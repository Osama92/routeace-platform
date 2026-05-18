import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Counts used by DeptOnboardingChecklist.
 */
export function useDeptOnboardingCounts() {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: ["dept-onboarding-counts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const orgFilter = organizationId!;
      const sb: any = supabase;
      const [transporters, dispatches, erp] = await Promise.all([
        sb.from("ld_transporters").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("dispatches").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("erp_connections").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
      ]);
      return {
        departmentConfigured: true,
        vendorCount: transporters.count ?? 0,
        dispatchCount: dispatches.count ?? 0,
        erpConnected: (erp.count ?? 0) > 0,
        zazaConfigured: false,
      };
    },
  });
}
