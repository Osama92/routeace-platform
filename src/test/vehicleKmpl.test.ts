import { describe, it, expect } from "vitest";
import { resolveKmpl, isInefficient, fuelSeverity, DEFAULT_KMPL, VEHICLE_KMPL } from "@/lib/fuel/vehicleKmpl";

describe("resolveKmpl", () => {
  it("returns the baseline for known vehicle types", () => {
    expect(resolveKmpl("bike")).toBe(50);
    expect(resolveKmpl("truck_15t")).toBe(3.0);
    expect(resolveKmpl("truck_20t")).toBe(2.78);
    expect(resolveKmpl("trailer")).toBe(2.22);
  });

  it("normalises case and surrounding whitespace", () => {
    expect(resolveKmpl(" Truck_20T ")).toBe(2.78);
    expect(resolveKmpl("VAN_DIESEL")).toBe(6.67);
  });

  it("falls back to DEFAULT_KMPL for unknown / missing types", () => {
    expect(resolveKmpl("spaceship")).toBe(DEFAULT_KMPL);
    expect(resolveKmpl("")).toBe(DEFAULT_KMPL);
    expect(resolveKmpl(null)).toBe(DEFAULT_KMPL);
    expect(resolveKmpl(undefined)).toBe(DEFAULT_KMPL);
  });

  it("covers every vehicle key without throwing", () => {
    for (const k of Object.keys(VEHICLE_KMPL)) {
      expect(resolveKmpl(k)).toBeGreaterThan(0);
    }
  });
});

describe("isInefficient", () => {
  const baseline = resolveKmpl("truck_20t"); // 2.78

  it("flags readings below 70% of baseline as inefficient", () => {
    expect(isInefficient(baseline * 0.69, baseline)).toBe(true);
    expect(isInefficient(baseline * 0.71, baseline)).toBe(false);
  });

  it("treats null / 0 / negative readings as inefficient (missing data)", () => {
    expect(isInefficient(null, baseline)).toBe(true);
    expect(isInefficient(0, baseline)).toBe(true);
    expect(isInefficient(-1, baseline)).toBe(true);
    expect(isInefficient(undefined, baseline)).toBe(true);
  });

  it("does not flag healthy readings", () => {
    expect(isInefficient(baseline, baseline)).toBe(false);
    expect(isInefficient(baseline * 1.2, baseline)).toBe(false);
  });
});

describe("fuelSeverity", () => {
  const baseline = resolveKmpl("van_diesel"); // 6.67

  it("returns critical below 50% of baseline", () => {
    expect(fuelSeverity(baseline * 0.4, baseline)).toBe("critical");
  });

  it("returns high between 50% and 70% of baseline", () => {
    expect(fuelSeverity(baseline * 0.6, baseline)).toBe("high");
  });

  it("returns normal at or above 70% of baseline", () => {
    expect(fuelSeverity(baseline * 0.71, baseline)).toBe("normal");
    expect(fuelSeverity(baseline, baseline)).toBe("normal");
  });

  it("returns critical for missing / invalid readings", () => {
    expect(fuelSeverity(null, baseline)).toBe("critical");
    expect(fuelSeverity(0, baseline)).toBe("critical");
    expect(fuelSeverity(NaN, baseline)).toBe("critical");
  });

  it("handles mixed fuel-type vehicles using their own baselines", () => {
    const bike = resolveKmpl("motorbike"); // 50
    expect(fuelSeverity(20, bike)).toBe("critical");   // 40% of 50
    expect(fuelSeverity(30, bike)).toBe("high");       // 60% of 50
    expect(fuelSeverity(40, bike)).toBe("normal");     // 80% of 50
  });
});
