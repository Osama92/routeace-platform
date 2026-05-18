# RouteAce — Developer Reference (CLAUDE.md)

This file is the single source of truth for how this codebase is structured, what decisions were made and why, and how to extend or deploy it. Update this file whenever a significant architectural decision is made or a major feature is added.

---

## Project Identity

| Key | Value |
|---|---|
| Product Name | RouteAce |
| Full Name | RouteAce Distribution Intelligence Platform |
| Operator | Glyde Systems |
| Production Domain | routeaceglyde.app |
| Supabase Project ID | dfvxwhcifycqqxmxiwjy |
| Supabase URL | https://dfvxwhcifycqqxmxiwjy.supabase.co |

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
VITE_SUPABASE_URL=https://dfvxwhcifycqqxmxiwjy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=dfvxwhcifycqqxmxiwjy
```

### Supabase Edge Function Secrets (set in Supabase dashboard)

```
WEBHOOK_SECRET          HMAC secret for auth-email-hook (replaces old LOVABLE_API_KEY)
SUPABASE_SERVICE_ROLE_KEY  Service role key
SUPABASE_URL            Internal — auto-injected by Supabase runtime
ALLOWED_ORIGIN          CORS origin, e.g. https://routeaceglyde.app
```

### GitHub Actions Secrets (repo settings)

```
SUPABASE_PROJECT_REF      dfvxwhcifycqqxmxiwjy
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
3. Set the hook URL to: `https://dfvxwhcifycqqxmxiwjy.supabase.co/functions/v1/auth-email-hook`
4. Set the signing secret to the same value as `WEBHOOK_SECRET` in your Supabase secrets

**Note:** The old `LOVABLE_API_KEY` env var is no longer used. Rename it to `WEBHOOK_SECRET` in Supabase secrets. The signature headers changed from `x-lovable-signature`/`x-lovable-timestamp` to `x-routeace-signature`/`x-routeace-timestamp`. If you have an existing Lovable-configured hook, you must re-configure it in Supabase to use the new header names and secret name.

---

## PWA / Service Worker

`src/lib/pwa.ts` manages service worker registration. It is only active in production (`import.meta.env.PROD === true`) and will refuse to register inside an iframe (prevents issues in embedded previews).

The service worker file itself is `public/sw.js`. Web push uses VAPID keys fetched from the `register-push-subscription` edge function.

---

## Connecting the Lovable-Purchased Domain

The domain `routeaceglyde.app` was originally purchased through Lovable. It is fully portable — you own the domain and can point it at any host. Below are step-by-step instructions for each deployment target.

### Step 1 — Identify your DNS registrar

Lovable purchases domains via a registrar on your behalf. Check your email inbox for a domain registration confirmation. The registrar is usually **Porkbun** or **Cloudflare**. Log in to that registrar with your Lovable account email.

Alternatively, look up the registrar:
```
whois routeaceglyde.app
```

### Step 2 — Build the project

```sh
npm run build
# Output is in dist/
```

### Step 3A — Deploy to Netlify (recommended for simplicity)

1. Go to https://app.netlify.com → New site → Deploy manually
2. Drag and drop the `dist/` folder
3. Add environment variables in Site Settings → Environment Variables
4. Go to Site Settings → Domain Management → Add custom domain → enter `routeaceglyde.app`
5. Netlify will show you the DNS records to set:
   - CNAME `www` → `<your-netlify-site>.netlify.app`
   - A record `@` → Netlify's IP (shown in the UI)
6. In your registrar, update the DNS records as shown
7. SSL will provision automatically within minutes
8. Add `_redirects` file in `public/` for SPA routing:
   ```
   /* /index.html 200
   ```

### Step 3B — Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Pages
2. Connect your Git repo OR upload `dist/` directly
3. Set build command: `npm run build`, output directory: `dist`
4. Add environment variables
5. Go to the Pages project → Custom domains → Add domain → `routeaceglyde.app`
6. If your domain's nameservers are already Cloudflare, the domain auto-connects
7. If not, update your registrar's nameservers to Cloudflare's (shown in the Cloudflare UI)

### Step 3C — Deploy to Vercel

1. `npm i -g vercel && vercel --prod`
2. In Vercel dashboard → Domains → Add `routeaceglyde.app`
3. Set DNS CNAME record: `@` → `cname.vercel-dns.com`
4. Add `vercel.json` in the project root for SPA routing:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

### Step 4 — Update Supabase CORS

After DNS propagates (usually 5–30 minutes):
1. Supabase Dashboard → Project Settings → API → Allowed Origins
2. Ensure `https://routeaceglyde.app` and `https://www.routeaceglyde.app` are listed
3. Update `ALLOWED_ORIGIN` secret in Edge Functions secrets

### Step 5 — Update Supabase Auth Redirect URLs

1. Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to `https://routeaceglyde.app`
3. Add to **Redirect URLs**: `https://routeaceglyde.app/**`

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
