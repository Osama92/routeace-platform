/**
 * useActiveErp
 *
 * Reads the org's active accounting ERP integrations from the
 * integration_configs DB table (persistent, cross-device/session).
 *
 * Returns all active accounting ERPs so multi-ERP orgs can sync to each.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

// provider values that represent accounting / ERP systems
const ACCOUNTING_PROVIDER_IDS = [
  "quickbooks", "quickbooks_online",
  "xero",
  "zoho_books",
  "sage",
  "wave",
  "netsuite",
  "odoo",
  "microsoft_dynamics",
];

// Maps edge-function names per provider
export const ERP_SYNC_FUNCTIONS: Record<string, string> = {
  quickbooks: "quickbooks-sync",
  quickbooks_online: "quickbooks-sync",
  xero: "xero-sync",
  zoho_books: "zoho-sync",
  sage: "sage-sync",
  wave: "wave-sync",
  netsuite: "netsuite-sync",
  odoo: "odoo-sync",
  microsoft_dynamics: "dynamics-sync",
};

export interface ErpInfo {
  id: string;           // provider key, e.g. "zoho_books"
  name: string;         // display name, e.g. "Zoho Books"
  logo: string;         // emoji or icon hint
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  syncFn: string;       // edge function name to call
}

interface UseActiveErpResult {
  erps: ErpInfo[];
  primaryErp: ErpInfo | null;
  isLoading: boolean;
}

export function useActiveErp(): UseActiveErpResult {
  const { organizationId } = useAuth();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["active-erp-configs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("integration_configs" as any)
        .select("id, provider, is_active, last_sync_at, last_sync_status")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .in("provider", ACCOUNTING_PROVIDER_IDS);
      return (data as any[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  const erps: ErpInfo[] = configs.map((cfg: any) => {
    const catalogEntry = INTEGRATION_CATALOG.find(
      (c) => c.id === cfg.provider || c.id === cfg.provider?.replace("_online", "")
    );
    return {
      id: cfg.provider,
      name: (catalogEntry as any)?.name ?? cfg.provider,
      logo: (catalogEntry as any)?.logo ?? "📊",
      connected: true,
      lastSyncAt: cfg.last_sync_at ?? null,
      lastSyncStatus: cfg.last_sync_status ?? null,
      syncFn: ERP_SYNC_FUNCTIONS[cfg.provider] ?? "zoho-sync",
    };
  });

  return {
    erps,
    primaryErp: erps[0] ?? null,
    isLoading,
  };
}
