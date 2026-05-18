/**
 * Security regression test - Cross-tenant RLS guard
 *
 * Calls the database function `public.assert_no_open_rls_policies()` and
 * asserts that NONE of the previously-vulnerable tables have re-acquired
 * an open SELECT/ALL policy (USING true or auth.uid() IS NOT NULL with no
 * organization scope).
 *
 * Add a table here whenever a future migration tightens it. Never remove
 * an entry - these tables hold cross-tenant PII / financial data and must
 * stay org-scoped.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dwujokxscygkfmnvqfy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdnh3aGNpZnljcXF4bXhpd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjQyMjksImV4cCI6MjA4MzEwMDIyOX0.z-D85kMgImWUukvT48qSEOlHOJ7A1m-ckA8XujNcVJs";

/**
 * Tables that previously leaked across tenants. They MUST remain absent
 * from the open-policy list. Adding a name here is a one-way ratchet.
 */
const PROTECTED_TABLES = [
  // Phase 12 (PII / dispatch / financial)
  "drivers",
  "partners",
  "customers",
  "staff",
  "company_settings",
  "gtm_entities",
  "gtm_opportunities",
  "driver_behavior_scores",
  "warehouse_inventory",
  "dispatch_state_history",
  "dispatch_delay_reasons",
  "dispatch_dropoffs",
  "fuel_events",
  "treasury_stress_index",
  "tax_ledger",
  // Phase 13 (finance / compliance / commerce)
  "trade_contracts",
  "revenue_contracts",
  "chart_of_accounts",
  "legal_entities",
  "fraud_detection_events",
  "compliance_registry",
  "performance_obligations",
  "vat_rules",
  "trade_disputes",
  "trade_verifications",
  "exchange_trade_matches",
  "trust_badges",
  // Phase 13 (warehouse-chained)
  "inventory_reconciliations",
  "reconciliation_items",
  "order_delivery_tracking",
  "warehouse_returns",
  "warehouse_return_items",
  "warehouse_zones",
  "warehouse_bins",
  "picklists",
  "picklist_items",
  "cycle_counts",
  "cycle_count_items",
  "parts_inventory",
  // Phase 13 (vehicle / dispatch chained)
  "parts_orders",
  "sensor_alerts",
  "fleet_downtime_log",
  "freight_performance_notes",
  // Phase 13 (intelligence / ops)
  "autonomous_rules",
  "ecosystem_nodes",
  "liquor_compliance_audit",
  "predictive_forecasts",
  "insurance_claims_predictions",
  "demand_forecasts",
  "decision_outcomes",
  "shelf_audits",
  "fmcg_field_returns",
  // Phase 14 (vehicle-category routing + per-org pricing)
  "driver_job_notifications",
  "org_pricing_settings",
];

describe("Cross-tenant RLS guard", () => {
  it("none of the previously-vulnerable tables have an open SELECT/ALL policy", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc("assert_no_open_rls_policies");
    expect(error, `RPC failed: ${error?.message}`).toBeNull();

    const violations = (data || []).filter((row: { table_name: string }) =>
      PROTECTED_TABLES.includes(row.table_name),
    );

    if (violations.length > 0) {
      const lines = violations
        .map(
          (v: { table_name: string; policy_name: string; reason: string }) =>
            `  - ${v.table_name} :: "${v.policy_name}" (${v.reason})`,
        )
        .join("\n");
      throw new Error(
        `\n${violations.length} protected table(s) regained an open RLS policy:\n${lines}\n\n` +
          `Replace the policy with one that requires is_org_member(auth.uid(), organization_id) ` +
          `or is_super_admin(auth.uid()).`,
      );
    }
    expect(violations).toEqual([]);
  }, 15000);
});
