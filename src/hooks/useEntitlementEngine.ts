/**
 * useEntitlementEngine - Central hook for real-time entitlement checks
 * 
 * Combines tenant config (Logistics OS), industry entitlements,
 * and AI credit tracking into a single enforcement interface.
 */
import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import {
  checkFeatureEntitlement,
  checkAICreditEntitlement,
  checkUsageLimit,
  checkOSBoundary,
  getUsageLevel,
  AI_CREDIT_COSTS,
  INDUSTRY_PLANS,
  type PlatformProduct,
  type IndustryPlanTier,
  type EntitlementCheckResult,
  type UsageLevel,
} from "@/lib/entitlements/engine";

interface IndustryEntitlement {
  id: string;
  plan_tier: string;
  industry_vertical: string;
  max_users: number;
  max_ai_credits_monthly: number;
  ai_credits_used: number;
  ai_credits_total: number;
  enabled_modules: string[];
  enabled_ai_tools: string[];
  api_access_enabled: boolean;
  conversation_intelligence: boolean;
  offline_mode_level: string;
}

export interface EntitlementEngine {
  // State
  isLoading: boolean;
  logisticsPlan: string;
  industryPlan: string;
  industryVertical: string;
  aiCreditsRemaining: number;
  aiCreditsTotal: number;
  aiCreditsUsed: number;

  // Check functions
  checkFeature: (requiredPlan: string, allowedRoles?: string[]) => EntitlementCheckResult;
  checkAI: (actionId: string) => EntitlementCheckResult;
  checkUsage: (resource: string, current: number) => EntitlementCheckResult;
  checkOS: (featureOS: PlatformProduct, currentOS: PlatformProduct) => EntitlementCheckResult;
  getCreditsForAction: (actionId: string) => number;
  getUsageLevel: (current: number, max: number) => UsageLevel;

  // Actions
  consumeCredits: (actionId: string) => Promise<boolean>;

  // Plan info
  industryPlanConfig: typeof INDUSTRY_PLANS[IndustryPlanTier];
  logisticsLimits: {
    maxUsers: number;
    maxVehicles: number;
    maxBranches: number;
    maxDispatches: number;
    maxApiCalls: number;
  };
}

export function useEntitlementEngine(): EntitlementEngine {
  const { user, userRole } = useAuth();
  const { config: tenantConfig, isLoading: tenantLoading } = useTenantConfig();
  const queryClient = useQueryClient();

  // Fetch industry entitlements
  const { data: industryEnt, isLoading: industryLoading } = useQuery({
    queryKey: ["industry-entitlements", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("industry_entitlements" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as IndustryEntitlement | null;
    },
    enabled: !!user,
  });

  const isLoading = tenantLoading || industryLoading;

  // Derive plan tiers
  const logisticsPlan = tenantConfig?.plan_tier || "free";
  const industryPlan = industryEnt?.plan_tier || "free";
  const industryVertical = industryEnt?.industry_vertical || "fmcg";

  // AI credits (combine logistics + industry)
  const logisticsCreditsRemaining = Math.max(0,
    (tenantConfig?.ai_credits_total || 0) - (tenantConfig?.ai_credits_used || 0)
  );
  const industryCreditsRemaining = Math.max(0,
    (industryEnt?.ai_credits_total || 0) - (industryEnt?.ai_credits_used || 0)
  );
  const aiCreditsRemaining = logisticsCreditsRemaining + industryCreditsRemaining;
  const aiCreditsTotal = (tenantConfig?.ai_credits_total || 0) + (industryEnt?.ai_credits_total || 0);
  const aiCreditsUsed = (tenantConfig?.ai_credits_used || 0) + (industryEnt?.ai_credits_used || 0);

  // Industry plan config
  const industryPlanConfig = INDUSTRY_PLANS[industryPlan as IndustryPlanTier] || INDUSTRY_PLANS.free;

  // Logistics limits
  const logisticsLimits = useMemo(() => ({
    maxUsers: tenantConfig?.max_users || 3,
    maxVehicles: tenantConfig?.max_vehicles || 1,
    maxBranches: tenantConfig?.max_branches || 1,
    maxDispatches: tenantConfig?.max_monthly_dispatches || 10,
    maxApiCalls: tenantConfig?.max_api_calls || 0,
  }), [tenantConfig]);

  // Check functions
  const checkFeature = useCallback((requiredPlan: string, allowedRoles?: string[]) => {
    return checkFeatureEntitlement(
      industryPlan || logisticsPlan,
      requiredPlan,
      userRole || undefined,
      allowedRoles,
    );
  }, [industryPlan, logisticsPlan, userRole]);

  const checkAI = useCallback((actionId: string) => {
    const plan = industryPlan || logisticsPlan;
    return checkAICreditEntitlement(actionId, plan, aiCreditsRemaining);
  }, [industryPlan, logisticsPlan, aiCreditsRemaining]);

  const checkUsageFn = useCallback((resource: string, current: number) => {
    const limits: Record<string, number> = {
      users: logisticsLimits.maxUsers,
      vehicles: logisticsLimits.maxVehicles,
      branches: logisticsLimits.maxBranches,
      dispatches: logisticsLimits.maxDispatches,
      api_calls: logisticsLimits.maxApiCalls,
      industry_users: industryPlanConfig.maxUsers,
    };
    const max = limits[resource] ?? 999999;
    return checkUsageLimit(current, max, resource.replace(/_/g, " "));
  }, [logisticsLimits, industryPlanConfig]);

  const checkOS = useCallback((featureOS: PlatformProduct, currentOS: PlatformProduct) => {
    return checkOSBoundary(currentOS, featureOS);
  }, []);

  const getCreditsForAction = useCallback((actionId: string) => {
    return AI_CREDIT_COSTS.find(a => a.actionId === actionId)?.credits || 0;
  }, []);

  // Consume AI credits
  const consumeCreditsMutation = useMutation({
    mutationFn: async (actionId: string) => {
      if (!user) throw new Error("Not authenticated");
      const action = AI_CREDIT_COSTS.find(a => a.actionId === actionId);
      if (!action) throw new Error("Unknown AI action");

      const { error } = await supabase
        .from("ai_credit_transactions" as any)
        .insert({
          user_id: user.id,
          action_id: actionId,
          action_label: action.label,
          credits_consumed: action.credits,
          os_context: action.os,
          balance_after: Math.max(0, aiCreditsRemaining - action.credits),
        } as any);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
    },
  });

  return {
    isLoading,
    logisticsPlan,
    industryPlan,
    industryVertical,
    aiCreditsRemaining,
    aiCreditsTotal,
    aiCreditsUsed,
    checkFeature,
    checkAI,
    checkUsage: checkUsageFn,
    checkOS,
    getCreditsForAction,
    getUsageLevel,
    consumeCredits: async (actionId: string) => {
      try {
        await consumeCreditsMutation.mutateAsync(actionId);
        return true;
      } catch {
        return false;
      }
    },
    industryPlanConfig,
    logisticsLimits,
  };
}
