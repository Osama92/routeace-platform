import { describe, it, expect } from "vitest";
import {
  resolveTenantMode,
  isCompanyOnlyRoute,
  COMPANY_ONLY_ROUTE_PREFIXES,
} from "@/lib/tenant/featureRegistry";

describe("featureRegistry - resolveTenantMode", () => {
  it("respects explicit LOGISTICS_DEPARTMENT tenant_mode", () => {
    expect(
      resolveTenantMode({
        tenantMode: "LOGISTICS_DEPARTMENT",
        industryCode: "logistics",
        role: "super_admin",
      })
    ).toBe("LOGISTICS_DEPARTMENT");
  });

  it("respects explicit LOGISTICS_COMPANY tenant_mode", () => {
    expect(
      resolveTenantMode({
        tenantMode: "LOGISTICS_COMPANY",
        industryCode: "fmcg",
        role: "ops_manager",
      })
    ).toBe("LOGISTICS_COMPANY");
  });

  it("falls back to LC for explicit company industry codes", () => {
    expect(
      resolveTenantMode({ tenantMode: null, industryCode: "logistics", role: null })
    ).toBe("LOGISTICS_COMPANY");
    expect(
      resolveTenantMode({ tenantMode: null, industryCode: "3pl", role: "ops_manager" })
    ).toBe("LOGISTICS_COMPANY");
  });

  it("derives LD for department-like industries", () => {
    expect(
      resolveTenantMode({ tenantMode: null, industryCode: "fmcg", role: null })
    ).toBe("LOGISTICS_DEPARTMENT");
    expect(
      resolveTenantMode({
        tenantMode: null,
        industryCode: "pharma",
        role: "ops_manager",
      })
    ).toBe("LOGISTICS_DEPARTMENT");
  });

  it("defaults to LOGISTICS_COMPANY when no signals available", () => {
    expect(
      resolveTenantMode({ tenantMode: null, industryCode: null, role: null })
    ).toBe("LOGISTICS_COMPANY");
  });

  it("is case-insensitive for industry codes", () => {
    expect(
      resolveTenantMode({ tenantMode: null, industryCode: "FMCG", role: null })
    ).toBe("LOGISTICS_DEPARTMENT");
  });
});

describe("featureRegistry - isCompanyOnlyRoute", () => {
  it("blocks exact match company-only routes", () => {
    expect(isCompanyOnlyRoute("/reseller")).toBe(true);
    expect(isCompanyOnlyRoute("/ai-ceo")).toBe(true);
    expect(isCompanyOnlyRoute("/investor")).toBe(true);
  });

  it("blocks nested paths under company-only prefixes", () => {
    expect(isCompanyOnlyRoute("/ai-ceo/dashboard")).toBe(true);
    expect(isCompanyOnlyRoute("/reseller/clients/abc")).toBe(true);
    expect(isCompanyOnlyRoute("/company/fleet-intelligence")).toBe(true);
  });

  it("does not block neutral or department routes", () => {
    expect(isCompanyOnlyRoute("/")).toBe(false);
    expect(isCompanyOnlyRoute("/dashboard")).toBe(false);
    expect(isCompanyOnlyRoute("/fleet-intelligence")).toBe(false);
    expect(isCompanyOnlyRoute("/dept/sales-tracker")).toBe(false);
    expect(isCompanyOnlyRoute("/super-admin")).toBe(false);
  });

  it("does not match prefix collisions (e.g. /ai-ceo-tooling)", () => {
    // /ai-ceo is in list - must not also match /ai-ceo-tooling unless under /ai-ceo/
    expect(isCompanyOnlyRoute("/ai-ceo-tooling")).toBe(false);
  });

  it("registry is non-empty and well-formed", () => {
    expect(COMPANY_ONLY_ROUTE_PREFIXES.length).toBeGreaterThan(20);
    for (const p of COMPANY_ONLY_ROUTE_PREFIXES) {
      expect(p.startsWith("/")).toBe(true);
      expect(p.endsWith("/")).toBe(false);
    }
  });
});

/**
 * E2E-style isolation: ensure LD tenants can NEVER reach Logistics Company
 * fleet/driver intelligence components, regardless of how they navigate
 * (sidebar, deep-link, browser history, sub-paths).
 */
describe("LD tenant isolation - Fleet & Driver Intelligence", () => {
  const LC_INTEL_ROUTES = [
    "/company/fleet-intelligence",
    "/company/driver-intelligence",
    "/company/fleet-intelligence/details",
    "/company/driver-intelligence/scoring",
  ];

  it("blocks LC fleet intelligence on every navigation path", () => {
    for (const r of LC_INTEL_ROUTES.filter((x) => x.includes("fleet"))) {
      expect(isCompanyOnlyRoute(r)).toBe(true);
    }
  });

  it("blocks LC driver intelligence on every navigation path", () => {
    for (const r of LC_INTEL_ROUTES.filter((x) => x.includes("driver"))) {
      expect(isCompanyOnlyRoute(r)).toBe(true);
    }
  });

  it("LD-scoped intelligence routes are NOT in the company-only registry", () => {
    // The dept-scoped routes must remain reachable by LD tenants.
    expect(isCompanyOnlyRoute("/fleet-intelligence")).toBe(false);
    expect(isCompanyOnlyRoute("/driver-intelligence")).toBe(false);
  });

  it("Logistics Company financial/profitability/AI-CEO routes are blocked for LD", () => {
    const blocked = [
      "/profitability-engine",
      "/financial-intelligence",
      "/ai-ceo",
      "/ai-ceo/dashboard",
      "/revenue-expansion",
      "/executive-autopilot",
      "/investor",
      "/reseller",
    ];
    for (const r of blocked) expect(isCompanyOnlyRoute(r)).toBe(true);
  });

  it("Department/cost-center routes remain accessible (negative-control)", () => {
    const allowed = [
      "/dashboard",
      "/drivers",
      "/fleet-intelligence", // dept-scoped landing
      "/driver-intelligence", // dept-scoped landing
      "/dept/sales-tracker",
      "/dept/cost-centre",
      "/operations",
    ];
    for (const r of allowed) expect(isCompanyOnlyRoute(r)).toBe(false);
  });

  it("resolveTenantMode → LD never resolves to LC even with company role hint", () => {
    const ld = resolveTenantMode({
      tenantMode: "LOGISTICS_DEPARTMENT",
      industryCode: "logistics",
      role: "super_admin",
    });
    expect(ld).toBe("LOGISTICS_DEPARTMENT");
  });
});

