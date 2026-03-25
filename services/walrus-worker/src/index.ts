import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import pino from 'pino';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import {
  RetryableWalrusClientError,
  WalrusClient,
  type WriteBlobStep,
} from '@mysten/walrus';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-walrus-worker' });

const suiClient = new SuiJsonRpcClient({
  url: env.SUI_RPC_URL,
  network: env.SUI_CHAIN,
});

const walrusClient = new WalrusClient(
  env.WALRUS_SYSTEM_OBJECT_ID && env.WALRUS_STAKING_POOL_ID
    ? {
        suiClient: suiClient as never,
        packageConfig: {
          systemObjectId: env.WALRUS_SYSTEM_OBJECT_ID,
          stakingPoolId: env.WALRUS_STAKING_POOL_ID,
        },
      }
    : {
        suiClient: suiClient as never,
        network: env.WALRUS_NETWORK,
      },
);

const walrusSigner = Ed25519Keypair.fromSecretKey(env.WALRUS_SIGNER_PRIVATE_KEY);

interface UploadIntentRow {
  id: string;
  wallet_address: string;
}

interface ArtifactRow {
  id: string;
  object_key: string | null;
  metadata: Record<string, unknown> | null;
  walrus_blob_id: string | null;
  walrus_blob_object_id: string | null;
}

function normalizeMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function mediaAbsolutePath(objectKey: string): string {
  if (path.isAbsolute(objectKey)) {
    return objectKey;
  }
  return path.join(env.MEDIA_STORAGE_ROOT, objectKey);
}

function uploadAbsolutePath(objectKey: string): string {
  if (path.isAbsolute(objectKey)) {
    return objectKey;
  }
  return path.join(env.UPLOAD_TMP_ROOT, objectKey);
}

async function resolveReadablePath(objectKey: string): Promise<string> {
  if (path.isAbsolute(objectKey)) {
    if (!(await pathExists(objectKey))) {
      throw new Error(`artifact file not found at ${objectKey}`);
    }
    return objectKey;
  }

  const mediaPath = mediaAbsolutePath(objectKey);
  if (await pathExists(mediaPath)) {
    return mediaPath;
  }

  const uploadPath = uploadAbsolutePath(objectKey);
  if (await pathExists(uploadPath)) {
    return uploadPath;
  }

  throw new Error(`artifact file not found for key ${objectKey}`);
}

function readWalrusResumeStep(metadata: Record<string, unknown>): WriteBlobStep | undefined {
  const walrus = metadata.walrus;
  if (!walrus || typeof walrus !== 'object' || Array.isArray(walrus)) {
    return undefined;
  }

  const step = (walrus as Record<string, unknown>).lastStep;
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return undefined;
  }

  const stepName = (step as Record<string, unknown>).step;
  if (typeof stepName !== 'string') {
    return undefined;
  }

  return step as WriteBlobStep;
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

async function getUploadIntent(uploadIntentId: string): Promise<UploadIntentRow> {
  const { rows } = await db.query<UploadIntentRow>(
    `
    SELECT id, wallet_address
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

async function getMasterArtifact(uploadIntentId: string): Promise<ArtifactRow> {
  const { rows } = await db.query<ArtifactRow>(
    `
    SELECT id, object_key, metadata, walrus_blob_id, walrus_blob_object_id
    FROM media_artifacts
    WHERE upload_intent_id = $1
      AND artifact_type = 'MASTER'
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`MASTER artifact missing for upload ${uploadIntentId}`);
  }

  return row;
}

async function updateWalrusCheckpoint(
  artifactId: string,
  metadata: Record<string, unknown>,
  step: WriteBlobStep,
): Promise<Record<string, unknown>> {
  const nextMetadata = {
    ...metadata,
    walrus: {
      ...((metadata.walrus as Record<string, unknown> | undefined) ?? {}),
      lastStep: step,
      updatedAt: new Date().toISOString(),
      state: step.step,
    },
  };

  await db.query(
    `
    UPDATE media_artifacts
    SET metadata = $2,
        processing_state = 'UPLOADING',
        updated_at = now()
    WHERE id = $1
    `,
    [artifactId, nextMetadata],
  );

  return nextMetadata;
}

async function processWalrusUpload(uploadIntentId: string): Promise<void> {
  if (!env.ENABLE_LIVE_WALRUS) {
    throw new Error('live Walrus integration is disabled (ENABLE_LIVE_WALRUS=false)');
  }

  const uploadIntent = await getUploadIntent(uploadIntentId);
  const artifact = await getMasterArtifact(uploadIntentId);
  if (artifact.walrus_blob_id && artifact.walrus_blob_object_id) {
    await enqueueIfMissing('CHAIN_MINT', uploadIntentId);
    return;
  }

  if (!artifact.object_key) {
    throw new Error(`MASTER artifact object key missing for upload ${uploadIntentId}`);
  }

  const sourcePath = await resolveReadablePath(artifact.object_key);
  const blob = new Uint8Array(await readFile(sourcePath));
  let metadata = normalizeMetadata(artifact.metadata);
  const resumeStep = readWalrusResumeStep(metadata);

  const uploadResult = await walrusClient.writeBlob({
    blob,
    epochs: env.WALRUS_STORAGE_EPOCHS,
    deletable: env.WALRUS_DELETABLE,
    signer: walrusSigner,
    owner: uploadIntent.wallet_address,
    attributes: {
      'onreel:upload_intent_id': uploadIntentId,
      'onreel:artifact_type': 'MASTER',
      'onreel:source_path': sourcePath,
    },
    resume: resumeStep,
    onStep: async (step) => {
      metadata = await updateWalrusCheckpoint(artifact.id, metadata, step);
    },
  });

  const finalizedMetadata = {
    ...metadata,
    walrus: {
      ...((metadata.walrus as Record<string, unknown> | undefined) ?? {}),
      state: 'stored',
      blobId: uploadResult.blobId,
      blobObjectId: uploadResult.blobObject.id,
      storageStartEpoch: uploadResult.blobObject.storage.start_epoch,
      storageEndEpoch: uploadResult.blobObject.storage.end_epoch,
      storedAt: new Date().toISOString(),
    },
  };

  await db.query(
    `
    UPDATE media_artifacts
    SET walrus_blob_id = $2,
        walrus_blob_object_id = $3,
        metadata = $4,
        processing_state = 'STORED',
        updated_at = now()
    WHERE id = $1
    `,
    [artifact.id, uploadResult.blobId, uploadResult.blobObject.id, finalizedMetadata],
  );

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'WALRUS_STORED',
        walrus_manifest_blob_id = $2,
        walrus_manifest_object_id = $3,
        onchain_storage_end_epoch = $4,
        updated_at = now()
    WHERE id = $1
      AND status IN ('ENCRYPTED','WALRUS_STORED')
    `,
    [
      uploadIntentId,
      uploadResult.blobId,
      uploadResult.blobObject.id,
      uploadResult.blobObject.storage.end_epoch,
    ],
  );

  await enqueueIfMissing('CHAIN_MINT', uploadIntentId);
}

async function processOne(): Promise<void> {
  const job = await claimNextJob(db, ['WALRUS_UPLOAD']);
  if (!job) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
    return;
  }

  try {
    const uploadIntentId = String(job.payload.uploadIntentId ?? '');
    if (!uploadIntentId) {
      throw new Error('WALRUS_UPLOAD missing uploadIntentId');
    }

    await processWalrusUpload(uploadIntentId);
    await markJobSucceeded(db, job.id);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('unknown walrus worker error');
    if (err instanceof RetryableWalrusClientError) {
      walrusClient.reset();
    }
    logger.error({ err, jobId: job.id, jobType: job.jobType }, 'job failed');
    await markJobFailed(db, job, err);
  }
}

async function main(): Promise<void> {
  logger.info('walrus worker started');
  while (true) {
    await processOne();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'walrus worker crashed');
  process.exit(1);
});
