/**
 * RouteAce Logistics OS - Pricing-to-Product Enforcement Matrix
 * 
 * Single source of truth mapping plan tiers + operating models
 * to module access, action permissions, usage limits, and AI credit rules.
 */

export type PlanTier = "free" | "starter" | "growth" | "enterprise";
export type OperatingModel = "haulage" | "multidrop" | "hybrid";

// ─── Module IDs ──────────────────────────────────────────────────
export type LogisticsModule =
  // Core
  | "dashboard"
  | "orders"
  | "order_inbox"
  | "order_auto_group"
  | "dispatch"
  | "dispatch_approvals"
  | "dispatch_waybills"
  | "dispatch_pod"
  | "route_planner"
  | "advanced_routes"
  // Fleet
  | "fleet"
  | "vehicles"
  | "drivers"
  | "maintenance"
  | "fuel_logs"
  // Customers
  | "customers"
  | "customer_pricing"
  | "customer_sla"
  // Finance
  | "invoices"
  | "billing"
  | "receivables"
  | "payables"
  | "expenses"
  | "payroll"
  | "ccc_kpis"
  | "cost_per_trip"
  | "margin_per_route"
  | "cashflow_ai"
  | "financial_statements"
  | "chart_of_accounts"
  | "tax_engines"
  | "revenue_recognition"
  // Integrations
  | "api_access"
  | "webhooks"
  | "whatsapp_business"
  | "instagram_business"
  | "customer_portal"
  // Reports
  | "reports_operational"
  | "reports_fleet"
  | "reports_finance"
  | "reports_ai_usage"
  // Intelligence
  | "ai_controller"
  | "market_intelligence"
  | "predictive_alerts"
  // Settings & Admin
  | "settings"
  | "team_management"
  | "roles_permissions"
  | "approval_center"
  | "sla_management"
  | "fleet_command"
  | "tracking"
  // Security
  | "security_center"
  | "audit_trails";

// ─── Action Types ────────────────────────────────────────────────
export type ModuleAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "automate" | "ai_analyze";

// ─── Plan Limits ─────────────────────────────────────────────────
export interface PlanLimits {
  max_users: number;
  max_vehicles: number;
  max_branches: number;
  max_monthly_dispatches: number;
  max_daily_stops: number;
  max_api_calls: number;
  max_integrations: number;
  max_customer_portal_accounts: number;
  ai_credits_monthly: number;
  ai_credit_rollover_months: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    max_users: 3,
    max_vehicles: 3,
    max_branches: 1,
    max_monthly_dispatches: 10,
    max_daily_stops: 10,
    max_api_calls: 0,
    max_integrations: 0,
    max_customer_portal_accounts: 0,
    ai_credits_monthly: 0,
    ai_credit_rollover_months: 0,
  },
  starter: {
    max_users: 10,
    max_vehicles: 20,
    max_branches: 3,
    max_monthly_dispatches: 500,
    max_daily_stops: 100,
    max_api_calls: 1000,
    max_integrations: 2,
    max_customer_portal_accounts: 10,
    ai_credits_monthly: 0,
    ai_credit_rollover_months: 0,
  },
  growth: {
    max_users: 50,
    max_vehicles: 100,
    max_branches: 10,
    max_monthly_dispatches: 5000,
    max_daily_stops: 500,
    max_api_calls: 10000,
    max_integrations: 5,
    max_customer_portal_accounts: 50,
    ai_credits_monthly: 500,
    ai_credit_rollover_months: 3,
  },
  enterprise: {
    max_users: 9999,
    max_vehicles: 9999,
    max_branches: 999,
    max_monthly_dispatches: 99999,
    max_daily_stops: 99999,
    max_api_calls: 99999,
    max_integrations: 99,
    max_customer_portal_accounts: 9999,
    ai_credits_monthly: 2000,
    ai_credit_rollover_months: 6,
  },
};

// ─── Module Access by Plan ───────────────────────────────────────
// true = included, false = locked
type ModuleAccessMap = Record<LogisticsModule, boolean>;

const FREE_MODULES: ModuleAccessMap = {
  dashboard: true,
  orders: true,
  order_inbox: false,
  order_auto_group: false,
  dispatch: true,
  dispatch_approvals: false,
  dispatch_waybills: false,
  dispatch_pod: false,
  route_planner: false,
  advanced_routes: false,
  fleet: true,
  vehicles: true,
  drivers: true,
  maintenance: false,
  fuel_logs: false,
  customers: true,
  customer_pricing: false,
  customer_sla: false,
  invoices: true,
  billing: false,
  receivables: false,
  payables: false,
  expenses: false,
  payroll: false,
  ccc_kpis: false,
  cost_per_trip: false,
  margin_per_route: false,
  cashflow_ai: false,
  financial_statements: false,
  chart_of_accounts: false,
  tax_engines: false,
  revenue_recognition: false,
  api_access: false,
  webhooks: false,
  whatsapp_business: false,
  instagram_business: false,
  customer_portal: false,
  reports_operational: true,
  reports_fleet: false,
  reports_finance: false,
  reports_ai_usage: false,
  ai_controller: false,
  market_intelligence: false,
  predictive_alerts: false,
  settings: true,
  team_management: true,
  roles_permissions: false,
  approval_center: false,
  sla_management: false,
  fleet_command: false,
  tracking: true,
  security_center: false,
  audit_trails: false,
};

const STARTER_MODULES: ModuleAccessMap = {
  ...FREE_MODULES,
  order_inbox: true,
  dispatch_waybills: true,
  dispatch_pod: true,
  route_planner: true,
  fleet_command: true,
  maintenance: true,
  fuel_logs: true,
  customer_pricing: true,
  invoices: true,
  billing: true,
  receivables: true,
  payables: true,
  expenses: true,
  payroll: true,
  cost_per_trip: true,
  reports_fleet: true,
  reports_finance: true,
  roles_permissions: true,
  approval_center: true,
  tracking: true,
  security_center: true,
  audit_trails: true,
};

const GROWTH_MODULES: ModuleAccessMap = {
  ...STARTER_MODULES,
  order_auto_group: true,
  dispatch_approvals: true,
  advanced_routes: true,
  customer_sla: true,
  ccc_kpis: true,
  margin_per_route: true,
  cashflow_ai: true,
  financial_statements: true,
  chart_of_accounts: true,
  tax_engines: true,
  api_access: true,
  webhooks: true,
  whatsapp_business: true,
  customer_portal: true,
  reports_ai_usage: true,
  ai_controller: true,
  market_intelligence: true,
  predictive_alerts: true,
  sla_management: true,
};

const ENTERPRISE_MODULES: ModuleAccessMap = {
  ...GROWTH_MODULES,
  instagram_business: true,
  revenue_recognition: true,
};

export const PLAN_MODULES: Record<PlanTier, ModuleAccessMap> = {
  free: FREE_MODULES,
  starter: STARTER_MODULES,
  growth: GROWTH_MODULES,
  enterprise: ENTERPRISE_MODULES,
};

// ─── Operating Model Relevance ───────────────────────────────────
// Modules that are MORE relevant for each model (shown prominently)
export const MODEL_PRIORITY_MODULES: Record<OperatingModel, LogisticsModule[]> = {
  haulage: [
    "dispatch", "fleet", "vehicles", "drivers", "maintenance",
    "fuel_logs", "cost_per_trip", "invoices", "receivables",
    "ccc_kpis", "tracking", "fleet_command",
  ],
  multidrop: [
    "orders", "order_inbox", "order_auto_group", "dispatch",
    "route_planner", "advanced_routes", "dispatch_pod",
    "customer_sla", "customers", "tracking", "sla_management",
  ],
  hybrid: [
    "orders", "order_inbox", "dispatch", "fleet", "vehicles",
    "drivers", "route_planner", "cost_per_trip", "invoices",
    "tracking", "fleet_command", "customer_sla",
  ],
};

// ─── AI Credit Consumers ─────────────────────────────────────────
export interface AICreditAction {
  id: string;
  label: string;
  credits_per_use: number;
  module: LogisticsModule;
  min_plan: PlanTier;
}

export const AI_CREDIT_ACTIONS: AICreditAction[] = [
  { id: "route_optimization", label: "Route Optimization", credits_per_use: 5, module: "advanced_routes", min_plan: "growth" },
  { id: "auto_group_route", label: "Auto Group Route", credits_per_use: 3, module: "order_auto_group", min_plan: "growth" },
  { id: "predictive_sla", label: "Predictive SLA Alert", credits_per_use: 2, module: "predictive_alerts", min_plan: "growth" },
  { id: "margin_routing", label: "Margin-Aware Routing", credits_per_use: 4, module: "margin_per_route", min_plan: "growth" },
  { id: "fuel_variance", label: "Fuel Variance Detection", credits_per_use: 2, module: "fuel_logs", min_plan: "growth" },
  { id: "dynamic_replan", label: "Dynamic Re-Planning", credits_per_use: 5, module: "advanced_routes", min_plan: "growth" },
  { id: "cashflow_forecast", label: "Cashflow AI Forecast", credits_per_use: 3, module: "cashflow_ai", min_plan: "growth" },
  { id: "smart_matching", label: "Smart Customer Matching", credits_per_use: 2, module: "market_intelligence", min_plan: "growth" },
];

// ─── Sidebar Route → Module Mapping ──────────────────────────────
// Maps Logistics OS sidebar hrefs to module IDs for entitlement enforcement.
// BOUNDARY: Only logistics-relevant routes are mapped here.
// Distribution Exchange, PortoDash, FinTech, Platform routes are NOT mapped
// because they belong to separate platforms.
export const ROUTE_TO_MODULE: Record<string, LogisticsModule> = {
  "/": "dashboard",
  "/control-center": "dashboard",
  "/dispatch": "dispatch",
  "/routes": "route_planner",
  "/advanced-route-planner": "advanced_routes",
  "/operations/sla-management": "sla_management",
  "/tracking": "tracking",
  "/drivers": "drivers",
  "/fleet": "fleet",
  "/customers": "customers",
  "/fleet-command": "fleet_command",
  "/invoices": "invoices",
  "/accounts-ledger": "receivables",
  "/expenses": "expenses",
  "/payroll": "payroll",
  "/driver-payroll": "payroll",
  "/driver-bonuses": "payroll",
  "/multidrop": "billing",
  "/payout-engine": "payables",
  "/loan-management": "billing",
  "/tax-filing-report": "tax_engines",
  "/chart-of-accounts": "chart_of_accounts",
  "/tax-engines": "tax_engines",
  "/financial-statements": "financial_statements",
  "/cashflow-forecast": "cashflow_ai",
  "/fleet-financial-intelligence": "ccc_kpis",
  "/revenue-recognition": "revenue_recognition",
  "/analytics": "reports_operational",
  "/admin-analytics": "reports_finance",
  "/kpi-dashboard": "reports_operational",
  "/investor": "reports_finance",
  "/ai-operations": "ai_controller",
  "/market-intelligence": "market_intelligence",
  "/approval-center": "approval_center",
  "/api-access": "api_access",
  "/settings": "settings",
  "/users": "team_management",
  "/security-center": "security_center",
};

// ─── Upsell Messages ────────────────────────────────────────────
export const UPSELL_MESSAGES: Partial<Record<LogisticsModule, { title: string; upgrade_to: PlanTier }>> = {
  order_auto_group: { title: "AI Auto Group Route requires Growth plan", upgrade_to: "growth" },
  advanced_routes: { title: "Advanced Route Planning requires Growth plan", upgrade_to: "growth" },
  ai_controller: { title: "AI Operations requires Growth plan", upgrade_to: "growth" },
  predictive_alerts: { title: "Predictive Alerts require Growth plan", upgrade_to: "growth" },
  cashflow_ai: { title: "Cashflow AI requires Growth plan", upgrade_to: "growth" },
  api_access: { title: "API Access requires Growth plan", upgrade_to: "growth" },
  whatsapp_business: { title: "WhatsApp Business requires Growth plan", upgrade_to: "growth" },
  instagram_business: { title: "Instagram Business requires Enterprise plan", upgrade_to: "enterprise" },
  revenue_recognition: { title: "Revenue Recognition requires Enterprise plan", upgrade_to: "enterprise" },
  customer_portal: { title: "Customer Portal requires Growth plan", upgrade_to: "growth" },
  market_intelligence: { title: "Market Intelligence requires Growth plan", upgrade_to: "growth" },
};

// ─── Helper Functions ────────────────────────────────────────────

export function isModuleAccessible(plan: PlanTier, module: LogisticsModule): boolean {
  return PLAN_MODULES[plan]?.[module] ?? false;
}

export function isRouteAccessible(plan: PlanTier, route: string): boolean {
  const module = ROUTE_TO_MODULE[route];
  if (!module) return true; // Routes not mapped are accessible (e.g., admin-only pages)
  return isModuleAccessible(plan, module);
}

export function getModuleUpsell(module: LogisticsModule): { title: string; upgrade_to: PlanTier } | null {
  return UPSELL_MESSAGES[module] ?? null;
}

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function isModelRelevant(model: OperatingModel, module: LogisticsModule): boolean {
  return MODEL_PRIORITY_MODULES[model]?.includes(module) ?? false;
}

export function canUseAIAction(plan: PlanTier, actionId: string, creditsRemaining: number): { allowed: boolean; reason?: string } {
  const action = AI_CREDIT_ACTIONS.find(a => a.id === actionId);
  if (!action) return { allowed: false, reason: "Unknown AI action" };

  const planOrder: PlanTier[] = ["free", "starter", "growth", "enterprise"];
  if (planOrder.indexOf(plan) < planOrder.indexOf(action.min_plan)) {
    return { allowed: false, reason: `Requires ${action.min_plan} plan or higher` };
  }

  if (creditsRemaining < action.credits_per_use) {
    return { allowed: false, reason: `Insufficient AI credits (need ${action.credits_per_use}, have ${creditsRemaining})` };
  }

  return { allowed: true };
}

// ─── Usage Threshold States ──────────────────────────────────────
export type UsageState = "within_limit" | "near_limit" | "at_limit" | "exceeded";

export function getUsageState(current: number, max: number): UsageState {
  if (max <= 0) return "at_limit";
  const ratio = current / max;
  if (ratio >= 1) return current > max ? "exceeded" : "at_limit";
  if (ratio >= 0.85) return "near_limit";
  return "within_limit";
}

// ─── Full Entitlement Check ──────────────────────────────────────
export interface EntitlementResult {
  accessible: boolean;
  reason?: string;
  upgrade_to?: PlanTier;
}

export function checkEntitlement(
  plan: PlanTier,
  module: LogisticsModule,
): EntitlementResult {
  if (isModuleAccessible(plan, module)) {
    return { accessible: true };
  }
  const upsell = getModuleUpsell(module);
  return {
    accessible: false,
    reason: upsell?.title || `This feature is not available on your current plan`,
    upgrade_to: upsell?.upgrade_to,
  };
}
