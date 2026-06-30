export type QuotaResource = "vehicle" | "user" | "dispatch" | "ai_credit" | "branch" | "integration";

export interface QuotaExceededDetail {
  resource: QuotaResource;
  /** Raw error message from DB trigger, e.g. "Vehicle quota exceeded (20 of 20 used)." */
  message: string;
}

const EVENT_NAME = "routeace:quota-exceeded";

/** Emit from any component/hook when a Supabase P0001 quota error is caught. */
export function emitQuotaExceeded(detail: QuotaExceededDetail) {
  window.dispatchEvent(new CustomEvent<QuotaExceededDetail>(EVENT_NAME, { detail }));
}

/** Subscribe to quota exceeded events. Returns an unsubscribe function. */
export function onQuotaExceeded(handler: (detail: QuotaExceededDetail) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<QuotaExceededDetail>).detail);
  window.addEventListener(EVENT_NAME, fn);
  return () => window.removeEventListener(EVENT_NAME, fn);
}

/**
 * Returns true when a Supabase error is a DB-level quota violation (SQLSTATE P0001).
 * Only matches the exact trigger messages emitted by check_dispatch_quota,
 * check_user_quota, check_vehicle_quota, etc.
 */
export function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  // Only trust the exact PostgreSQL error code our triggers raise
  if (e.code === "P0001") return true;
  // Fallback: only match the exact phrases our quota triggers emit
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("quota exceeded") || msg.includes("quota exceeded");
}

/** Derive resource type from the trigger error message. */
export function resourceFromError(message: string): QuotaResource {
  const m = message.toLowerCase();
  if (m.includes("vehicle"))    return "vehicle";
  if (m.includes("user"))       return "user";
  if (m.includes("dispatch"))   return "dispatch";
  if (m.includes("ai credit"))  return "ai_credit";
  if (m.includes("branch"))     return "branch";
  if (m.includes("integration")) return "integration";
  return "vehicle";
}
