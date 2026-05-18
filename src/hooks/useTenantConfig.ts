import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantConfig {
  id: string;
  organization_id: string | null;
  user_id: string;
  company_name: string;
  business_email: string | null;
  admin_phone: string | null;
  country: string;
  operating_cities: string[];
  company_size: string | null;
  operating_model: "haulage" | "multidrop" | "hybrid";
  fleet_count: number;
  vehicle_count: number;
  vehicle_classes: string[];
  ownership_type: string;
  branch_count: number;
  order_channels: string[];
  billing_currency: string;
  billing_cycle: string;
  tax_id: string | null;
  plan_tier: "free" | "starter" | "growth" | "enterprise";
  plan_started_at: string;
  ai_credits_total: number;
  ai_credits_used: number;
  ai_credits_rollover: number;
  ai_auto_purchase: boolean;
  ai_budget_cap: number | null;
  max_users: number;
  max_vehicles: number;
  max_branches: number;
  max_monthly_dispatches: number;
  max_api_calls: number;
  max_integrations: number;
  ops_can_add_fleet: boolean;
  ops_can_add_vehicles: boolean;
  ops_can_add_drivers: boolean;
  ops_can_add_maintenance: boolean;
  ops_can_create_dispatch: boolean;
  ops_can_approve_dispatch: boolean;
  ops_can_generate_waybill: boolean;
  ops_can_connect_integrations: boolean;
  ops_can_manage_order_inbox: boolean;
  ops_can_edit_customers: boolean;
  ops_can_see_billing: boolean;
  ops_can_see_finance: boolean;
  dispatch_approval_required: boolean;
  high_value_dispatch_threshold: number;
  waybill_auto_generate: boolean;
  maintenance_logging_required: boolean;
  enabled_modules: string[];
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  onboarding_step: number;
}

const PLAN_LIMITS: Record<string, Partial<TenantConfig>> = {
  free: {
    max_users: 3, max_vehicles: 1, max_branches: 1,
    max_monthly_dispatches: 10, max_api_calls: 0, max_integrations: 0,
    ai_credits_total: 0,
  },
  starter: {
    max_users: 10, max_vehicles: 20, max_branches: 3,
    max_monthly_dispatches: 500, max_api_calls: 1000, max_integrations: 2,
    ai_credits_total: 0,
  },
  growth: {
    max_users: 50, max_vehicles: 100, max_branches: 10,
    max_monthly_dispatches: 5000, max_api_calls: 10000, max_integrations: 5,
    ai_credits_total: 500,
  },
  enterprise: {
    max_users: 999, max_vehicles: 999, max_branches: 999,
    max_monthly_dispatches: 99999, max_api_calls: 99999, max_integrations: 99,
    ai_credits_total: 2000,
  },
};

export function getPlanLimits(tier: string) {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}

export function useTenantConfig() {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["tenant-config", user?.id, organizationId],
    queryFn: async () => {
      if (!user) return null;

      // 1. Try organization-scoped config first (multi-user orgs)
      if (organizationId) {
        const { data: orgRow, error: orgErr } = await supabase
          .from("tenant_config" as any)
          .select("*")
          .eq("organization_id", organizationId)
          .limit(1)
          .maybeSingle();
        if (orgErr) throw orgErr;
        if (orgRow) return orgRow as unknown as TenantConfig;
      }

      // 2. Fallback: config originally created against this user (pre-org or solo)
      const { data: userRow, error: userErr } = await supabase
        .from("tenant_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (userErr) throw userErr;
      if (!userRow) return null;

      // 3. Heal: if we have an org but the row has no org_id, attach it so future queries match
      const row = userRow as any;
      if (organizationId && !row.organization_id) {
        const { data: healed } = await supabase
          .from("tenant_config" as any)
          .update({ organization_id: organizationId })
          .eq("id", row.id)
          .select("*")
          .maybeSingle();
        if (healed) return healed as unknown as TenantConfig;
      }
      return row as TenantConfig;
    },
    enabled: !!user,
  });

  const upsertConfig = useMutation({
    mutationFn: async (updates: Partial<TenantConfig>) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...updates, user_id: user.id };
      if (organizationId && !payload.organization_id) {
        payload.organization_id = organizationId;
      }
      const { data, error } = await supabase
        .from("tenant_config" as any)
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TenantConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
    },
  });

  return { config, isLoading, upsertConfig };
}
