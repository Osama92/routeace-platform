/**
 * Regression guard - Performance Panel & staff screens must stay tenant-scoped.
 *
 * Two layers:
 *  1. Static source check - `loadStaff` in PerformancePanel.tsx must resolve
 *     active org membership before querying `profiles`, and must NEVER issue
 *     a database-wide staff/profile query, including for Super Admin users.
 *  2. Live anon check - the `staff` table must NOT be readable by an
 *     unauthenticated client (RLS must reject anon SELECT).
 *
 * If either fails, a recent change re-introduced cross-tenant leakage.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dwujokxscygkfmnvqfy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdnh3aGNpZnljcXF4bXhpd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjQyMjksImV4cCI6MjA4MzEwMDIyOX0.z-D85kMgImWUukvT48qSEOlHOJ7A1m-ckA8XujNcVJs";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Performance Panel tenant-scope guard (static)", () => {
  const src = read("src/pages/PerformancePanel.tsx");

  it("scopes every staff list to the active organization", () => {
    expect(src).toMatch(/organization_members/);
    expect(src).toMatch(/\.eq\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/);
    expect(src).toMatch(/\.eq\(\s*["']is_active["']\s*,\s*true\s*\)/);
  });

  it("does not special-case Super Admin into a database-wide profiles fetch", () => {
    expect(src).not.toMatch(/if\s*\([^)]*!?isSuperAdmin[^)]*\)/);
  });

  it("scopes the profiles query by active organization member IDs", () => {
    // Must call .in("user_id", ...) so the panel cannot pull every profile in the database.
    expect(src).toMatch(/\.in\(\s*["']user_id["']/);
  });

  it("does not expose an unconditional profiles fetch", () => {
    // Reject the old broken pattern: a bare profiles select with no .in() and
    // no Super-Admin guard. We look for the specific regression signature.
    const broken =
      /from\(["']profiles["']\)\s*\.select\([^)]*\)\s*\.order\([^)]*\)\s*;\s*$/m;
    expect(broken.test(src)).toBe(false);
  });
});

describe("Team Performance tenant-scope guard (static)", () => {
  const src = read("src/pages/TeamPerformance.tsx");

  it("scopes recompute to organization_members of the current org", () => {
    expect(src).toMatch(/organization_members/);
    expect(src).toMatch(/organization_id/);
  });
});

describe("Staff Management tenant/status guard (static)", () => {
  const src = read("src/pages/Staff.tsx");
  const migrationSrc = readdirSync(resolve(process.cwd(), "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8"))
    .join("\n");

  it("loads, edits, and deletes staff only inside the active organization", () => {
    expect(src).toMatch(/\.eq\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/);
    expect(src).not.toMatch(/00000000-0000-0000-0000-000000000000/);
  });

  it("keeps workforce economics queries org-scoped", () => {
    expect(src).toMatch(/from\(["']invoices["']\)[\s\S]*\.eq\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/);
    expect(src).toMatch(/from\(["']expenses["']\)[\s\S]*\.eq\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/);
    expect(src).toMatch(/from\(["']staff_salaries["']\)[\s\S]*\.eq\(\s*["']organization_id["']\s*,\s*organizationId\s*\)/);
  });

  it("has database automation for staff backfill, leave status, and profile status sync", () => {
    expect(migrationSrc).toMatch(/sync_staff_from_org_member/);
    expect(migrationSrc).toMatch(/refresh_staff_status_for_user/);
    expect(migrationSrc).toMatch(/trg_sync_staff_status_from_leave/);
    expect(migrationSrc).toMatch(/trg_sync_staff_status_from_profile/);
  });
});

describe("Staff table - anon SELECT must be denied", () => {
  it("returns no rows (or an RLS error) for an unauthenticated client", async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anon.from("staff").select("id").limit(5);
    // Either RLS blocks with an error, or the policy yields zero rows.
    if (error) {
      expect(error.message).toMatch(/permission|rls|policy|denied/i);
    } else {
      expect(data ?? []).toEqual([]);
    }
  }, 15000);

  it("profiles table does not leak rows to anon callers", async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anon
      .from("profiles")
      .select("user_id")
      .limit(5);
    if (error) {
      expect(error.message).toMatch(/permission|rls|policy|denied/i);
    } else {
      expect((data ?? []).length).toBe(0);
    }
  }, 15000);
});
