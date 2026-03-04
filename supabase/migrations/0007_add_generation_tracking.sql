-- Track card generation state in DB instead of in-memory
-- This is required for serverless deployments (Vercel) where each
-- function invocation may run on a different instance.

ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_failed_at  TIMESTAMPTZ;
