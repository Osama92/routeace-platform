// Phase 9 - Lightweight in-memory rate limiter for sensitive AI/data
// edge functions. Keyed by (bucket, identifier). Per-instance only -
// good enough to stop accidental floods and naive abuse without
// requiring external infra. For multi-instance hard limits, layer a
// DB/Redis store later.

import { buildCors } from "./cors.ts";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
  bucket: string;       // logical name, e.g. "driver-scoring"
  identifier: string;   // user id, ip, etc.
  limit: number;        // max requests in window
  windowMs: number;     // window size in ms
  req?: Request;        // optional Request, used to build allowlisted CORS on 429
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  response?: Response;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const key = `${opts.bucket}:${opts.identifier}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    store.set(key, fresh);
    return { allowed: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    const response = new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        retry_after_seconds: retryAfter,
      }),
      {
        status: 429,
        headers: {
          ...buildCors(opts.req),
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(opts.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(existing.resetAt / 1000)),
        },
      },
    );
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, response };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Best-effort sweep to keep the map small. Call occasionally.
export function sweepExpired() {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

/* ------------------------------------------------------------------ *
 * Phase 13 - distributed (DB-backed) backstop.
 * Use after the in-memory check passes when you want a hard cap that
 * survives across edge-function instances/regions. Requires service-role
 * Supabase client (admin). Returns the same shape as `rateLimit()`.
 * Fails open on DB errors (logs and allows) so a transient DB hiccup
 * doesn't take down all AI traffic.
 * ------------------------------------------------------------------ */


export interface DbRateLimitOptions extends RateLimitOptions {
  // deno-lint-ignore no-explicit-any
  admin: any; // service-role supabase client
}

export async function rateLimitDb(
  opts: DbRateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const windowSec = Math.max(1, Math.round(opts.windowMs / 1000));
    const { data, error } = await opts.admin.rpc("bump_rate_limit", {
      p_bucket: opts.bucket,
      p_identifier: opts.identifier,
      p_window_seconds: windowSec,
    });
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Fail open - never block traffic on DB blips.
      return { allowed: true, remaining: opts.limit, resetAt: Date.now() + opts.windowMs };
    }
    const row = data[0] as { out_count: number; out_window_start: string };
    const count = Number(row.out_count) || 0;
    const windowStart = new Date(row.out_window_start).getTime();
    const resetAt = windowStart + opts.windowMs;
    if (count > opts.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      const response = new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after_seconds: retryAfter,
          scope: "global",
        }),
        {
          status: 429,
          headers: {
            ...buildCors(opts.req),
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(opts.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          },
        },
      );
      return { allowed: false, remaining: 0, resetAt, response };
    }
    return { allowed: true, remaining: Math.max(0, opts.limit - count), resetAt };
  } catch (_e) {
    return { allowed: true, remaining: opts.limit, resetAt: Date.now() + opts.windowMs };
  }
}
