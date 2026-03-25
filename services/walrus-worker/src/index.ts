import pino from 'pino';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-walrus-worker' });

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

async function processWalrusUpload(uploadIntentId: string): Promise<void> {
  await db.query(
    `
    UPDATE media_artifacts
    SET walrus_blob_id = 'blob_' || replace(id::text, '-', ''),
        walrus_blob_object_id = 'object_' || replace(id::text, '-', ''),
        metadata = jsonb_set(metadata, '{walrus_state}', '"stored"'::jsonb, true)
    WHERE upload_intent_id = $1
    `,
    [uploadIntentId],
  );

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'WALRUS_STORED', updated_at = now()
    WHERE id = $1
      AND status IN ('ENCRYPTED','WALRUS_STORED')
    `,
    [uploadIntentId],
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
