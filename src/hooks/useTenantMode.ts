import { useTenantConfig } from "@/hooks/useTenantConfig";

export type TenantMode = "LOGISTICS_COMPANY" | "LOGISTICS_DEPARTMENT";

/**
 * Mode-aware role display labels.
 * Backend role names (super_admin, org_admin, ops_manager, support) NEVER change.
 * Only the UI label changes based on tenant mode.
 */
const ROLE_LABELS: Record<TenantMode, Record<string, string>> = {
  LOGISTICS_COMPANY: {
    super_admin: "Super Admin",
    admin: "Administrator",
    org_admin: "Org Admin",
    ops_manager: "Operations Manager",
    finance_manager: "Finance Manager",
    support: "Support",
    driver: "Driver",
    customer: "Customer",
  },
  LOGISTICS_DEPARTMENT: {
    super_admin: "Logistics Director",
    admin: "Logistics Director",
    org_admin: "Logistics Manager",
    ops_manager: "Outbound Officer",
    finance_manager: "Cost Controller",
    support: "Support",
    driver: "Driver",
    customer: "Internal Stakeholder",
  },
};

/**
 * Mode-aware metric labels for dashboard switching.
 */
const METRIC_LABELS: Record<TenantMode, Record<string, string>> = {
  LOGISTICS_COMPANY: {
    revenue: "Revenue",
    profit: "Profit",
    clients: "Clients",
    invoices: "Invoices",
    dashboardTitle: "Revenue Dashboard",
    primaryKpi: "Are we making money?",
  },
  LOGISTICS_DEPARTMENT: {
    revenue: "Cost Savings",
    profit: "Efficiency Gains",
    clients: "Internal Stakeholders",
    invoices: "Delivery Reports",
    dashboardTitle: "Logistics Efficiency Dashboard",
    primaryKpi: "Are we moving efficiently at lowest cost?",
  },
};

/**
 * Modules gated by tenant mode. Department mode hides reseller, AI CEO, finance engine.
 */
const MODULE_ACCESS: Record<TenantMode, Record<string, boolean>> = {
  LOGISTICS_COMPANY: {
    reseller: true,
    aiCeo: true,
    financeEngine: true,
    websiteBuilder: true,
    aiBoard: true,
    investorMode: true,
  },
  LOGISTICS_DEPARTMENT: {
    reseller: false,
    aiCeo: false,
    financeEngine: false,
    websiteBuilder: false,
    aiBoard: false,
    investorMode: false,
  },
};

export function useTenantMode() {
  const { config, isLoading } = useTenantConfig();
  const mode: TenantMode =
    ((config as any)?.tenant_mode as TenantMode) || "LOGISTICS_COMPANY";

  const isDepartment = mode === "LOGISTICS_DEPARTMENT";
  const isCompany = mode === "LOGISTICS_COMPANY";

  const labelForRole = (role?: string | null) =>
    role ? ROLE_LABELS[mode][role] || role : "";
  const labelForMetric = (key: string) =>
    METRIC_LABELS[mode][key] || key;
  const canAccessModule = (key: keyof (typeof MODULE_ACCESS)["LOGISTICS_COMPANY"]) =>
    MODULE_ACCESS[mode][key] ?? true;

  return {
    mode,
    isLoading,
    isDepartment,
    isCompany,
    isLocked: !!(config as any)?.mode_locked_at,
    labelForRole,
    labelForMetric,
    canAccessModule,
    aiAutonomy: ((config as any)?.ai_autonomy_mode as "full" | "approval" | "manual") || "approval",
    websiteBuilderEnabled: !!(config as any)?.enable_website_builder,
    usesWarehouseDispatch: !!(config as any)?.uses_warehouse_dispatch,
  };
}

export default useTenantMode;
