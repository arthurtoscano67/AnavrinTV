CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('GLOBAL','CREATOR_TIER','CAMPAIGN','INDIVIDUAL','MANUAL','EMERGENCY')),
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  selector JSONB NOT NULL DEFAULT '{}'::jsonb,
  patch JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  reason TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_rules_scope_enabled ON policy_rules(scope, enabled);
CREATE INDEX IF NOT EXISTS idx_policy_rules_selector ON policy_rules USING GIN(selector);

CREATE TABLE IF NOT EXISTS sponsor_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  campaign_id TEXT,
  category TEXT NOT NULL,
  total_mist NUMERIC(39,0) NOT NULL,
  consumed_mist NUMERIC(39,0) NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_budgets_target ON sponsor_budgets(target_type, target_value, enabled);

CREATE TABLE IF NOT EXISTS upload_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  channel_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes NUMERIC(39,0) NOT NULL,
  checksum_sha256 TEXT,
  tmp_object_key TEXT NOT NULL,
  resumable_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'RECEIVED','VALIDATED','SCANNED','TRANSCODED','ENCRYPTED','WALRUS_STORED','MINTED','INDEXED','PUBLISHED','FAILED'
  )),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_intents_user ON upload_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_intents_status ON upload_intents(status);

CREATE TABLE IF NOT EXISTS media_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_intent_id UUID NOT NULL REFERENCES upload_intents(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  mime_type TEXT,
  object_key TEXT,
  walrus_blob_id TEXT,
  walrus_blob_object_id TEXT,
  checksum_sha256 TEXT,
  encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  public_asset BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_artifacts_upload_intent ON media_artifacts(upload_intent_id);

CREATE TABLE IF NOT EXISTS workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','DEAD_LETTER')),
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  lock_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_ready ON workflow_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_type ON workflow_jobs(job_type, status);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  payout_min_mist NUMERIC(39,0) NOT NULL DEFAULT 100000000,
  payout_hold BOOLEAN NOT NULL DEFAULT FALSE,
  payout_hold_reason TEXT,
  ad_payout_bps INTEGER NOT NULL DEFAULT 6000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS treasury_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL,
  amount_mist NUMERIC(39,0) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SUI',
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_ledger_reference ON treasury_ledger(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS playback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  video_object_id TEXT NOT NULL,
  access_reason TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_user ON playback_sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  user_id TEXT,
  video_object_id TEXT,
  impression_type TEXT NOT NULL,
  revenue_mist NUMERIC(39,0) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id TEXT NOT NULL,
  video_object_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
