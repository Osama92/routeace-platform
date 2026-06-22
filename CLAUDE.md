# RouteAce — Developer Reference (CLAUDE.md)

This file is the single source of truth for how this codebase is structured, what decisions were made and why, and how to extend or deploy it. Update this file whenever a significant architectural decision is made or a major feature is added.

---

## Project Identity

| Key | Value |
|---|---|
| Product Name | RouteAce |
| Full Name | RouteAce Distribution Intelligence Platform |
| Operator | Glyde Systems |
| Production Domain | routeace.app |
| Supabase Project ID | mbybrzggrpyhvcnxhlua |
| Supabase URL | https://mbybrzggrpyhvcnxhlua.supabase.co |

---

## Architecture Overview

```
Browser (React SPA)
    │
    ├── Supabase Auth        — JWT-based authentication, RBAC via custom claims
    ├── Supabase Realtime    — Websocket subscriptions for live dispatch/tracking
    ├── Supabase Database    — PostgreSQL with RLS on every table
    └── Supabase Edge Funcs  — Deno-based serverless (97+ functions)
```

The frontend is a **pure SPA** (no SSR). Every route is protected by `<ProtectedRoute>` which reads the user's role from the Supabase JWT custom claims. The backend is entirely Supabase — there is no separate Node.js/Express server.

---

## Key Directories

| Path | What lives here |
|---|---|
| `src/pages/` | 237 route-level page components |
| `src/components/` | 358 domain-scoped UI components |
| `src/hooks/` | 70+ custom hooks — data fetching, permissions, domain logic |
| `src/lib/` | Per-vertical RBAC permission maps + utility functions |
| `src/contexts/` | Auth, Workspace, I18n, Dispatch, Sidebar, Region |
| `src/integrations/supabase/` | Supabase client singleton |
| `supabase/functions/` | Deno edge functions |
| `supabase/migrations/` | SQL migration files (applied in order) |
| `public/` | Static assets — favicon, manifest.json, sw.js, og-image.png |
| `src/assets/` | Imported assets — brand logos, landing images/videos |

---

## Environment Variables

### Frontend (Vite — must be prefixed `VITE_`)

```
VITE_SUPABASE_URL=https://mbybrzggrpyhvcnxhlua.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=mbybrzggrpyhvcnxhlua
```

### Supabase Edge Function Secrets (set in Supabase dashboard)

```
WEBHOOK_SECRET          HMAC secret for auth-email-hook (replaces old LOVABLE_API_KEY)
SUPABASE_SERVICE_ROLE_KEY  Service role key
SUPABASE_URL            Internal — auto-injected by Supabase runtime
ALLOWED_ORIGIN          CORS origin, e.g. https://routeace.app
```

### GitHub Actions Secrets (repo settings)

```
SUPABASE_PROJECT_REF      mbybrzggrpyhvcnxhlua
SUPABASE_SERVICE_ROLE_KEY  service role key (CI-only)
```

---

## Role-Based Access Control (RBAC)

Roles are stored as custom claims in the Supabase JWT. Route guards live in `src/App.tsx`:

| Guard Component | Protects |
|---|---|
| `ProtectedRoute` | All authenticated routes (checks role list) |
| `CoreProtectedRoute` | Internal core system routes only |
| `OSIsolationGuard` | Vertical OS routes (FMCG, Liquor, Pharma, etc.) |
| `DeptRouteGuard` | Department-scoped routes |
| `IndustryRoleGuard` | Industry vertical RBAC |

Role constants in `src/App.tsx`:

```typescript
ADMIN_ROLES            ["admin", "super_admin"]
ORG_MANAGEMENT_ROLES   ["admin", "super_admin", "org_admin"]
OPERATIONS_ROLES       [..., "ops_manager", "dispatcher"]
FINANCE_ROLES          [..., "finance_manager"]
SUPPORT_ROLES          [..., "support"]
```

Per-vertical permission maps live in `src/lib/` — e.g. `liquorPermissions.ts`, `pharmaPermissions.ts`, `agriPermissions.ts`.

---

## Auth Email Hook

**Function path:** `supabase/functions/auth-email-hook/index.ts`

Handles all Supabase auth transactional emails. It uses native Deno `crypto.subtle` for HMAC-SHA256 webhook verification — no external signing library.

**How it is triggered:**
1. A user triggers a Supabase auth event (signup, magic link, password recovery, invite, email change, reauthentication)
2. Supabase calls the edge function via HTTP with the event payload
3. The function verifies the `x-routeace-signature` and `x-routeace-timestamp` headers using `WEBHOOK_SECRET`
4. It renders the appropriate React Email template
5. It enqueues the email via `supabase.rpc('enqueue_email')` for delivery by `process-email-queue`

**Webhook signature format:**
```
x-routeace-timestamp: <unix-ms>
x-routeace-signature: HMAC_SHA256(WEBHOOK_SECRET, "<timestamp>.<raw-body>") as hex
```

**To register/re-register the hook in Supabase:**
1. Deploy the function: `supabase functions deploy auth-email-hook`
2. In Supabase Dashboard → Authentication → Hooks → "Send Email"
3. Set the hook URL to: `https://mbybrzggrpyhvcnxhlua.supabase.co/functions/v1/auth-email-hook`
4. Set the signing secret to the same value as `WEBHOOK_SECRET` in your Supabase secrets

**Note:** The old `LOVABLE_API_KEY` env var is no longer used. Rename it to `WEBHOOK_SECRET` in Supabase secrets. The signature headers changed from `x-lovable-signature`/`x-lovable-timestamp` to `x-routeace-signature`/`x-routeace-timestamp`. If you have an existing Lovable-configured hook, you must re-configure it in Supabase to use the new header names and secret name.

---

## PWA / Service Worker

`src/lib/pwa.ts` manages service worker registration. It is only active in production (`import.meta.env.PROD === true`) and will refuse to register inside an iframe (prevents issues in embedded previews).

The service worker file itself is `public/sw.js`. Web push uses VAPID keys fetched from the `register-push-subscription` edge function.

---

## Deployment — Cloudflare Pages

**Active host:** Cloudflare Pages (`routeace-platform` project).  
Netlify has been removed. `netlify.toml` is deleted; `wrangler.toml` is the deploy config.

CI/CD deploys automatically on push:
- `master` → production (`routeace.app`) via `.github/workflows/deploy-production.yml`
- `develop` → staging preview via `.github/workflows/deploy-develop.yml`

### GitHub Actions secrets required

Add these in your GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Cloudflare Pages: Edit** permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (Cloudflare dashboard → right sidebar) |
| `VITE_SUPABASE_PUBLISHABLE_KEY_PROD` | Supabase anon/publishable key for production project |
| `VITE_SUPABASE_PUBLISHABLE_KEY_DEV` | Supabase anon/publishable key for dev/staging project |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps + Places API key |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token (for migration pushes) |
| `SUPABASE_DB_PASSWORD_PROD` | DB password for production Supabase project |
| `SUPABASE_DB_PASSWORD_DEV` | DB password for dev/staging Supabase project |

### First-time Cloudflare Pages setup (one-off)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages
2. Connect this GitHub repo, select branch `master`
3. Set build command: `npm run build`, output directory: `dist`
4. Project name: `routeace-platform` (must match `wrangler.toml` and the workflow `--project-name` flag)
5. Add environment variables (Production environment):
   - `VITE_SUPABASE_URL` = `https://mbybrzggrpyhvcnxhlua.supabase.co`
   - `VITE_SUPABASE_PROJECT_ID` = `mbybrzggrpyhvcnxhlua`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon key
6. Go to the project → Custom domains → Add → `routeace.app`
   - If `routeace.app` nameservers are already on Cloudflare, it connects automatically
   - Otherwise point your registrar's NS records to Cloudflare

### SPA routing

`wrangler.toml` sets `not_found_handling = "single-page-application"` — all 404s serve `index.html`. No `_redirects` file needed.

### Update Supabase CORS + Auth (after DNS change)

1. Supabase Dashboard → Project Settings → API → Allowed Origins: ensure `https://routeace.app` and `https://www.routeace.app`
2. Update `ALLOWED_ORIGIN` secret in Supabase Edge Function secrets
3. Supabase Dashboard → Authentication → URL Configuration → Site URL: `https://routeace.app`, Redirect URLs: `https://routeace.app/**`

---

## Pre-deploy Gate

GitHub Actions workflow: `.github/workflows/predeploy-gate.yml`

Blocks merges to `main` when:
- `run_predeploy_readiness_check()` RPC returns `deployment_blocked = true`
- Latest tenant-isolation tests have failures
- Latest RLS smoke tests have failures
- DLQ growth in 24 h > 10 messages

Requires secrets: `SUPABASE_PROJECT_REF` + `SUPABASE_SERVICE_ROLE_KEY`

---

## Vertical Operating Systems

The platform has 10+ industry-specific vertical OS modules. Each vertical has:
- Its own dashboard pages in `src/pages/`
- Its own RBAC permission map in `src/lib/`
- An isolation guard in `src/App.tsx`

| Vertical | Route prefix | Permission file |
|---|---|---|
| FMCG | `/fmcg-*` | `agriPermissions.ts` (shared) |
| Liquor | `/liquor-*` | `liquorPermissions.ts` |
| Pharma | `/pharma-*` | `pharmaPermissions.ts` |
| Auto | `/auto-*` | `autoPermissions.ts` |
| Building Materials | `/building-*` | — |
| Agriculture | `/agri-*` | `agriPermissions.ts` |
| Cosmetics | `/cosmetics-*` | — |
| BFSI | `/bfsi-*` | `bfsiPermissions.ts` |

---

## Dependency Notes

- **lovable-tagger** — removed. Was a Lovable dev-only plugin that tagged components for their visual editor. No runtime impact.
- **xlsx** — loaded from SheetJS CDN tarball. If offline builds are needed, download the tarball and check it in.
- **mapbox-gl** — requires a Mapbox public token. Set `VITE_MAPBOX_TOKEN` if Mapbox features are enabled.

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-18 | Migrated from Lovable to Claude Code development. Removed lovable-tagger, @lovable.dev/email-js, @lovable.dev/webhooks-js. Replaced with native Deno crypto. Updated CORS headers, env var names, and OG metadata. |
