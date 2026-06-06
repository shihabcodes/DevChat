# DevChat Deployment Guide

This guide walks you through a production deploy of DevChat on **Vercel** (frontend) and **Railway** (backend) with **MongoDB Atlas** (database). Total time: ~15 minutes.

## 0. Prerequisites

- A GitHub account with the `shihabcodes/DevChat` repo
- A Vercel account (free tier works): https://vercel.com
- A Railway account (free $5/mo trial, then usage-based): https://railway.app
- A MongoDB Atlas account (free M0 cluster): https://www.mongodb.com/atlas
- An OpenAI account (only if you want to test AI features with your own key): https://platform.openai.com
- A Google Cloud project (only if you want Google sign-in): https://console.cloud.google.com

## 1. MongoDB Atlas

1. Create a free M0 cluster.
2. **Database Access** → Add a username + strong password. Note both.
3. **Network Access** → Add `0.0.0.0/0` (allow from anywhere) for now, or restrict to Railway's egress IPs once you know them.
4. **Database** → Connect → Drivers → Copy the connection string. It looks like:
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/devchat?retryWrites=true&w=majority`
5. URL-encode any special characters in the password.

## 2. Generate secrets

Run these locally:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # OPENAI_KEY_ENCRYPTION_SECRET
```

Save both — you'll paste them into Railway.

## 3. Deploy the backend to Railway

1. Go to https://railway.app/new → **Deploy from GitHub repo** → pick `shihabcodes/DevChat`.
2. **Set the Root Directory to `server`** (Settings → Source → Root Directory). This is required — the Node project lives in `server/`, not at the repo root. The repo also ships a root-level `nixpacks.toml` as a fallback, but setting the Root Directory in the UI is the official path and avoids edge cases.
3. Railway auto-detects Node and uses the `Procfile` / `railway.json` in `server/`. No Dockerfile needed.
4. In the **Variables** tab, set:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<from step 2>
   OPENAI_KEY_ENCRYPTION_SECRET=<from step 2>
   ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app
   CLIENT_URL=https://<your-vercel-domain>.vercel.app
   GOOGLE_CLIENT_ID=<from step 5 below, can leave blank for now>
   DEMO_TTL_HOURS=2
   ```
   > `PORT` is set automatically by Railway — don't override it.
5. Deploy. Watch the logs — you should see `[info] DevChat server listening on :<port> (env=production)`.
6. Click the generated Railway domain (something like `devchat-production.up.railway.app`). Visit `https://<railway-domain>/api/health` — you should get:
   ```json
   {"status":"ok","mongo":1,"timestamp":"...","uptime":...}
   ```

## 4. Deploy the frontend to Vercel

1. Go to https://vercel.com/new → import the same `shihabcodes/DevChat` repo.
2. Set the **Root Directory** to `client`.
3. Framework preset: **Next.js** (auto-detected).
4. In **Environment Variables**, set:
   ```
   NEXT_PUBLIC_API_URL=https://<railway-domain>.up.railway.app/api
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from step 5>
   ```
5. Deploy. Visit your Vercel URL. The landing page should render with the **Try the demo** button.

## 5. (Optional) Google OAuth

1. https://console.cloud.google.com/apis/credentials → Create OAuth client → **Web application**.
2. Authorized JavaScript origins:
   - `http://localhost:3000` (for local dev)
   - `https://<your-vercel-domain>.vercel.app`
3. Copy the Client ID. Paste it into both:
   - Railway: `GOOGLE_CLIENT_ID`
   - Vercel: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
4. Redeploy both.

## 6. Smoke test the live app

1. Open the Vercel URL in an incognito window.
2. Click **🚀 Try the demo (no signup)**. You should land in a workspace with 2 pre-baked code snippets.
3. Click **✨ Explain** on either snippet — you'll see a "no key" message pointing to AI Settings. (The cached explanation also renders immediately because it's pre-baked.)
4. Click **⚡ Add OpenAI key** in the sidebar. Paste your `sk-...` key. Click **Test**. If it works, click **Add key**.
5. Now click **✨ Explain** on a fresh code snippet (send one in code mode). Watch the AI response stream in.
6. To create a real account: sign out → **Create Account**. Verify the welcome bot seed lands in `#general`.

## 7. Backups and monitoring (recommended)

- **MongoDB Atlas**: Database → … → Schedule Snapshots. Free tier supports daily snapshots.
- **Uptime monitor**: Sign up at https://betterstack.com/uptime (free tier) and point it at `https://<railway-domain>/api/health`. Get alerted on downtime.
- **Error tracking**: Optional but recommended. Sign up at https://sentry.io (free tier), create a Node + Next.js project, set `SENTRY_DSN` env vars on Railway and Vercel. (Not wired in by default yet — see TODO in code.)

## 8. Local development

```bash
# Server
cd server
cp .env.example .env   # edit values
npm install
npm run dev            # http://localhost:5001

# Client (separate terminal)
cd client
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

## Troubleshooting

- **`Railpack could not determine how to build the app` / `Script start.sh not found`** → you forgot to set Root Directory to `server` in step 3.2. Go to the service → Settings → Source → Root Directory = `server`, then redeploy. The repo also includes a root-level `nixpacks.toml` as a fallback that should make this work even without the UI setting, but the UI is the supported path.
- **`/api/health` returns `mongo: 0`** → check `MONGODB_URI` and Atlas network access.
- **CORS errors in browser** → ensure `ALLOWED_ORIGINS` on Railway includes the Vercel URL **without trailing slash**.
- **"JWT_SECRET looks like a placeholder"** → you didn't replace the default. Generate a real one.
- **Google sign-in says "idtoken audience mismatch"** → the `GOOGLE_CLIENT_ID` in Railway and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel must match exactly, and the Google Cloud console's Authorized JS Origins must include both URLs.
- **AI explain returns "OpenAI key rejected"** → the user's pasted key is invalid or has no credits.

## Costs (steady state, ~100 daily active users)

- Railway: ~$5/mo (Hobby plan covers it)
- Vercel: $0 (Hobby plan)
- MongoDB Atlas: $0 (M0 free tier; upgrade to M10 at scale, ~$10/mo)
- OpenAI: $0 to you — users bring their own keys
- **Total: ~$5/mo**

## Future improvements (not yet implemented)

- Sentry integration on both client and server
- TypeScript migration
- E2E test suite (Playwright)
- Mobile-responsive layout pass
- Per-workspace API key (BYO key) and shared keys for teams
