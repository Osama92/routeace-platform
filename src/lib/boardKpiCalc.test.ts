import { describe, it, expect } from "vitest";
import {
  outstandingProgressValue,
  pdfScaleFor,
  buildExportFilename,
} from "./boardKpiCalc";

describe("outstandingProgressValue", () => {
  it("returns 0 when revenue is 0 (no bar even if outstanding > 0)", () => {
    expect(outstandingProgressValue(500_000, 0)).toBe(0);
  });

  it("returns 0 when both are 0", () => {
    expect(outstandingProgressValue(0, 0)).toBe(0);
  });

  it("returns 0 when outstanding is 0 and revenue > 0", () => {
    expect(outstandingProgressValue(0, 1_000_000)).toBe(0);
  });

  it("is proportional for typical live values", () => {
    expect(outstandingProgressValue(250_000, 1_000_000)).toBe(25);
    expect(outstandingProgressValue(750_000, 1_000_000)).toBe(75);
  });

  it("caps at 100 when outstanding exceeds revenue", () => {
    expect(outstandingProgressValue(5_000_000, 1_000_000)).toBe(100);
  });

  it("handles null / undefined / NaN / negative without crashing", () => {
    expect(outstandingProgressValue(null, 1000)).toBe(0);
    expect(outstandingProgressValue(undefined, undefined)).toBe(0);
    expect(outstandingProgressValue(NaN, 1000)).toBe(0);
    expect(outstandingProgressValue(100, NaN)).toBe(0);
    expect(outstandingProgressValue(-100, 1000)).toBe(0);
    expect(outstandingProgressValue(100, -1000)).toBe(0);
  });

  it("handles Infinity safely", () => {
    expect(outstandingProgressValue(Infinity, 1000)).toBe(0);
    expect(outstandingProgressValue(1000, Infinity)).toBe(0);
  });
});

describe("pdfScaleFor", () => {
  it("standard uses a lighter scale", () => {
    expect(pdfScaleFor("standard")).toBe(1.5);
  });
  it("high uses a sharper scale", () => {
    expect(pdfScaleFor("high")).toBe(3);
  });
});

describe("buildExportFilename", () => {
  it("includes the month and UTC timestamp", () => {
    const start = new Date(Date.UTC(2026, 4, 1));
    const end = new Date(Date.UTC(2026, 4, 31));
    const at = new Date(Date.UTC(2026, 4, 16, 13, 45, 12));
    const name = buildExportFilename(start, end, at);
    expect(name).toBe(
      "board-executive-dashboard_2026-05_exported-2026-05-16_13-45-12Z.pdf",
    );
  });

  it("includes a range when months differ", () => {
    const start = new Date(Date.UTC(2026, 3, 1));
    const end = new Date(Date.UTC(2026, 4, 31));
    const at = new Date(Date.UTC(2026, 4, 16, 0, 0, 0));
    expect(buildExportFilename(start, end, at)).toContain("2026-04_to_2026-05");
  });
});
