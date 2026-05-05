-- Application configuration key-value store
-- Used for runtime-switchable settings like LLM provider
CREATE TABLE app_config (
  key TEXT PRIMARY KEY NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE app_config IS 'Application-wide configuration stored as JSONB key-value pairs';

-- Initialize with default LLM provider
INSERT INTO app_config(key, value) 
VALUES ('llm_primary_provider', '"qwen"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS (no policies — only accessible via service_role in backend)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service_role always bypasses RLS anyway)
CREATE POLICY "Deny all" ON app_config FOR ALL USING (FALSE);
