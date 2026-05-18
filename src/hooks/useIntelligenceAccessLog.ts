import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type IntelViewScope = "LD" | "LC";
export type IntelModule = "driver_intelligence" | "fleet_intelligence";
export type IntelOwnership = "internal" | "third_party" | "mixed" | "none";

interface AccessLogParams {
  view_scope: IntelViewScope;
  module: IntelModule;
  ownership_scope?: IntelOwnership;
  internal_count?: number;
  third_party_count?: number;
  record_count?: number;
  route?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit-trail row in `intelligence_access_logs` exactly once per
 * mount (re-fires when the access fingerprint materially changes).
 */
export function useIntelligenceAccessLog(params: AccessLogParams) {
  const { user, organizationId } = useAuth();
  const fingerprint =
    `${params.view_scope}|${params.module}|${params.ownership_scope || "none"}|${params.internal_count || 0}|${params.third_party_count || 0}|${params.record_count || 0}`;
  const lastFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (lastFingerprint.current === fingerprint) return;
    lastFingerprint.current = fingerprint;

    void (async () => {
      try {
        await (supabase as any).from("intelligence_access_logs").insert({
          user_id: user.id,
          user_email: user.email ?? null,
          organization_id: organizationId ?? null,
          view_scope: params.view_scope,
          module: params.module,
          ownership_scope: params.ownership_scope ?? "none",
          internal_count: params.internal_count ?? 0,
          third_party_count: params.third_party_count ?? 0,
          record_count: params.record_count ?? 0,
          route: params.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
          metadata: params.metadata ?? null,
        });
      } catch (err) {
        // fail-open: never block UI on audit insert
        console.warn("[intel-access-log] insert failed", err);
      }
    })();
  }, [user, organizationId, fingerprint, params.route]);
}

export default useIntelligenceAccessLog;
