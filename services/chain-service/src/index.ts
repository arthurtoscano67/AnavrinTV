import path from 'node:path';
import pino from 'pino';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-chain-service' });

const suiClient = new SuiJsonRpcClient({
  url: env.SUI_RPC_URL,
  network: env.SUI_CHAIN,
});

const sponsorSigner = Ed25519Keypair.fromSecretKey(env.SUI_SPONSOR_PRIVATE_KEY);
const sponsorAddress = sponsorSigner.toSuiAddress();
const videoMintTarget = `${env.ONREEL_PACKAGE_ID}::video_asset::mint`;

interface UploadIntentRow {
  id: string;
  wallet_address: string;
  channel_id: string | null;
  title: string | null;
  description: string | null;
  file_name: string;
  uploader_signature: string | null;
  walrus_manifest_blob_id: string | null;
  walrus_manifest_object_id: string | null;
  onchain_storage_end_epoch: string | null;
  onchain_video_object_id: string | null;
  onchain_mint_tx_digest: string | null;
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
    SELECT
      id,
      wallet_address,
      channel_id,
      title,
      description,
      file_name,
      uploader_signature,
      walrus_manifest_blob_id,
      walrus_manifest_object_id,
      onchain_storage_end_epoch,
      onchain_video_object_id,
      onchain_mint_tx_digest
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

function resolveVideoTitle(uploadIntent: UploadIntentRow): string {
  if (uploadIntent.title && uploadIntent.title.trim().length > 0) {
    return uploadIntent.title.trim();
  }
  return path.parse(uploadIntent.file_name).name.slice(0, 200) || uploadIntent.file_name.slice(0, 200);
}

function resolveVideoDescription(uploadIntent: UploadIntentRow): string {
  if (!uploadIntent.description) {
    return '';
  }
  return uploadIntent.description.slice(0, 4000);
}

async function resolveThumbnailUrl(uploadIntentId: string, fallbackBlobId: string): Promise<string> {
  const { rows } = await db.query<{ walrus_blob_id: string | null }>(
    `
    SELECT walrus_blob_id
    FROM media_artifacts
    WHERE upload_intent_id = $1
      AND artifact_type = 'THUMBNAIL_WALLET'
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const thumbnailBlobId = rows[0]?.walrus_blob_id;
  if (thumbnailBlobId) {
    return `walrus://${thumbnailBlobId}`;
  }

  return `walrus://${fallbackBlobId}`;
}

function extractVideoObjectId(result: Record<string, unknown>): string | null {
  const events = Array.isArray(result.events) ? result.events : null;
  if (events) {
    for (const event of events) {
      if (!event || typeof event !== 'object') {
        continue;
      }
      const type = (event as Record<string, unknown>).type;
      const parsedJson = (event as Record<string, unknown>).parsedJson;
      if (
        typeof type === 'string' &&
        type.endsWith('::video_asset::VideoMinted') &&
        parsedJson &&
        typeof parsedJson === 'object' &&
        typeof (parsedJson as Record<string, unknown>).video_id === 'string'
      ) {
        return (parsedJson as Record<string, unknown>).video_id as string;
      }
    }
  }

  const objectChanges = Array.isArray(result.objectChanges) ? result.objectChanges : null;
  if (objectChanges) {
    for (const change of objectChanges) {
      if (!change || typeof change !== 'object') {
        continue;
      }
      const objectType = (change as Record<string, unknown>).objectType;
      const objectId = (change as Record<string, unknown>).objectId;
      const type = (change as Record<string, unknown>).type;
      if (
        type === 'created' &&
        typeof objectType === 'string' &&
        objectType.endsWith('::video_asset::VideoAsset') &&
        typeof objectId === 'string'
      ) {
        return objectId;
      }
    }
  }

  return null;
}

async function buildGasPayment(): Promise<
  {
    objectId: string;
    version: string;
    digest: string;
  }[]
> {
  const coins = await suiClient.getCoins({
    owner: sponsorAddress,
    coinType: '0x2::sui::SUI',
    limit: env.SUI_GAS_PAYMENT_COIN_LIMIT,
  });

  if (coins.data.length === 0) {
    throw new Error(`sponsor address ${sponsorAddress} has no SUI coins for gas`);
  }

  return coins.data.map((coin) => ({
    objectId: coin.coinObjectId,
    version: coin.version,
    digest: coin.digest,
  }));
}

async function executeMint(uploadIntent: UploadIntentRow): Promise<{
  digest: string;
  videoObjectId: string;
  sender: string;
  usedUserSignature: boolean;
}> {
  if (!uploadIntent.walrus_manifest_blob_id || !uploadIntent.walrus_manifest_object_id) {
    throw new Error(`walrus IDs missing for upload ${uploadIntent.id}`);
  }

  if (!uploadIntent.onchain_storage_end_epoch) {
    throw new Error(`storage end epoch missing for upload ${uploadIntent.id}`);
  }

  const gasPayment = await buildGasPayment();
  const title = resolveVideoTitle(uploadIntent);
  const description = resolveVideoDescription(uploadIntent);
  const channelBytes = Array.from(Buffer.from(uploadIntent.channel_id ?? '', 'utf8'));
  const thumbnailUrl = await resolveThumbnailUrl(uploadIntent.id, uploadIntent.walrus_manifest_blob_id);
  const storageEndEpoch = BigInt(uploadIntent.onchain_storage_end_epoch);

  const tx = new Transaction();
  tx.moveCall({
    target: videoMintTarget,
    arguments: [
      tx.pure.address(uploadIntent.wallet_address),
      tx.pure.vector('u8', channelBytes),
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.string(thumbnailUrl),
      tx.pure.string(uploadIntent.walrus_manifest_blob_id),
      tx.pure.string(uploadIntent.walrus_manifest_object_id),
      tx.pure.u64(storageEndEpoch),
      tx.pure.address(env.ONREEL_POLICY_OBJECT_ID),
    ],
  });

  const kindBytes = await tx.build({ client: suiClient as never, onlyTransactionKind: true });
  const sponsoredTx = Transaction.fromKind(kindBytes);
  const hasUploaderSignature = Boolean(uploadIntent.uploader_signature);
  if (env.CHAIN_REQUIRE_USER_SIGNATURE && !hasUploaderSignature) {
    throw new Error(`uploader signature required for upload ${uploadIntent.id}`);
  }

  const sender = hasUploaderSignature ? uploadIntent.wallet_address : sponsorAddress;
  sponsoredTx.setSender(sender);
  sponsoredTx.setGasOwner(sponsorAddress);
  sponsoredTx.setGasPayment(gasPayment);
  sponsoredTx.setGasBudget(env.CHAIN_MINT_GAS_BUDGET);

  const txBytes = await sponsoredTx.build({ client: suiClient as never });
  const { signature: sponsorSignature } = await sponsorSigner.signTransaction(txBytes);
  const signatures = hasUploaderSignature
    ? [uploadIntent.uploader_signature as string, sponsorSignature]
    : sponsorSignature;

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: signatures,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  const status = result.effects?.status?.status;
  if (status !== 'success') {
    const error = result.effects?.status?.error ?? 'unknown chain execution error';
    throw new Error(`mint transaction failed: ${error}`);
  }

  const videoObjectId =
    extractVideoObjectId(result as unknown as Record<string, unknown>) ??
    uploadIntent.onchain_video_object_id;
  if (!videoObjectId) {
    throw new Error(`mint succeeded but video object ID was not found for upload ${uploadIntent.id}`);
  }

  return {
    digest: result.digest,
    videoObjectId,
    sender,
    usedUserSignature: hasUploaderSignature,
  };
}

async function processChainMint(uploadIntentId: string): Promise<void> {
  if (!env.ENABLE_LIVE_CHAIN) {
    throw new Error('live chain integration is disabled (ENABLE_LIVE_CHAIN=false)');
  }

  const uploadIntent = await getUploadIntent(uploadIntentId);
  if (uploadIntent.onchain_video_object_id && uploadIntent.onchain_mint_tx_digest) {
    await enqueueIfMissing('INDEX_VIDEO', uploadIntentId);
    return;
  }

  const mintResult = await executeMint(uploadIntent);

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'MINTED',
        onchain_video_object_id = $2,
        onchain_mint_tx_digest = $3,
        onchain_policy_object_id = $4,
        updated_at = now()
    WHERE id = $1
      AND status IN ('WALRUS_STORED','MINTED')
    `,
    [
      uploadIntentId,
      mintResult.videoObjectId,
      mintResult.digest,
      env.ONREEL_POLICY_OBJECT_ID,
    ],
  );

  await db.query(
    `
    INSERT INTO audit_log (actor_id, action_type, target_type, target_id, reason, metadata)
    VALUES ('chain-service', 'VIDEO_ASSET_MINTED', 'upload_intents', $1, 'minted video object', $2)
    `,
    [
      uploadIntentId,
      {
        txDigest: mintResult.digest,
        videoObjectId: mintResult.videoObjectId,
        sender: mintResult.sender,
        gasOwner: sponsorAddress,
        usedUserSignature: mintResult.usedUserSignature,
      },
    ],
  );

  await enqueueIfMissing('INDEX_VIDEO', uploadIntentId);
}

async function processOne(): Promise<void> {
  const job = await claimNextJob(db, ['CHAIN_MINT']);
  if (!job) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
    return;
  }

  try {
    const uploadIntentId = String(job.payload.uploadIntentId ?? '');
    if (!uploadIntentId) {
      throw new Error('CHAIN_MINT missing uploadIntentId');
    }

    await processChainMint(uploadIntentId);
    await markJobSucceeded(db, job.id);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('unknown chain service error');
    logger.error({ err, jobId: job.id, jobType: job.jobType }, 'job failed');
    await markJobFailed(db, job, err);
  }
}

async function main(): Promise<void> {
  logger.info('chain service started');
  while (true) {
    await processOne();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'chain service crashed');
  process.exit(1);
});
