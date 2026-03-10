# DevChat — Real-Time Developer Chat Platform

<div align="center">

**Real-time chat built for developers. Share code, get AI explanations, collaborate faster.**

**[🔥 View Live App](https://your-vercel-deployment-link-here.vercel.app)** | **[📚 Read Deployment Guide](./DEPLOYMENT.md)**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Express](https://img.shields.io/badge/Express-4.x-green?style=flat-square&logo=express)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-white?style=flat-square&logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?style=flat-square&logo=mongodb)

</div>

---

## Features

- 💬 **Real-time messaging** via WebSocket (Socket.io)
- 🖥️ **Code snippets** with Monaco Editor (VS Code engine), syntax highlighting, and line numbers
- ✨ **AI code explanation** — click "Explain this" on any code block for an inline GPT-4o-powered explanation
- 🏢 **Workspaces & Channels** — create teams, organize conversations by topic
- 🟢 **Presence indicators** — see who's online in real-time
- ⌨️ **Typing indicators** — "Shihab is typing..."
- 🔗 **Invite codes** — share a code to invite teammates
- 🌙 **Dark-mode first** — built for developers who live in the terminal

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 |
| Styling | Tailwind CSS 4 |
| Code Editor | Monaco Editor |
| Real-Time | Socket.io |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (email/password) |
| AI | OpenAI GPT-4o |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas free tier](https://www.mongodb.com/atlas))

### 1. Clone & Install

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

```bash
# Copy the example env file
cp server/.env.example server/.env

# Edit server/.env with your values:
# - MONGODB_URI (required)
# - JWT_SECRET (change for production)
# - OPENAI_API_KEY (optional, for AI explanations)
```

### 3. Run

```bash
# Terminal 1 — Start the backend
cd server && npm run dev

# Terminal 2 — Start the frontend
cd client && npm run dev
```

Open **http://localhost:3000** → Register → Start chatting!

## Project Structure

```
DevChat/
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/             # Pages (App Router)
│       ├── components/      # UI components
│       └── lib/             # API client, Socket.io
├── server/                  # Express backend
│   └── src/
│       ├── models/          # Mongoose schemas
│       ├── routes/          # REST API
│       ├── socket/          # Real-time handlers
│       └── middleware/      # JWT auth
└── README.md
```

## License

MIT
