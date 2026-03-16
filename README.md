# VirtualClerk.ai

AI-powered clerk and workflow assistant for local governments, nonprofits, committees, and boards.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI:** OpenAI Responses API (gpt-4o)
- **Hosting:** Vercel

---

## Getting Started

### 1. Prerequisites

Install [Node.js 18+](https://nodejs.org) and [npm](https://npmjs.com).

### 2. Install dependencies

```bash
cd virtualclerk
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql` — creates all tables, indexes, and triggers
3. Then run `supabase/rls.sql` — applies all Row Level Security policies
4. In **Storage**, create a bucket called `documents` (set to private)

### 4. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
CRON_SECRET=a-random-secret-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/                      # Auth
│   ├── dashboard/                  # Authenticated dashboard
│   ├── [org]/                      # Org-scoped workspace
│   │   ├── meetings/               # Meeting list + detail
│   │   ├── committees/             # Committee management
│   │   ├── documents/              # Document library
│   │   ├── tasks/                  # Action items
│   │   └── settings/               # Org settings
│   ├── public/[org]/               # Public transparency portal
│   └── api/
│       ├── ai/generate-minutes/    # AI minutes generation
│       ├── ai/summarize-document/  # AI document summary
│       ├── ai/extract-action-items/# AI task extraction
│       └── cron/meeting-reminders/ # Vercel cron
├── components/
│   ├── layout/                     # Sidebar, Header
│   ├── meetings/                   # Agenda cards, buttons
│   └── documents/                  # Search
├── lib/
│   ├── supabase/                   # client, server, middleware
│   └── utils.ts
└── types/
    └── database.ts                 # Full TypeScript types
```

---

## AI Features

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Minutes Generator | `POST /api/ai/generate-minutes` | Drafts meeting minutes from agenda + motions |
| Document Summary | `POST /api/ai/summarize-document` | Summarizes uploaded documents |
| Action Item Extractor | `POST /api/ai/extract-action-items` | Extracts tasks from meeting notes |

All use **OpenAI Responses API** with `gpt-4o`.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

The cron job (`/api/cron/meeting-reminders`) runs daily at 8am UTC — add `CRON_SECRET` to Vercel env.

---

## User Roles & Permissions

| Role | Permissions |
|------|------------|
| Platform Admin | Full access across all orgs |
| Org Admin | Manage org, users, all content |
| Clerk | Manage meetings, agendas, minutes, documents |
| Board Member | View all, vote on motions |
| Committee Member | View committee content, vote |
| Staff | View and upload documents, create tasks |
| Public User | View public portal only |

---

## Public Portal

Each organization has a public-facing portal at:

```
/public/{organizationSlug}
```

Shows: upcoming public meetings, approved minutes, public documents.

No login required.

---

## Next Steps (V2)

- [ ] Onboarding flow (create org, invite users)
- [ ] Document upload with Supabase Storage
- [ ] Meeting form (create/edit)
- [ ] Agenda drag-and-drop reordering
- [ ] Motion and vote recording UI
- [ ] Minutes approval workflow
- [ ] Email notifications (Resend/SendGrid)
- [ ] Document Q&A (RAG with embeddings)
- [ ] Mobile responsive polish
- [ ] Stripe billing for SaaS tiers
