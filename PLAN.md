# VirtualClerk.ai — Product Roadmap

> AI-powered clerk and workflow assistant SaaS for local governments, nonprofits, committees, and boards.

---

## Vision

Automate the administrative work of a clerk — meetings, agendas, minutes, motions, votes, documents, tasks, and public records — so organizations can focus on governing, not paperwork.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| AI | OpenAI Responses API (gpt-4o) |
| Calendar | Google Calendar API (OAuth 2.0) |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

---

## Module Roadmap

### ✅ Phase 1 — Core Platform (Complete)

| Module | Status |
|---|---|
| Landing page | ✅ |
| User registration (`/register`) | ✅ |
| Auth / login | ✅ |
| Onboarding — create workspace | ✅ |
| Dashboard with stats | ✅ |
| Org-scoped layout + middleware | ✅ |
| Public portal (`/public/[org]`) | ✅ |

### ✅ Phase 2 — Meetings & Agendas (Complete)

| Module | Status |
|---|---|
| Meetings list (grouped by month) | ✅ |
| Schedule a meeting (create form) | ✅ |
| Meeting detail (agenda, docs, motions, minutes) | ✅ |
| Add agenda item | ✅ |
| AI minutes generation | ✅ |
| AI action item extraction | ✅ |
| Meeting reminders (Vercel cron) | ✅ |

### ✅ Phase 3 — Committees (Complete)

| Module | Status |
|---|---|
| Committee list | ✅ |
| Create committee | ✅ |
| Committee detail + member list | ✅ |
| Add member to committee | ✅ |
| Eligible member picker (excludes existing) | ✅ |

### ✅ Phase 4 — Tasks (Complete)

| Module | Status |
|---|---|
| Task board (grouped by status) | ✅ |
| Create task (title, desc, assignee, due date, priority) | ✅ |
| Task detail + inline edit | ✅ |
| Status toggle (open / in_progress / complete / overdue) | ✅ |
| Delete task | ✅ |

### ✅ Phase 5 — Calendar (Complete)

| Module | Status |
|---|---|
| Calendar month view (meetings + tasks) | ✅ |
| Upcoming this month list | ✅ |
| Google Calendar OAuth connect/disconnect | ✅ |
| Sync meetings to Google Calendar | ✅ |
| Per-org Google OAuth credentials | ✅ |

### ✅ Phase 6 — Settings & API Keys (Complete)

| Module | Status |
|---|---|
| Org settings page | ✅ |
| Timezone preference | ✅ |
| Per-org OpenAI API key | ✅ |
| Per-org Google Calendar client ID/secret | ✅ |
| Masked key display + safe upsert | ✅ |

### 🔲 Phase 7 — Documents (In Progress)

| Module | Status |
|---|---|
| Document library (searchable list) | ✅ |
| Document upload UI (Supabase Storage) | 🔲 |
| AI document summarization | ✅ |
| Document versioning | 🔲 |
| Folder/tag management | 🔲 |

### 🔲 Phase 8 — Motions & Votes

| Module | Status |
|---|---|
| Record a motion | 🔲 |
| Vote recording UI (yes/no/abstain per member) | 🔲 |
| Motion/vote display on meeting detail | 🔲 |
| Vote tally and result | 🔲 |

### 🔲 Phase 9 — Minutes Approval Workflow

| Module | Status |
|---|---|
| Draft minutes from AI | ✅ |
| Edit minutes in-app | 🔲 |
| Minutes approval workflow (submit → review → approve) | 🔲 |
| Publish approved minutes to public portal | 🔲 |

### 🔲 Phase 10 — User Management

| Module | Status |
|---|---|
| Invite users to organization | 🔲 |
| Role management (org_admin / clerk / board_member) | 🔲 |
| User profile page | 🔲 |
| Remove/deactivate member | 🔲 |

### 🔲 Phase 11 — Notifications & Email

| Module | Status |
|---|---|
| Email notifications (Resend) | 🔲 |
| Meeting reminder emails | 🔲 |
| Task assignment notifications | 🔲 |
| Minutes approval request emails | 🔲 |

### 🔲 Phase 12 — Billing

| Module | Status |
|---|---|
| Stripe integration | 🔲 |
| Plan tiers (Free / Pro / Enterprise) | 🔲 |
| Usage limits by plan | 🔲 |
| Billing portal | 🔲 |

### 🔲 Phase 13 — AI: RAG Document Q&A

| Module | Status |
|---|---|
| Document embedding (OpenAI embeddings) | 🔲 |
| Vector search (pgvector in Supabase) | 🔲 |
| Ask questions about your documents | 🔲 |
| Answer with source citations | 🔲 |

---

## Database Tables

| Table | Purpose |
|---|---|
| `organizations` | Multi-tenant org records |
| `users` | User profiles |
| `organization_users` | Org membership + roles |
| `organization_settings` | Per-org API keys, timezone |
| `committees` | Committees and working groups |
| `committee_members` | Committee roster with roles |
| `meetings` | Meeting records |
| `agenda_items` | Agenda line items per meeting |
| `documents` | Document library |
| `document_versions` | Version history |
| `tasks` | Action items with priority |
| `motions` | Recorded motions |
| `votes` | Vote records per motion |
| `minutes` | Meeting minutes (AI or manual) |
| `publications` | Published public records |
| `notifications` | In-app notifications |
| `audit_logs` | Change history |
| `google_calendar_connections` | Per-org Google Calendar tokens |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `OPENAI_API_KEY` | Platform OpenAI key (fallback) |
| `GOOGLE_CLIENT_ID` | Platform Google OAuth client ID (fallback) |
| `GOOGLE_CLIENT_SECRET` | Platform Google OAuth client secret (fallback) |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. https://virtualclerk.ai) |
