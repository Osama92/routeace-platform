/**
 * OS Isolation Layer
 * Ensures strict separation between Operating Systems.
 * Each OS operates as a standalone product with no cross-visibility.
 */

import { WorkspaceId } from "./workspaceRegistry";

/** OS families - grouped by product boundary */
export type OSFamily = "logistics" | "industry" | "portodash" | "platform";

/** Map workspace IDs to their OS family */
export function getOSFamily(workspaceId: WorkspaceId): OSFamily {
  switch (workspaceId) {
    case "logistics":
      return "logistics";
    case "industry":
      return "industry";
    case "portodash":
      return "portodash";
    // Platform-level tools (admin/super_admin only)
    case "trade-finance":
    case "distribution-exchange":
    case "commerce-identity":
    case "embedded-commerce":
    case "control-tower":
    case "partner-console":
    case "core-internal":
      return "platform";
    default:
      return "logistics";
  }
}

/** Route prefixes that belong to each OS family */
const OS_ROUTE_PREFIXES: Record<OSFamily, string[]> = {
  logistics: [
    "/", "/dispatch", "/routes", "/advanced-route-planner", "/tracking",
    "/fleet", "/drivers", "/customers", "/invoices", "/expenses",
    "/analytics", "/admin-analytics", "/settings", "/users", "/emails",
    "/fleet-command", "/driver-payroll", "/driver-bonuses", "/payroll",
    "/staff", "/partners", "/vendor-performance", "/multidrop",
    "/payout-engine", "/loan-management", "/tax-filing-report",
    "/chart-of-accounts", "/tax-engines", "/financial-statements",
    "/cashflow-forecast", "/fleet-financial-intelligence",
    "/revenue-recognition", "/accounts-ledger", "/invoice-approvals",
    "/trip-rate-config", "/api-access", "/super-admin", "/org-admin",
    "/ops-manager", "/finance-manager", "/driver-super-app",
    "/customer-portal", "/control-center", "/operations",
    "/kpi-dashboard", "/investor", "/ai-operations",
    "/market-intelligence", "/support-center", "/admin-governance",
    "/governance-control", "/approval-center", "/security-center",
    "/wallet-banking",
    // Finance modules
    "/financial-intelligence", "/profitability-engine", "/revenue-optimization",
    "/billing-engine", "/finance-erp", "/finance-ledger", "/profit-loss",
    "/vendor-payables", "/tax-automation", "/cfo-dashboard",
    "/global-tax-compliance", "/cashflow-forecast",
    // Intelligence & GTM
    "/gtm-brain-logistics", "/executive-autopilot", "/decision-center",
    "/autonomous-distribution-ai", "/role-ai-performance",
    "/decision-simulation", "/autonomous-execution",
    // Compliance & governance
    "/compliance-monitor", "/compliance/eu-dashboard",
    "/analytics/eu-corridor-dashboard", "/analytics/bri-asia-engine",
    "/analytics/gcc-corridor-ai", "/analytics/us-interstate-ai",
    // Driver & fleet
    "/driver-dashboard", "/driver-performance", "/driver-super-app",
    // System intelligence
    "/system/freight-intelligence", "/system/pricing-intelligence",
    "/system/risk-hedge-engine", "/system/tax-intelligence",
    "/system/insurance-marketplace", "/system/mobility-command",
    "/system/regulatory-mapping", "/system/government-intelligence",
    "/system/investor-mode", "/system/freight-financialization",
    // Other logistics-adjacent
    "/audit-logs", "/email-templates", "/target-settings",
    "/entitlement-dashboard", "/role-management", "/product-metrics",
    "/session-analytics", "/session-alerts", "/account-integrity",
    "/backdoor-detection", "/security-architecture", "/event-bus",
    "/network-graph", "/strategy", "/developer-dashboard",
    "/developer-platform", "/api-marketplace",
    "/fleet-intelligence",
    "/decision-cockpit",
    "/bills",
    "/finance-reconciliation",
    "/period-closing",
    "/finance-integrations",
    "/invoice-reports",
    "/finance-manager",
    "/ai-command-center",
    "/reseller-command-center",
    "/finance-ai-performance",
    "/workforce",
  ],
  industry: [
    "/sales", "/fmcg", "/industry", "/pharma", "/agri", "/building",
    "/cosmetics", "/bfsi", "/auto", "/consumer", "/liquor",
  ],
  portodash: [
    "/portodash",
  ],
  platform: [
    "/trade-finance", "/distribution-exchange", "/commerce-identity",
    "/embedded-commerce", "/partner-console",
    "/core", "/continental-commerce", "/revenue-activation",
    "/ai-autopilot", "/gtm-growth-engine",
    // Moved from logistics per boundary violation fixes:
    "/analytics/gfix", "/embedded-banking",
    "/sovereign-reporting", "/commerce-identity-trust",
    "/continental-commerce-network",
    // Core team only:
    "/product-control-tower",
  ],
};

/**
 * Check if a route belongs to a given OS family
 */
export function routeBelongsToOS(pathname: string, family: OSFamily): boolean {
  const prefixes = OS_ROUTE_PREFIXES[family];
  if (!prefixes) return false;
  
  // Special handling for logistics "/" prefix - only match exact "/" or logistics-specific routes
  if (family === "logistics") {
    // Check non-root prefixes first
    for (const prefix of prefixes) {
      if (prefix === "/") continue;
      if (pathname.startsWith(prefix)) return true;
    }
    // Root path belongs to logistics
    if (pathname === "/") return true;
    return false;
  }

  return prefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * Get workspaces that should be visible in the switcher for a given OS family.
 * Platform / internal-core workspaces (Infrastructure Control Tower,
 * Partner Console, RouteAce Core) are gated to internal team roles only.
 * Tenant super_admin does NOT unlock platform workspaces.
 */
export function getVisibleWorkspacesForFamily(
  family: OSFamily,
  isInternalTeam: boolean
): WorkspaceId[] {
  if (isInternalTeam) {
    const base: WorkspaceId[] = [];
    switch (family) {
      case "logistics":
        base.push("logistics");
        break;
      case "industry":
        base.push("industry");
        break;
      case "portodash":
        base.push("portodash");
        break;
      case "platform":
        base.push("control-tower", "partner-console", "core-internal",
          "trade-finance", "distribution-exchange", "commerce-identity",
          "embedded-commerce");
        break;
    }
    if (family !== "platform") {
      base.push("control-tower", "partner-console");
    }
    return base;
  }

  // Tenant users (including tenant super_admin): only their OS family.
  switch (family) {
    case "logistics":
      return ["logistics"];
    case "industry":
      return ["industry"];
    case "portodash":
      return ["portodash"];
    default:
      return [];
  }
}

/**
 * Cross-OS event types for backend communication.
 * These events flow through the database, NOT through the UI.
 */
export type CrossOSEvent =
  | "order.created"           // Industry → Logistics
  | "order.assigned"          // Industry → Logistics
  | "dispatch.started"        // Logistics → Industry (status update)
  | "delivery.completed"      // Logistics → Industry (status update)
  | "invoice.generated"       // Logistics → Finance
  | "payment.completed"       // Finance → All
  | "shipment.created"        // PortoDash → Logistics
  | "compliance.validated";   // PortoDash internal

export interface CrossOSEventPayload {
  event: CrossOSEvent;
  sourceOS: OSFamily;
  targetOS: OSFamily;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validate that a cross-OS event is allowed
 */
export function isValidCrossOSEvent(payload: CrossOSEventPayload): boolean {
  const allowedFlows: Record<string, OSFamily[]> = {
    "order.created": ["logistics"],      // Industry can send to Logistics
    "order.assigned": ["logistics"],
    "dispatch.started": ["industry"],    // Logistics can notify Industry
    "delivery.completed": ["industry"],
    "invoice.generated": ["platform"],
    "payment.completed": ["logistics", "industry", "portodash"],
    "shipment.created": ["logistics"],
    "compliance.validated": ["portodash"],
  };
  
  const allowedTargets = allowedFlows[payload.event];
  return allowedTargets ? allowedTargets.includes(payload.targetOS) : false;
}
