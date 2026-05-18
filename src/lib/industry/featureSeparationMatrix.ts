/**
 * RouteAce Industry OS - Role-by-Role Feature Separation Matrix
 * 
 * Central config governing module visibility, action permissions,
 * data scope, AI tool access, and plan gating for every Industry OS role.
 */

// ─── Operating Systems ──────────────────────────────────────────
export type PlatformOS =
  | "industry_os"
  | "logistics_os"
  | "portodash"
  | "trade_finance"
  | "distribution_exchange"
  | "embedded_commerce"
  | "control_tower";

// ─── Industry Verticals ─────────────────────────────────────────
export type IndustryVertical =
  | "fmcg"
  | "pharma"
  | "agri"
  | "building"
  | "cosmetics"
  | "liquor"
  | "auto"
  | "consumer"
  | "bfsi";

// ─── Industry OS Roles ──────────────────────────────────────────
export type IndustryRole =
  // Executive
  | "business_owner"
  | "general_manager"
  | "commercial_director"
  | "sales_director"
  | "finance_controller"
  | "trade_marketing_director"
  // Sales Management
  | "regional_sales_manager"
  | "area_sales_manager"
  | "territory_manager"
  | "key_account_manager"
  | "national_sales_manager"
  // Frontline
  | "sales_rep"
  | "field_sales_rep"
  | "van_sales_rep"
  | "medical_rep"
  | "merchandiser"
  | "promoter"
  | "account_executive"
  | "telesales_agent"
  | "customer_service_agent"
  // Distribution / Partner
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "dealer_manager"
  | "channel_partner_manager"
  // Support / Governance
  | "pricing_manager"
  | "credit_control_officer"
  | "collections_officer"
  | "sales_ops_analyst"
  | "data_analyst"
  | "internal_admin"
  | "compliance_reviewer";

// ─── Industry OS Modules ────────────────────────────────────────
export type IndustryModule =
  | "sales_dashboard"
  | "leads"
  | "accounts"
  | "outlets"
  | "contacts"
  | "opportunities"
  | "pipeline"
  | "quotes"
  | "orders"
  | "products"
  | "price_books"
  | "promotions"
  | "territories"
  | "field_execution"
  | "visit_planning"
  | "forecasting"
  | "incentives"
  | "collections_visibility"
  | "returns"
  | "distributor_portal"
  | "partner_management"
  | "sales_analytics"
  | "market_intelligence"
  | "ai_sales_assistant"
  | "sales_settings"
  | "sales_admin";

// ─── Sales Plan Tiers ───────────────────────────────────────────
export type SalesPlanTier = "free" | "starter" | "pro" | "enterprise" | "unlimited";

// ─── AI Tools ───────────────────────────────────────────────────
export type SalesAITool =
  | "lead_scoring"
  | "next_best_action"
  | "quote_risk"
  | "discount_exception"
  | "deal_risk"
  | "forecast_ai"
  | "sales_coaching"
  | "call_summary"
  | "whatsapp_summary"
  | "outlet_opportunity"
  | "churn_detection"
  | "territory_performance"
  | "promotion_effectiveness";

// ─── Data Scope ─────────────────────────────────────────────────
export type DataScope =
  | "self_only"
  | "assigned_accounts"
  | "assigned_outlets"
  | "assigned_territory"
  | "assigned_team"
  | "assigned_distributor"
  | "branch"
  | "region"
  | "country"
  | "company_wide"
  | "multi_country"
  | "aggregated_only";

// ─── Action Types ───────────────────────────────────────────────
export type ActionType =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export"
  | "automate"
  | "trigger_ai"
  | "override_margin"
  | "manage_pricing"
  | "assign"
  | "escalate";

// ─── Role Feature Config ────────────────────────────────────────
export interface RoleFeatureConfig {
  label: string;
  category: "executive" | "sales_management" | "frontline" | "distribution" | "support";
  defaultHome: string;
  visibleModules: IndustryModule[];
  hiddenModules: IndustryModule[];
  dataScope: DataScope;
  aiTools: SalesAITool[];
  approvalRights: IndustryModule[];
  exportRights: IndustryModule[];
  sensitiveFieldAccess: string[];
  mobileFeatures: string[];
  crossOSHandoffs: string[];
  minPlan: SalesPlanTier;
}

// ─── Logistics OS Modules (NEVER visible in Industry OS) ─────
export const LOGISTICS_ONLY_MODULES = [
  "fleet_setup", "vehicles", "drivers", "dispatch_console",
  "trip_telemetry", "maintenance", "fuel_logs", "waybills",
  "route_execution", "proof_of_delivery_mgmt", "driver_assignment",
  "transporter_operations", "operator_finance",
] as const;

// ─── Industry OS Modules (NEVER visible in Logistics OS) ─────
export const INDUSTRY_ONLY_MODULES: IndustryModule[] = [
  "leads", "accounts", "outlets", "opportunities", "pipeline",
  "quotes", "price_books", "promotions", "territories",
  "field_execution", "visit_planning", "forecasting",
  "incentives", "distributor_portal", "partner_management",
  "market_intelligence", "ai_sales_assistant",
];

// ─── Cross-OS Handoff Touchpoints (allowed in Industry OS) ───
export const FULFILLMENT_HANDOFFS = [
  "send_fulfillment_request",
  "track_delivery_status",
  "view_pod_summary",
  "delivery_exception_alert",
] as const;

// ─── All Modules ────────────────────────────────────────────────
const ALL_MODULES: IndustryModule[] = [
  "sales_dashboard", "leads", "accounts", "outlets", "contacts",
  "opportunities", "pipeline", "quotes", "orders", "products",
  "price_books", "promotions", "territories", "field_execution",
  "visit_planning", "forecasting", "incentives", "collections_visibility",
  "returns", "distributor_portal", "partner_management",
  "sales_analytics", "market_intelligence", "ai_sales_assistant",
  "sales_settings", "sales_admin",
];

const EXECUTIVE_MODULES: IndustryModule[] = [
  "sales_dashboard", "leads", "accounts", "outlets", "contacts",
  "opportunities", "pipeline", "quotes", "orders", "products",
  "price_books", "promotions", "territories", "forecasting",
  "incentives", "collections_visibility", "returns",
  "distributor_portal", "partner_management", "sales_analytics",
  "market_intelligence", "ai_sales_assistant", "sales_settings", "sales_admin",
];

const MANAGER_MODULES: IndustryModule[] = [
  "sales_dashboard", "leads", "accounts", "outlets", "contacts",
  "opportunities", "pipeline", "quotes", "orders", "products",
  "promotions", "territories", "field_execution", "visit_planning",
  "forecasting", "incentives", "sales_analytics",
  "market_intelligence", "ai_sales_assistant",
];

const REP_MODULES: IndustryModule[] = [
  "sales_dashboard", "leads", "accounts", "outlets", "contacts",
  "opportunities", "quotes", "orders", "products",
  "field_execution", "visit_planning", "sales_analytics",
];

// ─── Role Configs ───────────────────────────────────────────────
export const INDUSTRY_ROLE_MATRIX: Record<IndustryRole, RoleFeatureConfig> = {
  // ── Executive ─────────────────────────────────────────────────
  business_owner: {
    label: "Business Owner / Admin",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: ALL_MODULES,
    hiddenModules: [],
    dataScope: "company_wide",
    aiTools: ["forecast_ai", "deal_risk", "churn_detection", "territory_performance", "promotion_effectiveness"],
    approvalRights: ALL_MODULES,
    exportRights: ALL_MODULES,
    sensitiveFieldAccess: ["margin", "discount_depth", "credit_limit", "incentive_payout", "internal_profitability"],
    mobileFeatures: ["dashboard", "approvals", "analytics"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "free",
  },
  general_manager: {
    label: "General Manager",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: EXECUTIVE_MODULES,
    hiddenModules: ["sales_admin"],
    dataScope: "company_wide",
    aiTools: ["forecast_ai", "deal_risk", "territory_performance"],
    approvalRights: ["quotes", "orders", "promotions", "incentives"],
    exportRights: EXECUTIVE_MODULES,
    sensitiveFieldAccess: ["margin", "discount_depth", "credit_limit"],
    mobileFeatures: ["dashboard", "approvals", "analytics"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "starter",
  },
  commercial_director: {
    label: "Commercial Director",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: EXECUTIVE_MODULES,
    hiddenModules: ["sales_admin"],
    dataScope: "company_wide",
    aiTools: ["forecast_ai", "deal_risk", "promotion_effectiveness", "territory_performance"],
    approvalRights: ["quotes", "orders", "promotions", "price_books", "incentives"],
    exportRights: EXECUTIVE_MODULES,
    sensitiveFieldAccess: ["margin", "discount_depth", "credit_limit", "internal_profitability"],
    mobileFeatures: ["dashboard", "pipeline", "approvals"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "starter",
  },
  sales_director: {
    label: "Sales Director",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: EXECUTIVE_MODULES.filter(m => m !== "sales_admin"),
    hiddenModules: ["sales_admin"],
    dataScope: "company_wide",
    aiTools: ["forecast_ai", "deal_risk", "sales_coaching", "territory_performance"],
    approvalRights: ["quotes", "orders", "territories", "incentives"],
    exportRights: ["sales_analytics", "forecasting", "pipeline", "territories"],
    sensitiveFieldAccess: ["margin", "discount_depth"],
    mobileFeatures: ["dashboard", "pipeline", "approvals"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "starter",
  },
  finance_controller: {
    label: "Finance Controller",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "orders", "quotes", "collections_visibility", "returns", "sales_analytics", "price_books"],
    hiddenModules: ["leads", "field_execution", "visit_planning", "promotions", "territories", "ai_sales_assistant"],
    dataScope: "company_wide",
    aiTools: ["churn_detection"],
    approvalRights: ["quotes", "orders", "price_books"],
    exportRights: ["collections_visibility", "orders", "sales_analytics"],
    sensitiveFieldAccess: ["margin", "discount_depth", "credit_limit", "incentive_payout", "internal_profitability"],
    mobileFeatures: ["dashboard", "collections"],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
  trade_marketing_director: {
    label: "Trade Marketing Director",
    category: "executive",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "promotions", "outlets", "field_execution", "sales_analytics", "market_intelligence", "products", "price_books"],
    hiddenModules: ["leads", "pipeline", "quotes", "forecasting", "incentives", "collections_visibility"],
    dataScope: "company_wide",
    aiTools: ["promotion_effectiveness", "outlet_opportunity"],
    approvalRights: ["promotions"],
    exportRights: ["promotions", "sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["dashboard", "promotions"],
    crossOSHandoffs: [],
    minPlan: "pro",
  },

  // ── Sales Management ──────────────────────────────────────────
  regional_sales_manager: {
    label: "Regional Sales Manager",
    category: "sales_management",
    defaultHome: "/sales/dashboard",
    visibleModules: MANAGER_MODULES,
    hiddenModules: ["sales_admin", "price_books", "distributor_portal", "partner_management"],
    dataScope: "region",
    aiTools: ["forecast_ai", "deal_risk", "sales_coaching", "territory_performance", "next_best_action"],
    approvalRights: ["quotes", "orders"],
    exportRights: ["sales_analytics", "forecasting"],
    sensitiveFieldAccess: ["margin"],
    mobileFeatures: ["dashboard", "pipeline", "team_performance", "approvals"],
    crossOSHandoffs: ["track_delivery_status", "view_pod_summary"],
    minPlan: "starter",
  },
  area_sales_manager: {
    label: "Area Sales Manager",
    category: "sales_management",
    defaultHome: "/sales/dashboard",
    visibleModules: MANAGER_MODULES.filter(m => m !== "partner_management"),
    hiddenModules: ["sales_admin", "price_books", "distributor_portal", "partner_management", "collections_visibility"],
    dataScope: "assigned_territory",
    aiTools: ["deal_risk", "sales_coaching", "next_best_action"],
    approvalRights: ["quotes"],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["dashboard", "pipeline", "team_performance"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "starter",
  },
  territory_manager: {
    label: "Territory Manager",
    category: "sales_management",
    defaultHome: "/sales/dashboard",
    visibleModules: [...REP_MODULES, "territories", "forecasting", "promotions"],
    hiddenModules: ["sales_admin", "price_books", "incentives", "partner_management"],
    dataScope: "assigned_territory",
    aiTools: ["next_best_action", "territory_performance"],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["dashboard", "outlets", "visits", "orders"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "starter",
  },
  key_account_manager: {
    label: "Key Account Manager",
    category: "sales_management",
    defaultHome: "/sales/accounts",
    visibleModules: ["sales_dashboard", "accounts", "contacts", "opportunities", "pipeline", "quotes", "orders", "products", "sales_analytics"],
    hiddenModules: ["territories", "field_execution", "visit_planning", "promotions", "incentives", "sales_admin"],
    dataScope: "assigned_accounts",
    aiTools: ["deal_risk", "next_best_action", "quote_risk", "churn_detection"],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: ["margin"],
    mobileFeatures: ["accounts", "pipeline", "orders"],
    crossOSHandoffs: ["send_fulfillment_request", "track_delivery_status"],
    minPlan: "pro",
  },
  national_sales_manager: {
    label: "National Sales Manager",
    category: "sales_management",
    defaultHome: "/sales/dashboard",
    visibleModules: MANAGER_MODULES,
    hiddenModules: ["sales_admin"],
    dataScope: "country",
    aiTools: ["forecast_ai", "deal_risk", "sales_coaching", "territory_performance", "promotion_effectiveness"],
    approvalRights: ["quotes", "orders", "territories"],
    exportRights: MANAGER_MODULES,
    sensitiveFieldAccess: ["margin", "discount_depth"],
    mobileFeatures: ["dashboard", "pipeline", "approvals"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "pro",
  },

  // ── Frontline ─────────────────────────────────────────────────
  sales_rep: {
    label: "Sales Rep",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: REP_MODULES,
    hiddenModules: ["price_books", "promotions", "territories", "forecasting", "incentives", "partner_management", "sales_admin", "market_intelligence"],
    dataScope: "assigned_outlets",
    aiTools: ["next_best_action"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["daily_route", "outlets", "visit_checkin", "order_capture", "quote_draft", "ai_summary", "offline_sync"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "free",
  },
  field_sales_rep: {
    label: "Field Sales Rep",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: [...REP_MODULES, "field_execution", "visit_planning"],
    hiddenModules: ["price_books", "forecasting", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_outlets",
    aiTools: ["next_best_action", "outlet_opportunity"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["daily_route", "outlets", "visit_checkin", "order_capture", "offline_sync", "photo_upload"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "free",
  },
  van_sales_rep: {
    label: "Van Sales Rep",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: [...REP_MODULES, "field_execution", "visit_planning"],
    hiddenModules: ["price_books", "forecasting", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_outlets",
    aiTools: ["next_best_action"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["daily_route", "outlets", "visit_checkin", "order_capture", "stock_load", "collections", "offline_sync"],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
  medical_rep: {
    label: "Medical Rep",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: [...REP_MODULES, "field_execution", "visit_planning"],
    hiddenModules: ["price_books", "forecasting", "incentives", "partner_management", "sales_admin", "promotions"],
    dataScope: "assigned_outlets",
    aiTools: ["next_best_action", "call_summary"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["daily_route", "clinics", "visit_checkin", "detail_log", "sample_issue", "offline_sync"],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
  merchandiser: {
    label: "Merchandiser",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "outlets", "field_execution", "visit_planning"],
    hiddenModules: ["leads", "opportunities", "pipeline", "quotes", "orders", "price_books", "forecasting", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_outlets",
    aiTools: [],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["store_visits", "shelf_photo", "compliance_checklist", "campaign_task", "offline_sync"],
    crossOSHandoffs: [],
    minPlan: "free",
  },
  promoter: {
    label: "Promoter",
    category: "frontline",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "outlets", "field_execution", "promotions"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "forecasting", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_outlets",
    aiTools: [],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["assigned_stores", "promotion_task", "photo_upload"],
    crossOSHandoffs: [],
    minPlan: "free",
  },
  account_executive: {
    label: "Account Executive",
    category: "frontline",
    defaultHome: "/sales/pipeline",
    visibleModules: ["sales_dashboard", "leads", "accounts", "contacts", "opportunities", "pipeline", "quotes", "orders", "products", "sales_analytics"],
    hiddenModules: ["territories", "field_execution", "visit_planning", "promotions", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_accounts",
    aiTools: ["next_best_action", "deal_risk", "quote_risk", "call_summary"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["pipeline", "accounts", "calls", "orders"],
    crossOSHandoffs: ["send_fulfillment_request"],
    minPlan: "starter",
  },
  telesales_agent: {
    label: "Telesales Agent",
    category: "frontline",
    defaultHome: "/sales/leads",
    visibleModules: ["sales_dashboard", "leads", "accounts", "contacts", "opportunities", "orders", "products"],
    hiddenModules: ["field_execution", "visit_planning", "territories", "promotions", "incentives", "partner_management", "sales_admin", "price_books"],
    dataScope: "assigned_accounts",
    aiTools: ["call_summary", "next_best_action"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
  customer_service_agent: {
    label: "Customer Service Agent",
    category: "frontline",
    defaultHome: "/sales/accounts",
    visibleModules: ["sales_dashboard", "accounts", "contacts", "orders", "returns", "collections_visibility"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "promotions", "territories", "forecasting", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_accounts",
    aiTools: ["whatsapp_summary"],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: [],
    crossOSHandoffs: ["track_delivery_status", "delivery_exception_alert"],
    minPlan: "free",
  },

  // ── Distribution / Partner ────────────────────────────────────
  distributor_owner: {
    label: "Distributor Owner",
    category: "distribution",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "outlets", "orders", "products", "collections_visibility", "returns", "sales_analytics", "distributor_portal"],
    hiddenModules: ["leads", "pipeline", "price_books", "promotions", "territories", "forecasting", "incentives", "sales_admin", "market_intelligence"],
    dataScope: "assigned_distributor",
    aiTools: ["churn_detection"],
    approvalRights: ["orders"],
    exportRights: ["sales_analytics", "orders"],
    sensitiveFieldAccess: ["credit_limit"],
    mobileFeatures: ["dashboard", "orders", "collections", "stock"],
    crossOSHandoffs: ["track_delivery_status", "view_pod_summary"],
    minPlan: "starter",
  },
  distributor_sales_manager: {
    label: "Distributor Sales Manager",
    category: "distribution",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "outlets", "orders", "products", "sales_analytics", "distributor_portal"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "promotions", "territories", "forecasting", "incentives", "sales_admin"],
    dataScope: "assigned_distributor",
    aiTools: [],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["dashboard", "orders", "outlets"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "starter",
  },
  distributor_sales_rep: {
    label: "Distributor Sales Rep",
    category: "distribution",
    defaultHome: "/sales/orders",
    visibleModules: ["sales_dashboard", "outlets", "orders", "products"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "promotions", "territories", "forecasting", "incentives", "sales_admin", "partner_management"],
    dataScope: "assigned_outlets",
    aiTools: [],
    approvalRights: [],
    exportRights: [],
    sensitiveFieldAccess: [],
    mobileFeatures: ["outlets", "order_capture", "collections", "offline_sync"],
    crossOSHandoffs: [],
    minPlan: "free",
  },
  dealer_manager: {
    label: "Dealer Manager",
    category: "distribution",
    defaultHome: "/sales/accounts",
    visibleModules: ["sales_dashboard", "accounts", "outlets", "contacts", "orders", "products", "sales_analytics", "partner_management"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "promotions", "territories", "forecasting", "incentives", "sales_admin"],
    dataScope: "assigned_distributor",
    aiTools: ["churn_detection"],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["dealers", "orders", "performance"],
    crossOSHandoffs: ["track_delivery_status"],
    minPlan: "pro",
  },
  channel_partner_manager: {
    label: "Channel Partner Manager",
    category: "distribution",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "partner_management", "distributor_portal", "orders", "sales_analytics", "market_intelligence"],
    hiddenModules: ["leads", "pipeline", "quotes", "price_books", "promotions", "territories", "field_execution", "visit_planning", "incentives", "sales_admin"],
    dataScope: "assigned_distributor",
    aiTools: ["churn_detection", "territory_performance"],
    approvalRights: [],
    exportRights: ["sales_analytics", "partner_management"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["partners", "performance"],
    crossOSHandoffs: [...FULFILLMENT_HANDOFFS],
    minPlan: "pro",
  },

  // ── Support / Governance ──────────────────────────────────────
  pricing_manager: {
    label: "Pricing Manager",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "products", "price_books", "quotes", "orders", "sales_analytics"],
    hiddenModules: ["leads", "pipeline", "field_execution", "visit_planning", "territories", "incentives", "partner_management", "sales_admin"],
    dataScope: "company_wide",
    aiTools: ["quote_risk", "discount_exception"],
    approvalRights: ["quotes", "price_books"],
    exportRights: ["price_books", "sales_analytics"],
    sensitiveFieldAccess: ["margin", "discount_depth", "internal_profitability"],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "pro",
  },
  credit_control_officer: {
    label: "Credit Control Officer",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "collections_visibility", "orders", "returns"],
    hiddenModules: ["leads", "pipeline", "quotes", "field_execution", "visit_planning", "territories", "promotions", "incentives", "partner_management", "sales_admin"],
    dataScope: "company_wide",
    aiTools: ["churn_detection"],
    approvalRights: ["orders"],
    exportRights: ["collections_visibility"],
    sensitiveFieldAccess: ["credit_limit"],
    mobileFeatures: ["collections"],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
  collections_officer: {
    label: "Collections Officer",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "collections_visibility", "orders"],
    hiddenModules: ["leads", "pipeline", "quotes", "field_execution", "visit_planning", "territories", "promotions", "incentives", "partner_management", "sales_admin"],
    dataScope: "assigned_accounts",
    aiTools: [],
    approvalRights: [],
    exportRights: ["collections_visibility"],
    sensitiveFieldAccess: [],
    mobileFeatures: ["collections", "accounts"],
    crossOSHandoffs: [],
    minPlan: "free",
  },
  sales_ops_analyst: {
    label: "Sales Operations Analyst",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "leads", "accounts", "pipeline", "orders", "forecasting", "territories", "sales_analytics", "market_intelligence"],
    hiddenModules: ["field_execution", "visit_planning", "promotions", "incentives", "partner_management", "sales_admin"],
    dataScope: "company_wide",
    aiTools: ["forecast_ai", "territory_performance"],
    approvalRights: [],
    exportRights: ["sales_analytics", "forecasting", "pipeline"],
    sensitiveFieldAccess: [],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "pro",
  },
  data_analyst: {
    label: "Data Analyst",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "sales_analytics", "market_intelligence", "forecasting"],
    hiddenModules: ["leads", "pipeline", "quotes", "orders", "field_execution", "visit_planning", "promotions", "incentives", "partner_management", "sales_admin"],
    dataScope: "aggregated_only",
    aiTools: ["forecast_ai"],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "pro",
  },
  internal_admin: {
    label: "Internal Admin",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ALL_MODULES,
    hiddenModules: [],
    dataScope: "company_wide",
    aiTools: [],
    approvalRights: ["sales_settings", "sales_admin"],
    exportRights: ALL_MODULES,
    sensitiveFieldAccess: ["margin", "discount_depth", "credit_limit", "incentive_payout"],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "free",
  },
  compliance_reviewer: {
    label: "Compliance Reviewer",
    category: "support",
    defaultHome: "/sales/dashboard",
    visibleModules: ["sales_dashboard", "accounts", "orders", "quotes", "sales_analytics"],
    hiddenModules: ["leads", "pipeline", "field_execution", "visit_planning", "promotions", "incentives", "partner_management"],
    dataScope: "company_wide",
    aiTools: [],
    approvalRights: [],
    exportRights: ["sales_analytics"],
    sensitiveFieldAccess: [],
    mobileFeatures: [],
    crossOSHandoffs: [],
    minPlan: "starter",
  },
};

// ─── Plan-to-Module Gating ──────────────────────────────────────
export const SALES_PLAN_MODULES: Record<SalesPlanTier, IndustryModule[]> = {
  free: [
    "sales_dashboard", "leads", "accounts", "contacts", "outlets",
    "opportunities", "pipeline", "orders", "products",
  ],
  starter: [
    "sales_dashboard", "leads", "accounts", "contacts", "outlets",
    "opportunities", "pipeline", "quotes", "orders", "products",
    "field_execution", "visit_planning", "collections_visibility",
    "returns", "sales_analytics",
  ],
  pro: [
    "sales_dashboard", "leads", "accounts", "contacts", "outlets",
    "opportunities", "pipeline", "quotes", "orders", "products",
    "price_books", "promotions", "territories", "field_execution",
    "visit_planning", "forecasting", "collections_visibility",
    "returns", "distributor_portal", "sales_analytics",
    "market_intelligence",
  ],
  enterprise: [
    "sales_dashboard", "leads", "accounts", "contacts", "outlets",
    "opportunities", "pipeline", "quotes", "orders", "products",
    "price_books", "promotions", "territories", "field_execution",
    "visit_planning", "forecasting", "incentives", "collections_visibility",
    "returns", "distributor_portal", "partner_management",
    "sales_analytics", "market_intelligence", "ai_sales_assistant",
    "sales_settings", "sales_admin",
  ],
  unlimited: ALL_MODULES,
};

// ─── Plan-to-AI Gating ─────────────────────────────────────────
export const SALES_PLAN_AI: Record<SalesPlanTier, SalesAITool[]> = {
  free: [],
  starter: [],
  pro: ["lead_scoring", "next_best_action", "forecast_ai"],
  enterprise: [
    "lead_scoring", "next_best_action", "quote_risk", "discount_exception",
    "deal_risk", "forecast_ai", "sales_coaching", "call_summary",
    "territory_performance", "promotion_effectiveness",
  ],
  unlimited: [
    "lead_scoring", "next_best_action", "quote_risk", "discount_exception",
    "deal_risk", "forecast_ai", "sales_coaching", "call_summary",
    "whatsapp_summary", "outlet_opportunity", "churn_detection",
    "territory_performance", "promotion_effectiveness",
  ],
};

// ─── Industry-Specific Module Extensions ────────────────────────
export const INDUSTRY_MODULE_EXTENSIONS: Partial<Record<IndustryVertical, string[]>> = {
  fmcg: ["beat_planning", "van_sales", "merchandising_compliance", "secondary_sales"],
  pharma: ["doctor_visits", "sample_tracking", "detailing_logs", "restricted_promotions"],
  agri: ["crop_cycle_calendar", "farmer_groups", "pre_season_forecast"],
  building: ["project_selling", "staged_delivery", "contractor_accounts"],
  liquor: ["permit_tracking", "on_off_trade", "compliance_gates"],
  cosmetics: ["campaign_sell_in", "promoter_tracking", "retail_activation"],
  auto: ["dealer_workshops", "parts_catalog", "warranty_notes"],
  consumer: ["modern_general_trade", "replenishment", "route_coverage"],
};

// ─── Utility Functions ──────────────────────────────────────────

/** Check if a role can see a module, considering plan gating */
export function canRoleAccessModule(
  role: IndustryRole,
  module: IndustryModule,
  plan: SalesPlanTier
): boolean {
  const roleConfig = INDUSTRY_ROLE_MATRIX[role];
  if (!roleConfig) return false;
  
  // Module must be in role's visible list
  if (!roleConfig.visibleModules.includes(module)) return false;
  
  // Module must be in plan's allowed list
  if (!SALES_PLAN_MODULES[plan]?.includes(module)) return false;
  
  // Plan must meet role's minimum
  const planOrder: SalesPlanTier[] = ["free", "starter", "pro", "enterprise", "unlimited"];
  if (planOrder.indexOf(plan) < planOrder.indexOf(roleConfig.minPlan)) return false;
  
  return true;
}

/** Check if a role can use an AI tool, considering plan gating */
export function canRoleUseAI(
  role: IndustryRole,
  tool: SalesAITool,
  plan: SalesPlanTier
): boolean {
  const roleConfig = INDUSTRY_ROLE_MATRIX[role];
  if (!roleConfig) return false;
  if (!roleConfig.aiTools.includes(tool)) return false;
  if (!SALES_PLAN_AI[plan]?.includes(tool)) return false;
  return true;
}

/** Get effective visible modules for a role + plan */
export function getEffectiveModules(
  role: IndustryRole,
  plan: SalesPlanTier
): IndustryModule[] {
  const roleConfig = INDUSTRY_ROLE_MATRIX[role];
  if (!roleConfig) return [];
  const planModules = SALES_PLAN_MODULES[plan] || [];
  return roleConfig.visibleModules.filter(m => planModules.includes(m));
}

/** Check if a module belongs to Logistics OS (should never appear in Industry OS) */
export function isLogisticsOnlyModule(moduleId: string): boolean {
  return (LOGISTICS_ONLY_MODULES as readonly string[]).includes(moduleId);
}

/** Check if a module belongs to Industry OS (should never appear in Logistics OS) */
export function isIndustryOnlyModule(moduleId: string): boolean {
  return (INDUSTRY_ONLY_MODULES as string[]).includes(moduleId);
}
