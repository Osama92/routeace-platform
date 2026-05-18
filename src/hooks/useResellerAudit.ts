/**
 * useResellerAudit - logs reseller reads, denied access, and self-checks
 * to public.reseller_access_log for forensic traceability.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useResellerGuard } from "@/hooks/useResellerGuard";

type Outcome = "allowed" | "denied";
type Action = "read" | "failed_access" | "self_check";

export function useResellerAudit() {
  const { user } = useAuth();
  const { tenantId } = useResellerGuard();

  const log = useCallback(
    async (params: {
      table_name: string;
      action: Action;
      outcome: Outcome;
      target_org_id?: string | null;
      details?: Record<string, unknown>;
    }) => {
      if (!user) return;
      try {
        await supabase.from("reseller_access_log").insert([{
          user_id: user.id,
          user_email: user.email ?? null,
          org_id: tenantId,
          table_name: params.table_name,
          action: params.action,
          outcome: params.outcome,
          target_org_id: params.target_org_id ?? null,
          details: (params.details ?? null) as never,
        }] as never);
      } catch (err) {
        console.warn("[reseller-audit] log failed", err);
      }
    },
    [user, tenantId]
  );

  return { log };
}

export default useResellerAudit;
