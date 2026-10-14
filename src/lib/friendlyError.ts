/**
 * Translates raw Postgres / Supabase / network errors into short, user-facing
 * messages. The original technical message is returned separately so it can be
 * logged or shown in the developer console / CoreDeveloper area.
 *
 * Usage:
 *   const { friendly, technical } = friendlyError(err);
 *   toast({ title: "Couldn't save", description: friendly, variant: "destructive" });
 *   console.error("[dev]", technical);
 */

interface FriendlyErrorResult {
  friendly: string;   // shown to end users
  technical: string;  // logged / shown in CoreDeveloper area
}

// Ordered from most-specific to least-specific.
// Each entry: [pattern to match in the raw message, user-friendly text]
const ERROR_MAP: [RegExp, string][] = [
  // ── Constraint violations ────────────────────────────────────────────────
  [/check constraint.*vehicle_mileage/i,          "Delivery recorded but the mileage log could not be updated. An admin has been notified."],
  [/check constraint/i,                           "One of the values you entered isn't valid. Please check your input and try again."],
  [/unique.*constraint|duplicate key/i,           "A record with those details already exists. Please check for duplicates."],
  [/foreign key.*constraint|violates foreign/i,   "This record is linked to something that no longer exists. Please refresh and try again."],
  [/not.null.*constraint|null value.*column/i,    "A required field is missing. Please fill in all required details."],

  // ── Auth & permission errors ─────────────────────────────────────────────
  [/jwt expired|token.*expired/i,                 "Your session has expired. Please sign in again."],
  [/invalid.*jwt|jwt.*invalid/i,                  "Authentication failed. Please sign out and sign back in."],
  [/permission denied|insufficient.*privilege/i,  "You don't have permission to do this. Contact your administrator."],
  [/row.level security|rls/i,                     "Access denied. You may not have permission to view or edit this record."],
  [/new row violates.*policy/i,                   "You don't have permission to create this record."],

  // ── Network / connectivity ───────────────────────────────────────────────
  [/failed to fetch|network.*error|fetch.*failed/i, "Connection issue. Please check your internet and try again."],
  [/timeout|timed out/i,                          "The request took too long. Please try again in a moment."],

  // ── Supabase / Postgres operational ─────────────────────────────────────
  [/relation.*does not exist/i,                   "A system configuration error occurred. Please contact support."],
  [/column.*does not exist/i,                     "A system configuration error occurred. Please contact support."],
  [/function.*does not exist/i,                   "A feature isn't available yet. Please contact support."],
  [/deadlock detected/i,                          "The system was busy processing another request. Please try again."],
  [/too many connections/i,                       "The system is under high load. Please try again in a moment."],
  [/storage.*error|bucket.*not found/i,           "File storage error. Please try again or contact support."],

  // ── Edge function / server ───────────────────────────────────────────────
  [/edge function.*error|function.*returned.*error/i, "A background process failed. Please try again or contact support."],
  [/rate limit|too many requests/i,               "Too many requests. Please wait a moment and try again."],
  [/service.*unavailable|503/i,                   "Service temporarily unavailable. Please try again shortly."],

  // ── Invoice / finance domain ─────────────────────────────────────────────
  [/invoice.*locked|locked.*invoice/i,            "This invoice is locked and cannot be edited."],
  [/invoice.*paid/i,                              "Paid invoices cannot be modified."],

  // ── Dispatch domain ──────────────────────────────────────────────────────
  [/dispatch.*already.*delivered|already.*delivered/i, "This dispatch has already been marked as delivered."],
  [/sla.*breach|breach.*sla/i,                   "An SLA breach was detected during this update."],

  // ── Pre-trip / safety gate (check_vehicle_trip_gate) ─────────────────────
  // These RAISE EXCEPTION with their own already-specific message (which
  // names the vehicle), so the pattern here only needs to NOT swallow it —
  // match-and-pass-through, not replace with a generic string, unlike every
  // other entry in this map. Previously these fell straight to FALLBACK,
  // discarding an actionable reason ("FST590YL needs a pre-trip check...")
  // in favour of "Something went wrong" — confirmed live in platform_errors
  // for a real org blocked on exactly this.
  [/needs a pre-trip check/i,                    "__PASSTHROUGH__"],
  [/failed a safety-critical check/i,             "__PASSTHROUGH__"],
  [/outstanding post-trip check/i,                "__PASSTHROUGH__"],
];

const FALLBACK = "Something went wrong. Please try again or contact support if the problem persists.";

export function friendlyError(err: unknown): FriendlyErrorResult {
  const technical =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as any).message)
        : String(err);

  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(technical)) {
      // Sentinel for entries whose own raw message IS already the right
      // thing to show a user (e.g. the pre-trip gate's own specific,
      // vehicle-named message) — pass it through as-is instead of
      // replacing it with a generic string, which is what every other
      // entry in ERROR_MAP does.
      return { friendly: friendly === "__PASSTHROUGH__" ? technical : friendly, technical };
    }
  }

  return { friendly: FALLBACK, technical };
}

/**
 * Convenience: returns just the friendly string.
 * Use when you don't need the technical message separately.
 */
export function toFriendlyError(err: unknown): string {
  return friendlyError(err).friendly;
}
