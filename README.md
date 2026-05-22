# RouteAce — Distribution Intelligence Platform

RouteAce is a full-stack SaaS logistics platform built for African distribution operators. It covers real-time fleet tracking, intelligent dispatch, SLA enforcement, multi-vertical operating systems (FMCG, Liquor, Pharma, Auto, Agri, etc.), AI decision intelligence, and integrated finance (AR/AP, payroll, tax).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui (Radix UI) + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Realtime | Supabase Realtime (websockets) |
| Maps | Mapbox GL |
| Charts | Recharts |
| Email | React Email + Supabase Edge Functions |
| PWA | Service Worker + Web Push |

## Local Development

Prerequisites: Node.js 20+ and npm (or bun).

```sh
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start dev server (http://localhost:8080)
npm run dev
```

### Environment Variables

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

Never commit the `.env` file. The `.gitignore` already excludes it.

## Build

```sh
# Production build
npm run build

# Preview the production build locally
npm run preview
```

Output is in `dist/`. Deploy the contents of `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

## Supabase

All edge functions live in `supabase/functions/`. Database migrations live in `supabase/migrations/`.

```sh
# Deploy a single edge function
supabase functions deploy <function-name>

# Deploy all edge functions
supabase functions deploy

# Push pending migrations
supabase db push
```

### Required Supabase Secrets

Set these in the Supabase dashboard → Project Settings → Edge Functions → Secrets:

| Secret | Purpose |
|---|---|
| `WEBHOOK_SECRET` | HMAC secret for the `auth-email-hook` edge function |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for edge functions that write to the DB |
| `ALLOWED_ORIGIN` | CORS allowed origin (e.g. `https://routeace.app`) |

### Auth Email Hook

The `auth-email-hook` edge function handles all Supabase auth emails (signup confirmation, magic link, password recovery, etc.). It verifies incoming requests using HMAC-SHA256 with the `WEBHOOK_SECRET` secret and the `x-routeace-signature` / `x-routeace-timestamp` request headers.

After deploying the function, register it in Supabase → Authentication → Hooks → Send Email.

## Deployment

### Static Hosting (Netlify / Vercel / Cloudflare Pages)

1. Run `npm run build` — output is in `dist/`
2. Deploy `dist/` to your host of choice
3. Set environment variables in the host dashboard
4. Configure SPA fallback: all routes must serve `index.html` (e.g. `/* /index.html 200` in a Netlify `_redirects` file)

### Connecting the Lovable-Purchased Domain

The domain was purchased through Lovable but is fully portable. Steps:

1. Log in to your domain registrar (the DNS provider Lovable used — check your Lovable project settings or email receipt for the registrar name)
2. In your registrar's DNS management, update the records to point to your new host:
   - For Netlify: add a CNAME record pointing to `<your-netlify-site>.netlify.app`
   - For Vercel: add a CNAME record pointing to `cname.vercel-dns.com`
   - For Cloudflare Pages: follow Cloudflare's custom domain guide
3. In your new host dashboard, add the custom domain and complete ownership verification
4. SSL is issued automatically by the host (Let's Encrypt or Cloudflare)
5. Update `ALLOWED_ORIGIN` in Supabase secrets to match the new domain
6. Update `og:url` in `index.html` if the domain changes

See `CLAUDE.md` for detailed step-by-step instructions.

## Pre-deploy Gate

The GitHub Actions workflow in `.github/workflows/predeploy-gate.yml` runs a readiness check against Supabase before any merge to `main`. It requires two repository secrets:

- `SUPABASE_PROJECT_REF` — the Supabase project reference ID
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for CI

## Project Structure

```
src/
  assets/         Static images and videos
  components/     UI components organised by domain
  contexts/       React contexts (Auth, Workspace, I18n, etc.)
  hooks/          Custom React hooks (70+)
  integrations/   Supabase client setup
  lib/            Utilities and per-vertical permission maps
  pages/          Route-level page components (237 pages)
  utils/          Shared helper functions
supabase/
  functions/      Deno edge functions (97+)
  migrations/     PostgreSQL migration files
public/           Static public assets (favicon, manifest, sw.js)
```
