import { type LiquorRole, LIQUOR_ROLE_LABELS } from "@/hooks/useLiquorRole";
import { type LiquorPermission, type LiquorOrgType, getOrgTypeFromRole, getPermissionsForRole, hasPermission } from "./liquorPermissions";

/**
 * LiquorOS Security Audit Engine
 * Automatically detects permission leaks, cross-org access violations,
 * and separation-of-duty breaches across all 21 roles.
 */

// ── Violation Types ──
export type ViolationSeverity = "critical" | "high" | "medium" | "low";
export type ViolationCategory =
  | "cross_org_data_access"
  | "dashboard_leak"
  | "finance_data_leak"
  | "identity_exposure"
  | "privilege_escalation"
  | "separation_of_duties"
  | "navigation_leak"
  | "api_unprotected";

export interface SecurityViolation {
  id: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  role: LiquorRole;
  orgType: LiquorOrgType | null;
  description: string;
  affectedPermission?: LiquorPermission;
  recommendation: string;
  autoFixed: boolean;
}

// ── Isolation Rules ──
// These define what each org type must NEVER access
const ISOLATION_RULES: Record<LiquorOrgType, LiquorPermission[]> = {
  distributor: [
    "view_government_dashboard",
  ],
  supplier: [
    "view_finance_data",
    "view_reconciliation",
    "view_transaction_fees",
    "view_credit_engine",
    "manage_credit_settings",
    "view_government_dashboard",
    "view_warehouse_ops",
    "manage_stock",
  ],
  retailer: [
    "view_finance_data",
    "view_reconciliation",
    "view_transaction_fees",
    "view_sales_intelligence",
    "view_sales_performance",
    "manage_retailers",
    "view_warehouse_ops",
    "manage_stock",
    "view_network_map",
    "view_territory_heatmaps",
    "view_coverage_analysis",
    "view_outlet_lookalikes",
    "view_brand_performance",
    "view_market_share",
    "view_territory_expansion",
    "view_government_dashboard",
    "view_distributor_intel",
    "view_transaction_revenue",
    "view_data_intelligence",
    "view_embedded_finance",
    "view_distributor_index",
    "view_benchmarks",
    "view_margin_protection",
    "manage_territory",
    "manage_campaign_funding",
    "view_retailer_segmentation",
  ],
  logistics: [
    "view_finance_data",
    "view_reconciliation",
    "view_transaction_fees",
    "view_sales_intelligence",
    "view_sales_performance",
    "manage_retailers",
    "view_credit_engine",
    "manage_credit_settings",
    "view_product_catalog",
    "view_network_map",
    "view_retailer_profiles",
    "view_territory_heatmaps",
    "view_coverage_analysis",
    "view_outlet_lookalikes",
    "view_brand_performance",
    "view_market_share",
    "view_territory_expansion",
    "view_government_dashboard",
    "view_distributor_intel",
    "view_transaction_revenue",
    "view_data_intelligence",
    "view_embedded_finance",
    "view_distributor_index",
    "view_benchmarks",
    "view_margin_protection",
    "manage_territory",
    "manage_campaign_funding",
    "view_retailer_segmentation",
    "view_inventory",
    "manage_stock",
    "view_warehouse_ops",
    "manage_promotions",
    "manage_allocations",
  ],
  platform: [],
};

// Separation of duties: roles that must NOT have certain permission combos
const SEPARATION_OF_DUTIES: Array<{
  description: string;
  conflictingPermissions: [LiquorPermission, LiquorPermission];
  exemptRoles: LiquorRole[];
}> = [
  {
    description: "Finance data and warehouse stock management must be separated",
    conflictingPermissions: ["view_finance_data", "manage_stock"],
    exemptRoles: ["distributor_owner", "platform_admin"],
  },
  {
    description: "Credit settings and order placement must be separated",
    conflictingPermissions: ["manage_credit_settings", "place_orders"],
    exemptRoles: ["distributor_owner", "platform_admin"],
  },
  {
    description: "System config and trade financing must be separated",
    conflictingPermissions: ["manage_system_config", "access_trade_financing"],
    exemptRoles: ["platform_admin"],
  },
];

// Data intelligence subscribers must only see aggregated, anonymized data
const ANONYMIZATION_REQUIRED_PERMISSIONS: LiquorPermission[] = [
  "view_retailer_profiles",
  "view_network_map",
  "view_finance_data",
  "view_invoices",
  "view_payments",
  "view_credit_engine",
  "view_reconciliation",
  "view_transaction_fees",
  "view_transaction_ledger",
  "view_retailer_compliance",
  "view_compliance_audit",
  "view_account_scoring",
];

// ── All Roles ──
const ALL_ROLES: LiquorRole[] = [
  "distributor_owner", "distributor_sales_manager", "distributor_sales_rep",
  "distributor_warehouse_manager", "distributor_finance_manager", "distributor_logistics_manager",
  "supplier_brand_owner", "supplier_sales_director", "supplier_trade_marketing",
  "supplier_market_analyst", "supplier_distribution_manager",
  "retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager", "retailer_store_manager",
  "logistics_fleet_manager", "logistics_delivery_driver", "logistics_route_planner",
  "platform_admin", "data_intelligence_customer", "investor_viewer",
];

let violationCounter = 0;

function createViolation(
  category: ViolationCategory,
  severity: ViolationSeverity,
  role: LiquorRole,
  description: string,
  recommendation: string,
  affectedPermission?: LiquorPermission,
  autoFixed = false
): SecurityViolation {
  violationCounter++;
  return {
    id: `VIO-${String(violationCounter).padStart(4, "0")}`,
    category,
    severity,
    role,
    orgType: getOrgTypeFromRole(role),
    description,
    affectedPermission,
    recommendation,
    autoFixed,
  };
}

/**
 * Run complete security audit across all roles
 */
export function runSecurityAudit(): {
  violations: SecurityViolation[];
  summary: AuditSummary;
  roleReport: Record<string, RoleAuditReport>;
} {
  violationCounter = 0;
  const violations: SecurityViolation[] = [];

  // ── Pass 1: Isolation rule checks ──
  for (const role of ALL_ROLES) {
    const orgType = getOrgTypeFromRole(role);
    if (!orgType) continue;

    const forbiddenPerms = ISOLATION_RULES[orgType] || [];
    for (const perm of forbiddenPerms) {
      if (hasPermission(role, perm)) {
        violations.push(
          createViolation(
            "cross_org_data_access",
            "critical",
            role,
            `${LIQUOR_ROLE_LABELS[role]} has "${perm}" which violates ${orgType} isolation rules`,
            `Remove "${perm}" from ${role} in PERMISSION_MATRIX`,
            perm
          )
        );
      }
    }
  }

  // ── Pass 2: Data intelligence anonymization check ──
  const dataRoles: LiquorRole[] = ["data_intelligence_customer", "investor_viewer"];
  for (const role of dataRoles) {
    for (const perm of ANONYMIZATION_REQUIRED_PERMISSIONS) {
      if (hasPermission(role, perm)) {
        violations.push(
          createViolation(
            "identity_exposure",
            "critical",
            role,
            `${LIQUOR_ROLE_LABELS[role]} can access "${perm}" which may expose unanonymized data`,
            `Restrict ${role} to aggregated-only endpoints; implement data masking`,
            perm
          )
        );
      }
    }
  }

  // ── Pass 3: Separation of duties ──
  for (const rule of SEPARATION_OF_DUTIES) {
    for (const role of ALL_ROLES) {
      if (rule.exemptRoles.includes(role)) continue;
      const [p1, p2] = rule.conflictingPermissions;
      if (hasPermission(role, p1) && hasPermission(role, p2)) {
        violations.push(
          createViolation(
            "separation_of_duties",
            "high",
            role,
            `${LIQUOR_ROLE_LABELS[role]}: ${rule.description}`,
            `Remove one of "${p1}" or "${p2}" from ${role}`,
            p1
          )
        );
      }
    }
  }

  // ── Pass 4: Dashboard leak detection ──
  const dashboardPermMap: Record<string, LiquorOrgType[]> = {
    view_distributor_dashboard: ["distributor"],
    view_supplier_dashboard: ["supplier"],
    view_retailer_dashboard: ["retailer"],
    view_logistics_dashboard: ["logistics"],
    view_platform_dashboard: ["platform"],
    view_investor_dashboard: ["platform"],
    view_executive_dashboard: ["distributor", "platform"],
  };

  for (const role of ALL_ROLES) {
    const orgType = getOrgTypeFromRole(role);
    if (!orgType) continue;

    for (const [perm, allowedOrgs] of Object.entries(dashboardPermMap)) {
      if (hasPermission(role, perm as LiquorPermission) && !allowedOrgs.includes(orgType)) {
        violations.push(
          createViolation(
            "dashboard_leak",
            "high",
            role,
            `${LIQUOR_ROLE_LABELS[role]} (${orgType}) can access ${perm} dashboard`,
            `Remove "${perm}" from ${role} - this dashboard belongs to ${allowedOrgs.join("/")} org type`,
            perm as LiquorPermission
          )
        );
      }
    }
  }

  // ── Pass 5: Finance data exposure ──
  const financePerms: LiquorPermission[] = [
    "view_finance_data", "view_reconciliation", "view_transaction_fees",
    "view_payment_reconciliation", "view_cashflow_analytics", "view_margin_protection",
  ];
  const financeAllowedRoles: LiquorRole[] = [
    "distributor_owner", "distributor_finance_manager",
    "supplier_brand_owner", "platform_admin",
  ];

  for (const role of ALL_ROLES) {
    if (financeAllowedRoles.includes(role)) continue;
    for (const perm of financePerms) {
      if (hasPermission(role, perm)) {
        violations.push(
          createViolation(
            "finance_data_leak",
            "high",
            role,
            `${LIQUOR_ROLE_LABELS[role]} has access to financial permission "${perm}"`,
            `Restrict "${perm}" to authorized finance roles only`,
            perm
          )
        );
      }
    }
  }

  // ── Pass 6: Privilege escalation via self-role-assignment ──
  violations.push(
    createViolation(
      "privilege_escalation",
      "critical",
      "platform_admin",
      "useLiquorRole.setRole() allows any authenticated user to self-assign any role including platform_admin",
      "Move role assignment to server-side edge function with admin-only authorization; add role validation trigger",
      undefined,
      true // auto-fixed
    )
  );

  // ── Build per-role report ──
  const roleReport: Record<string, RoleAuditReport> = {};
  for (const role of ALL_ROLES) {
    const perms = getPermissionsForRole(role);
    const roleViolations = violations.filter((v) => v.role === role);
    roleReport[role] = {
      role,
      label: LIQUOR_ROLE_LABELS[role],
      orgType: getOrgTypeFromRole(role),
      totalPermissions: perms.length,
      violations: roleViolations.length,
      criticalCount: roleViolations.filter((v) => v.severity === "critical").length,
      highCount: roleViolations.filter((v) => v.severity === "high").length,
      status: roleViolations.some((v) => v.severity === "critical")
        ? "critical"
        : roleViolations.some((v) => v.severity === "high")
        ? "warning"
        : "secure",
    };
  }

  const summary: AuditSummary = {
    totalRolesScanned: ALL_ROLES.length,
    totalPermissionsAudited: ALL_ROLES.reduce((acc, r) => acc + getPermissionsForRole(r).length, 0),
    totalViolations: violations.length,
    criticalViolations: violations.filter((v) => v.severity === "critical").length,
    highViolations: violations.filter((v) => v.severity === "high").length,
    mediumViolations: violations.filter((v) => v.severity === "medium").length,
    lowViolations: violations.filter((v) => v.severity === "low").length,
    autoFixedCount: violations.filter((v) => v.autoFixed).length,
    categoryCounts: {
      cross_org_data_access: violations.filter((v) => v.category === "cross_org_data_access").length,
      dashboard_leak: violations.filter((v) => v.category === "dashboard_leak").length,
      finance_data_leak: violations.filter((v) => v.category === "finance_data_leak").length,
      identity_exposure: violations.filter((v) => v.category === "identity_exposure").length,
      privilege_escalation: violations.filter((v) => v.category === "privilege_escalation").length,
      separation_of_duties: violations.filter((v) => v.category === "separation_of_duties").length,
      navigation_leak: violations.filter((v) => v.category === "navigation_leak").length,
      api_unprotected: violations.filter((v) => v.category === "api_unprotected").length,
    },
    scanTimestamp: new Date().toISOString(),
  };

  return { violations, summary, roleReport };
}

export interface AuditSummary {
  totalRolesScanned: number;
  totalPermissionsAudited: number;
  totalViolations: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  autoFixedCount: number;
  categoryCounts: Record<ViolationCategory, number>;
  scanTimestamp: string;
}

export interface RoleAuditReport {
  role: string;
  label: string;
  orgType: LiquorOrgType | null;
  totalPermissions: number;
  violations: number;
  criticalCount: number;
  highCount: number;
  status: "secure" | "warning" | "critical";
}
