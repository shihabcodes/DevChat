<div align="center">

# DevChat : Real-Time Developer Chat

**Real-time chat built for developers. Share code with syntax highlighting, stream AI explanations in-line, collaborate without alt-tabbing to ChatGPT.**

[🚀 Live Demo](https://dev-chat-virid.vercel.app) · [📚 Deployment Guide](./DEPLOYMENT.md) · [🐛 Report a Bug](https://github.com/shihabcodes/DevChat/issues/new)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3ecf8e?logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-bring%20your%20own%20key-412991?logo=openai)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Features

- 💬 **Real-time messaging** with optimistic send, retry, and a reconnect banner
- ⌨️ **Typing indicators** and 🟢 **who's online** per workspace
- 🖥️ **Syntax-highlighted code** with Shiki, and a Monaco editor for writing snippets
- ✨ **AI explanations** streamed in-line. You bring your own OpenAI key, which is encrypted at rest and never sent back to the browser
- ⚡ **Shared AI cache**: once a snippet is explained, teammates see it instantly and for free
- 🏢 **Workspaces & channels**, joined with a rotatable invite code
- 🚀 **One-click demo**: a private guest workspace, no signup, deleted after 24 hours
- 📱 **Mobile-friendly** sidebar drawer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19, Tailwind CSS 4 |
| Database | Supabase Postgres with row level security on every table |
| Auth | Supabase Auth: email/password, anonymous guests, optional Google |
| Real-time | Supabase Realtime: message changes, broadcast (typing), presence (online) |
| AI | Next.js route handlers on Vercel calling OpenAI, streamed over SSE |
| Hosting | Vercel (app) + Supabase (database, auth, realtime), both on free tiers |

There is no separate backend server. The browser talks to Supabase directly, and the database decides what each user may read or write. The only server code is the two AI routes, which need secrets.

## Quick Start

### Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

### 1. Install

```bash
git clone https://github.com/shihabcodes/DevChat.git
cd DevChat/client && npm install
```

### 2. Set up the database

```bash
cd ..                       # repo root
supabase login
supabase link --project-ref <your-project-ref>
supabase db push            # applies supabase/migrations
```

In the Supabase dashboard, under **Authentication**:
- **Sign In / Providers**: turn on *Allow anonymous sign-ins* (used by the demo)
- **URL Configuration**: Site URL `http://localhost:3000`, and add your production URL to Redirect URLs

### 3. Configure environment

```bash
cp client/.env.example client/.env.local
```

Fill in `client/.env.local`:

| Variable | Where it comes from | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page, publishable key | No |
| `SUPABASE_SECRET_KEY` | Same page, **secret** key | **Yes** |
| `AI_KEY_ENCRYPTION_SECRET` | `openssl rand -base64 48` | **Yes** |
| `OPENAI_MODEL` | Optional, defaults to `gpt-4o-mini` | No |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional, enables Google sign-in | No |

### 4. Run

```bash
cd client && npm run dev    # → http://localhost:3000
```

Click **Try Demo** to land in a seeded guest workspace.

### 5. Verify the database rules

```bash
supabase db query --linked -f supabase/tests/rls_test.sql
```

Every returned row should have `pass = true`. The test creates throwaway users, tries 35 allowed and forbidden actions (outsiders reading messages, members promoting themselves, planting fake AI answers, and so on), then deletes everything it created.

## Project Structure

```
DevChat/
├── client/                      # Next.js app (deployed to Vercel)
│   └── src/
│       ├── app/                 # Pages: / and /workspace/[id]
│       │   └── api/ai/          # Server routes: key (BYOK) and explain (SSE)
│       ├── components/          # Sidebar, ChatArea, MessageBubble, CodeBlock, AISettings
│       └── lib/
│           ├── supabase.ts      # Browser client
│           ├── data.ts          # Data access (auth, workspaces, channels, messages)
│           ├── realtime.ts      # Live messages, typing, presence hooks
│           ├── ai.ts            # Browser helpers for the AI routes
│           └── server/          # Server-only: admin client, auth check, encryption
├── supabase/
│   ├── migrations/              # Schema, RLS policies, realtime auth, cron jobs
│   └── tests/rls_test.sql       # Allow/deny checks for every policy
├── DEPLOYMENT.md
└── README.md
```

## Security

- **Row level security everywhere.** Membership in a workspace is the single rule for seeing its channels, messages, members and AI explanations. It's enforced in Postgres, so a bug in the UI can't leak data.
- **Least privilege.** Anonymous visitors have no table access. Signed-in users can only update specific columns (for example, message content but not its channel or author). `TRUNCATE` is revoked.
- **Server-only writes where it matters.** AI explanations and stored API keys can only be written by the server, so nobody can plant a fake "AI" answer.
- **Invite codes** are visible only to workspace owners and admins, and can be rotated.
- **Abuse limits.** 10 messages per 10 seconds per user (enforced in the database), 30 AI explanations per hour, and Supabase's built-in per-IP limits on sign-ups and guest sign-ins.
- **Guest cleanup.** A `pg_cron` job deletes demo guests and everything they created after 24 hours.
- **API keys** are verified with OpenAI, encrypted with AES-256-GCM before storage, and never returned to the browser.
- **Content Security Policy** only allows network connections to the app itself, Supabase, and Google.

## License

MIT : see [LICENSE](./LICENSE).
