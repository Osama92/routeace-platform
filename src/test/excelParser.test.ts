import { describe, it, expect } from "vitest";
import { normalizeDate, sanitizeNumber } from "@/lib/excelParser";

describe("Excel Parser - Date Normalization", () => {
  it("should handle ISO date strings", () => {
    const result = normalizeDate("2024-01-15");
    expect(result).toBe("2024-01-15");
  });

  it("should handle US format MM/DD/YYYY", () => {
    const result = normalizeDate("01/15/2024");
    expect(result).toBe("2024-01-15");
  });

  it("should handle Excel serial date numbers", () => {
    const result = normalizeDate(45306);
    expect(result).toMatch(/2024/);
  });

  it("should return null for invalid dates", () => {
    const result = normalizeDate("not-a-date");
    expect(result).toBeNull();
  });

  it("should handle null/undefined", () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
  });
});

describe("Excel Parser - Numeric Sanitization", () => {
  it("should strip commas from numbers", () => {
    expect(sanitizeNumber("1,200")).toBe(1200);
    expect(sanitizeNumber("1,200,000")).toBe(1200000);
  });

  it("should handle already clean numbers", () => {
    expect(sanitizeNumber("500")).toBe(500);
    expect(sanitizeNumber(500)).toBe(500);
  });

  it("should return null for invalid values", () => {
    expect(sanitizeNumber("abc")).toBeNull();
    expect(sanitizeNumber(null)).toBeNull();
  });
});
