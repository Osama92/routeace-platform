/**
 * RouteAce Unified Entitlement Engine
 * 
 * Central enforcement layer governing feature access, AI credits,
 * usage limits, and plan gating across ALL RouteAce OS products.
 * 
 * Every feature check flows through: UI → Hook → Engine → Backend
 */

// ─── Platform Products ──────────────────────────────────────────
export type PlatformProduct =
  | "logistics_os"
  | "industry_os"
  | "portodash"
  | "trade_finance"
  | "distribution_exchange"
  | "embedded_commerce"
  | "control_tower"
  | "partner_console";

// ─── Industry OS Plan Tiers (Naira-based) ───────────────────────
export type IndustryPlanTier = "free" | "growth" | "enterprise" | "custom";

export interface IndustryPlanConfig {
  tier: IndustryPlanTier;
  label: string;
  pricePerUserNGN: number;
  pricePerUserUSD: number;
  maxUsers: number;
  aiCreditsPerUser: number;
  apiAccess: boolean;
  offlineLevel: "none" | "basic" | "full";
  conversationIntelligence: boolean;
  customObjects: boolean;
  sandbox: boolean;
  advancedForecasting: boolean;
  distributorSales: boolean;
  commissionEngine: boolean;
  automationWorkflows: "none" | "basic" | "advanced" | "unlimited";
  supportSLA: string;
}

export const INDUSTRY_PLANS: Record<IndustryPlanTier, IndustryPlanConfig> = {
  free: {
    tier: "free",
    label: "Free",
    pricePerUserNGN: 0,
    pricePerUserUSD: 0,
    maxUsers: 2,
    aiCreditsPerUser: 0,
    apiAccess: false,
    offlineLevel: "none",
    conversationIntelligence: false,
    customObjects: false,
    sandbox: false,
    advancedForecasting: false,
    distributorSales: false,
    commissionEngine: false,
    automationWorkflows: "none",
    supportSLA: "community",
  },
  growth: {
    tier: "growth",
    label: "Growth",
    pricePerUserNGN: 15000,
    pricePerUserUSD: 10,
    maxUsers: 50,
    aiCreditsPerUser: 200,
    apiAccess: false,
    offlineLevel: "basic",
    conversationIntelligence: false,
    customObjects: false,
    sandbox: false,
    advancedForecasting: false,
    distributorSales: false,
    commissionEngine: false,
    automationWorkflows: "basic",
    supportSLA: "email_48h",
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    pricePerUserNGN: 35000,
    pricePerUserUSD: 23,
    maxUsers: 500,
    aiCreditsPerUser: 1000,
    apiAccess: true,
    offlineLevel: "full",
    conversationIntelligence: true,
    customObjects: true,
    sandbox: false,
    advancedForecasting: true,
    distributorSales: true,
    commissionEngine: true,
    automationWorkflows: "advanced",
    supportSLA: "email_24h",
  },
  custom: {
    tier: "custom",
    label: "Custom",
    pricePerUserNGN: 60000,
    pricePerUserUSD: 40,
    maxUsers: 99999,
    aiCreditsPerUser: 99999,
    apiAccess: true,
    offlineLevel: "full",
    conversationIntelligence: true,
    customObjects: true,
    sandbox: true,
    advancedForecasting: true,
    distributorSales: true,
    commissionEngine: true,
    automationWorkflows: "unlimited",
    supportSLA: "dedicated",
  },
};

// ─── AI Credit Costs ────────────────────────────────────────────
export interface AICreditCost {
  actionId: string;
  label: string;
  credits: number;
  os: PlatformProduct;
  minPlan: IndustryPlanTier | "starter" | "growth" | "enterprise";
}

export const AI_CREDIT_COSTS: AICreditCost[] = [
  // Industry OS Sales AI
  { actionId: "lead_scoring", label: "Lead Scoring", credits: 1, os: "industry_os", minPlan: "growth" },
  { actionId: "forecast_generation", label: "Forecast Generation", credits: 5, os: "industry_os", minPlan: "growth" },
  { actionId: "call_transcription", label: "Call Transcription", credits: 3, os: "industry_os", minPlan: "enterprise" },
  { actionId: "deal_risk_analysis", label: "Deal Risk Analysis", credits: 2, os: "industry_os", minPlan: "growth" },
  { actionId: "next_best_action", label: "Next Best Action", credits: 1, os: "industry_os", minPlan: "growth" },
  { actionId: "sales_coaching", label: "Sales Coaching AI", credits: 3, os: "industry_os", minPlan: "enterprise" },
  { actionId: "whatsapp_summary", label: "WhatsApp Summary", credits: 2, os: "industry_os", minPlan: "enterprise" },
  { actionId: "promotion_effectiveness", label: "Promotion Effectiveness", credits: 3, os: "industry_os", minPlan: "enterprise" },
  { actionId: "churn_detection", label: "Churn Detection", credits: 2, os: "industry_os", minPlan: "growth" },
  { actionId: "territory_performance", label: "Territory Performance AI", credits: 2, os: "industry_os", minPlan: "growth" },
  // Logistics OS AI
  { actionId: "route_optimization", label: "Route Optimization", credits: 5, os: "logistics_os", minPlan: "growth" },
  { actionId: "auto_group_route", label: "Auto Group Route", credits: 3, os: "logistics_os", minPlan: "growth" },
  { actionId: "predictive_sla", label: "Predictive SLA Alert", credits: 2, os: "logistics_os", minPlan: "growth" },
  { actionId: "margin_routing", label: "Margin-Aware Routing", credits: 4, os: "logistics_os", minPlan: "growth" },
  { actionId: "fuel_variance", label: "Fuel Variance Detection", credits: 2, os: "logistics_os", minPlan: "growth" },
  { actionId: "cashflow_forecast", label: "Cashflow AI Forecast", credits: 3, os: "logistics_os", minPlan: "growth" },
  { actionId: "demand_prediction", label: "Demand Prediction", credits: 5, os: "logistics_os", minPlan: "enterprise" },
];

// ─── Feature Registry ───────────────────────────────────────────
export interface FeatureDefinition {
  id: string;
  label: string;
  os: PlatformProduct;
  requiredPlan: string;
  aiCreditCost: number;
  description: string;
}

// ─── Entitlement Check Result ───────────────────────────────────
export type EntitlementDenialReason =
  | "plan_locked"
  | "role_denied"
  | "credits_exhausted"
  | "usage_limit_reached"
  | "os_boundary"
  | "reseller_restricted"
  | "not_authenticated";

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: EntitlementDenialReason;
  message?: string;
  upgradeTo?: string;
  creditsNeeded?: number;
  creditsAvailable?: number;
}

// ─── Plan Comparison (Industry OS tiers mapped to feature separation matrix tiers) ─
const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 2, // pro maps to growth
  enterprise: 3,
  unlimited: 4,
  custom: 4,
};

function planMeetsMinimum(currentPlan: string, requiredPlan: string): boolean {
  return (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 0);
}

// ─── Core Check Functions ───────────────────────────────────────

export function checkFeatureEntitlement(
  currentPlan: string,
  requiredPlan: string,
  userRole?: string,
  allowedRoles?: string[],
): EntitlementCheckResult {
  if (!planMeetsMinimum(currentPlan, requiredPlan)) {
    return {
      allowed: false,
      reason: "plan_locked",
      message: `Available on ${INDUSTRY_PLANS[requiredPlan as IndustryPlanTier]?.label || requiredPlan} plan`,
      upgradeTo: requiredPlan,
    };
  }
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: "role_denied",
      message: "Your role does not have access to this feature",
    };
  }
  return { allowed: true };
}

export function checkAICreditEntitlement(
  actionId: string,
  currentPlan: string,
  creditsRemaining: number,
): EntitlementCheckResult {
  const action = AI_CREDIT_COSTS.find(a => a.actionId === actionId);
  if (!action) {
    return { allowed: false, reason: "plan_locked", message: "Unknown AI action" };
  }
  if (!planMeetsMinimum(currentPlan, action.minPlan)) {
    return {
      allowed: false,
      reason: "plan_locked",
      message: `${action.label} requires ${action.minPlan} plan or higher`,
      upgradeTo: action.minPlan,
    };
  }
  if (creditsRemaining < action.credits) {
    return {
      allowed: false,
      reason: "credits_exhausted",
      message: `Insufficient AI credits (need ${action.credits}, have ${creditsRemaining})`,
      creditsNeeded: action.credits,
      creditsAvailable: creditsRemaining,
    };
  }
  return { allowed: true };
}

export function checkUsageLimit(
  current: number,
  max: number,
  resourceLabel: string,
): EntitlementCheckResult {
  if (max <= 0) {
    return {
      allowed: false,
      reason: "usage_limit_reached",
      message: `${resourceLabel} not available on your current plan`,
    };
  }
  if (current >= max) {
    return {
      allowed: false,
      reason: "usage_limit_reached",
      message: `${resourceLabel} limit reached (${current}/${max}). Upgrade to increase.`,
    };
  }
  return { allowed: true };
}

export function checkOSBoundary(
  currentOS: PlatformProduct,
  featureOS: PlatformProduct,
): EntitlementCheckResult {
  if (currentOS !== featureOS) {
    return {
      allowed: false,
      reason: "os_boundary",
      message: `This feature belongs to a different workspace`,
    };
  }
  return { allowed: true };
}

// ─── Usage Threshold ────────────────────────────────────────────
export type UsageLevel = "ok" | "warning" | "critical" | "exceeded";

export function getUsageLevel(current: number, max: number): UsageLevel {
  if (max <= 0) return "exceeded";
  const ratio = current / max;
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.75) return "warning";
  return "ok";
}

// ─── Industry Plan Feature Matrix ───────────────────────────────
export interface IndustryFeatureRow {
  feature: string;
  free: boolean | string;
  growth: boolean | string;
  enterprise: boolean | string;
  custom: boolean | string;
}

export const INDUSTRY_FEATURE_MATRIX: IndustryFeatureRow[] = [
  { feature: "Lead Management", free: true, growth: true, enterprise: true, custom: true },
  { feature: "Accounts & Contacts", free: true, growth: true, enterprise: true, custom: true },
  { feature: "Opportunity Tracking", free: "Limited", growth: true, enterprise: true, custom: true },
  { feature: "Manual Order Creation", free: true, growth: true, enterprise: true, custom: true },
  { feature: "Basic Reports", free: true, growth: true, enterprise: true, custom: true },
  { feature: "Lead Scoring & Routing", free: false, growth: true, enterprise: true, custom: true },
  { feature: "WhatsApp + Email Sync", free: false, growth: true, enterprise: true, custom: true },
  { feature: "Pipeline Management", free: false, growth: true, enterprise: true, custom: true },
  { feature: "Quotes & Price Books", free: false, growth: true, enterprise: true, custom: true },
  { feature: "Order Management", free: false, growth: true, enterprise: true, custom: true },
  { feature: "Territory Management", free: false, growth: true, enterprise: true, custom: true },
  { feature: "Basic Forecasting", free: false, growth: true, enterprise: true, custom: true },
  { feature: "AI Credits (per user/mo)", free: "0", growth: "200", enterprise: "1,000", custom: "Unlimited" },
  { feature: "Advanced Forecasting", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Conversation Intelligence", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Distributor / Partner Sales", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Commission Engine", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Advanced Automation", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Full API Access", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Multi-Region Operations", free: false, growth: false, enterprise: true, custom: true },
  { feature: "Sandbox Environment", free: false, growth: false, enterprise: false, custom: true },
  { feature: "Dedicated Support", free: false, growth: false, enterprise: false, custom: true },
  { feature: "Custom AI Models", free: false, growth: false, enterprise: false, custom: true },
  { feature: "White Label", free: false, growth: false, enterprise: false, custom: true },
];

// ─── Reseller Entitlement Rules ─────────────────────────────────
export interface ResellerEntitlementCheck {
  canSeeOperationalData: false;
  canSeeUsageMetrics: true;
  canSeeBillingSummary: true;
  canSeeHealthStatus: true;
}

export function checkResellerAccess(
  dataType: "operational" | "usage" | "billing" | "health",
): EntitlementCheckResult {
  if (dataType === "operational") {
    return {
      allowed: false,
      reason: "reseller_restricted",
      message: "Resellers cannot access downstream tenant operational data",
    };
  }
  return { allowed: true };
}
