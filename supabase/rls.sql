-- ============================================================
-- VirtualClerk.ai — Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

-- ─── Helper Functions ────────────────────────────────────────────────────────

-- Check if the current user is a member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the current user's role within an organization
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_users
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = TRUE;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if the current user has at least a certain role
CREATE OR REPLACE FUNCTION public.is_org_role_at_least(org_id UUID, min_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
  role_order INT;
  user_role_order INT;
  v_role user_role;
BEGIN
  v_role := public.get_org_role(org_id);
  -- Higher number = more access
  role_order := CASE min_role
    WHEN 'platform_admin'    THEN 6
    WHEN 'org_admin'         THEN 5
    WHEN 'clerk'             THEN 4
    WHEN 'board_member'      THEN 3
    WHEN 'committee_member'  THEN 2
    WHEN 'staff'             THEN 1
    WHEN 'public_user'       THEN 0
    ELSE 0
  END;
  user_role_order := CASE v_role
    WHEN 'platform_admin'    THEN 6
    WHEN 'org_admin'         THEN 5
    WHEN 'clerk'             THEN 4
    WHEN 'board_member'      THEN 3
    WHEN 'committee_member'  THEN 2
    WHEN 'staff'             THEN 1
    WHEN 'public_user'       THEN 0
    ELSE -1
  END;
  RETURN user_role_order >= role_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- Allow org members to see each other's profiles
CREATE POLICY "Org members can view member profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou1
      JOIN public.organization_users ou2
        ON ou1.organization_id = ou2.organization_id
      WHERE ou1.user_id = auth.uid()
        AND ou2.user_id = public.users.id
        AND ou1.is_active = TRUE
    )
  );

-- ─── Organizations ────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Org admins can update their org"
  ON public.organizations FOR UPDATE
  USING (public.is_org_role_at_least(id, 'org_admin'));

CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Organization Users ───────────────────────────────────────────────────────

CREATE POLICY "Org members can view memberships"
  ON public.organization_users FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage memberships"
  ON public.organization_users FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'org_admin'));

CREATE POLICY "Org admins can update memberships"
  ON public.organization_users FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'org_admin'));

CREATE POLICY "Org admins can remove memberships"
  ON public.organization_users FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'org_admin'));

-- ─── Committees ───────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view committees"
  ON public.committees FOR SELECT
  USING (public.is_org_member(organization_id));

-- Public committees are visible without auth
CREATE POLICY "Public committees visible to all"
  ON public.committees FOR SELECT
  USING (visibility_level = 'public');

CREATE POLICY "Clerks and above can create committees"
  ON public.committees FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can update committees"
  ON public.committees FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Org admins can delete committees"
  ON public.committees FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'org_admin'));

-- ─── Committee Members ────────────────────────────────────────────────────────

CREATE POLICY "Org members can view committee members"
  ON public.committee_members FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Clerks and above can manage committee members"
  ON public.committee_members FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can remove committee members"
  ON public.committee_members FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Meetings ─────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view internal/private meetings"
  ON public.meetings FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Public meetings visible to all"
  ON public.meetings FOR SELECT
  USING (visibility_level = 'public');

CREATE POLICY "Clerks and above can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can update meetings"
  ON public.meetings FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Org admins can delete meetings"
  ON public.meetings FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'org_admin'));

-- ─── Agenda Items ─────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view agenda items"
  ON public.agenda_items FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Public agenda items visible to all"
  ON public.agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = agenda_items.meeting_id
        AND m.visibility_level = 'public'
    )
  );

CREATE POLICY "Clerks and above can manage agenda items"
  ON public.agenda_items FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can update agenda items"
  ON public.agenda_items FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can delete agenda items"
  ON public.agenda_items FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Documents ────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view internal documents"
  ON public.documents FOR SELECT
  USING (
    public.is_org_member(organization_id)
    AND visibility_level IN ('internal', 'public')
  );

CREATE POLICY "Document owners can view private documents"
  ON public.documents FOR SELECT
  USING (
    visibility_level = 'private'
    AND created_by = auth.uid()
  );

CREATE POLICY "Public documents visible to all"
  ON public.documents FOR SELECT
  USING (visibility_level = 'public');

CREATE POLICY "Staff and above can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'staff'));

CREATE POLICY "Document owners and clerks can update documents"
  ON public.documents FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_org_role_at_least(organization_id, 'clerk')
  );

CREATE POLICY "Clerks and above can delete documents"
  ON public.documents FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Document Versions ────────────────────────────────────────────────────────

CREATE POLICY "Same as document access for versions"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (
          d.visibility_level = 'public'
          OR (public.is_org_member(d.organization_id) AND d.visibility_level != 'private')
          OR d.created_by = auth.uid()
        )
    )
  );

-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Staff and above can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'staff'));

CREATE POLICY "Task assignees and clerks can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_org_role_at_least(organization_id, 'clerk')
  );

CREATE POLICY "Clerks and above can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Motions ─────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view motions"
  ON public.motions FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Public motions visible to all"
  ON public.motions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = motions.meeting_id AND m.visibility_level = 'public'
    )
  );

CREATE POLICY "Clerks and above can create motions"
  ON public.motions FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can update motions"
  ON public.motions FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Votes ────────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view votes"
  ON public.votes FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Board/committee members can vote"
  ON public.votes FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND (
      public.is_org_role_at_least(organization_id, 'board_member')
      OR public.is_org_role_at_least(organization_id, 'committee_member')
    )
  );

-- ─── Minutes ─────────────────────────────────────────────────────────────────

CREATE POLICY "Org members can view minutes"
  ON public.minutes FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Public approved minutes visible to all"
  ON public.minutes FOR SELECT
  USING (
    is_approved = TRUE
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minutes.meeting_id AND m.visibility_level = 'public'
    )
  );

CREATE POLICY "Clerks and above can create minutes"
  ON public.minutes FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

CREATE POLICY "Clerks and above can update minutes"
  ON public.minutes FOR UPDATE
  USING (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Publications ─────────────────────────────────────────────────────────────

CREATE POLICY "Anyone can view publications"
  ON public.publications FOR SELECT
  USING (TRUE);

CREATE POLICY "Clerks and above can publish"
  ON public.publications FOR INSERT
  WITH CHECK (public.is_org_role_at_least(organization_id, 'clerk'));

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

CREATE POLICY "Org admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_org_role_at_least(organization_id, 'org_admin'));

-- Service role only for inserts (never from the client)
