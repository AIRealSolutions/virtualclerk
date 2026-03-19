# VirtualClerk.ai — Build Progress

Last updated: 2026-03-19

---

## Deployed

- **Repo:** https://github.com/AIRealSolutions/virtualclerk
- **Live:** https://virtualclerk.ai
- **Host:** Vercel (auto-deploys on push to `master`)
- **DB:** Supabase (PostgreSQL + Auth + RLS)

---

## Completed Sessions

### Session 1 — Scaffold & Deploy
- Created full Next.js 14 project from scratch (no Node.js on local machine — all files written manually)
- Set up TailwindCSS with civic color palette (`civic-blue`, `civic-teal`, `civic-navy`, `civic-slate`)
- Supabase client/server/middleware setup with SSR and new key name support
- Auth middleware protecting org-scoped and dashboard routes
- Landing page, login, onboarding, dashboard
- All core pages: meetings list/detail, committees, documents, tasks, public portal
- AI routes: generate-minutes, summarize-document, extract-action-items
- Vercel cron: meeting reminders
- Full PostgreSQL schema (16 tables) + RLS policies
- Resolved: package issues, build errors, ESLint config, Supabase key naming, RLS violations, OpenAI lazy init

### Session 2 — Meetings & Agenda Items
- Meeting creation form (`/[org]/meetings/new`) + `POST /api/meetings`
- Agenda item creation form (`/[org]/meetings/[id]/agenda/new`) + `POST /api/meetings/[id]/agenda`
- Auto-increments `order_index`; links back to meeting detail

### Session 3 — Committees
- Committee list already existed; built out full CRUD:
  - Create committee form + `POST /api/committees`
  - Committee detail page with member list + role badges
  - Add member form + `POST /api/committees/[id]/members`
  - `GET /api/committees/[id]/members/eligible` (excludes existing members)

### Session 4 — Registration & Onboarding Fix
- Created `/register` page (full name, email, password, confirm password)
- Handles instant-session and email-confirm flows
- Fixed landing page CTAs to point to `/register` instead of `/login`

### Session 5 — Tasks & Calendar
- Full task CRUD:
  - Task board (`/[org]/tasks`) — kanban-style by status
  - Create task form with title, description, assignee (org members), due date, priority
  - Task detail page with inline edit, one-click status toggle, delete
  - `POST /api/tasks`, `PATCH/DELETE /api/tasks/[id]`
- Shared `GET /api/org-members` endpoint
- Calendar month view (`/[org]/calendar`):
  - Interactive month grid (client component, navigate months)
  - Meetings in blue, tasks in amber/red by priority
  - Upcoming this month list
- Google Calendar integration:
  - OAuth connect/disconnect (per org)
  - Sync all upcoming meetings as Google Calendar events (create or update, idempotent)
  - Token refresh on expiry
- Calendar added to sidebar

### Session 6 — Settings & Per-Org API Keys
- Org settings page (`/[org]/settings`):
  - Timezone selector
  - OpenAI API key (masked, safe upsert, clear option)
  - Google Calendar client ID + secret (masked)
  - Admin/clerk only; read-only for other roles
- `GET/POST /api/settings` — masked display, never overwrites with blank
- `src/lib/org-settings.ts` — shared helpers to resolve org vs platform keys
- All AI routes now use org OpenAI key when set, falling back to `OPENAI_API_KEY`
- Google Calendar routes use org client ID/secret when set, falling back to platform keys

---

## SQL Migrations to Run

Run these in order in the Supabase SQL Editor if not already applied:

| File | Purpose | Applied? |
|---|---|---|
| `supabase/schema.sql` | Full schema (16 tables, enums, indexes, triggers) | ✅ |
| `supabase/rls.sql` | All RLS policies + helper functions | ✅ |
| `supabase/migrations/calendar_and_tasks.sql` | `priority` column on tasks + `google_calendar_connections` table | 🔲 |
| `supabase/migrations/organization_settings.sql` | `organization_settings` table | 🔲 |

---

## Up Next (Priority Order)

1. **Document upload** — Supabase Storage UI, drag-and-drop, file type validation
2. **Invite users** — email invite flow, role assignment, accept invite page
3. **Motion & vote recording** — record motions on agenda items, capture votes per member
4. **Minutes edit & approval** — edit AI draft in-app, submit for approval, publish to portal
5. **Email notifications** — Resend integration for reminders, assignments, approvals
6. **Stripe billing** — plan tiers, usage limits, billing portal

---

## Known Issues / Technical Debt

- Many ESLint warnings (`no-explicit-any`, `no-unused-vars`) — non-blocking, cleanup pending
- `next@14.2.16` has a flagged security vulnerability — upgrade to latest patch when ready
- Supabase joined relations (`users(...)`) return arrays; cast with `unknown` intermediate type
- No email confirmation skip configured — new users see "check email" screen unless Supabase email confirm is disabled
- Google Calendar sync uses `America/New_York` hardcoded timezone — should use org timezone setting
- Document upload UI not yet built — documents page shows library only
