import { supabase } from "@/integrations/supabase/client";

/**
 * Records a CFO module event (click, recommendation shown, action taken).
 * Fire-and-forget - never throws to caller.
 */
export async function recordCfoEvent(params: {
  moduleKey: string;
  eventType: "view" | "click" | "recommendation_shown" | "action_taken" | "approval";
  recommendation?: string;
  ledgerEntryHash?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("cfo_audit_log").insert({
      user_id: user?.id ?? null,
      module_key: params.moduleKey,
      event_type: params.eventType,
      recommendation: params.recommendation ?? null,
      ledger_entry_hash: params.ledgerEntryHash ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    // Silent fail - audit must never break UX
    console.warn("[cfoAudit] failed to record", e);
  }
}

/**
 * Append an immutable ledger entry via the SECURITY DEFINER RPC.
 * Returns the new entry hash + sequence number.
 */
export async function appendLedgerEntry(params: {
  module: string;
  actionType: string;
  referenceType?: string;
  referenceId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase.rpc("append_ledger_entry", {
    p_module: params.module,
    p_action_type: params.actionType,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_amount: params.amount ?? 0,
    p_currency: params.currency ?? "NGN",
    p_description: params.description ?? null,
    p_metadata: params.metadata ?? {},
    p_tenant_id: null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { id: string; entry_hash: string; sequence_number: number };
}
