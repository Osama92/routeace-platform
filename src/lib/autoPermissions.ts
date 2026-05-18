import { type AutoRole } from "@/hooks/useAutoRole";

export type AutoPermission =
  | "view_executive_dashboard"
  | "view_manufacturer_dashboard"
  | "view_distributor_dashboard"
  | "view_workshop_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_investor_dashboard"
  | "view_sales_intelligence"
  | "view_parts_catalog"
  | "manage_workshop_orders"
  | "place_orders"
  | "view_parts_penetration"
  | "view_workshop_activation"
  | "manage_territory_fill"
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "view_parts_compatibility"
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
  | "view_oem_analytics"
  | "view_workshop_network"
  | "view_dealer_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type AutoOrgType = "manufacturer" | "distributor" | "workshop" | "fleet_operator" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: AutoRole): AutoOrgType | null => {
  if (role.startsWith("manufacturer_")) return "manufacturer";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("workshop_")) return "workshop";
  if (role.startsWith("fleet_")) return "fleet_operator";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<AutoPermission, AutoRole[]> = {
  view_executive_dashboard: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_manufacturer_dashboard: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_product_engineer", "manufacturer_supply_chain", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_workshop_dashboard: ["workshop_owner", "workshop_service_manager", "workshop_parts_manager", "platform_admin"],
  view_field_dashboard: ["manufacturer_territory_rep", "distributor_sales_rep", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_parts_catalog: ["manufacturer_product_engineer", "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "workshop_owner", "workshop_parts_manager", "fleet_maintenance_head", "platform_admin"],
  manage_workshop_orders: ["workshop_owner", "workshop_service_manager", "workshop_parts_manager", "platform_admin"],
  place_orders: ["workshop_owner", "workshop_parts_manager", "fleet_maintenance_head", "distributor_sales_rep", "platform_admin"],
  view_parts_penetration: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_workshop_activation: ["manufacturer_sales_director", "manufacturer_territory_rep", "distributor_sales_manager", "platform_admin"],
  manage_territory_fill: ["manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "workshop_owner", "workshop_parts_manager", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "workshop_parts_manager", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_parts_compatibility: ["manufacturer_product_engineer", "workshop_service_manager", "workshop_parts_manager", "platform_admin"],
  view_finance_data: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "workshop_owner", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "workshop_owner", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "fleet_maintenance_head", "platform_admin"],
  view_market_intelligence: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["manufacturer_sales_director", "manufacturer_territory_rep", "distributor_sales_manager", "platform_admin"],
  view_demand_forecasting: ["manufacturer_ceo", "manufacturer_supply_chain", "distributor_owner", "platform_admin"],
  view_demand_signals: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_expansion_engine: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_oem_analytics: ["manufacturer_ceo", "manufacturer_product_engineer", "platform_admin"],
  view_workshop_network: ["manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_dealer_network: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: AutoRole, permission: AutoPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: AutoRole, permissions: AutoPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
