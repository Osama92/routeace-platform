import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useApprovalPolicy(entityType: string) {
  const { organizationId, userRole, isSuperAdmin } = useAuth();

  const { data: policy } = useQuery({
    queryKey: ["approval_policy", organizationId, entityType],
    enabled: !!organizationId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_policies")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("entity_type", entityType)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Fall back to platform defaults if no org-specific policy exists yet
  const allowedRoles: string[] =
    (policy?.roles_allowed as string[] | undefined) ?? ["super_admin", "org_admin"];

  const canApprove =
    isSuperAdmin || allowedRoles.includes(userRole ?? "");

  const requiresTwoLevels =
    (policy?.approval_levels_required ?? 1) >= 2;

  const autoApproveBelow =
    policy?.auto_approve_if_below_threshold
      ? (policy.min_amount_threshold ?? 0)
      : 0;

  return { policy, canApprove, requiresTwoLevels, autoApproveBelow, allowedRoles };
}
