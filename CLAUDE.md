# VirtualClerk.ai — Claude Code Instructions

> AI-powered clerk and workflow assistant SaaS for local governments, nonprofits, committees, and boards.

- **Repo:** https://github.com/AIRealSolutions/virtualclerk
- **Live:** https://virtualclerk.ai
- **Host:** Vercel (auto-deploys on push to `master`)
- **DB:** Supabase (PostgreSQL + Auth + RLS)
- **Plan & Progress:** See `agent/PLAN.md` and `agent/PROGRESS.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| AI | OpenAI Responses API (gpt-4o) |
| Calendar | Google Calendar API (OAuth 2.0) |
| Hosting | Vercel |

---

## Architecture Rules

### Next.js App Router
- All routes use async params: `params: Promise<{ org: string; id: string }>` — always `await params`
- Server components fetch data directly via Supabase server client
- Client components (`"use client"`) use `fetch()` against API routes
- API routes live in `src/app/api/`

### Supabase Client Pattern
- **Auth verification:** Use `createClient()` from `@/lib/supabase/server` (cookie-based session)
- **Writes that bypass RLS:** Use `createServiceClient()` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`
- **Joined relations return arrays**, not single objects — always cast with:
  ```typescript
  const raw = row.users as unknown as UserType[] | UserType | null;
  const user = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  ```

### Auth & Permissions
- Org-scoped routes are protected by middleware at `src/middleware.ts`
- API routes verify session via cookie client, then check `organization_users` role
- Allowed roles for admin actions: `["org_admin", "clerk", "board_member"]`
- Public routes (RSVP page, public portal) use service client with no session check

### Per-Org API Keys
- Use `src/lib/org-settings.ts` helpers — never read `organization_settings` directly in routes:
  ```typescript
  import { getOrgSettings, resolveOpenAIKey, resolveGoogleClientId, resolveGoogleClientSecret } from "@/lib/org-settings";
  ```
- Keys fall back to platform env vars if org hasn't set their own

---

## Color Palette (Tailwind)

| Token | Use |
|---|---|
| `civic-blue` | Primary buttons, links, accents |
| `civic-teal` | AI badges, secondary accents |
| `civic-navy` | Headings, dark text |
| `civic-slate` | Page backgrounds |

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
| `meeting_invitations` | RSVP invitations with token auth |
| `publications` | Published public records |
| `notifications` | In-app notifications |
| `audit_logs` | Change history |
| `google_calendar_connections` | Per-org Google Calendar tokens |

---

## Key Patterns

### API Route Template
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... validate, check membership, write with db()
}
```

### Form Page Template (Client)
```typescript
"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
// fetch on submit → redirect on success
```

### Zod Validation
Always validate API request bodies with Zod before processing:
```typescript
import { z } from "zod";
const schema = z.object({ ... });
const parsed = schema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
```

---

## Known Issues / Technical Debt

- Many ESLint warnings (`no-explicit-any`, `no-unused-vars`) — non-blocking, cleanup pending
- `next@14.2.16` has a flagged security vulnerability — upgrade when stable
- Google Calendar sync uses hardcoded `America/New_York` timezone — should use org timezone setting
- No email notifications yet (Resend not integrated)
- Document upload UI not built — documents page shows library only
