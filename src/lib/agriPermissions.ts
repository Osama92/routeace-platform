import { type AgriRole } from "@/hooks/useAgriRole";

export type AgriPermission =
  | "view_executive_dashboard"
  | "view_manufacturer_dashboard"
  | "view_distributor_dashboard"
  | "view_dealer_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_compliance_dashboard"
  | "view_investor_dashboard"
  | "view_sales_intelligence"
  | "view_crop_cycle_intelligence"
  | "manage_farmer_segments"
  | "place_orders"
  | "view_product_catalog"
  | "view_seasonal_planning"
  | "manage_demo_plots"
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "view_batch_tracking"
  | "view_expiry_management"
  | "view_finance_data"
  | "view_invoices"
  | "view_payments"
  | "view_credit_engine"
  | "manage_credit_settings"
  | "view_delivery_routes"
  | "assign_drivers"
  | "track_shipments"
  | "manage_fleet"
  | "view_regulatory_compliance"
  | "manage_product_registration"
  | "view_safety_certificates"
  | "view_traceability"
  | "view_market_intelligence"
  | "view_territory_analytics"
  | "view_demand_forecasting"
  | "view_demand_signals"
  | "view_expansion_engine"
  | "view_weather_intelligence"
  | "view_soil_analytics"
  | "view_dealer_network"
  | "view_farmer_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type AgriOrgType = "manufacturer" | "distributor" | "dealer" | "cooperative" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: AgriRole): AgriOrgType | null => {
  if (role.startsWith("manufacturer_")) return "manufacturer";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("dealer_")) return "dealer";
  if (role.startsWith("cooperative_")) return "cooperative";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<AgriPermission, AgriRole[]> = {
  view_executive_dashboard: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_manufacturer_dashboard: ["manufacturer_ceo", "manufacturer_product_manager", "manufacturer_agronomist", "manufacturer_supply_chain", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_dealer_dashboard: ["dealer_owner", "dealer_store_manager", "dealer_procurement", "platform_admin"],
  view_field_dashboard: ["manufacturer_field_officer", "distributor_field_agent", "cooperative_extension_officer", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_compliance_dashboard: ["manufacturer_regulatory", "manufacturer_ceo", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_crop_cycle_intelligence: ["manufacturer_agronomist", "manufacturer_field_officer", "distributor_field_agent", "cooperative_extension_officer", "manufacturer_ceo", "platform_admin"],
  manage_farmer_segments: ["manufacturer_agronomist", "cooperative_extension_officer", "distributor_field_agent", "platform_admin"],
  place_orders: ["dealer_owner", "dealer_store_manager", "dealer_procurement", "cooperative_manager", "distributor_sales_manager", "platform_admin"],
  view_product_catalog: ["manufacturer_ceo", "manufacturer_product_manager", "distributor_owner", "distributor_sales_manager", "dealer_owner", "dealer_store_manager", "cooperative_manager", "platform_admin"],
  view_seasonal_planning: ["manufacturer_ceo", "manufacturer_product_manager", "manufacturer_agronomist", "distributor_owner", "platform_admin"],
  manage_demo_plots: ["manufacturer_field_officer", "manufacturer_agronomist", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "dealer_owner", "dealer_store_manager", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "dealer_store_manager", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  view_batch_tracking: ["manufacturer_regulatory", "manufacturer_supply_chain", "distributor_warehouse_manager", "platform_admin"],
  view_expiry_management: ["distributor_warehouse_manager", "dealer_store_manager", "manufacturer_supply_chain", "platform_admin"],
  view_finance_data: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "dealer_owner", "dealer_procurement", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "platform_admin"],
  view_regulatory_compliance: ["manufacturer_regulatory", "manufacturer_ceo", "platform_admin"],
  manage_product_registration: ["manufacturer_regulatory", "platform_admin"],
  view_safety_certificates: ["manufacturer_regulatory", "manufacturer_supply_chain", "platform_admin"],
  view_traceability: ["manufacturer_regulatory", "manufacturer_supply_chain", "distributor_warehouse_manager", "platform_admin"],
  view_market_intelligence: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["distributor_sales_manager", "distributor_field_agent", "manufacturer_field_officer", "platform_admin"],
  view_demand_forecasting: ["manufacturer_ceo", "manufacturer_supply_chain", "distributor_owner", "platform_admin"],
  view_demand_signals: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_expansion_engine: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_weather_intelligence: ["manufacturer_agronomist", "manufacturer_field_officer", "cooperative_extension_officer", "manufacturer_ceo", "platform_admin"],
  view_soil_analytics: ["manufacturer_agronomist", "cooperative_extension_officer", "platform_admin"],
  view_dealer_network: ["manufacturer_ceo", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_farmer_network: ["manufacturer_agronomist", "cooperative_extension_officer", "distributor_field_agent", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: AgriRole, permission: AgriPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: AgriRole, permissions: AgriPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
