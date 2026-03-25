import { Pool } from 'pg';

export type JobType =
  | 'UPLOAD_PIPELINE'
  | 'MEDIA_TRANSCODE'
  | 'MEDIA_ENCRYPT'
  | 'WALRUS_UPLOAD'
  | 'CHAIN_MINT'
  | 'INDEX_VIDEO'
  | 'PUBLISH_VIDEO';

export async function enqueueJob(
  db: Pool,
  jobType: JobType,
  payload: Record<string, unknown>,
  maxAttempts = 10,
): Promise<{ id: string }> {
  const { rows } = await db.query(
    `
    INSERT INTO workflow_jobs (job_type, status, payload, max_attempts)
    VALUES ($1, 'QUEUED', $2, $3)
    RETURNING id
    `,
    [jobType, payload, maxAttempts],
  );

  return { id: String(rows[0].id) };
}
