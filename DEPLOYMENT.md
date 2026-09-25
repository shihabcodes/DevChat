# Deploying DevChat

DevChat runs on two free services:

- **Supabase**: Postgres, auth, realtime, and a cron job for guest cleanup
- **Vercel**: the Next.js app, including the two AI API routes

There is no other server to host.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. From the repo root, apply the schema:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. Check the policies:
   ```bash
   supabase db query --linked -f supabase/tests/rls_test.sql
   ```
   Every row should have `pass = true`.
4. In the dashboard, under **Authentication**:
   - **Sign In / Providers**: enable *Allow anonymous sign-ins*.
   - **URL Configuration**: set the Site URL to your production URL, and add `https://<your-app>.vercel.app/**` to Redirect URLs. Email confirmation links use these.
5. **Google sign-in (optional).** The "Continue with Google" button appears automatically once the provider is enabled:
   1. In [Google Cloud Console](https://console.cloud.google.com), open **Google Auth Platform**. Configure branding (app name, support email) and set the audience to **External**, then publish the app. The basic `openid`, `email` and `profile` scopes don't need Google verification.
   2. Under **Clients**, create an OAuth client of type **Web application**:
      - Authorized JavaScript origins: your production URL and `http://localhost:3000`
      - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   3. In Supabase → **Authentication → Sign In / Providers → Google**, enable it and paste the Client ID and Client Secret.
6. Optional but recommended before real users sign up: under **Authentication → Emails → SMTP Settings**, connect an email provider such as Resend. The built-in sender only allows a few emails per hour.

### Keeping a free project awake

Free Supabase projects pause after 7 days without database activity. Any real use keeps it awake. If the demo may sit idle, schedule something that queries the database every few days, such as a GitHub Actions cron job.

## 2. Vercel

1. Import the GitHub repo in Vercel and set **Root Directory** to `client`. Vercel detects Next.js automatically.
2. Under **Settings → Environment Variables**, add these for both **Production** and **Preview**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). Mark it **Sensitive** |
   | `AI_KEY_ENCRYPTION_SECRET` | Same value as in your `.env.local`. Mark it **Sensitive** |
   | `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini` |

   `AI_KEY_ENCRYPTION_SECRET` must stay the same across deploys. If it changes, stored OpenAI keys can't be decrypted, and users have to re-enter them.

3. Deploy. Pushing to `main` deploys to production, and other branches get preview URLs.

## 3. Smoke test after deploying

1. Open the site and click **Try Demo**. You should land in a workspace with three seeded messages.
2. Open the same workspace in a second window and send a message. It should appear in the first window live.
3. Click **Explain Code**. Without a key, the AI Settings dialog opens. With a key, the explanation streams in.
4. `GET /api/ai/key` without a token should return `401`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails with "Missing NEXT_PUBLIC_SUPABASE_URL…" | Environment variables aren't set for that environment (Production or Preview) |
| "Try Demo" errors with "Anonymous sign-ins are disabled" | Enable anonymous sign-ins in Supabase Auth |
| Banner says "Live updates are offline" | Realtime blocked by a network/proxy, or the Supabase project is paused |
| AI routes return 500 | `SUPABASE_SECRET_KEY` or `AI_KEY_ENCRYPTION_SECRET` missing in Vercel |
| Confirmation email link goes to localhost | Supabase Site URL still points at localhost |
