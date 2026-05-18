/**
 * Pure helpers for maintenance fund calculation in DynamicPricingEngine.
 * Extracted so unit tests can verify behaviour without rendering React.
 */

/**
 * Coerces an arbitrary value (string from <input>, number, null, undefined)
 * into a finite non-negative number. Anything else returns 0.
 */
export function toFiniteNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * Maintenance fund = ₦ per-km × route distance, rounded to nearest naira.
 * Returns 0 on invalid inputs (NaN, negative, zero distance).
 */
export function computeMaintenanceFund(
  perKm: unknown,
  distanceKm: unknown,
): number {
  const rate = toFiniteNumber(perKm);
  const dist = toFiniteNumber(distanceKm);
  if (rate <= 0 || dist <= 0) return 0;
  return Math.round(rate * dist);
}

export type MaintenanceOverrideState = {
  value: number;
  overridden: boolean;
};

const STORAGE_PREFIX = "pricing-maint-override:";

function storageKey(scope: string | null | undefined) {
  return `${STORAGE_PREFIX}${scope || "manual"}`;
}

/** Load a saved override for a given dispatch scope (or "manual"). */
export function loadMaintenanceOverride(
  scope: string | null | undefined,
): MaintenanceOverrideState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MaintenanceOverrideState>;
    if (typeof parsed?.overridden !== "boolean") return null;
    return {
      overridden: parsed.overridden,
      value: toFiniteNumber(parsed.value),
    };
  } catch {
    return null;
  }
}

/** Persist override choice. Pass overridden=false to clear the saved override. */
export function saveMaintenanceOverride(
  scope: string | null | undefined,
  state: MaintenanceOverrideState,
) {
  if (typeof window === "undefined") return;
  try {
    if (!state.overridden) {
      window.localStorage.removeItem(storageKey(scope));
      return;
    }
    window.localStorage.setItem(storageKey(scope), JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
