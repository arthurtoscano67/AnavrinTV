import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pino from 'pino';
import { SealClient } from '@mysten/seal';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-media-worker' });

const suiClient = new SuiJsonRpcClient({
  url: env.SUI_RPC_URL,
  network: env.SUI_CHAIN,
});

const sealClient = new SealClient({
  suiClient: suiClient as never,
  serverConfigs: env.SEAL_SERVER_OBJECT_IDS.map((objectId) => ({
    objectId,
    weight: 1,
  })),
});

interface UploadIntentRow {
  id: string;
  tmp_object_key: string;
  mime_type: string;
  wallet_address: string;
}

interface ArtifactRow {
  object_key: string | null;
  metadata: Record<string, unknown> | null;
}

async function enqueueIfMissing(jobType: string, uploadIntentId: string): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `
    SELECT id
    FROM workflow_jobs
    WHERE job_type = $1
      AND status IN ('QUEUED','RUNNING')
      AND payload->>'uploadIntentId' = $2
    LIMIT 1
    `,
    [jobType, uploadIntentId],
  );

  if (rows[0]) {
    return;
  }

  await db.query(
    `
    INSERT INTO workflow_jobs (job_type, status, payload)
    VALUES ($1, 'QUEUED', $2)
    `,
    [jobType, { uploadIntentId }],
  );
}

function uploadAbsolutePath(objectKey: string): string {
  if (path.isAbsolute(objectKey)) {
    return objectKey;
  }
  return path.join(env.UPLOAD_TMP_ROOT, objectKey);
}

function mediaAbsolutePath(objectKey: string): string {
  if (path.isAbsolute(objectKey)) {
    return objectKey;
  }
  return path.join(env.MEDIA_STORAGE_ROOT, objectKey);
}

async function assertReadable(filePath: string): Promise<void> {
  await access(filePath);
}

function checksumSha256Hex(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

function normalizeMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

async function upsertArtifact(input: {
  uploadIntentId: string;
  artifactType: string;
  mimeType: string | null;
  objectKey: string | null;
  sourceObjectKey: string | null;
  encrypted: boolean;
  publicAsset: boolean;
  fileSizeBytes: bigint | null;
  checksumSha256: string | null;
  processingState: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await db.query(
    `
    INSERT INTO media_artifacts (
      upload_intent_id,
      artifact_type,
      mime_type,
      object_key,
      source_object_key,
      encrypted,
      public_asset,
      file_size_bytes,
      checksum_sha256,
      processing_state,
      metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (upload_intent_id, artifact_type) DO UPDATE
    SET mime_type = EXCLUDED.mime_type,
        object_key = EXCLUDED.object_key,
        source_object_key = EXCLUDED.source_object_key,
        encrypted = EXCLUDED.encrypted,
        public_asset = EXCLUDED.public_asset,
        file_size_bytes = EXCLUDED.file_size_bytes,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        processing_state = EXCLUDED.processing_state,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      input.uploadIntentId,
      input.artifactType,
      input.mimeType,
      input.objectKey,
      input.sourceObjectKey,
      input.encrypted,
      input.publicAsset,
      input.fileSizeBytes ? input.fileSizeBytes.toString() : null,
      input.checksumSha256,
      input.processingState,
      input.metadata,
    ],
  );
}

async function getUploadIntent(uploadIntentId: string): Promise<UploadIntentRow> {
  const { rows } = await db.query<UploadIntentRow>(
    `
    SELECT id, tmp_object_key, mime_type, wallet_address
    FROM upload_intents
    WHERE id = $1
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`upload intent not found: ${uploadIntentId}`);
  }

  return row;
}

async function processTranscode(uploadIntentId: string): Promise<void> {
  const uploadIntent = await getUploadIntent(uploadIntentId);
  const sourcePath = uploadAbsolutePath(uploadIntent.tmp_object_key);
  await assertReadable(sourcePath);

  await upsertArtifact({
    uploadIntentId,
    artifactType: 'MASTER',
    mimeType: uploadIntent.mime_type,
    objectKey: uploadIntent.tmp_object_key,
    sourceObjectKey: uploadIntent.tmp_object_key,
    encrypted: false,
    publicAsset: false,
    fileSizeBytes: null,
    checksumSha256: null,
    processingState: 'READY_FOR_ENCRYPT',
    metadata: {
      pipeline: 'transcode',
      source: 'upload_tmp',
      checkedAt: new Date().toISOString(),
    },
  });

  await upsertArtifact({
    uploadIntentId,
    artifactType: 'THUMBNAIL_WALLET',
    mimeType: 'image/jpeg',
    objectKey: `thumb/${uploadIntentId}/wallet.jpg`,
    sourceObjectKey: null,
    encrypted: false,
    publicAsset: true,
    fileSizeBytes: null,
    checksumSha256: null,
    processingState: 'PENDING_GENERATION',
    metadata: {
      pipeline: 'thumbnail',
      status: 'pending_generation',
      updatedAt: new Date().toISOString(),
    },
  });

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'TRANSCODED', updated_at = now()
    WHERE id = $1
      AND status IN ('VALIDATED','SCANNED','TRANSCODED')
    `,
    [uploadIntentId],
  );

  await enqueueIfMissing('MEDIA_ENCRYPT', uploadIntentId);
}

async function processEncrypt(uploadIntentId: string): Promise<void> {
  if (!env.ENABLE_LIVE_SEAL) {
    throw new Error('live Seal integration is disabled (ENABLE_LIVE_SEAL=false)');
  }

  const uploadIntent = await getUploadIntent(uploadIntentId);
  const { rows: artifactRows } = await db.query<ArtifactRow>(
    `
    SELECT object_key, metadata
    FROM media_artifacts
    WHERE upload_intent_id = $1
      AND artifact_type = 'MASTER'
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const masterArtifact = artifactRows[0];
  const sourceObjectKey = masterArtifact?.object_key ?? uploadIntent.tmp_object_key;
  if (!sourceObjectKey) {
    throw new Error(`missing source object key for ${uploadIntentId}`);
  }

  const sourcePath = path.isAbsolute(sourceObjectKey)
    ? sourceObjectKey
    : sourceObjectKey === uploadIntent.tmp_object_key
      ? uploadAbsolutePath(sourceObjectKey)
      : mediaAbsolutePath(sourceObjectKey);
  await assertReadable(sourcePath);

  const plaintext = await readFile(sourcePath);
  const plaintextSha256 = checksumSha256Hex(plaintext);

  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const aad = Buffer.from(`onreel:${uploadIntentId}`, 'utf8');
  const cipher = createCipheriv('aes-256-gcm', dek, iv);
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const ciphertextSha256 = checksumSha256Hex(ciphertext);

  const sealIdentity = `video:${uploadIntentId}:${uploadIntent.wallet_address}`;
  const { encryptedObject: wrappedDek } = await sealClient.encrypt({
    threshold: env.SEAL_THRESHOLD,
    packageId: env.SEAL_PACKAGE_ID,
    id: sealIdentity,
    data: dek,
  });

  const encryptedObjectKey = path.posix.join('encrypted', uploadIntentId, 'master.enc');
  const encryptedAbsolutePath = mediaAbsolutePath(encryptedObjectKey);
  await mkdir(path.dirname(encryptedAbsolutePath), { recursive: true });
  await writeFile(encryptedAbsolutePath, ciphertext);

  const currentMetadata = normalizeMetadata(masterArtifact?.metadata ?? null);
  const encryptionMetadata = {
    version: 1,
    scheme: 'aes-256-gcm+seal',
    seal: {
      packageId: env.SEAL_PACKAGE_ID,
      threshold: env.SEAL_THRESHOLD,
      id: sealIdentity,
      serverObjectIds: env.SEAL_SERVER_OBJECT_IDS,
      wrappedDekB64: Buffer.from(wrappedDek).toString('base64'),
    },
    ivB64: iv.toString('base64'),
    aadB64: aad.toString('base64'),
    authTagB64: authTag.toString('base64'),
    plaintextSha256,
    ciphertextSha256,
    plaintextBytes: plaintext.length,
    ciphertextBytes: ciphertext.length,
    sourceObjectKey,
    encryptedObjectKey,
  };

  await upsertArtifact({
    uploadIntentId,
    artifactType: 'MASTER',
    mimeType: uploadIntent.mime_type,
    objectKey: encryptedObjectKey,
    sourceObjectKey,
    encrypted: true,
    publicAsset: false,
    fileSizeBytes: BigInt(ciphertext.length),
    checksumSha256: ciphertextSha256,
    processingState: 'ENCRYPTED',
    metadata: {
      ...currentMetadata,
      encryption: encryptionMetadata,
      updatedAt: new Date().toISOString(),
    },
  });

  await upsertArtifact({
    uploadIntentId,
    artifactType: 'SEAL_ENVELOPE',
    mimeType: 'application/json',
    objectKey: null,
    sourceObjectKey: null,
    encrypted: true,
    publicAsset: false,
    fileSizeBytes: BigInt(wrappedDek.length),
    checksumSha256: checksumSha256Hex(wrappedDek),
    processingState: 'READY',
    metadata: {
      uploadIntentId,
      wrappedDekB64: Buffer.from(wrappedDek).toString('base64'),
      packageId: env.SEAL_PACKAGE_ID,
      threshold: env.SEAL_THRESHOLD,
      id: sealIdentity,
      createdAt: new Date().toISOString(),
    },
  });

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'ENCRYPTED', updated_at = now()
    WHERE id = $1
      AND status IN ('TRANSCODED','ENCRYPTED')
    `,
    [uploadIntentId],
  );

  await enqueueIfMissing('WALRUS_UPLOAD', uploadIntentId);
}

async function processOne(): Promise<void> {
  const job = await claimNextJob(db, ['MEDIA_TRANSCODE', 'MEDIA_ENCRYPT']);
  if (!job) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
    return;
  }

  try {
    const uploadIntentId = String(job.payload.uploadIntentId ?? '');
    if (!uploadIntentId) {
      throw new Error(`${job.jobType} missing uploadIntentId`);
    }

    if (job.jobType === 'MEDIA_TRANSCODE') {
      await processTranscode(uploadIntentId);
    } else {
      await processEncrypt(uploadIntentId);
    }

    await markJobSucceeded(db, job.id);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('unknown media worker error');
    logger.error({ err, jobId: job.id, jobType: job.jobType }, 'job failed');
    await markJobFailed(db, job, err);
  }
}

async function main(): Promise<void> {
  logger.info('media worker started');
  while (true) {
    await processOne();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'media worker crashed');
  process.exit(1);
});
