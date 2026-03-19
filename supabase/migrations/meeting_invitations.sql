-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS meeting_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES users(id),
  -- For org members: user_id is set; for external: null
  user_id         UUID REFERENCES users(id),
  -- Always set — email of the invitee
  email           TEXT NOT NULL,
  name            TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  -- Unique token for external RSVP link (no auth required)
  rsvp_token      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  note            TEXT,   -- optional note from invitee on RSVP
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  UNIQUE (meeting_id, email)
);

ALTER TABLE meeting_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org's meetings
CREATE POLICY "org members can view invitations"
  ON meeting_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Index for fast token lookup (used by public RSVP page)
CREATE INDEX IF NOT EXISTS meeting_invitations_token_idx ON meeting_invitations (rsvp_token);
CREATE INDEX IF NOT EXISTS meeting_invitations_meeting_idx ON meeting_invitations (meeting_id);
