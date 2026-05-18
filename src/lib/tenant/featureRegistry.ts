/**
 * LD vs LC Feature Registry - Phase 2 surgical separation
 *
 * Source of truth: user role + industry_code (with tenant_mode as primary signal).
 * This module is ADDITIVE only. It tightens guards without altering existing
 * Logistics Company workflows.
 */

export type ResolvedTenantMode = "LOGISTICS_COMPANY" | "LOGISTICS_DEPARTMENT";

/** Industry codes whose orgs are typically internal logistics departments
 *  (i.e. logistics is a cost-center inside a non-logistics business). */
const DEPARTMENT_LIKE_INDUSTRIES = new Set<string>([
  "fmcg",
  "pharma",
  "agri",
  "cosmetics",
  "building",
  "consumer",
  "auto",
  "bfsi",
  "liquor",
  "manufacturing",
  "retail",
]);

/** Industry codes that are explicitly Logistics Companies (revenue from logistics). */
const COMPANY_INDUSTRIES = new Set<string>([
  "logistics",
  "logistics_company",
  "3pl",
  "haulage",
  "courier",
  "fleet",
]);

/** Roles that, in a department-like industry, behave as internal department roles. */
const DEPARTMENT_ROLE_HINTS = new Set<string>([
  "ops_manager",
  "finance_manager",
  "support",
  "customer", // internal stakeholder in dept mode
]);

/**
 * Resolve effective tenant mode from all available signals.
 * Priority: explicit tenant_mode > industry_code mapping > role hint > LC default.
 */
export function resolveTenantMode(params: {
  tenantMode?: string | null;
  industryCode?: string | null;
  role?: string | null;
}): ResolvedTenantMode {
  const { tenantMode, industryCode, role } = params;

  if (tenantMode === "LOGISTICS_DEPARTMENT") return "LOGISTICS_DEPARTMENT";
  if (tenantMode === "LOGISTICS_COMPANY") return "LOGISTICS_COMPANY";

  const code = (industryCode || "").toLowerCase().trim();
  if (code && COMPANY_INDUSTRIES.has(code)) return "LOGISTICS_COMPANY";
  if (code && DEPARTMENT_LIKE_INDUSTRIES.has(code)) {
    // department-like industry + dept-style role → LD
    if (role && DEPARTMENT_ROLE_HINTS.has(role)) return "LOGISTICS_DEPARTMENT";
    // even without role hint, department-like industry defaults to LD
    return "LOGISTICS_DEPARTMENT";
  }

  return "LOGISTICS_COMPANY";
}

/**
 * Route prefixes that ONLY make sense for Logistics Companies (revenue, reseller,
 * AI CEO, investor, etc.). Department tenants must never see these.
 */
export const COMPANY_ONLY_ROUTE_PREFIXES: readonly string[] = [
  "/reseller",
  "/reseller-command",
  "/reseller-command-center",
  "/revenue-expansion",
  "/revenue-optimization",
  "/revenue-protection",
  "/revenue-recognition",
  "/multidrop",
  "/loan-management",
  "/billing-engine",
  "/profitability-engine",
  "/financial-intelligence",
  "/cashflow-forecast",
  "/financial-statements",
  "/period-closing",
  "/ai-ceo",
  "/executive-autopilot",
  "/gtm-brain-logistics",
  "/ai-workforce",
  "/investor",
  "/autonomous-company",
  "/autonomous-execution",
  "/company/fleet-intelligence",
  "/company/driver-intelligence",
  "/website-generator",
  "/public-site",
  "/customer-matching",
  "/chart-of-accounts",
  "/tax-engines",
  "/board-decisions",
  "/capital-funding",
  "/white-label",
  "/asset-operations",
  "/fleet-compliance",
  "/fleet-inspection",
  "/predictive-maintenance",
  "/maintenance-cost-optimizer",
  "/maintenance-intelligence",
  "/iot-telemetry",
  "/autonomous-fleet",
  "/fuel-savings",
  "/fuel-intelligence",
  "/executive-command",
  "/partner-api",
] as const;

export function isCompanyOnlyRoute(pathname: string): boolean {
  return COMPANY_ONLY_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}
