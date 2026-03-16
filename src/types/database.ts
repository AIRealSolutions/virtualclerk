export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VisibilityLevel = "private" | "internal" | "public";
export type MeetingStatus =
  | "draft"
  | "agenda_finalized"
  | "meeting_complete"
  | "minutes_published";
export type TaskStatus = "open" | "in_progress" | "complete" | "overdue";
export type UserRole =
  | "platform_admin"
  | "org_admin"
  | "clerk"
  | "board_member"
  | "committee_member"
  | "staff"
  | "public_user";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id">>;
      };
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "updated_at">;
        Update: Partial<Omit<UserProfile, "id">>;
      };
      organization_users: {
        Row: OrganizationUser;
        Insert: Omit<OrganizationUser, "id" | "created_at">;
        Update: Partial<Omit<OrganizationUser, "id">>;
      };
      committees: {
        Row: Committee;
        Insert: Omit<Committee, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Committee, "id">>;
      };
      committee_members: {
        Row: CommitteeMember;
        Insert: Omit<CommitteeMember, "id" | "created_at">;
        Update: Partial<Omit<CommitteeMember, "id">>;
      };
      meetings: {
        Row: Meeting;
        Insert: Omit<Meeting, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Meeting, "id">>;
      };
      agenda_items: {
        Row: AgendaItem;
        Insert: Omit<AgendaItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AgendaItem, "id">>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Document, "id">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id">>;
      };
      motions: {
        Row: Motion;
        Insert: Omit<Motion, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Motion, "id">>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, "id" | "created_at">;
        Update: Partial<Omit<Vote, "id">>;
      };
      minutes: {
        Row: Minutes;
        Insert: Omit<Minutes, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Minutes, "id">>;
      };
      publications: {
        Row: Publication;
        Insert: Omit<Publication, "id" | "created_at">;
        Update: Partial<Omit<Publication, "id">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      visibility_level: VisibilityLevel;
      meeting_status: MeetingStatus;
      task_status: TaskStatus;
      user_role: UserRole;
    };
  };
}

// ─── Entity Types ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  org_type: "government" | "nonprofit" | "committee" | "business" | "personal";
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // matches auth.users.id
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Committee {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  meeting_schedule: string | null;
  is_active: boolean;
  visibility_level: VisibilityLevel;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  role: "chair" | "vice_chair" | "member" | "alternate";
  organization_id: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  organization_id: string;
  committee_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  status: MeetingStatus;
  visibility_level: VisibilityLevel;
  meeting_link: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  id: string;
  meeting_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category:
    | "call_to_order"
    | "roll_call"
    | "approval_of_minutes"
    | "old_business"
    | "new_business"
    | "public_comment"
    | "reports"
    | "announcements"
    | "adjournment"
    | "other";
  order_index: number;
  duration_minutes: number | null;
  ai_summary: string | null;
  presenter: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  folder_path: string | null;
  tags: string[];
  version: number;
  visibility_level: VisibilityLevel;
  meeting_id: string | null;
  agenda_item_id: string | null;
  ai_summary: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  status: TaskStatus;
  meeting_id: string | null;
  agenda_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Motion {
  id: string;
  organization_id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  motion_text: string;
  proposed_by: string;
  seconded_by: string | null;
  result: "passed" | "failed" | "tabled" | "withdrawn" | "pending";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  motion_id: string;
  organization_id: string;
  voter_id: string;
  vote: "yes" | "no" | "abstain";
  created_at: string;
}

export interface Minutes {
  id: string;
  organization_id: string;
  meeting_id: string;
  content: string;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  ai_generated: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Publication {
  id: string;
  organization_id: string;
  meeting_id: string | null;
  document_id: string | null;
  minutes_id: string | null;
  published_by: string;
  published_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  created_at: string;
}
