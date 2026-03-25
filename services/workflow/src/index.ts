import pino from 'pino';
import { claimNextJob, markJobFailed, markJobSucceeded } from '@onreel/shared';

import { db } from './db.js';
import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-workflow' });

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

async function processUploadPipeline(payload: Record<string, unknown>): Promise<void> {
  const uploadIntentId = String(payload.uploadIntentId ?? '');
  if (!uploadIntentId) {
    throw new Error('UPLOAD_PIPELINE missing uploadIntentId');
  }

  const { rows } = await db.query<{ status: string }>('SELECT status FROM upload_intents WHERE id = $1', [
    uploadIntentId,
  ]);

  if (!rows[0]) {
    throw new Error('upload intent not found');
  }

  const current = rows[0].status;
  if (current === 'FAILED' || current === 'PUBLISHED') {
    return;
  }

  if (current === 'RECEIVED') {
    await db.query(
      `
      UPDATE upload_intents
      SET status = 'VALIDATED', updated_at = now()
      WHERE id = $1
      `,
      [uploadIntentId],
    );
  }

  await enqueueIfMissing('MEDIA_TRANSCODE', uploadIntentId);
}

async function processPublishVideo(payload: Record<string, unknown>): Promise<void> {
  const uploadIntentId = String(payload.uploadIntentId ?? '');
  if (!uploadIntentId) {
    throw new Error('PUBLISH_VIDEO missing uploadIntentId');
  }

  await db.query(
    `
    UPDATE upload_intents
    SET status = 'PUBLISHED',
        published_at = COALESCE(published_at, now()),
        updated_at = now()
    WHERE id = $1
    `,
    [uploadIntentId],
  );
}

async function processOne(): Promise<void> {
  const job = await claimNextJob(db, ['UPLOAD_PIPELINE', 'PUBLISH_VIDEO']);
  if (!job) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
    return;
  }

  try {
    if (job.jobType === 'UPLOAD_PIPELINE') {
      await processUploadPipeline(job.payload);
    } else if (job.jobType === 'PUBLISH_VIDEO') {
      await processPublishVideo(job.payload);
    } else {
      throw new Error(`unsupported job type: ${job.jobType}`);
    }

    await markJobSucceeded(db, job.id);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('unknown workflow error');
    logger.error({ err, jobId: job.id, jobType: job.jobType }, 'job failed');
    await markJobFailed(db, job, err);
  }
}

async function main(): Promise<void> {
  logger.info('workflow service started');
  while (true) {
    await processOne();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'workflow service crashed');
  process.exit(1);
});
