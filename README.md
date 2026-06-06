<div align="center">

# DevChat — Real-Time Developer Chat

**Real-time chat built for developers. Share code with syntax highlighting, stream AI explanations in-line, collaborate faster — without alt-tabbing to ChatGPT.**

[🚀 Live Demo](https://dev-chat-virid.vercel.app) · [📚 Deployment Guide](./DEPLOYMENT.md) · [🐛 Report a Bug](https://github.com/shihabcodes/DevChat/issues/new)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Express](https://img.shields.io/badge/Express-4.x-green?logo=express)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-white?logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?logo=mongodb)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Features

- 💬 **Real-time messaging** via WebSockets (Socket.io)
- 🖥️ **Syntax-highlighted code** with **Shiki** (the same engine that powers VS Code's docs), 20+ languages
- ✨ **AI explanations** — click "Explain" on any code block, get a **streamed** GPT-4o response (you bring your own OpenAI key, encrypted at rest)
- 🏢 **Workspaces & Channels** — create teams, organize conversations by topic
- 🟢 **Presence indicators** — see who's online in real-time
- ⌠ **Typing indicators** — "Alice is typing..."
- 🔗 **Invite codes** — share a code to invite teammates
- 🔒 **Google OAuth** + email/password
- 🚀 **Try-the-demo mode** — no signup, full workspace pre-seeded with code samples
- 🌙 **Dark-mode first** — built for developers who live in the terminal

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS 4 + custom design tokens |
| Code highlighting | Shiki (lazy-loaded, client-side) |
| Real-time | Socket.io 4.x |
| Backend | Node.js + Express 4 |
| Database | MongoDB 8.x + Mongoose |
| Auth | JWT (email/password) + Google OAuth |
| AI | OpenAI GPT-4o-mini, **streaming** via SSE |
| Security | Helmet, Zod input validation, AES-256-GCM at-rest encryption for user OpenAI keys, per-route authorization, rate limiting |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local install or [Atlas free tier](https://www.mongodb.com/atlas))

### 1. Clone & install

```bash
git clone https://github.com/shihabcodes/DevChat.git
cd DevChat

# Server
cd server && npm install

# Client (new terminal)
cd ../client && npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env — set MONGODB_URI and a real JWT_SECRET (>= 32 chars)

# Client
cp client/.env.example client/.env.local
# Edit client/.env.local — leave NEXT_PUBLIC_API_URL pointing at the local backend
```

### 3. Run

```bash
# Terminal 1 — backend
cd server && npm run dev
# → http://localhost:5001

# Terminal 2 — frontend
cd client && npm run dev
# → http://localhost:3000
```

Visit **http://localhost:3000** → click **🚀 Try the demo** to land in a fully seeded workspace in 2 seconds.

## Project Structure

```
DevChat/
├── client/                  # Next.js frontend (App Router)
│   └── src/
│       ├── app/             # Pages: / and /workspace/[id]
│       ├── components/      # UI: Sidebar, ChatArea, MessageBubble, CodeBlock, AISettings
│       └── lib/             # api client, socket client, Shiki highlighter
├── server/                  # Express backend
│   └── src/
│       ├── config/          # env, db, logger
│       ├── models/          # Mongoose schemas: User, Workspace, Channel, Message
│       ├── routes/          # REST API: auth, workspaces, channels, messages, ai, keys, demo
│       ├── socket/          # Socket.io handlers with membership checks
│       ├── middleware/      # auth, authorization, validation, rate limiting
│       └── utils/           # AES-256-GCM crypto helper
├── DEPLOYMENT.md            # Production deploy walkthrough
└── README.md
```

## API Highlights

All routes (except `/api/auth/*`, `/api/demo`, `/api/health`) require a JWT in the `Authorization: Bearer <token>` header.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Email + password signup |
| `POST` | `/api/auth/login` | Email + password login |
| `POST` | `/api/auth/google` | Google OAuth ID token sign-in |
| `GET` | `/api/auth/me` | Current user + workspaces + hasOpenaiKey |
| `POST` | `/api/demo` | Create an ephemeral demo workspace (auto-expires) |
| `GET` `/POST` | `/api/workspaces` | List / create workspaces |
| `GET` | `/api/workspaces/:id` | Get a workspace (membership-checked) |
| `POST` | `/api/workspaces/join` | Join via invite code |
| `GET` `/POST` `/PATCH` `/DELETE` | `/api/channels[/...]` | Channel CRUD, membership-checked |
| `GET` | `/api/messages/channel/:id` | List messages (membership-checked) |
| `POST` | `/api/ai/explain` | Streamed AI explanation (SSE) |
| `GET` `POST` `DELETE` | `/api/keys` | Manage user's OpenAI key |
| `POST` | `/api/keys/test` | Verify the stored key against OpenAI |
| `GET` | `/api/health` | Health + Mongo status |

## Security

DevChat is built with the assumption that a hostile user is poking at every endpoint. Highlights:

- **Helmet** security headers (CSP disabled in dev for DX, on in prod)
- **CORS** allowlist from `ALLOWED_ORIGINS` env
- **Request body size** capped at 64 KB
- **Zod** input validation on every route + socket payload
- **JWT_SECRET** runtime check: server refuses to boot in production with a placeholder secret
- **Per-route authorization middleware** — no IDOR, no implicit cross-tenant access
- **Per-route + global rate limiting** (express-rate-limit)
- **Disposable email blocklist** on signup
- **OpenAI keys** encrypted at rest with AES-256-GCM (random IV per write, auth tag verified on read)
- **Socket.io** membership checks on `joinChannel` and `sendMessage`
- **Graceful shutdown** on SIGTERM (drain sockets, close server, disconnect Mongo)
- **Structured logging** with request IDs (Pino-style in prod, single-line in dev)

## AI Streaming

`POST /api/ai/explain` returns Server-Sent Events. Each `delta` event carries one chunk of the streamed response. The final `done` event carries the full explanation, which the server also persists to `Message.aiExplanation` so the same request is free the second time.

```js
const stream = api.explainCodeStream({ messageId, code, language, onDelta });
const { text } = await stream.result;
```

## Why this project exists

Developers context-switch to ChatGPT to ask about code shared in chat. DevChat embeds the AI in the chat so the switch goes away. The bet is that the chat is where the code is, so the AI should be there too.

## License

MIT — see [LICENSE](./LICENSE).
