ALTER TABLE upload_intents
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS uploader_signature TEXT,
  ADD COLUMN IF NOT EXISTS onchain_video_object_id TEXT,
  ADD COLUMN IF NOT EXISTS onchain_mint_tx_digest TEXT,
  ADD COLUMN IF NOT EXISTS onchain_storage_end_epoch BIGINT,
  ADD COLUMN IF NOT EXISTS onchain_policy_object_id TEXT,
  ADD COLUMN IF NOT EXISTS walrus_manifest_blob_id TEXT,
  ADD COLUMN IF NOT EXISTS walrus_manifest_object_id TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE media_artifacts
  ADD COLUMN IF NOT EXISTS file_size_bytes NUMERIC(39,0),
  ADD COLUMN IF NOT EXISTS source_object_key TEXT,
  ADD COLUMN IF NOT EXISTS processing_state TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_artifacts_upload_intent_type_unique
  ON media_artifacts(upload_intent_id, artifact_type);

CREATE INDEX IF NOT EXISTS idx_media_artifacts_processing_state
  ON media_artifacts(processing_state);
