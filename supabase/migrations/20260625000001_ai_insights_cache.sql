-- AI insights cache table
-- Stores generated AI responses keyed by (cache_key, org_scope) with a TTL.
-- Edge functions check this before calling Gemini, writing back on cache miss.

create table if not exists public.ai_insights_cache (
  id             uuid primary key default gen_random_uuid(),
  cache_key      text not null,          -- e.g. "weekly-insights", "predictive-kpis", "fmcg-executive"
  org_scope      text not null default 'platform',  -- "platform" for core, org_id for tenant-scoped
  payload        jsonb not null,
  model_used     text,
  generated_at   timestamptz not null default now(),
  expires_at     timestamptz not null
);

-- Unique on (cache_key, org_scope) — one live entry per key per scope
create unique index if not exists ai_insights_cache_key_scope
  on public.ai_insights_cache (cache_key, org_scope);

-- Fast lookup by expiry (for cleanup)
create index if not exists ai_insights_cache_expires
  on public.ai_insights_cache (expires_at);

-- RLS: service role only (edge functions use service role key)
alter table public.ai_insights_cache enable row level security;

-- No public access — edge functions bypass RLS via service role
create policy "service_role_only" on public.ai_insights_cache
  using (false);
