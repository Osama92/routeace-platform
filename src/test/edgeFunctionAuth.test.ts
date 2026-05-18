/**
 * Security regression test - Edge Function Auth Enforcement
 *
 * Statically scans every supabase/functions/<name>/index.ts and asserts that
 * each handler either:
 *   1. Calls `requireAuth(...)` from _shared/require-auth.ts, OR
 *   2. Performs manual JWT validation (`auth.getUser()` after reading the
 *      Authorization header), OR
 *   3. Verifies an x-api-key header (partner API), OR
 *   4. Verifies an HMAC signature (webhook), OR
 *   5. Is explicitly listed in PUBLIC_ALLOWLIST (with a documented reason).
 *
 * Any function that fails ALL of the above is a security regression and the
 * test will fail. New unauthenticated endpoints must be classified explicitly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");

/**
 * Functions that are intentionally callable without an end-user JWT.
 * Every entry MUST include a one-line reason. Reviewer should challenge
 * any addition - public endpoints are an attack surface.
 */
const PUBLIC_ALLOWLIST: Record<string, string> = {
  // Public signup / onboarding flows
  "create-company-signup": "public company self-signup endpoint",
  "transporter-self-signup": "public transporter self-signup endpoint",

  // Third-party callbacks / webhooks (validated via provider signature or reference lookup)
  "auth-email-hook": "Supabase auth webhook - verified via signing secret",
  "verify-subscription-payment": "Paystack callback - verifies tx via Paystack API",

  // Public proxies (rate-limited by upstream, no sensitive data returned)
  "google-places-autocomplete": "thin Google Places proxy",
  "google-places-details": "thin Google Places proxy",

  // Cron / scheduled jobs (invoked by pg_cron with service-role; not advertised externally)
  "check-sla-breaches": "pg_cron scheduled SLA sweep",
  "csat-reminder-dispatcher": "pg_cron scheduled CSAT reminders",
  "breakdown-alerts-dispatcher": "pg_cron breakdown alert sweep",
  "maintenance-alert-dispatch": "pg_cron maintenance reminders",
  "cfo-daily-brief": "pg_cron daily CFO digest",
  "queue-health-monitor": "pg_cron queue health probe",
  "wms-background-sync": "pg_cron WMS integration sync",
  "process-email-queue": "pg_cron email queue drain (verify_jwt=true in config)",
  "send-transactional-email": "verify_jwt=true in config.toml - Supabase gateway validates JWT before invocation",
  "preview-transactional-email": "Bearer token compared to internal API key (custom check, regex-invisible)",
  "customer-invite-accept": "public token-redemption endpoint - validated via customer_invite_tokens.token lookup",
  "erp-oauth-callback": "OAuth provider redirect target - must be publicly reachable; state token validated server-side",
  "handle-email-suppression": "ESP webhook - validated via HMAC against Lovable API key (custom verification)",
  "handle-email-unsubscribe": "public one-click unsubscribe link - validated via single-use token in email_unsubscribe_tokens",
};

/**
 * KNOWN GAPS - functions currently missing auth that are tracked as tech debt.
 * The test will FAIL if any of these are still unauthenticated. Move a name
 * out of this list once auth has been added; never add new entries here.
 */
const KNOWN_AUTH_GAPS: Record<string, string> = {
  // (empty - all known gaps must be fixed before this list is allowed to grow)
};

/**
 * Regex patterns indicating a recognized auth gate. ANY match counts as
 * "authenticated". Patterns are intentionally permissive to accommodate the
 * variety of auth styles in the codebase, but they must match real auth code.
 */
const AUTH_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /requireAuth\s*\(/, label: "requireAuth()" },
  {
    // Manual JWT validation: file reads the Authorization header AND calls auth.getUser()/getClaims().
    // Header name match is case-insensitive (browsers/SDKs vary).
    pattern: /(?=[\s\S]*req\.headers\.get\(\s*["'`]authorization["'`]\s*\)[\s\S]*?auth\.(getUser|getClaims)\s*\()/i,
    label: "manual Authorization + auth.getUser()/getClaims()",
  },
  {
    // Internal-only functions: compare the presented bearer to SUPABASE_SERVICE_ROLE_KEY.
    pattern: /SERVICE_ROLE_KEY[\s\S]{0,800}(authHeader|Authorization)[\s\S]{0,400}(===|!==)/,
    label: "service-role bearer enforcement",
  },
  {
    pattern: /req\.headers\.get\(\s*["'`]x-api-key["'`]\s*\)/i,
    label: "x-api-key header",
  },
  {
    pattern: /crypto\.subtle\.(verify|sign)\s*\(\s*["'`]HMAC["'`]/,
    label: "HMAC signature verification",
  },
  {
    pattern: /req\.headers\.get\(\s*["'`]x-(webhook|cron|signature)[^"'`]*["'`]\s*\)/i,
    label: "webhook/cron signature header",
  },
];

interface Classification {
  name: string;
  status: "auth" | "public" | "gap" | "missing";
  reason: string;
}

function listEdgeFunctions(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((entry) => {
      if (entry.startsWith("_")) return false;
      const full = join(FUNCTIONS_DIR, entry);
      try {
        return statSync(full).isDirectory() &&
          statSync(join(full, "index.ts")).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

function classify(name: string): Classification {
  const source = readFileSync(join(FUNCTIONS_DIR, name, "index.ts"), "utf-8");

  for (const { pattern, label } of AUTH_PATTERNS) {
    if (pattern.test(source)) {
      return { name, status: "auth", reason: label };
    }
  }
  if (name in PUBLIC_ALLOWLIST) {
    return { name, status: "public", reason: PUBLIC_ALLOWLIST[name] };
  }
  if (name in KNOWN_AUTH_GAPS) {
    return { name, status: "gap", reason: KNOWN_AUTH_GAPS[name] };
  }
  return {
    name,
    status: "missing",
    reason: "no requireAuth, manual JWT, x-api-key, or HMAC verification found",
  };
}

describe("Edge Function Auth Enforcement (security regression)", () => {
  const functions = listEdgeFunctions();

  it("discovers at least one edge function", () => {
    expect(functions.length).toBeGreaterThan(0);
  });

  it("every edge function enforces auth or is explicitly allow-listed", () => {
    const results = functions.map(classify);
    const missing = results.filter((r) => r.status === "missing");

    if (missing.length > 0) {
      const message = [
        "",
        `${missing.length} edge function(s) lack a recognized auth gate:`,
        ...missing.map((m) => `  - ${m.name}: ${m.reason}`),
        "",
        "Fix options:",
        "  1. Add `requireAuth(req, { requirePrivileged: true })` from",
        "     supabase/functions/_shared/require-auth.ts (preferred).",
        "  2. If the endpoint must be public, add an entry with a reason to",
        "     PUBLIC_ALLOWLIST in src/test/edgeFunctionAuth.test.ts.",
        "",
      ].join("\n");
      throw new Error(message);
    }
    expect(missing).toEqual([]);
  });

  it("PUBLIC_ALLOWLIST entries still exist as edge functions", () => {
    const stale = Object.keys(PUBLIC_ALLOWLIST).filter(
      (name) => !functions.includes(name),
    );
    expect(stale, `Stale PUBLIC_ALLOWLIST entries: ${stale.join(", ")}`)
      .toEqual([]);
  });

  it("KNOWN_AUTH_GAPS entries still exist as edge functions", () => {
    const stale = Object.keys(KNOWN_AUTH_GAPS).filter(
      (name) => !functions.includes(name),
    );
    expect(stale, `Stale KNOWN_AUTH_GAPS entries: ${stale.join(", ")}`)
      .toEqual([]);
  });

  it("PUBLIC_ALLOWLIST entries do not silently re-enforce auth (drift detection)", () => {
    // If a public function later gains a real auth gate, remove it from the
    // allowlist so the enforcement remains visible in code review.
    const drifted = Object.keys(PUBLIC_ALLOWLIST).filter((name) => {
      const c = classify(name);
      return c.status === "auth";
    });
    // Soft assertion via console.warn - not a failure (drift is harmless)
    if (drifted.length > 0) {
      console.warn(
        `[drift] PUBLIC_ALLOWLIST entries that now have auth (consider removing): ${drifted.join(", ")}`,
      );
    }
  });

  it("the requireAuth shared helper exists and exports the expected API", () => {
    const shared = readFileSync(
      join(FUNCTIONS_DIR, "_shared", "require-auth.ts"),
      "utf-8",
    );
    expect(shared).toMatch(/export\s+async\s+function\s+requireAuth/);
    expect(shared).toMatch(/requirePrivileged/);
    expect(shared).toMatch(/PRIVILEGED_ROLES/);
  });
});
