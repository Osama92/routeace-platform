import { type LiquorRole } from "@/hooks/useLiquorRole";

/**
 * Liquor OS Permission Matrix - Enterprise Edition
 * Maps each permission to the roles that can access it.
 * Single source of truth for all access control decisions.
 */

export type LiquorPermission =
  // Dashboard
  | "view_executive_dashboard"
  | "view_distributor_dashboard"
  | "view_supplier_dashboard"
  | "view_retailer_dashboard"
  | "view_logistics_dashboard"
  | "view_platform_dashboard"
  | "view_investor_dashboard"
  // Sales
  | "view_sales_intelligence"
  | "view_sales_performance"
  | "manage_retailers"
  | "place_orders"
  | "view_product_catalog"
  // Warehouse & Stock
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  // Finance
  | "view_finance_data"
  | "view_invoices"
  | "view_payments"
  | "view_credit_engine"
  | "manage_credit_settings"
  | "view_reconciliation"
  | "view_transaction_fees"
  // Logistics
  | "view_delivery_routes"
  | "assign_drivers"
  | "track_shipments"
  | "manage_fleet"
  | "view_route_plans"
  | "view_digital_pod"
  // Trade & Promotions
  | "view_promotions"
  | "manage_promotions"
  | "view_promo_roi"
  // Network Intelligence
  | "view_network_map"
  | "view_retailer_profiles"
  | "view_territory_heatmaps"
  | "view_coverage_analysis"
  | "view_outlet_lookalikes"
  | "view_brand_performance"
  | "view_market_share"
  | "view_territory_expansion"
  // Commerce Exchange
  | "access_supplier_marketplace"
  | "access_distributor_marketplace"
  | "access_retailer_ordering"
  | "view_order_routing"
  | "manage_allocations"
  | "access_trade_financing"
  | "view_transaction_ledger"
  | "view_compliance_engine"
  | "view_distributor_intel"
  // Revenue Engines
  | "view_transaction_revenue"
  | "view_data_intelligence"
  | "view_embedded_finance"
  | "view_supplier_demand"
  // Intelligence
  | "view_distributor_index"
  | "view_benchmarks"
  | "view_margin_protection"
  // Platform Admin
  | "view_platform_analytics"
  | "manage_system_config"
  | "view_aggregated_analytics"
  // Compliance Engine
  | "view_id_verification"
  | "view_government_dashboard"
  | "view_retailer_compliance"
  | "view_compliance_audit"
  // Enterprise Modules (v2)
  | "view_account_scoring"
  | "view_demand_forecast"
  | "manage_territory"
  | "view_retailer_loyalty"
  | "manage_retailer_loyalty"
  | "view_allocation_releases"
  | "manage_campaign_funding"
  | "view_auto_ordering"
  | "manage_auto_ordering"
  | "view_org_journey"
  | "view_cashflow_analytics"
  | "view_warehouse_heatmap"
  | "view_reorder_predictions"
  | "view_upsell_suggestions"
  | "view_rep_route_optimizer"
  | "view_retailer_segmentation"
  | "view_inventory_turnover"
  | "view_payment_reconciliation"
  | "view_driver_app"
  | "view_fleet_analytics"
  | "view_route_profitability"
  // Intelligence Brain
  | "view_network_graph"
  | "view_inventory_risk"
  | "view_brand_trends"
  | "view_credit_risk"
  | "view_promotion_roi"
  | "view_retailer_growth"
  | "view_ai_recommendations"
  | "view_ai_alerts"
  // Global Expansion Engine
  | "view_expansion_dashboard"
  | "view_sku_expansion"
  | "view_brand_expansion"
  | "view_logistics_feasibility"
  | "view_regulatory_expansion"
  // Demand Signal Harvester
  | "view_demand_signals"
  | "view_nightlife_signals"
  | "view_social_trends"
  | "view_tourism_signals"
  | "view_competitor_intel";

// ── Role groups for reuse ──
const DIST_OWNER: LiquorRole[] = ["distributor_owner", "platform_admin"];
const DIST_SALES: LiquorRole[] = ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep"];
const DIST_ALL: LiquorRole[] = ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager", "distributor_logistics_manager"];
const SUPPLIER_ALL: LiquorRole[] = ["supplier_brand_owner", "supplier_sales_director", "supplier_trade_marketing", "supplier_market_analyst", "supplier_distribution_manager"];
const RETAILER_ALL: LiquorRole[] = ["retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager", "retailer_store_manager"];
const LOGISTICS_ALL: LiquorRole[] = ["logistics_fleet_manager", "logistics_delivery_driver", "logistics_route_planner"];
const FINANCE_ROLES: LiquorRole[] = ["distributor_owner", "distributor_finance_manager", "supplier_brand_owner", "platform_admin"];

const PERMISSION_MATRIX: Record<LiquorPermission, LiquorRole[]> = {
  // ── Dashboard access ──
  view_executive_dashboard: ["distributor_owner", "platform_admin"],
  view_distributor_dashboard: [...DIST_ALL],
  view_supplier_dashboard: [...SUPPLIER_ALL],
  view_retailer_dashboard: [...RETAILER_ALL],
  view_logistics_dashboard: [...LOGISTICS_ALL],
  view_platform_dashboard: ["platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],

  // ── Sales ──
  view_sales_intelligence: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_sales_director", "platform_admin"],
  view_sales_performance: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "supplier_brand_owner", "supplier_sales_director"],
  manage_retailers: [...DIST_SALES],
  place_orders: ["distributor_sales_rep", ...RETAILER_ALL],
  view_product_catalog: [...DIST_ALL, ...RETAILER_ALL, "supplier_brand_owner", "supplier_sales_director", "supplier_distribution_manager", "platform_admin"],

  // ── Warehouse ──
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "distributor_logistics_manager", "supplier_distribution_manager", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager"],
  view_warehouse_heatmap: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_inventory_turnover: ["distributor_owner", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],

  // ── Finance - strict isolation ──
  view_finance_data: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", ...RETAILER_ALL],
  view_payments: ["distributor_owner", "distributor_finance_manager", "retailer_bar_owner", "retailer_restaurant_owner"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager"],
  manage_credit_settings: ["distributor_owner", "distributor_finance_manager"],
  view_reconciliation: ["distributor_owner", "distributor_finance_manager"],
  view_transaction_fees: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_cashflow_analytics: ["distributor_owner", "distributor_finance_manager", "supplier_brand_owner", "platform_admin"],
  view_payment_reconciliation: ["distributor_owner", "distributor_finance_manager", "platform_admin"],

  // ── Logistics ──
  view_delivery_routes: ["distributor_logistics_manager", ...LOGISTICS_ALL],
  assign_drivers: ["distributor_logistics_manager", "logistics_fleet_manager"],
  track_shipments: ["distributor_owner", "distributor_logistics_manager", ...LOGISTICS_ALL],
  manage_fleet: ["logistics_fleet_manager"],
  view_route_plans: ["distributor_logistics_manager", "logistics_fleet_manager", "logistics_route_planner"],
  view_digital_pod: ["distributor_owner", "distributor_logistics_manager", "logistics_fleet_manager", "logistics_delivery_driver"],
  view_driver_app: ["logistics_delivery_driver"],
  view_fleet_analytics: ["logistics_fleet_manager", "distributor_logistics_manager", "distributor_owner", "platform_admin"],
  view_route_profitability: ["logistics_fleet_manager", "logistics_route_planner", "distributor_owner", "platform_admin"],
  view_rep_route_optimizer: ["distributor_sales_manager", "distributor_sales_rep", "distributor_owner"],

  // ── Trade & Promotions ──
  view_promotions: [...DIST_ALL, ...RETAILER_ALL, "supplier_brand_owner", "supplier_trade_marketing"],
  manage_promotions: ["supplier_brand_owner", "supplier_trade_marketing"],
  view_promo_roi: ["supplier_brand_owner", "supplier_trade_marketing", "supplier_sales_director", "platform_admin"],

  // ── Network Intelligence ──
  view_network_map: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_sales_director", "platform_admin"],
  view_retailer_profiles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "supplier_brand_owner", "supplier_sales_director"],
  view_territory_heatmaps: ["distributor_owner", ...SUPPLIER_ALL, "platform_admin"],
  view_coverage_analysis: ["distributor_owner", "supplier_brand_owner", "supplier_sales_director"],
  view_outlet_lookalikes: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_market_analyst"],
  view_brand_performance: [...SUPPLIER_ALL, "distributor_owner"],
  view_market_share: ["supplier_brand_owner", "supplier_sales_director", "supplier_market_analyst", "distributor_owner", "platform_admin"],
  view_territory_expansion: ["distributor_owner", "supplier_brand_owner", "supplier_sales_director"],

  // ── Commerce Exchange ──
  access_supplier_marketplace: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_sales_director", "supplier_distribution_manager"],
  access_distributor_marketplace: ["distributor_owner", "distributor_warehouse_manager", ...RETAILER_ALL],
  access_retailer_ordering: [...RETAILER_ALL],
  view_order_routing: ["distributor_owner", "platform_admin"],
  manage_allocations: ["supplier_brand_owner", "supplier_distribution_manager", "distributor_owner"],
  access_trade_financing: ["distributor_owner", "distributor_finance_manager", "retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager"],
  view_transaction_ledger: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_compliance_engine: ["distributor_owner", "platform_admin"],
  view_distributor_intel: ["supplier_brand_owner", "supplier_sales_director", "supplier_market_analyst", "platform_admin"],

  // ── Revenue Engines ──
  view_transaction_revenue: ["distributor_owner", "platform_admin"],
  view_data_intelligence: ["platform_admin", "data_intelligence_customer", "supplier_brand_owner", "supplier_market_analyst"],
  view_embedded_finance: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_supplier_demand: ["supplier_brand_owner", "supplier_trade_marketing", "platform_admin"],

  // ── Intelligence ──
  view_distributor_index: ["distributor_owner", "supplier_brand_owner", "supplier_sales_director", "platform_admin"],
  view_benchmarks: ["distributor_owner", "supplier_brand_owner", "supplier_sales_director", "platform_admin"],
  view_margin_protection: ["distributor_owner", "distributor_finance_manager"],

  // ── Platform Admin ──
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
  view_aggregated_analytics: ["data_intelligence_customer", "investor_viewer", "platform_admin"],

  // ── Compliance Engine ──
  view_id_verification: [...DIST_SALES, "retailer_bar_owner", "retailer_restaurant_owner", "retailer_store_manager", "platform_admin"],
  view_government_dashboard: ["platform_admin"],
  view_retailer_compliance: [...RETAILER_ALL, "distributor_owner", "platform_admin"],
  view_compliance_audit: ["distributor_owner", "distributor_finance_manager", "platform_admin"],

  // ── Enterprise Modules (v2) ──
  view_account_scoring: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_finance_manager", "platform_admin"],
  view_demand_forecast: ["distributor_owner", "distributor_warehouse_manager", "supplier_brand_owner", "supplier_market_analyst", "supplier_distribution_manager", "platform_admin"],
  manage_territory: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_sales_director", "platform_admin"],
  view_retailer_loyalty: [...RETAILER_ALL, "distributor_owner", "distributor_sales_manager"],
  manage_retailer_loyalty: ["distributor_owner", "supplier_brand_owner", "supplier_trade_marketing", "platform_admin"],
  view_allocation_releases: ["supplier_brand_owner", "supplier_distribution_manager", "distributor_owner", "distributor_sales_manager", ...RETAILER_ALL],
  manage_campaign_funding: ["supplier_brand_owner", "supplier_trade_marketing", "platform_admin"],
  view_auto_ordering: [...RETAILER_ALL, "distributor_owner", "distributor_warehouse_manager"],
  manage_auto_ordering: ["distributor_owner", "retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager"],
  view_org_journey: [...DIST_ALL, ...SUPPLIER_ALL, ...RETAILER_ALL, ...LOGISTICS_ALL, "platform_admin"],
  view_reorder_predictions: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager"],
  view_upsell_suggestions: ["distributor_sales_manager", "distributor_sales_rep", "supplier_trade_marketing"],
  view_retailer_segmentation: ["distributor_owner", "distributor_sales_manager", "supplier_brand_owner", "supplier_market_analyst", "platform_admin"],

  // ── Intelligence Brain ──
  view_network_graph: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin", "data_intelligence_customer"],
  view_inventory_risk: [...DIST_ALL, ...SUPPLIER_ALL, "platform_admin"],
  view_brand_trends: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin", "data_intelligence_customer"],
  view_credit_risk: [...FINANCE_ROLES, "platform_admin"],
  view_promotion_roi: ["supplier_brand_owner", "supplier_trade_marketing", "supplier_sales_director", ...DIST_OWNER, "platform_admin"],
  view_retailer_growth: [...DIST_ALL, ...SUPPLIER_ALL, "platform_admin"],
  view_ai_recommendations: [...DIST_ALL, ...SUPPLIER_ALL, ...RETAILER_ALL, "platform_admin"],
  view_ai_alerts: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin"],
  // Global Expansion Engine
  view_expansion_dashboard: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin"],
  view_sku_expansion: [...DIST_OWNER, "distributor_sales_manager", ...SUPPLIER_ALL, "platform_admin"],
  view_brand_expansion: [...SUPPLIER_ALL, ...DIST_OWNER, "platform_admin"],
  view_logistics_feasibility: [...DIST_OWNER, "distributor_logistics_manager", ...LOGISTICS_ALL, "platform_admin"],
  view_regulatory_expansion: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin"],
  // Demand Signal Harvester
  view_demand_signals: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin", "data_intelligence_customer"],
  view_nightlife_signals: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin", "data_intelligence_customer"],
  view_social_trends: [...DIST_OWNER, ...SUPPLIER_ALL, "supplier_market_analyst", "platform_admin", "data_intelligence_customer"],
  view_tourism_signals: [...DIST_OWNER, ...SUPPLIER_ALL, "platform_admin", "data_intelligence_customer"],
  view_competitor_intel: [...DIST_OWNER, "distributor_sales_manager", ...SUPPLIER_ALL, "platform_admin"],
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: LiquorRole | null, permission: LiquorPermission): boolean => {
  if (!role) return false;
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

/**
 * Check if a role has ANY of the listed permissions
 */
export const hasAnyPermission = (role: LiquorRole | null, permissions: LiquorPermission[]): boolean => {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
};

/**
 * Get all permissions for a role
 */
export const getPermissionsForRole = (role: LiquorRole): LiquorPermission[] => {
  return (Object.entries(PERMISSION_MATRIX) as [LiquorPermission, LiquorRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
};

/**
 * Determine the organization type from a role
 */
export type LiquorOrgType = "distributor" | "supplier" | "retailer" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: LiquorRole | null): LiquorOrgType | null => {
  if (!role) return null;
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("supplier_")) return "supplier";
  if (role.startsWith("retailer_")) return "retailer";
  if (role.startsWith("logistics_")) return "logistics";
  if (["platform_admin", "data_intelligence_customer", "investor_viewer"].includes(role)) return "platform";
  return null;
};

/**
 * Get the default landing route for a role
 */
export const getDefaultRouteForRole = (role: LiquorRole): string => {
  const base = "/industry/liquor";
  const orgType = getOrgTypeFromRole(role);
  switch (orgType) {
    case "distributor": return `${base}/distributor-dash`;
    case "supplier": return `${base}/supplier-dash`;
    case "retailer": return `${base}/retailer-dash`;
    case "logistics": return `${base}/logistics`;
    case "platform": return `${base}/platform-intel`;
    default: return base;
  }
};

/**
 * Role feature summary - audit reference
 */
export const ROLE_FEATURE_SUMMARY: Record<string, { permissions: number; modules: string[] }> = {
  distributor_owner: { permissions: 62, modules: ["Executive Dashboard", "Sales Intelligence", "Warehouse Ops", "Finance", "Logistics Oversight", "Commerce Exchange", "Revenue Analytics", "Compliance", "Territory Mgmt", "Account Scoring", "Demand Forecast", "Auto-Ordering", "Loyalty Programs"] },
  distributor_sales_manager: { permissions: 28, modules: ["Sales Intelligence", "Retailer Mgmt", "Account Scoring", "Territory Mgmt", "Route Optimizer", "Upsell AI", "Loyalty"] },
  distributor_sales_rep: { permissions: 18, modules: ["Retailer Visits", "Order Entry", "Product Catalog", "Route Optimizer", "Upsell AI", "Account Scoring", "Reorder Predictions"] },
  distributor_warehouse_manager: { permissions: 14, modules: ["Inventory", "Stock Mgmt", "Warehouse Heatmap", "Inventory Turnover", "Demand Forecast", "Auto-Ordering"] },
  distributor_finance_manager: { permissions: 16, modules: ["Finance", "Invoices", "Payments", "Credit Engine", "Reconciliation", "Transaction Fees", "Cashflow Analytics", "Compliance Audit"] },
  distributor_logistics_manager: { permissions: 12, modules: ["Delivery Routes", "Driver Assignment", "Shipment Tracking", "Route Plans", "Digital POD", "Fleet Analytics"] },
  supplier_brand_owner: { permissions: 38, modules: ["Brand Performance", "Market Share", "Campaign Mgmt", "Allocation Engine", "Data Intelligence", "Demand Forecast", "Territory Mgmt", "Campaign Funding", "Loyalty Programs"] },
  supplier_sales_director: { permissions: 22, modules: ["Sales Performance", "Network Map", "Distributor Intel", "Territory Expansion", "Benchmarks", "Territory Mgmt"] },
  supplier_trade_marketing: { permissions: 14, modules: ["Promotions", "Campaign Funding", "Upsell Suggestions", "Promo ROI", "Supplier Demand Engine"] },
  supplier_market_analyst: { permissions: 12, modules: ["Territory Heatmaps", "Market Share", "Outlet Lookalikes", "Data Intelligence", "Demand Forecast", "Retailer Segmentation"] },
  supplier_distribution_manager: { permissions: 10, modules: ["Inventory", "Allocations", "Supplier Marketplace", "Demand Forecast", "Allocation Releases"] },
  retailer_bar_owner: { permissions: 20, modules: ["Ordering", "Invoices", "Credit", "Promotions", "Trade Financing", "Loyalty", "Allocation Releases", "Auto-Ordering", "Compliance"] },
  retailer_restaurant_owner: { permissions: 20, modules: ["Ordering", "Invoices", "Credit", "Promotions", "Trade Financing", "Loyalty", "Allocation Releases", "Auto-Ordering", "Compliance"] },
  retailer_procurement_manager: { permissions: 16, modules: ["Ordering", "Invoices", "Credit", "Promotions", "Loyalty", "Allocation Releases", "Auto-Ordering", "Compliance"] },
  retailer_store_manager: { permissions: 14, modules: ["Ordering", "Product Catalog", "Promotions", "Loyalty", "Allocation Releases", "Compliance"] },
  logistics_fleet_manager: { permissions: 10, modules: ["Fleet Mgmt", "Driver Assignment", "Shipment Tracking", "Route Plans", "Digital POD", "Fleet Analytics", "Route Profitability"] },
  logistics_delivery_driver: { permissions: 6, modules: ["Delivery Routes", "Shipment Tracking", "Digital POD", "Driver App"] },
  logistics_route_planner: { permissions: 6, modules: ["Route Plans", "Delivery Routes", "Shipment Tracking", "Route Profitability"] },
  platform_admin: { permissions: 68, modules: ["All Modules - Full Platform Access"] },
  data_intelligence_customer: { permissions: 3, modules: ["Aggregated Analytics", "Data Intelligence"] },
  investor_viewer: { permissions: 3, modules: ["Investor Dashboard", "Aggregated Analytics"] },
};
