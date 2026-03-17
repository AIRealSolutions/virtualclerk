-- Run this in the Supabase SQL Editor

-- 1. Add priority column to tasks (if it doesn't already exist)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Google Calendar connections table (one per org)
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connected_by      UUID NOT NULL REFERENCES users(id),
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  calendar_name     TEXT,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT,
  token_expiry      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id)
);

-- RLS: only org members can read; only service role writes (via API)
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view google calendar connections"
  ON google_calendar_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
