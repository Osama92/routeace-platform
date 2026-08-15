/**
 * On-Time Delivery — the single source of truth for scoring a delivery.
 *
 * WHY THIS EXISTS
 *
 * The same on-time test was copy-pasted across 14 call sites in 11 files:
 *
 *     d.actual_delivery && d.scheduled_delivery &&
 *     new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
 *
 * `scheduled_delivery` is NULL on every dispatch in production and nothing in
 * the codebase writes it, so that condition was always false and every screen
 * reporting OTD showed 0% — Operations, Analytics, KPI, Dashboard, the vendor
 * scorecards and the driver reports alike. Fixing one screen left the other
 * thirteen wrong, which is exactly what happened. Any new OTD figure must call
 * this module rather than reimplement the comparison.
 *
 * WHAT "ON TIME" MEANS HERE
 *
 * A delivery is on time when it arrived by the time the business PROMISED the
 * customer. That promise is resolved in order of how specific it is:
 *
 *   1. dispatch.sla_deadline    — a deadline committed on this dispatch.
 *   2. scheduled_pickup + route.sla_hours — the agreed service level for that
 *      lane (typically 96–120h, i.e. the 4–5 working days actually sold).
 *   3. dispatch.scheduled_delivery — an explicit promised timestamp.
 *   4. scheduled_pickup + route.estimated_duration_hours — LAST RESORT.
 *
 * Order 4 is deliberately last. `estimated_duration_hours` is driving time
 * (15–30h per lane) and is not a commitment to anyone: it excludes loading,
 * waiting at the customer and mandatory rest. Scoring against it produced 5–8%
 * OTD, versus 52% for the same trips against the SLA the business agreed. It
 * is kept only so lanes with no SLA configured still yield a figure, and
 * `basis` reports when it was used so the number can be read accordingly.
 *
 * Trips with no resolvable promise are excluded from BOTH sides of the ratio
 * rather than counted late — an unmeasurable trip is not a failed one.
 */

export interface OtdDispatchLike {
  actual_delivery?: string | null;
  scheduled_delivery?: string | null;
  scheduled_pickup?: string | null;
  sla_deadline?: string | null;
  /** Supabase embeds a to-one join as an object, but a to-many as an array. */
  routes?:
    | { sla_hours?: number | null; estimated_duration_hours?: number | null }
    | { sla_hours?: number | null; estimated_duration_hours?: number | null }[]
    | null;
  /** Pre-computed flag where a table already carries one; trusted if set. */
  on_time_flag?: boolean | null;
}

export type OtdBasis = "sla_deadline" | "route_sla" | "scheduled_delivery" | "route_estimate" | "none";

/** The columns any query must select for scoreOtd to work. */
export const OTD_SELECT =
  "actual_delivery, scheduled_delivery, scheduled_pickup, sla_deadline, routes(sla_hours, estimated_duration_hours)";

const route = (d: OtdDispatchLike) =>
  Array.isArray(d.routes) ? d.routes[0] : d.routes ?? undefined;

const addHours = (from: string, hours: number) =>
  new Date(new Date(from).getTime() + hours * 3600000);

/** Which promise applies to this dispatch, and where it came from. */
export const resolvePromise = (
  d: OtdDispatchLike,
): { at: Date; basis: OtdBasis } | null => {
  if (d.sla_deadline) return { at: new Date(d.sla_deadline), basis: "sla_deadline" };

  const r = route(d);
  const slaHours = Number(r?.sla_hours) || 0;
  if (d.scheduled_pickup && slaHours > 0) {
    return { at: addHours(d.scheduled_pickup, slaHours), basis: "route_sla" };
  }

  if (d.scheduled_delivery) {
    return { at: new Date(d.scheduled_delivery), basis: "scheduled_delivery" };
  }

  const estHours = Number(r?.estimated_duration_hours) || 0;
  if (d.scheduled_pickup && estHours > 0) {
    return { at: addHours(d.scheduled_pickup, estHours), basis: "route_estimate" };
  }

  return null;
};

/** True / false / null, where null means the trip cannot be judged. */
export const isOnTime = (d: OtdDispatchLike): boolean | null => {
  if (typeof d.on_time_flag === "boolean") return d.on_time_flag;
  if (!d.actual_delivery) return null;
  const promise = resolvePromise(d);
  if (!promise) return null;
  return new Date(d.actual_delivery) <= promise.at;
};

export interface OtdResult {
  /** Percentage 0–100, or null when nothing could be scored. */
  rate: number | null;
  /** Trips that had both a delivery and a promise. */
  scoreable: number;
  onTime: number;
  late: number;
  /** Of the scoreable trips, how many used a real service level (1–3). */
  onSlaBasis: number;
  /** True when every scored trip was judged against a real service level. */
  fullSlaCoverage: boolean;
}

/**
 * Scores a set of dispatches. Returns rate = null (not 0) when nothing is
 * measurable, so callers can render "Not tracked" instead of a figure that
 * reads as total failure.
 */
export const scoreOtd = (rows: OtdDispatchLike[] | null | undefined): OtdResult => {
  const list = rows ?? [];
  let scoreable = 0;
  let onTime = 0;
  let onSlaBasis = 0;

  for (const d of list) {
    const verdict = isOnTime(d);
    if (verdict === null) continue;
    scoreable += 1;
    if (verdict) onTime += 1;
    const basis = resolvePromise(d)?.basis;
    if (basis && basis !== "route_estimate") onSlaBasis += 1;
  }

  return {
    rate: scoreable > 0 ? Math.round((onTime / scoreable) * 100) : null,
    scoreable,
    onTime,
    late: scoreable - onTime,
    onSlaBasis,
    fullSlaCoverage: scoreable > 0 && onSlaBasis === scoreable,
  };
};
