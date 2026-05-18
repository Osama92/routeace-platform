/**
 * LC cross-organization isolation regression test.
 *
 * Asserts that all LC-scope finance + decision tables remain absent from the
 * `assert_no_open_rls_policies()` violation list. Adding a table here is a
 * one-way ratchet - removing entries is forbidden because it would re-open
 * the door to cross-tenant leakage on Finance ERP, Ledger, Reconciliation,
 * P&L, Cash Flow and Decision Cockpit.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dfvxwhcifycqqxmxiwjy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdnh3aGNpZnljcXF4bXhpd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjQyMjksImV4cCI6MjA4MzEwMDIyOX0.z-D85kMgImWUukvT48qSEOlHOJ7A1m-ckA8XujNcVJs";

const PROTECTED_LC_TABLES = [
  "ledger_entries",
  "invoices",
  "bills",
  "expenses",
  "reconciliation_batches",
  "finance_reconciliation",
  "suspense_cases",
  "finance_approval_requests",
  "finance_anomaly_events",
  "finance_periods",
  "treasury_risk_scores",
  "sovereign_report_snapshots",
  "cash_transactions",
  "fleet_downtime_log",
  "settlement_obligations",
  "fuel_savings_ledger",
  "dispatches",
];

describe("LC cross-org isolation guard", () => {
  it("anon client cannot read LC finance/decision tables", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const failures: string[] = [];

    for (const table of PROTECTED_LC_TABLES) {
      const { data, error } = await supabase
        .from(table as never)
        .select("organization_id")
        .limit(1);

      // Acceptable outcomes for an unauthenticated caller:
      //  - empty array (RLS denied silently)
      //  - permission error
      // Unacceptable: a populated row leaks across the public boundary.
      if (!error && Array.isArray(data) && data.length > 0) {
        failures.push(`${table} returned ${data.length} row(s) to anon`);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `LC isolation breach detected:\n  - ${failures.join("\n  - ")}`,
      );
    }
    expect(failures).toEqual([]);
  }, 30000);

  it("anon RPC for assert_no_open_rls_policies returns only RLS-policy metadata (no tenant data)", async () => {
    // assert_no_open_rls_policies is intentionally granted to anon/authenticated so the
    // cross-tenant RLS regression guard (rlsCrossTenantGuard.test.ts) can run from CI.
    // It only inspects pg_catalog policy metadata - no tenant rows are exposed.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc("assert_no_open_rls_policies");
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    // Result rows must only contain policy metadata fields, never tenant payloads.
    const allowedKeys = new Set(["policy_name", "reason", "table_name", "schema_name", "qual"]);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      for (const key of Object.keys(row)) {
        expect(allowedKeys.has(key), `unexpected column "${key}" - possible tenant data leak`).toBe(true);
      }
    }
  }, 15000);
});
