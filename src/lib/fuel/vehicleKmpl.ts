/**
 * Per-vehicle-type fuel efficiency baselines (km per litre).
 * Centralised so FuelIntelligence, DynamicPricingEngine, and tests
 * stay in sync. Keys are normalised lowercase, trimmed.
 */
export const VEHICLE_KMPL: Record<string, number> = {
  bike: 50.0,
  motorbike: 50.0,
  motorcycle: 50.0,
  van: 6.67,
  van_diesel: 6.67,
  van_petrol: 4.0,
  pickup: 6.67,
  truck: 2.78,
  truck_15t: 3.0,
  truck_20t: 2.78,
  trailer: 2.22,
  hgv: 2.22,
};

/** Fallback when vehicle_type is unknown / null / empty. */
export const DEFAULT_KMPL = 3.5;

/**
 * Resolve the baseline km/L for a vehicle.
 * - Trims + lowercases input
 * - Returns DEFAULT_KMPL for null / undefined / empty / unknown
 */
export function resolveKmpl(vehicleType: string | null | undefined): number {
  if (!vehicleType) return DEFAULT_KMPL;
  const key = String(vehicleType).toLowerCase().trim();
  if (!key) return DEFAULT_KMPL;
  return VEHICLE_KMPL[key] ?? DEFAULT_KMPL;
}

/**
 * Decide if an observed km/L value is inefficient relative to the
 * vehicle's baseline. Threshold mirrors FuelIntelligence (<70% baseline).
 */
export function isInefficient(observedKmpl: number | null | undefined, baselineKmpl: number): boolean {
  const v = Number(observedKmpl ?? 0);
  if (!Number.isFinite(v) || v <= 0) return true; // missing reading = inefficient
  return v < baselineKmpl * 0.7;
}

/** Severity bucket: <50% baseline = critical, <70% = high, else normal. */
export function fuelSeverity(observedKmpl: number | null | undefined, baselineKmpl: number): "critical" | "high" | "normal" {
  const v = Number(observedKmpl ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "critical";
  if (v < baselineKmpl * 0.5) return "critical";
  if (v < baselineKmpl * 0.7) return "high";
  return "normal";
}
