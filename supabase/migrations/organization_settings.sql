-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS organization_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Org profile
  timezone             TEXT NOT NULL DEFAULT 'America/New_York',
  -- OpenAI
  openai_api_key       TEXT,
  -- Google Calendar OAuth app
  google_client_id     TEXT,
  google_client_secret TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id)
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Only org members can read their own settings
CREATE POLICY "org members can view settings"
  ON organization_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
