import { type CosmeticsRole } from "@/hooks/useCosmeticsRole";

export type CosmeticsPermission =
  | "view_executive_dashboard"
  | "view_brand_dashboard"
  | "view_distributor_dashboard"
  | "view_retailer_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_investor_dashboard"
  | "view_sales_intelligence"
  | "view_counter_performance"
  | "manage_beauty_advisors"
  | "place_orders"
  | "view_product_catalog"
  | "view_shade_analytics"
  | "manage_campaign_intelligence"
  | "view_campaign_roi"
  | "manage_promoter_tracking"
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "view_shelf_share"
  | "view_planogram_compliance"
  | "view_finance_data"
  | "view_invoices"
  | "view_payments"
  | "view_credit_engine"
  | "manage_credit_settings"
  | "view_delivery_routes"
  | "assign_drivers"
  | "track_shipments"
  | "manage_fleet"
  | "view_market_intelligence"
  | "view_territory_analytics"
  | "view_demand_forecasting"
  | "view_demand_signals"
  | "view_expansion_engine"
  | "view_beauty_trends"
  | "view_influencer_analytics"
  | "view_retailer_network"
  | "view_counter_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type CosmeticsOrgType = "brand" | "distributor" | "retailer" | "salon" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: CosmeticsRole): CosmeticsOrgType | null => {
  if (role.startsWith("brand_")) return "brand";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("retailer_")) return "retailer";
  if (role.startsWith("salon_")) return "salon";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<CosmeticsPermission, CosmeticsRole[]> = {
  view_executive_dashboard: ["brand_ceo", "distributor_owner", "platform_admin"],
  view_brand_dashboard: ["brand_ceo", "brand_marketing_director", "brand_product_manager", "brand_training_manager", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_retailer_dashboard: ["retailer_store_owner", "retailer_counter_manager", "retailer_procurement", "platform_admin"],
  view_field_dashboard: ["brand_beauty_advisor", "distributor_sales_rep", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["brand_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["brand_ceo", "brand_marketing_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_counter_performance: ["brand_ceo", "brand_marketing_director", "brand_beauty_advisor", "retailer_counter_manager", "distributor_sales_manager", "platform_admin"],
  manage_beauty_advisors: ["brand_training_manager", "brand_marketing_director", "platform_admin"],
  place_orders: ["retailer_store_owner", "retailer_counter_manager", "retailer_procurement", "salon_owner", "distributor_sales_rep", "platform_admin"],
  view_product_catalog: ["brand_ceo", "brand_product_manager", "distributor_owner", "distributor_sales_manager", "retailer_store_owner", "retailer_procurement", "salon_owner", "platform_admin"],
  view_shade_analytics: ["brand_product_manager", "brand_marketing_director", "distributor_sales_manager", "retailer_counter_manager", "platform_admin"],
  manage_campaign_intelligence: ["brand_marketing_director", "brand_ceo", "platform_admin"],
  view_campaign_roi: ["brand_ceo", "brand_marketing_director", "distributor_owner", "platform_admin"],
  manage_promoter_tracking: ["brand_training_manager", "brand_beauty_advisor", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "retailer_store_owner", "retailer_counter_manager", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "retailer_counter_manager", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_shelf_share: ["brand_marketing_director", "brand_beauty_advisor", "distributor_sales_manager", "retailer_counter_manager", "platform_admin"],
  view_planogram_compliance: ["brand_marketing_director", "brand_beauty_advisor", "retailer_counter_manager", "platform_admin"],
  view_finance_data: ["brand_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "retailer_store_owner", "retailer_procurement", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "platform_admin"],
  view_market_intelligence: ["brand_ceo", "brand_marketing_director", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["brand_marketing_director", "distributor_sales_manager", "platform_admin"],
  view_demand_forecasting: ["brand_ceo", "brand_product_manager", "distributor_owner", "platform_admin"],
  view_demand_signals: ["brand_ceo", "brand_marketing_director", "distributor_owner", "platform_admin"],
  view_expansion_engine: ["brand_ceo", "distributor_owner", "platform_admin"],
  view_beauty_trends: ["brand_ceo", "brand_marketing_director", "brand_product_manager", "platform_admin"],
  view_influencer_analytics: ["brand_marketing_director", "brand_ceo", "platform_admin"],
  view_retailer_network: ["brand_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_counter_network: ["brand_marketing_director", "brand_beauty_advisor", "distributor_sales_manager", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: CosmeticsRole, permission: CosmeticsPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: CosmeticsRole, permissions: CosmeticsPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
