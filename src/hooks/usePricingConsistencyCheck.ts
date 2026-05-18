import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LC_PRICING_PLANS, LC_PLAN_DB_TIER } from "@/config/lcPricingPlans";

export interface PricingFinding {
  plan_id: string;
  db_tier: string;
  landing_price_naira: number;
  db_price_naira: number | null;
  mismatch: boolean;
  reason?: string;
}

export interface PricingConsistencyResult {
  loading: boolean;
  ok: boolean;
  findings: PricingFinding[];
  checkedAt: string | null;
  error: string | null;
  /** Local cross-check between landing config and Settings config (always true unless code drift). */
  localOk: boolean;
}

/**
 * Runtime consistency check that flags when:
 *  • Settings tier prices differ from landing tier prices (local - they share the
 *    same source of truth, so a `false` here indicates code drift), AND
 *  • DB `subscription_plans` prices differ from landing prices for this tenant.
 */
export function usePricingConsistencyCheck(opts?: { autoRun?: boolean }): PricingConsistencyResult & { run: () => Promise<void> } {
  const [state, setState] = useState<PricingConsistencyResult>({
    loading: false,
    ok: true,
    findings: [],
    checkedAt: null,
    error: null,
    localOk: true,
  });

  const localOk = LC_PRICING_PLANS.every((p) => !!LC_PLAN_DB_TIER[p.id]);

  const run = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke("pricing-consistency-check", { body: {} });
      if (error) throw error;
      setState({
        loading: false,
        ok: !!data?.ok && localOk,
        findings: data?.findings ?? [],
        checkedAt: data?.checked_at ?? new Date().toISOString(),
        error: null,
        localOk,
      });
      if (data?.ok === false) {
        // Surface to console so ops/admin sees drift without blocking the UI
        // eslint-disable-next-line no-console
        console.warn("[pricing-consistency] DB ↔ landing price drift detected", data.findings);
      }
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message ?? "Check failed", localOk }));
    }
  };

  useEffect(() => {
    if (opts?.autoRun !== false) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, run };
}
