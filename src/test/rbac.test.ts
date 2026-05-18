import { describe, it, expect } from "vitest";
import { PERMISSIONS, hasPermission, ROLE_PERMISSIONS } from "@/lib/rbac/permissions";

describe("RBAC Permission Matrix", () => {
  it("should grant super_admin platform-level permissions", () => {
    expect(hasPermission("super_admin", "PLATFORM_VIEW")).toBe(true);
    expect(hasPermission("super_admin", "PLATFORM_MANAGE_ORGS")).toBe(true);
    expect(hasPermission("super_admin", "PLATFORM_SUSPEND_ORGS")).toBe(true);
  });

  it("should restrict finance_manager from dispatch create", () => {
    expect(hasPermission("finance_manager", "DISPATCH_CREATE")).toBe(false);
  });

  it("should restrict ops_manager from payouts process", () => {
    expect(hasPermission("ops_manager", "PAYOUTS_PROCESS")).toBe(false);
  });

  it("should allow admin role broad access", () => {
    expect(hasPermission("admin", "DISPATCH_CREATE")).toBe(true);
    expect(hasPermission("admin", "INVOICES_CREATE")).toBe(true);
  });

  it("should restrict customer from dispatch operations", () => {
    expect(hasPermission("customer", "DISPATCH_CREATE")).toBe(false);
    expect(hasPermission("customer", "INVOICES_CREATE")).toBe(false);
  });

  it("should enforce separation of duties between ops and finance", () => {
    // Finance cannot do dispatch
    expect(hasPermission("finance_manager", "DISPATCH_CREATE")).toBe(false);
    expect(hasPermission("finance_manager", "DISPATCH_ASSIGN")).toBe(false);
    // Ops cannot do payouts
    expect(hasPermission("ops_manager", "PAYOUTS_CREATE")).toBe(false);
    expect(hasPermission("ops_manager", "INVOICES_SYNC")).toBe(false);
  });
});
