/**
 * RouteAce Product Architecture Control Tower - Platform Registry
 * 
 * Single source of truth for all platforms, their modules, feature ownership,
 * tenant types, role entitlements, and boundary rules across the ecosystem.
 */

// ─── Platform IDs ────────────────────────────────────────────────
export type PlatformId =
  | "logistics_os"
  | "fmcg_os"
  | "liquor_os"
  | "agri_os"
  | "pharma_os"
  | "building_os"
  | "beauty_os"
  | "bfsi_os"
  | "auto_os"
  | "consumer_os"
  | "distribution_exchange"
  | "trade_finance"
  | "embedded_commerce"
  | "superadmin_infra"
  | "portodash";

export type PlatformCategory = "operator" | "industry" | "marketplace" | "infrastructure" | "standalone";

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export type FeatureStatus = "active" | "beta" | "deprecated" | "planned";

// ─── Platform Definition ─────────────────────────────────────────
export interface PlatformDefinition {
  id: PlatformId;
  name: string;
  shortName: string;
  category: PlatformCategory;
  description: string;
  /** Whether this platform has its own independent auth/signup */
  independentAuth: boolean;
  /** Allowed tenant types */
  tenantTypes: string[];
  /** Primary roles for this platform */
  primaryRoles: string[];
  /** Color for UI badges */
  color: string;
  /** Icon identifier */
  icon: string;
  /** Total registered features */
  featureCount?: number;
}

// ─── Feature Definition ──────────────────────────────────────────
export interface FeatureDefinition {
  id: string;
  name: string;
  /** Primary owning platform */
  owningPlatform: PlatformId;
  /** Platforms that may consume this feature as secondary */
  secondaryConsumers: PlatformId[];
  /** Route path in the app */
  route?: string;
  /** Tenant types that can access this */
  allowedTenantTypes: string[];
  /** Roles that can access this */
  allowedRoles: string[];
  /** Pricing tier dependency (null = free) */
  pricingDependency: string | null;
  /** Does this consume AI credits? */
  aiCreditDependency: boolean;
  /** Data sensitivity level */
  dataSensitivity: DataSensitivity;
  /** Current status */
  status: FeatureStatus;
  /** Module group for sidebar classification */
  moduleGroup: string;
}

// ─── Cross-Platform Data Contract ────────────────────────────────
export interface DataExchangeContract {
  id: string;
  sourcePlatform: PlatformId;
  destinationPlatform: PlatformId;
  purpose: string;
  allowedFields: string[];
  maskedFields: string[];
  requiresTenantAuth: boolean;
  requiresRoleAuth: boolean;
  isActive: boolean;
}

// ─── Leakage Alert ───────────────────────────────────────────────
export type LeakageSeverity = "critical" | "high" | "medium" | "low";

export interface LeakageAlert {
  id: string;
  featureId: string;
  featureName: string;
  currentPlatform: PlatformId;
  correctPlatform: PlatformId;
  severity: LeakageSeverity;
  description: string;
  recommendation: string;
  detectedAt: string;
  resolved: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// PLATFORM REGISTRY - All 15 Platforms
// ═══════════════════════════════════════════════════════════════════

export const PLATFORM_REGISTRY: PlatformDefinition[] = [
  {
    id: "logistics_os",
    name: "Logistics Operator OS",
    shortName: "Logistics OS",
    category: "operator",
    description: "Fleet management, dispatch, transport execution, route planning, logistics billing, and fleet finance.",
    independentAuth: false,
    tenantTypes: ["fleet_operator", "3pl", "carrier", "haulage"],
    primaryRoles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "customer"],
    color: "hsl(220, 70%, 50%)",
    icon: "Truck",
  },
  {
    id: "fmcg_os",
    name: "FMCG Distribution OS",
    shortName: "FMCG OS",
    category: "industry",
    description: "Field sales execution, retailer management, beat planning, trade promotions, and distributor intelligence.",
    independentAuth: true,
    tenantTypes: ["fmcg_distributor", "fmcg_manufacturer", "fmcg_retailer"],
    primaryRoles: ["executive", "rsm", "asm", "sales_supervisor", "rep", "merchandiser", "outbound_officer"],
    color: "hsl(142, 60%, 40%)",
    icon: "ShoppingCart",
  },
  {
    id: "liquor_os",
    name: "Liquor Distribution OS",
    shortName: "Liquor OS",
    category: "industry",
    description: "Three-tier distribution, excise compliance, age verification, license management, and case velocity tracking.",
    independentAuth: true,
    tenantTypes: ["liquor_distributor", "liquor_supplier", "liquor_retailer"],
    primaryRoles: ["distributor_admin", "supplier_admin", "retailer_admin", "compliance_officer"],
    color: "hsl(280, 55%, 45%)",
    icon: "Wine",
  },
  {
    id: "agri_os",
    name: "Agriculture Distribution OS",
    shortName: "Agri OS",
    category: "industry",
    description: "Farm input distribution, crop cycle logistics, safety certification, and geo-verified delivery.",
    independentAuth: true,
    tenantTypes: ["agri_distributor", "agri_supplier", "agri_cooperative"],
    primaryRoles: ["agri_admin", "field_officer", "warehouse_manager", "quality_inspector"],
    color: "hsl(85, 55%, 40%)",
    icon: "Leaf",
  },
  {
    id: "pharma_os",
    name: "Pharmaceutical Distribution OS",
    shortName: "Pharma OS",
    category: "industry",
    description: "Cold-chain logistics, prescription tracking, NAFDAC compliance, and batch traceability.",
    independentAuth: true,
    tenantTypes: ["pharma_distributor", "pharma_manufacturer", "pharmacy"],
    primaryRoles: ["pharma_admin", "pharmacist", "cold_chain_manager", "regulatory_officer"],
    color: "hsl(195, 65%, 45%)",
    icon: "Pill",
  },
  {
    id: "building_os",
    name: "Building Materials OS",
    shortName: "Building OS",
    category: "industry",
    description: "Heavy-material distribution, site delivery scheduling, project-based ordering, and weight-based billing.",
    independentAuth: true,
    tenantTypes: ["building_supplier", "building_distributor", "contractor"],
    primaryRoles: ["building_admin", "site_manager", "logistics_coordinator"],
    color: "hsl(25, 60%, 45%)",
    icon: "Building2",
  },
  {
    id: "beauty_os",
    name: "Beauty & Cosmetics OS",
    shortName: "Beauty OS",
    category: "industry",
    description: "Beauty product distribution, salon management, shelf-life tracking, and brand-specific channel ops.",
    independentAuth: true,
    tenantTypes: ["beauty_distributor", "beauty_brand", "salon_chain"],
    primaryRoles: ["beauty_admin", "brand_manager", "field_rep"],
    color: "hsl(330, 55%, 50%)",
    icon: "Sparkles",
  },
  {
    id: "bfsi_os",
    name: "BFSI Services OS",
    shortName: "BFSI OS",
    category: "industry",
    description: "Financial services distribution, agent management, KYC compliance, and insurance logistics.",
    independentAuth: true,
    tenantTypes: ["bfsi_provider", "insurance_agent", "microfinance"],
    primaryRoles: ["bfsi_admin", "agent_manager", "compliance_manager"],
    color: "hsl(210, 50%, 40%)",
    icon: "Landmark",
  },
  {
    id: "auto_os",
    name: "Auto Ancillary OS",
    shortName: "Auto OS",
    category: "industry",
    description: "Spare parts distribution, dealership network management, warranty tracking, and service center ops.",
    independentAuth: true,
    tenantTypes: ["auto_distributor", "dealership", "service_center"],
    primaryRoles: ["auto_admin", "dealer_manager", "parts_coordinator"],
    color: "hsl(0, 55%, 45%)",
    icon: "Car",
  },
  {
    id: "consumer_os",
    name: "General Consumer Goods OS",
    shortName: "Consumer OS",
    category: "industry",
    description: "Multi-category consumer goods distribution, retail network, and promotion management.",
    independentAuth: true,
    tenantTypes: ["consumer_distributor", "consumer_brand"],
    primaryRoles: ["consumer_admin", "category_manager", "sales_lead"],
    color: "hsl(45, 60%, 45%)",
    icon: "Package",
  },
  {
    id: "distribution_exchange",
    name: "Distribution Exchange",
    shortName: "Dist. Exchange",
    category: "marketplace",
    description: "Supply-demand clearing, capacity marketplace, distributor discovery, and network efficiency benchmarks.",
    independentAuth: false,
    tenantTypes: ["exchange_participant", "logistics_provider", "warehouse_operator"],
    primaryRoles: ["exchange_admin", "capacity_manager", "supply_coordinator"],
    color: "hsl(160, 50%, 40%)",
    icon: "Network",
  },
  {
    id: "trade_finance",
    name: "Trade Finance Network",
    shortName: "Trade Finance",
    category: "infrastructure",
    description: "Credit scoring, invoice finance, trade finance referrals, and underwriting signals.",
    independentAuth: false,
    tenantTypes: ["finance_participant", "lender", "credit_bureau"],
    primaryRoles: ["finance_admin", "credit_analyst", "underwriter"],
    color: "hsl(180, 45%, 38%)",
    icon: "Coins",
  },
  {
    id: "embedded_commerce",
    name: "Embedded Commerce Layer",
    shortName: "ECL",
    category: "infrastructure",
    description: "APIs, SDKs, widgets, and external integrations for order, logistics, warehouse, and trade finance.",
    independentAuth: false,
    tenantTypes: ["api_consumer", "developer", "partner_integrator"],
    primaryRoles: ["developer_admin", "api_user"],
    color: "hsl(260, 45%, 50%)",
    icon: "Code",
  },
  {
    id: "superadmin_infra",
    name: "SuperAdmin Infrastructure",
    shortName: "Control Tower",
    category: "infrastructure",
    description: "Aggregate visibility, governance, audits, entitlement oversight, benchmarks, and system-wide policy.",
    independentAuth: false,
    tenantTypes: ["platform_operator"],
    primaryRoles: ["super_admin", "core_founder", "core_builder", "core_product", "core_engineer"],
    color: "hsl(0, 0%, 25%)",
    icon: "Shield",
  },
  {
    id: "portodash",
    name: "PortoDash ExportTech",
    shortName: "PortoDash",
    category: "standalone",
    description: "Export workflows, customs compliance, port coordination, export documentation, and FX repatriation.",
    independentAuth: true,
    tenantTypes: ["exporter", "aggregator", "freight_coordinator", "customs_broker"],
    primaryRoles: ["export_ops_manager", "compliance_manager", "doc_officer", "shipment_coordinator"],
    color: "hsl(200, 65%, 45%)",
    icon: "Ship",
  },
];

// ═══════════════════════════════════════════════════════════════════
// FEATURE OWNERSHIP REGISTRY
// ═══════════════════════════════════════════════════════════════════

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // ── Logistics OS Features ────────────────────────────────────────
  { id: "log_dispatch", name: "Dispatch Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/dispatch", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "ops_manager", "dispatcher"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Operations" },
  { id: "log_fleet", name: "Fleet Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/fleet", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager"], pricingDependency: "starter", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Fleet & Drivers" },
  { id: "log_drivers", name: "Driver Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/drivers", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Fleet & Drivers" },
  { id: "log_tracking", name: "Live Tracking", owningPlatform: "logistics_os", secondaryConsumers: ["distribution_exchange"], route: "/tracking", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "ops_manager", "dispatcher", "customer"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Operations" },
  { id: "log_invoices", name: "Invoicing & Billing", owningPlatform: "logistics_os", secondaryConsumers: ["trade_finance"], route: "/invoices", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "finance_manager"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Finance" },
  { id: "log_expenses", name: "Expense Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/expenses", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "finance_manager"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Finance" },
  { id: "log_routes", name: "Route Planning", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/routes", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "ops_manager", "dispatcher"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Operations" },
  { id: "log_advanced_routes", name: "Advanced Route Planner", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/advanced-route-planner", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "ops_manager"], pricingDependency: "growth", aiCreditDependency: true, dataSensitivity: "internal", status: "active", moduleGroup: "Intelligence" },
  { id: "log_customers", name: "Customer Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/customers", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Operations" },
  { id: "log_analytics", name: "Analytics & Reports", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/analytics", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "finance_manager"], pricingDependency: "starter", aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Reports & Analytics" },
  { id: "log_ccc", name: "CCC / Fleet Finance KPIs", owningPlatform: "logistics_os", secondaryConsumers: ["trade_finance"], route: "/fleet-ccc", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "finance_manager"], pricingDependency: "growth", aiCreditDependency: true, dataSensitivity: "restricted", status: "active", moduleGroup: "Finance" },
  { id: "log_ai_controller", name: "AI Operations Controller", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/ai-operations-controller", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "ops_manager"], pricingDependency: "growth", aiCreditDependency: true, dataSensitivity: "internal", status: "active", moduleGroup: "Intelligence" },
  { id: "log_sla", name: "SLA Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/operations/sla-management", allowedTenantTypes: ["fleet_operator", "3pl", "carrier"], allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager"], pricingDependency: "starter", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Operations" },
  { id: "log_partners", name: "Partner / Vendor Management", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/partners", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "org_admin"], pricingDependency: "starter", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Partners & Staff" },
  { id: "log_payroll", name: "Payroll & Payouts", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/payroll", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "finance_manager"], pricingDependency: "starter", aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Finance" },
  { id: "log_control_center", name: "Enterprise Control Center", owningPlatform: "logistics_os", secondaryConsumers: [], route: "/control-center", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"], pricingDependency: "growth", aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Dashboard" },
  { id: "log_api_access", name: "API Access & Keys", owningPlatform: "logistics_os", secondaryConsumers: ["embedded_commerce"], route: "/api-access", allowedTenantTypes: ["fleet_operator", "3pl"], allowedRoles: ["admin", "super_admin"], pricingDependency: "enterprise", aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Administration" },

  // ── Distribution Exchange Features ───────────────────────────────
  { id: "dx_marketplace", name: "Supply-Demand Marketplace", owningPlatform: "distribution_exchange", secondaryConsumers: ["logistics_os"], route: "/distribution-exchange", allowedTenantTypes: ["exchange_participant", "logistics_provider"], allowedRoles: ["exchange_admin", "supply_coordinator"], pricingDependency: "growth", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Marketplace" },
  { id: "dx_capacity", name: "Warehouse Capacity Matching", owningPlatform: "distribution_exchange", secondaryConsumers: [], route: "/warehouse-capacity", allowedTenantTypes: ["warehouse_operator", "exchange_participant"], allowedRoles: ["exchange_admin", "capacity_manager"], pricingDependency: "growth", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Marketplace" },

  // ── Trade Finance Features ───────────────────────────────────────
  { id: "tf_credit_scoring", name: "Credit Scoring Engine", owningPlatform: "trade_finance", secondaryConsumers: ["logistics_os", "distribution_exchange"], route: "/trade-finance/credit", allowedTenantTypes: ["finance_participant", "lender"], allowedRoles: ["finance_admin", "credit_analyst"], pricingDependency: "enterprise", aiCreditDependency: true, dataSensitivity: "restricted", status: "active", moduleGroup: "Finance" },
  { id: "tf_invoice_finance", name: "Invoice Financing", owningPlatform: "trade_finance", secondaryConsumers: ["logistics_os"], route: "/trade-finance/invoice", allowedTenantTypes: ["finance_participant", "lender"], allowedRoles: ["finance_admin", "underwriter"], pricingDependency: "enterprise", aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Finance" },

  // ── PortoDash Features ───────────────────────────────────────────
  { id: "pd_export_ops", name: "Export Operations", owningPlatform: "portodash", secondaryConsumers: [], route: "/portodash/operations", allowedTenantTypes: ["exporter", "aggregator", "freight_coordinator"], allowedRoles: ["export_ops_manager", "shipment_coordinator"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Export" },
  { id: "pd_customs", name: "Customs & Compliance", owningPlatform: "portodash", secondaryConsumers: [], route: "/portodash/customs", allowedTenantTypes: ["exporter", "customs_broker"], allowedRoles: ["compliance_manager", "doc_officer"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Export" },
  { id: "pd_documentation", name: "Export Documentation", owningPlatform: "portodash", secondaryConsumers: [], route: "/portodash/documents", allowedTenantTypes: ["exporter", "aggregator"], allowedRoles: ["doc_officer", "export_ops_manager"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "confidential", status: "active", moduleGroup: "Export" },
  { id: "pd_fx_repatriation", name: "FX Repatriation", owningPlatform: "portodash", secondaryConsumers: ["trade_finance"], route: "/portodash/fx", allowedTenantTypes: ["exporter"], allowedRoles: ["export_ops_manager", "compliance_manager"], pricingDependency: "growth", aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Export" },

  // ── SuperAdmin / Infrastructure Features ─────────────────────────
  { id: "sa_governance", name: "Admin Governance Workspace", owningPlatform: "superadmin_infra", secondaryConsumers: [], route: "/admin-governance", allowedTenantTypes: ["platform_operator"], allowedRoles: ["super_admin", "org_admin", "admin"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Administration" },
  { id: "sa_control_tower", name: "Product Architecture Control Tower", owningPlatform: "superadmin_infra", secondaryConsumers: [], route: "/product-control-tower", allowedTenantTypes: ["platform_operator"], allowedRoles: ["core_founder", "core_builder", "core_product", "core_engineer"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Core Team Infrastructure" },
  { id: "sa_security_center", name: "Security Command Center", owningPlatform: "superadmin_infra", secondaryConsumers: [], route: "/security-center", allowedTenantTypes: ["platform_operator"], allowedRoles: ["super_admin", "admin"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Security" },
  { id: "sa_ipo_readiness", name: "IPO Readiness & Governance", owningPlatform: "superadmin_infra", secondaryConsumers: [], route: "/ipo-readiness", allowedTenantTypes: ["platform_operator"], allowedRoles: ["super_admin", "core_founder"], pricingDependency: null, aiCreditDependency: false, dataSensitivity: "restricted", status: "active", moduleGroup: "Governance" },

  // ── Embedded Commerce Layer Features ─────────────────────────────
  { id: "ecl_api_gateway", name: "API Gateway", owningPlatform: "embedded_commerce", secondaryConsumers: [], route: "/ecl/gateway", allowedTenantTypes: ["api_consumer", "developer"], allowedRoles: ["developer_admin", "api_user"], pricingDependency: "enterprise", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Developer" },
  { id: "ecl_marketplace", name: "App Marketplace", owningPlatform: "embedded_commerce", secondaryConsumers: [], route: "/ecl/marketplace", allowedTenantTypes: ["api_consumer", "partner_integrator"], allowedRoles: ["developer_admin"], pricingDependency: "enterprise", aiCreditDependency: false, dataSensitivity: "internal", status: "active", moduleGroup: "Developer" },
];

// ═══════════════════════════════════════════════════════════════════
// CROSS-PLATFORM DATA EXCHANGE CONTRACTS
// ═══════════════════════════════════════════════════════════════════

export const DATA_EXCHANGE_CONTRACTS: DataExchangeContract[] = [
  {
    id: "dx_log_capacity",
    sourcePlatform: "logistics_os",
    destinationPlatform: "distribution_exchange",
    purpose: "Dispatch capacity updates and fulfillment status",
    allowedFields: ["dispatch_status", "vehicle_capacity", "eta", "route_id"],
    maskedFields: ["customer_name", "pricing", "driver_salary"],
    requiresTenantAuth: true,
    requiresRoleAuth: true,
    isActive: true,
  },
  {
    id: "dx_log_tf",
    sourcePlatform: "logistics_os",
    destinationPlatform: "trade_finance",
    purpose: "CCC KPIs, receivables health, and operational reliability signals",
    allowedFields: ["ccc_days", "dso", "dpo", "on_time_rate", "delivery_completion_rate"],
    maskedFields: ["customer_name", "invoice_amounts", "driver_details"],
    requiresTenantAuth: true,
    requiresRoleAuth: true,
    isActive: true,
  },
  {
    id: "dx_log_pd",
    sourcePlatform: "logistics_os",
    destinationPlatform: "portodash",
    purpose: "Shipment milestone updates and transport leg execution status",
    allowedFields: ["shipment_status", "milestone_type", "timestamp", "location"],
    maskedFields: ["cost", "driver_details", "internal_notes"],
    requiresTenantAuth: true,
    requiresRoleAuth: true,
    isActive: true,
  },
  {
    id: "dx_ind_exchange",
    sourcePlatform: "fmcg_os",
    destinationPlatform: "distribution_exchange",
    purpose: "Demand signals and supply listing triggers",
    allowedFields: ["product_category", "demand_volume", "region", "listing_type"],
    maskedFields: ["customer_pricing", "margin_data", "retailer_names"],
    requiresTenantAuth: true,
    requiresRoleAuth: true,
    isActive: true,
  },
  {
    id: "dx_pd_tf",
    sourcePlatform: "portodash",
    destinationPlatform: "trade_finance",
    purpose: "Export documentation and FX repatriation signals",
    allowedFields: ["export_value", "destination_country", "compliance_status"],
    maskedFields: ["buyer_details", "bank_account", "fx_rates"],
    requiresTenantAuth: true,
    requiresRoleAuth: true,
    isActive: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
// BUILT-IN LEAKAGE DETECTION
// ═══════════════════════════════════════════════════════════════════

/** Routes that exist in the app but are classified under the wrong platform */
export function detectLeakages(): LeakageAlert[] {
  const alerts: LeakageAlert[] = [];

  // Known misplacements to flag
  const KNOWN_MISPLACEMENTS: Array<{
    featureName: string;
    currentRoute: string;
    currentPlatform: PlatformId;
    correctPlatform: PlatformId;
    severity: LeakageSeverity;
  }> = [
    // All 5 boundary violations have been resolved:
    // - Global Freight Intelligence → moved to platform/distribution_exchange routes
    // - Embedded Banking → moved to platform/trade_finance routes
    // - Sovereign Reporting → moved to platform/superadmin_infra routes
    // - Commerce Identity & Trust → moved to platform/superadmin_infra routes
    // - Continental Commerce Network → moved to platform/superadmin_infra routes
  ];

  KNOWN_MISPLACEMENTS.forEach((m, i) => {
    alerts.push({
      id: `leak_${i}`,
      featureId: `unknown_${i}`,
      featureName: m.featureName,
      currentPlatform: m.currentPlatform,
      correctPlatform: m.correctPlatform,
      severity: m.severity,
      description: `"${m.featureName}" is routed at ${m.currentRoute} inside ${getPlatformName(m.currentPlatform)} but belongs in ${getPlatformName(m.correctPlatform)}.`,
      recommendation: `Move route and sidebar entry to ${getPlatformName(m.correctPlatform)} navigation.`,
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  });

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════

export function getPlatformById(id: PlatformId): PlatformDefinition | undefined {
  return PLATFORM_REGISTRY.find((p) => p.id === id);
}

export function getPlatformName(id: PlatformId): string {
  return getPlatformById(id)?.name ?? id;
}

export function getFeaturesByPlatform(platformId: PlatformId): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.owningPlatform === platformId);
}

export function getFeaturesByStatus(status: FeatureStatus): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.status === status);
}

export function getPlatformsByCategory(category: PlatformCategory): PlatformDefinition[] {
  return PLATFORM_REGISTRY.filter((p) => p.category === category);
}

export function getContractsForPlatform(platformId: PlatformId): DataExchangeContract[] {
  return DATA_EXCHANGE_CONTRACTS.filter(
    (c) => c.sourcePlatform === platformId || c.destinationPlatform === platformId
  );
}

/** Compute platform health stats */
export function getPlatformHealth() {
  const leakages = detectLeakages();
  const platforms = PLATFORM_REGISTRY.map((p) => ({
    ...p,
    featureCount: getFeaturesByPlatform(p.id).length,
    contractCount: getContractsForPlatform(p.id).length,
    leakageCount: leakages.filter(
      (l) => l.currentPlatform === p.id || l.correctPlatform === p.id
    ).length,
  }));

  return {
    platforms,
    totalFeatures: FEATURE_REGISTRY.length,
    totalContracts: DATA_EXCHANGE_CONTRACTS.length,
    totalLeakages: leakages.length,
    criticalLeakages: leakages.filter((l) => l.severity === "critical").length,
    highLeakages: leakages.filter((l) => l.severity === "high").length,
    leakages,
  };
}
