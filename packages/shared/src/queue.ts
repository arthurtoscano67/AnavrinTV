export interface QueryResult<T> {
  rows: T[];
}

export interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface WorkflowJobRow {
  id: string;
  job_type: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER';
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  next_run_at: string;
}

export interface ClaimedJob {
  id: string;
  jobType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

export async function claimNextJob(
  db: Queryable,
  acceptedTypes: string[],
): Promise<ClaimedJob | null> {
  if (acceptedTypes.length === 0) {
    return null;
  }

  const { rows } = await db.query<WorkflowJobRow>(
    `
    WITH candidate AS (
      SELECT id
      FROM workflow_jobs
      WHERE status = 'QUEUED'
        AND next_run_at <= now()
        AND job_type = ANY($1)
      ORDER BY next_run_at ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE workflow_jobs w
    SET status = 'RUNNING',
        updated_at = now()
    FROM candidate
    WHERE w.id = candidate.id
    RETURNING w.*
    `,
    [acceptedTypes],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    jobType: row.job_type,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  };
}

export async function markJobSucceeded(db: Queryable, jobId: string): Promise<void> {
  await db.query(
    `
    UPDATE workflow_jobs
    SET status = 'SUCCEEDED',
        updated_at = now()
    WHERE id = $1
    `,
    [jobId],
  );
}

export async function markJobFailed(
  db: Queryable,
  job: ClaimedJob,
  error: Error,
  backoffSeconds = 15,
): Promise<void> {
  const nextAttempts = job.attempts + 1;
  const isDead = nextAttempts >= job.maxAttempts;

  if (isDead) {
    await db.query(
      `
      UPDATE workflow_jobs
      SET status = 'DEAD_LETTER',
          attempts = $2,
          last_error = $3,
          updated_at = now()
      WHERE id = $1
      `,
      [job.id, nextAttempts, error.message],
    );
    return;
  }

  const delay = Math.min(backoffSeconds * nextAttempts, 600);
  await db.query(
    `
    UPDATE workflow_jobs
    SET status = 'QUEUED',
        attempts = $2,
        last_error = $3,
        next_run_at = now() + make_interval(secs => $4),
        updated_at = now()
    WHERE id = $1
    `,
    [job.id, nextAttempts, error.message, delay],
  );
}
