-- ============================================================
-- VirtualClerk.ai — PostgreSQL Schema
-- Run this in your Supabase SQL editor (in order)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE visibility_level AS ENUM ('private', 'internal', 'public');
CREATE TYPE meeting_status   AS ENUM ('draft', 'agenda_finalized', 'meeting_complete', 'minutes_published');
CREATE TYPE task_status      AS ENUM ('open', 'in_progress', 'complete', 'overdue');
CREATE TYPE user_role        AS ENUM ('platform_admin', 'org_admin', 'clerk', 'board_member', 'committee_member', 'staff', 'public_user');
CREATE TYPE org_type         AS ENUM ('government', 'nonprofit', 'committee', 'business', 'personal');
CREATE TYPE motion_result    AS ENUM ('passed', 'failed', 'tabled', 'withdrawn', 'pending');
CREATE TYPE vote_choice      AS ENUM ('yes', 'no', 'abstain');
CREATE TYPE committee_role   AS ENUM ('chair', 'vice_chair', 'member', 'alternate');
CREATE TYPE agenda_category  AS ENUM (
  'call_to_order', 'roll_call', 'approval_of_minutes',
  'old_business', 'new_business', 'public_comment',
  'reports', 'announcements', 'adjournment', 'other'
);

-- ─── Users (mirrors auth.users) ──────────────────────────────────────────────

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Organizations ────────────────────────────────────────────────────────────

CREATE TABLE public.organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  website     TEXT,
  org_type    org_type NOT NULL DEFAULT 'government',
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- ─── Organization Users (membership + roles) ─────────────────────────────────

CREATE TABLE public.organization_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'staff',
  title           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_users_org   ON public.organization_users(organization_id);
CREATE INDEX idx_org_users_user  ON public.organization_users(user_id);

-- ─── Committees ───────────────────────────────────────────────────────────────

CREATE TABLE public.committees (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  meeting_schedule TEXT,   -- e.g. "First Tuesday of each month at 7pm"
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  visibility_level visibility_level NOT NULL DEFAULT 'internal',
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_committees_org ON public.committees(organization_id);

-- ─── Committee Members ────────────────────────────────────────────────────────

CREATE TABLE public.committee_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  committee_id    UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            committee_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (committee_id, user_id)
);

CREATE INDEX idx_committee_members_committee ON public.committee_members(committee_id);
CREATE INDEX idx_committee_members_user      ON public.committee_members(user_id);

-- ─── Meetings ─────────────────────────────────────────────────────────────────

CREATE TABLE public.meetings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  committee_id     UUID REFERENCES public.committees(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  location         TEXT,
  meeting_date     DATE NOT NULL,
  start_time       TIME,
  end_time         TIME,
  status           meeting_status NOT NULL DEFAULT 'draft',
  visibility_level visibility_level NOT NULL DEFAULT 'internal',
  meeting_link     TEXT,   -- virtual meeting URL
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_org      ON public.meetings(organization_id);
CREATE INDEX idx_meetings_date     ON public.meetings(meeting_date DESC);
CREATE INDEX idx_meetings_status   ON public.meetings(status);
CREATE INDEX idx_meetings_committee ON public.meetings(committee_id);

-- ─── Agenda Items ─────────────────────────────────────────────────────────────

CREATE TABLE public.agenda_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id       UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  category         agenda_category NOT NULL DEFAULT 'other',
  order_index      INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  ai_summary       TEXT,
  presenter        TEXT,
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agenda_items_meeting ON public.agenda_items(meeting_id);
CREATE INDEX idx_agenda_items_order   ON public.agenda_items(meeting_id, order_index);

-- ─── Documents ────────────────────────────────────────────────────────────────

CREATE TABLE public.documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  file_path        TEXT NOT NULL,   -- Supabase Storage path
  file_size        BIGINT,
  file_type        TEXT,
  folder_path      TEXT,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  version          INTEGER NOT NULL DEFAULT 1,
  visibility_level visibility_level NOT NULL DEFAULT 'internal',
  meeting_id       UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  agenda_item_id   UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL,
  ai_summary       TEXT,
  search_vector    TSVECTOR,
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_org       ON public.documents(organization_id);
CREATE INDEX idx_documents_meeting   ON public.documents(meeting_id);
CREATE INDEX idx_documents_search    ON public.documents USING GIN(search_vector);
CREATE INDEX idx_documents_tags      ON public.documents USING GIN(tags);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION documents_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();

-- Document versions
CREATE TABLE public.document_versions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   BIGINT,
  created_by  UUID NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_versions_doc ON public.document_versions(document_id);

-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  assigned_to      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by       UUID NOT NULL REFERENCES public.users(id),
  due_date         DATE,
  status           task_status NOT NULL DEFAULT 'open',
  meeting_id       UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  agenda_item_id   UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_org        ON public.tasks(organization_id);
CREATE INDEX idx_tasks_assigned   ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status     ON public.tasks(status);
CREATE INDEX idx_tasks_due_date   ON public.tasks(due_date);

-- ─── Motions ─────────────────────────────────────────────────────────────────

CREATE TABLE public.motions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id       UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id   UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL,
  motion_text      TEXT NOT NULL,
  proposed_by      UUID NOT NULL REFERENCES public.users(id),
  seconded_by      UUID REFERENCES public.users(id),
  result           motion_result NOT NULL DEFAULT 'pending',
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_motions_meeting ON public.motions(meeting_id);
CREATE INDEX idx_motions_org     ON public.motions(organization_id);

-- ─── Votes ────────────────────────────────────────────────────────────────────

CREATE TABLE public.votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motion_id       UUID NOT NULL REFERENCES public.motions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  voter_id        UUID NOT NULL REFERENCES public.users(id),
  vote            vote_choice NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (motion_id, voter_id)
);

CREATE INDEX idx_votes_motion ON public.votes(motion_id);

-- ─── Minutes ─────────────────────────────────────────────────────────────────

CREATE TABLE public.minutes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id      UUID NOT NULL UNIQUE REFERENCES public.meetings(id) ON DELETE CASCADE,
  content         TEXT NOT NULL DEFAULT '',
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     UUID REFERENCES public.users(id),
  approved_at     TIMESTAMPTZ,
  ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_minutes_meeting ON public.minutes(meeting_id);
CREATE INDEX idx_minutes_org     ON public.minutes(organization_id);

-- ─── Publications ─────────────────────────────────────────────────────────────

CREATE TABLE public.publications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id      UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  document_id     UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  minutes_id      UUID REFERENCES public.minutes(id) ON DELETE SET NULL,
  published_by    UUID NOT NULL REFERENCES public.users(id),
  published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publications_org ON public.publications(organization_id);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL,   -- e.g. 'meeting_reminder', 'task_due', 'minutes_published'
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  link            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org    ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(table_name, record_id);

-- ─── updated_at trigger (reusable) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations  BEFORE UPDATE ON public.organizations  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_committees     BEFORE UPDATE ON public.committees     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_meetings       BEFORE UPDATE ON public.meetings       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_agenda_items   BEFORE UPDATE ON public.agenda_items   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_documents      BEFORE UPDATE ON public.documents      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_tasks          BEFORE UPDATE ON public.tasks          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_motions        BEFORE UPDATE ON public.motions        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_minutes        BEFORE UPDATE ON public.minutes        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_users          BEFORE UPDATE ON public.users          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
