import pino from 'pino';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-indexer' });

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

async function processIndexVideo(uploadIntentId: string): Promise<void> {
  await db.query(
    `
    UPDATE upload_intents
    SET status = 'INDEXED', updated_at = now()
    WHERE id = $1
      AND status IN ('MINTED','INDEXED')
    `,
    [uploadIntentId],
  );

  await db.query(
    `
    INSERT INTO audit_log (actor_id, action_type, target_type, target_id, reason)
    VALUES ('indexer', 'VIDEO_INDEXED', 'upload_intents', $1, 'projection updated')
    `,
    [uploadIntentId],
  );

  await enqueueIfMissing('PUBLISH_VIDEO', uploadIntentId);
}

async function processOne(): Promise<void> {
  const job = await claimNextJob(db, ['INDEX_VIDEO']);
  if (!job) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
    return;
  }

  try {
    const uploadIntentId = String(job.payload.uploadIntentId ?? '');
    if (!uploadIntentId) {
      throw new Error('INDEX_VIDEO missing uploadIntentId');
    }

    await processIndexVideo(uploadIntentId);
    await markJobSucceeded(db, job.id);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('unknown indexer error');
    logger.error({ err, jobId: job.id, jobType: job.jobType }, 'job failed');
    await markJobFailed(db, job, err);
  }
}

async function main(): Promise<void> {
  logger.info('indexer started');
  while (true) {
    await processOne();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'indexer crashed');
  process.exit(1);
});
