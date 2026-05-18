/**
 * Hook that reads tenant_config and provides plan enforcement utilities.
 * Used by Sidebar, pages, and action buttons to enforce entitlements.
 */
import { useMemo } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import {
  PlanTier,
  OperatingModel,
  LogisticsModule,
  isModuleAccessible,
  isRouteAccessible,
  checkEntitlement,
  canUseAIAction,
  getUsageState,
  getPlanLimits,
  ROUTE_TO_MODULE,
  UsageState,
  PlanLimits,
  EntitlementResult,
} from "@/lib/plans/entitlements";

export interface PlanEntitlements {
  plan: PlanTier;
  model: OperatingModel;
  limits: PlanLimits;
  aiCreditsRemaining: number;
  isLoading: boolean;
  hasConfig: boolean;

  /** Check if a module is accessible on current plan */
  canAccessModule: (module: LogisticsModule) => boolean;

  /** Check if a sidebar route is accessible */
  canAccessRoute: (route: string) => boolean;

  /** Full entitlement check with upsell info */
  checkModule: (module: LogisticsModule) => EntitlementResult;

  /** Check if an AI action can be performed */
  canUseAI: (actionId: string) => { allowed: boolean; reason?: string };

  /** Get usage state for a resource */
  getUsage: (resource: keyof PlanLimits, current: number) => UsageState;

  /** Get the module ID for a route */
  getRouteModule: (route: string) => LogisticsModule | undefined;
}

export function usePlanEntitlements(): PlanEntitlements {
  const { config, isLoading } = useTenantConfig();

  return useMemo(() => {
    const plan: PlanTier = (config?.plan_tier as PlanTier) || "free";
    const model: OperatingModel = (config?.operating_model as OperatingModel) || "haulage";
    const limits = getPlanLimits(plan);
    const aiCreditsRemaining = Math.max(0, (config?.ai_credits_total || 0) - (config?.ai_credits_used || 0));

    return {
      plan,
      model,
      limits,
      aiCreditsRemaining,
      isLoading,
      hasConfig: !!config,

      canAccessModule: (module: LogisticsModule) => isModuleAccessible(plan, module),

      canAccessRoute: (route: string) => isRouteAccessible(plan, route),

      checkModule: (module: LogisticsModule) => checkEntitlement(plan, module),

      canUseAI: (actionId: string) => canUseAIAction(plan, actionId, aiCreditsRemaining),

      getUsage: (resource: keyof PlanLimits, current: number) => getUsageState(current, limits[resource]),

      getRouteModule: (route: string) => ROUTE_TO_MODULE[route],
    };
  }, [config, isLoading]);
}
