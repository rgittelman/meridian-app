# Meridian — Deploy Checklist

## Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- AI provider: Ollama (local) or OpenAI API key

## 1. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL from Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `anon` / `public` key from same page |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `service_role` key — never expose to client |
| `AI_PROVIDER` | Yes | `ollama` (default), `openai`, or `claude` |
| `OLLAMA_URL` | If Ollama | Default: `http://localhost:11434` |
| `OPENAI_API_KEY` | If OpenAI | From platform.openai.com |

## 2. Database Migrations

Run in order in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query):

```
1. supabase/schema.sql
2. supabase/migrations/001_memory_layer.sql
3. supabase/migrations/002_conversations.sql
4. supabase/migrations/003_life_os.sql
5. supabase/migrations/004_profile_hardening.sql
6. supabase/migrations/005_delete_cascade_hardening.sql
```

Each migration is idempotent — safe to re-run.

## 3. Supabase Auth

### Email/password (works by default)

No extra config needed.

### Google OAuth (optional)

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable and add your Google OAuth client ID + secret
3. Add redirect URL: `https://YOUR_DOMAIN/auth/callback`

### Apple OAuth (optional)

1. Supabase Dashboard → Authentication → Providers → Apple
2. Requires Apple Developer account
3. Add redirect URL: `https://YOUR_DOMAIN/auth/callback`

## 4. AI Provider Setup

### Ollama (default, local)

```bash
# Install: https://ollama.com
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### OpenAI

Set `AI_PROVIDER=openai` and `OPENAI_API_KEY=sk-...` in `.env.local`.

## 5. Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

Flow: `/signup` → email confirmation → `/auth/callback` → `/onboarding` → `/`

## 6. Production Deploy (Vercel)

```bash
# Push to GitHub, connect repo in Vercel
# Add all env vars from .env.example in Vercel → Settings → Environment Variables
# Deploy
```

Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set as public env vars.

## Verify

- [ ] Can sign up with email
- [ ] Can sign in with email
- [ ] Google OAuth works (if configured)
- [ ] Onboarding completes and sets `profiles.onboarding_complete = true`
- [ ] Chat works with chosen AI provider
- [ ] Memory ingest runs after chat messages
- [ ] Today page loads intelligence data
