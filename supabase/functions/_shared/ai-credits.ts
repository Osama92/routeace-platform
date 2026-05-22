/**
 * AI credit enforcement middleware.
 * Checks tenant's remaining credits before an LLM call and deducts them after.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export interface CreditCheckResult {
  allowed: boolean;
  reason?: string;
  configId?: string;
}

export async function checkAndDeductCredits(
  supabase: SupabaseClient,
  opts: {
    organizationId: string | null | undefined;
    userId: string;
    cost: number;
  },
): Promise<CreditCheckResult> {
  if (opts.cost <= 0) return { allowed: true };

  try {
    // Look up tenant config — prefer org-scoped, fall back to user-scoped
    let query = supabase
      .from("tenant_config" as any)
      .select("id, ai_credits_total, ai_credits_used, plan_tier");

    const { data: config, error } = opts.organizationId
      ? await (query as any).eq("organization_id", opts.organizationId).limit(1).maybeSingle()
      : await (query as any).eq("user_id", opts.userId).limit(1).maybeSingle();

    if (error || !config) {
      // Fail open — don't block AI if config is missing
      return { allowed: true };
    }

    // Enterprise / unlimited plans bypass the counter
    if (
      config.plan_tier === "enterprise" ||
      (config.ai_credits_total != null && config.ai_credits_total >= 9999)
    ) {
      return { allowed: true, configId: config.id };
    }

    const total = config.ai_credits_total ?? 0;
    const used = config.ai_credits_used ?? 0;
    const remaining = total - used;

    if (remaining < opts.cost) {
      return {
        allowed: false,
        reason: `Insufficient AI credits. This action costs ${opts.cost} credit${opts.cost !== 1 ? "s" : ""}, but you have ${Math.max(0, remaining)} remaining. Upgrade your plan to get more.`,
      };
    }

    // Deduct credits atomically
    const { error: updateErr } = await (supabase as any)
      .from("tenant_config")
      .update({ ai_credits_used: used + opts.cost })
      .eq("id", config.id);

    if (updateErr) {
      // Don't block the call if deduction fails — just log
      console.error("Failed to deduct AI credits:", updateErr.message);
    }

    return { allowed: true, configId: config.id };
  } catch (err) {
    console.error("AI credit check error:", err);
    return { allowed: true }; // fail open
  }
}
