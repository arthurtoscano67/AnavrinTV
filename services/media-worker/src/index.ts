import pino from 'pino';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-media-worker' });

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

async function processTranscode(uploadIntentId: string): Promise<void> {
  await db.query(
    `
    UPDATE upload_intents
    SET status = 'TRANSCODED', updated_at = now()
    WHERE id = $1
      AND status IN ('VALIDATED','SCANNED','TRANSCODED')
    `,
    [uploadIntentId],
  );

  await db.query(
    `
    INSERT INTO media_artifacts (
      upload_intent_id,
      artifact_type,
      mime_type,
      object_key,
      encrypted,
      public_asset,
      metadata
    )
    VALUES
      ($1, 'MASTER', 'video/mp4', 'master/' || $1 || '.mp4', FALSE, FALSE, '{"pipeline":"transcode"}'::jsonb),
      ($1, 'THUMBNAIL_WALLET', 'image/jpeg', 'thumb/' || $1 || '.jpg', FALSE, TRUE, '{"pipeline":"thumbnail"}'::jsonb)
    `,
    [uploadIntentId],
  );

  await enqueueIfMissing('MEDIA_ENCRYPT', uploadIntentId);
}

async function processEncrypt(uploadIntentId: string): Promise<void> {
  await db.query(
    `
    UPDATE media_artifacts
    SET encrypted = TRUE,
        metadata = jsonb_set(metadata, '{encryption}', '"seal-envelope"'::jsonb, true)
    WHERE upload_intent_id = $1
      AND artifact_type = 'MASTER'
    `,
    [uploadIntentId],
  );

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
