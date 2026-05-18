/**
 * Hook: Industry OS Feature Access Controller
 * 
 * Reads the user's industry role, plan tier, and industry vertical
 * to determine exactly which modules, AI tools, actions, and data
 * they can access. Enforces cross-OS delineation.
 */
import { useMemo } from "react";
import {
  IndustryRole,
  IndustryModule,
  SalesAITool,
  SalesPlanTier,
  IndustryVertical,
  INDUSTRY_ROLE_MATRIX,
  SALES_PLAN_MODULES,
  SALES_PLAN_AI,
  INDUSTRY_MODULE_EXTENSIONS,
  LOGISTICS_ONLY_MODULES,
  FULFILLMENT_HANDOFFS,
  canRoleAccessModule,
  canRoleUseAI,
  getEffectiveModules,
  type RoleFeatureConfig,
  type DataScope,
} from "@/lib/industry/featureSeparationMatrix";

export interface IndustryFeatureAccess {
  /** Current role config */
  roleConfig: RoleFeatureConfig | null;
  /** Effective visible modules after plan + role filtering */
  visibleModules: IndustryModule[];
  /** Available AI tools after plan + role filtering */
  availableAI: SalesAITool[];
  /** Data scope for this role */
  dataScope: DataScope | null;
  /** Industry-specific extensions */
  industryExtensions: string[];
  /** Allowed fulfillment handoffs */
  fulfillmentHandoffs: string[];
  /** Default home page for this role */
  defaultHome: string;

  /** Check if a specific module is accessible */
  canAccess: (module: IndustryModule) => boolean;
  /** Check if an AI tool is available */
  canUseAI: (tool: SalesAITool) => boolean;
  /** Check if role can approve in a module */
  canApprove: (module: IndustryModule) => boolean;
  /** Check if role can export from a module */
  canExport: (module: IndustryModule) => boolean;
  /** Check if a sensitive field is visible */
  canSeeSensitive: (field: string) => boolean;
  /** Check if this is a logistics-only module (should be hidden) */
  isBlockedLogisticsModule: (moduleId: string) => boolean;
}

export function useIndustryFeatureAccess(
  role: IndustryRole | null,
  plan: SalesPlanTier = "free",
  industry: IndustryVertical = "fmcg"
): IndustryFeatureAccess {
  return useMemo(() => {
    const roleConfig = role ? INDUSTRY_ROLE_MATRIX[role] ?? null : null;

    const visibleModules = role ? getEffectiveModules(role, plan) : [];
    
    const availableAI = role && roleConfig
      ? roleConfig.aiTools.filter(t => (SALES_PLAN_AI[plan] || []).includes(t))
      : [];

    const industryExtensions = INDUSTRY_MODULE_EXTENSIONS[industry] || [];

    const fulfillmentHandoffs = roleConfig?.crossOSHandoffs || [];

    return {
      roleConfig,
      visibleModules,
      availableAI,
      dataScope: roleConfig?.dataScope ?? null,
      industryExtensions,
      fulfillmentHandoffs,
      defaultHome: roleConfig?.defaultHome ?? "/sales/dashboard",

      canAccess: (module: IndustryModule) =>
        role ? canRoleAccessModule(role, module, plan) : false,

      canUseAI: (tool: SalesAITool) =>
        role ? canRoleUseAI(role, tool, plan) : false,

      canApprove: (module: IndustryModule) =>
        roleConfig?.approvalRights.includes(module) ?? false,

      canExport: (module: IndustryModule) =>
        roleConfig?.exportRights.includes(module) ?? false,

      canSeeSensitive: (field: string) =>
        roleConfig?.sensitiveFieldAccess.includes(field) ?? false,

      isBlockedLogisticsModule: (moduleId: string) =>
        (LOGISTICS_ONLY_MODULES as readonly string[]).includes(moduleId),
    };
  }, [role, plan, industry]);
}
