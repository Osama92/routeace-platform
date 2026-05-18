import { type BuildingRole } from "@/hooks/useBuildingRole";

export type BuildingPermission =
  | "view_executive_dashboard"
  | "view_manufacturer_dashboard"
  | "view_distributor_dashboard"
  | "view_dealer_dashboard"
  | "view_contractor_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_investor_dashboard"
  | "view_sales_intelligence"
  | "view_project_tracking"
  | "manage_site_deliveries"
  | "place_orders"
  | "view_product_catalog"
  | "view_project_pipeline"
  | "manage_quotations"
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "view_bulk_materials"
  | "view_finance_data"
  | "view_invoices"
  | "view_payments"
  | "view_credit_engine"
  | "manage_credit_settings"
  | "view_delivery_routes"
  | "assign_drivers"
  | "track_shipments"
  | "manage_fleet"
  | "view_heavy_vehicle_ops"
  | "view_market_intelligence"
  | "view_territory_analytics"
  | "view_demand_forecasting"
  | "view_demand_signals"
  | "view_expansion_engine"
  | "view_construction_trends"
  | "view_dealer_network"
  | "view_contractor_network"
  | "view_site_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type BuildingOrgType = "manufacturer" | "distributor" | "dealer" | "contractor" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: BuildingRole): BuildingOrgType | null => {
  if (role.startsWith("manufacturer_")) return "manufacturer";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("dealer_")) return "dealer";
  if (role.startsWith("contractor_")) return "contractor";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<BuildingPermission, BuildingRole[]> = {
  view_executive_dashboard: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_manufacturer_dashboard: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_product_manager", "manufacturer_supply_chain", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_dealer_dashboard: ["dealer_owner", "dealer_store_manager", "dealer_procurement", "platform_admin"],
  view_contractor_dashboard: ["contractor_project_manager", "contractor_procurement", "contractor_site_engineer", "platform_admin"],
  view_field_dashboard: ["manufacturer_sales_engineer", "distributor_sales_rep", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_heavy_vehicle_operator", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_project_tracking: ["manufacturer_sales_director", "manufacturer_sales_engineer", "distributor_sales_manager", "contractor_project_manager", "platform_admin"],
  manage_site_deliveries: ["distributor_owner", "distributor_sales_manager", "logistics_fleet_manager", "contractor_site_engineer", "platform_admin"],
  place_orders: ["dealer_owner", "dealer_store_manager", "dealer_procurement", "contractor_procurement", "contractor_project_manager", "platform_admin"],
  view_product_catalog: ["manufacturer_ceo", "manufacturer_product_manager", "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "dealer_owner", "contractor_procurement", "platform_admin"],
  view_project_pipeline: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  manage_quotations: ["manufacturer_sales_engineer", "distributor_sales_manager", "distributor_sales_rep", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "dealer_owner", "dealer_store_manager", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "dealer_store_manager", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_bulk_materials: ["distributor_warehouse_manager", "manufacturer_supply_chain", "logistics_heavy_vehicle_operator", "platform_admin"],
  view_finance_data: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "dealer_owner", "contractor_procurement", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "logistics_heavy_vehicle_operator", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "contractor_site_engineer", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "platform_admin"],
  view_heavy_vehicle_ops: ["logistics_heavy_vehicle_operator", "logistics_fleet_manager", "platform_admin"],
  view_market_intelligence: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["manufacturer_sales_director", "distributor_sales_manager", "platform_admin"],
  view_demand_forecasting: ["manufacturer_ceo", "manufacturer_supply_chain", "distributor_owner", "platform_admin"],
  view_demand_signals: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_expansion_engine: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_construction_trends: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  view_dealer_network: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_contractor_network: ["manufacturer_sales_director", "manufacturer_sales_engineer", "distributor_owner", "platform_admin"],
  view_site_network: ["manufacturer_sales_engineer", "distributor_sales_rep", "contractor_project_manager", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: BuildingRole, permission: BuildingPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: BuildingRole, permissions: BuildingPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
