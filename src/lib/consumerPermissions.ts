import { type ConsumerRole } from "@/hooks/useConsumerRole";

export type ConsumerPermission =
  | "view_executive_dashboard"
  | "view_manufacturer_dashboard"
  | "view_distributor_dashboard"
  | "view_retailer_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_investor_dashboard"
  | "view_sales_intelligence"
  | "view_sku_performance"
  | "manage_retailer_visits"
  | "place_orders"
  | "view_product_catalog"
  | "view_distribution_metrics"
  | "view_promotion_management"
  | "view_promotion_roi"
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "view_shelf_compliance"
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
  | "view_consumer_trends"
  | "view_retailer_network"
  | "view_distributor_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type ConsumerOrgType = "manufacturer" | "distributor" | "retailer" | "wholesaler" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: ConsumerRole): ConsumerOrgType | null => {
  if (role.startsWith("manufacturer_")) return "manufacturer";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("retailer_")) return "retailer";
  if (role.startsWith("wholesaler_")) return "wholesaler";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<ConsumerPermission, ConsumerRole[]> = {
  view_executive_dashboard: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_manufacturer_dashboard: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_brand_manager", "manufacturer_supply_chain", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_retailer_dashboard: ["retailer_owner", "retailer_store_manager", "retailer_procurement", "platform_admin"],
  view_field_dashboard: ["manufacturer_sales_rep", "distributor_sales_rep", "manufacturer_merchandiser", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_sku_performance: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_brand_manager", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  manage_retailer_visits: ["manufacturer_sales_rep", "manufacturer_merchandiser", "distributor_sales_rep", "platform_admin"],
  place_orders: ["retailer_owner", "retailer_store_manager", "retailer_procurement", "wholesaler_owner", "wholesaler_procurement", "distributor_sales_rep", "platform_admin"],
  view_product_catalog: ["manufacturer_ceo", "manufacturer_brand_manager", "distributor_owner", "distributor_sales_manager", "retailer_owner", "retailer_procurement", "wholesaler_owner", "platform_admin"],
  view_distribution_metrics: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  view_promotion_management: ["manufacturer_brand_manager", "manufacturer_sales_director", "distributor_sales_manager", "platform_admin"],
  view_promotion_roi: ["manufacturer_ceo", "manufacturer_brand_manager", "distributor_owner", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "retailer_owner", "retailer_store_manager", "wholesaler_owner", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "retailer_store_manager", "wholesaler_owner", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_shelf_compliance: ["manufacturer_merchandiser", "manufacturer_brand_manager", "distributor_sales_manager", "platform_admin"],
  view_finance_data: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "retailer_owner", "retailer_procurement", "wholesaler_owner", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "platform_admin"],
  view_market_intelligence: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["manufacturer_sales_director", "distributor_sales_manager", "platform_admin"],
  view_demand_forecasting: ["manufacturer_ceo", "manufacturer_supply_chain", "distributor_owner", "platform_admin"],
  view_demand_signals: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_expansion_engine: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_consumer_trends: ["manufacturer_ceo", "manufacturer_brand_manager", "manufacturer_sales_director", "platform_admin"],
  view_retailer_network: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_distributor_network: ["manufacturer_ceo", "manufacturer_sales_director", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: ConsumerRole, permission: ConsumerPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: ConsumerRole, permissions: ConsumerPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
