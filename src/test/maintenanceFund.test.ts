import { describe, it, expect, beforeEach } from "vitest";
import {
  computeMaintenanceFund,
  toFiniteNumber,
  loadMaintenanceOverride,
  saveMaintenanceOverride,
} from "@/lib/pricing/maintenance";

// Per-vehicle ₦/km rates that ship with DynamicPricingEngine.
const RATES = {
  bike: 20.67,
  van: 40.33,
  truck_15t: 86.67,
  truck_20t: 90.67,
  trailer: 142.33,
} as const;

describe("toFiniteNumber", () => {
  it("coerces numeric strings", () => {
    expect(toFiniteNumber("125")).toBe(125);
    expect(toFiniteNumber("125.75")).toBe(125.75);
  });
  it("returns fallback for NaN, Infinity, negatives, empty, null", () => {
    expect(toFiniteNumber("abc")).toBe(0);
    expect(toFiniteNumber("")).toBe(0);
    expect(toFiniteNumber(null)).toBe(0);
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber(NaN)).toBe(0);
    expect(toFiniteNumber(Infinity)).toBe(0);
    expect(toFiniteNumber(-50)).toBe(0);
    expect(toFiniteNumber("xyz", 1)).toBe(1);
  });
});

describe("computeMaintenanceFund - ₦ per-km × route distance", () => {
  it("matches the published rates for a 100 km trip", () => {
    expect(computeMaintenanceFund(RATES.bike, 100)).toBe(2067);
    expect(computeMaintenanceFund(RATES.van, 100)).toBe(4033);
    expect(computeMaintenanceFund(RATES.truck_15t, 100)).toBe(8667);
    expect(computeMaintenanceFund(RATES.truck_20t, 100)).toBe(9067);
    expect(computeMaintenanceFund(RATES.trailer, 100)).toBe(14233);
  });

  it("scales linearly with distance and rounds to nearest naira", () => {
    expect(computeMaintenanceFund(RATES.trailer, 250)).toBe(Math.round(142.33 * 250));
    expect(computeMaintenanceFund(RATES.truck_20t, 1)).toBe(91);
  });

  it("never returns NaN regardless of input shape", () => {
    expect(computeMaintenanceFund("142.33", "250")).toBe(Math.round(142.33 * 250));
    expect(computeMaintenanceFund("oops", 100)).toBe(0);
    expect(computeMaintenanceFund(RATES.trailer, "")).toBe(0);
    expect(computeMaintenanceFund(NaN, NaN)).toBe(0);
    expect(computeMaintenanceFund(RATES.bike, -10)).toBe(0);
  });

  it("returns 0 when distance is 0 (i.e. cleared on vehicle change before distance set)", () => {
    expect(computeMaintenanceFund(RATES.trailer, 0)).toBe(0);
  });

  it("recomputes a fresh value when vehicle (per-km rate) changes - simulating switch + clear of prior override", () => {
    const distance = 180;
    // Operator on Trailer: 142.33 * 180
    const trailerFund = computeMaintenanceFund(RATES.trailer, distance);
    // Switches vehicle to Bike - override is cleared (component contract), recompute uses new rate
    const bikeFund = computeMaintenanceFund(RATES.bike, distance);
    expect(trailerFund).toBe(Math.round(142.33 * 180));
    expect(bikeFund).toBe(Math.round(20.67 * 180));
    expect(trailerFund).not.toBe(bikeFund);
  });
});

describe("maintenance override persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists override across reloads (load returns saved value)", () => {
    saveMaintenanceOverride("dispatch-A", { value: 12345, overridden: true });
    const reloaded = loadMaintenanceOverride("dispatch-A");
    expect(reloaded).toEqual({ value: 12345, overridden: true });
  });

  it("scopes override per dispatch - switching dispatches reads the right value", () => {
    saveMaintenanceOverride("dispatch-A", { value: 11111, overridden: true });
    saveMaintenanceOverride("dispatch-B", { value: 22222, overridden: true });
    expect(loadMaintenanceOverride("dispatch-A")?.value).toBe(11111);
    expect(loadMaintenanceOverride("dispatch-B")?.value).toBe(22222);
  });

  it("returns null for an unsaved scope (auto-calc takes over)", () => {
    expect(loadMaintenanceOverride("never-saved")).toBeNull();
  });

  it("clearing the override removes it from storage", () => {
    saveMaintenanceOverride("dispatch-A", { value: 9999, overridden: true });
    saveMaintenanceOverride("dispatch-A", { value: 0, overridden: false });
    expect(loadMaintenanceOverride("dispatch-A")).toBeNull();
  });
});
