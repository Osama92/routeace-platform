/**
 * Shared AI response cache backed by ai_insights_cache table.
 *
 * TTLs (configurable per caller):
 *   weekly-insights   6 hours   — platform-level, slow-moving
 *   predictive-kpis   6 hours   — same
 *   fmcg-*            2 hours   — tenant-scoped, more dynamic
 *   ai-decision       1 hour    — context-dependent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface CacheEntry {
  payload: Record<string, unknown>;
  generatedAt: string;
  fromCache: boolean;
  model_used?: string;
}

/**
 * Try to read a valid (non-expired) cache entry.
 * Returns null on miss or error.
 */
export async function getCached(
  supabase: SupabaseClient,
  cacheKey: string,
  orgScope = "platform",
): Promise<CacheEntry | null> {
  const { data, error } = await supabase
    .from("ai_insights_cache")
    .select("payload, generated_at, model_used, expires_at")
    .eq("cache_key", cacheKey)
    .eq("org_scope", orgScope)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  return {
    payload: data.payload as Record<string, unknown>,
    generatedAt: data.generated_at,
    fromCache: true,
    model_used: data.model_used ?? undefined,
  };
}

/**
 * Write a cache entry, upserting on (cache_key, org_scope).
 * ttlHours defaults to 6.
 */
export async function setCached(
  supabase: SupabaseClient,
  cacheKey: string,
  payload: Record<string, unknown>,
  opts: { orgScope?: string; ttlHours?: number; model?: string } = {},
): Promise<void> {
  const orgScope = opts.orgScope ?? "platform";
  const ttlMs = (opts.ttlHours ?? 6) * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  await supabase.from("ai_insights_cache").upsert(
    {
      cache_key: cacheKey,
      org_scope: orgScope,
      payload,
      model_used: opts.model ?? null,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "cache_key,org_scope" },
  );
}
