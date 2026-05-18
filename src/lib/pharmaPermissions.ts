import { type PharmaRole } from "@/hooks/usePharmaRole";

export type PharmaPermission =
  // Dashboards
  | "view_executive_dashboard"
  | "view_manufacturer_dashboard"
  | "view_distributor_dashboard"
  | "view_pharmacy_dashboard"
  | "view_hospital_dashboard"
  | "view_field_dashboard"
  | "view_logistics_dashboard"
  | "view_finance_dashboard"
  | "view_compliance_dashboard"
  | "view_investor_dashboard"
  // Sales & Prescriptions
  | "view_sales_intelligence"
  | "view_prescription_tracking"
  | "manage_doctor_visits"
  | "place_orders"
  | "view_product_catalog"
  | "view_drug_formulary"
  | "manage_sample_distribution"
  | "view_prescription_uplift"
  // Inventory & Supply Chain
  | "view_inventory"
  | "manage_stock"
  | "view_warehouse_ops"
  | "manage_cold_chain"
  | "view_batch_tracking"
  | "view_expiry_management"
  // Finance
  | "view_finance_data"
  | "view_invoices"
  | "view_payments"
  | "view_credit_engine"
  | "manage_credit_settings"
  | "view_reconciliation"
  // Logistics
  | "view_delivery_routes"
  | "assign_drivers"
  | "track_shipments"
  | "manage_fleet"
  | "view_cold_chain_logistics"
  // Compliance & Regulatory
  | "view_nafdac_compliance"
  | "manage_drug_registration"
  | "view_counterfeit_detection"
  | "manage_recall_procedures"
  | "view_pharmacovigilance"
  | "view_adverse_events"
  | "manage_controlled_substances"
  // Intelligence & Analytics
  | "view_market_intelligence"
  | "view_territory_analytics"
  | "view_competitor_analysis"
  | "view_demand_forecasting"
  | "view_demand_signals"
  | "view_expansion_engine"
  // Network
  | "view_doctor_network"
  | "view_pharmacy_network"
  | "view_hospital_network"
  | "view_distributor_network"
  // Platform
  | "view_platform_analytics"
  | "manage_system_config";

export type PharmaOrgType = "manufacturer" | "distributor" | "pharmacy" | "hospital" | "logistics" | "platform";

export const getOrgTypeFromRole = (role: PharmaRole): PharmaOrgType | null => {
  if (role.startsWith("manufacturer_")) return "manufacturer";
  if (role.startsWith("distributor_")) return "distributor";
  if (role.startsWith("pharmacy_")) return "pharmacy";
  if (role.startsWith("hospital_")) return "hospital";
  if (role.startsWith("logistics_")) return "logistics";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<PharmaPermission, PharmaRole[]> = {
  view_executive_dashboard: ["manufacturer_ceo", "distributor_owner", "platform_admin"],
  view_manufacturer_dashboard: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_regulatory_affairs", "manufacturer_supply_chain", "manufacturer_med_science", "platform_admin"],
  view_distributor_dashboard: ["distributor_owner", "distributor_sales_manager", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"],
  view_pharmacy_dashboard: ["pharmacy_owner", "pharmacy_manager", "pharmacy_procurement", "platform_admin"],
  view_hospital_dashboard: ["hospital_pharmacy_director", "hospital_procurement", "platform_admin"],
  view_field_dashboard: ["manufacturer_med_rep", "distributor_sales_rep", "platform_admin"],
  view_logistics_dashboard: ["logistics_fleet_manager", "logistics_cold_chain_specialist", "logistics_delivery_driver", "platform_admin"],
  view_finance_dashboard: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_compliance_dashboard: ["manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_sales_intelligence: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_prescription_tracking: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "manufacturer_med_science", "platform_admin"],
  manage_doctor_visits: ["manufacturer_med_rep", "manufacturer_sales_director", "platform_admin"],
  place_orders: ["pharmacy_owner", "pharmacy_manager", "pharmacy_procurement", "hospital_procurement", "distributor_sales_rep", "platform_admin"],
  view_product_catalog: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "pharmacy_owner", "pharmacy_manager", "pharmacy_procurement", "hospital_procurement", "platform_admin"],
  view_drug_formulary: ["manufacturer_med_science", "manufacturer_regulatory_affairs", "pharmacy_owner", "pharmacy_manager", "hospital_pharmacy_director", "platform_admin"],
  manage_sample_distribution: ["manufacturer_med_rep", "manufacturer_sales_director", "platform_admin"],
  view_prescription_uplift: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "platform_admin"],
  view_inventory: ["distributor_owner", "distributor_warehouse_manager", "distributor_sales_manager", "pharmacy_owner", "pharmacy_manager", "hospital_pharmacy_director", "platform_admin"],
  manage_stock: ["distributor_warehouse_manager", "pharmacy_manager", "hospital_pharmacy_director", "platform_admin"],
  view_warehouse_ops: ["distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  manage_cold_chain: ["distributor_warehouse_manager", "logistics_cold_chain_specialist", "manufacturer_supply_chain", "platform_admin"],
  view_batch_tracking: ["manufacturer_quality_assurance", "manufacturer_supply_chain", "distributor_warehouse_manager", "pharmacy_manager", "platform_admin"],
  view_expiry_management: ["distributor_warehouse_manager", "pharmacy_manager", "hospital_pharmacy_director", "manufacturer_quality_assurance", "platform_admin"],
  view_finance_data: ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_invoices: ["distributor_owner", "distributor_finance_manager", "pharmacy_owner", "pharmacy_procurement", "hospital_procurement", "platform_admin"],
  view_payments: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  view_credit_engine: ["distributor_owner", "distributor_finance_manager", "platform_admin"],
  manage_credit_settings: ["distributor_owner", "platform_admin"],
  view_reconciliation: ["distributor_finance_manager", "platform_admin"],
  view_delivery_routes: ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"],
  assign_drivers: ["logistics_fleet_manager", "platform_admin"],
  track_shipments: ["logistics_fleet_manager", "logistics_delivery_driver", "logistics_cold_chain_specialist", "distributor_owner", "distributor_warehouse_manager", "platform_admin"],
  manage_fleet: ["logistics_fleet_manager", "platform_admin"],
  view_cold_chain_logistics: ["logistics_cold_chain_specialist", "logistics_fleet_manager", "manufacturer_supply_chain", "platform_admin"],
  view_nafdac_compliance: ["manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "manufacturer_ceo", "distributor_owner", "platform_admin"],
  manage_drug_registration: ["manufacturer_regulatory_affairs", "platform_admin"],
  view_counterfeit_detection: ["manufacturer_quality_assurance", "manufacturer_regulatory_affairs", "platform_admin"],
  manage_recall_procedures: ["manufacturer_quality_assurance", "manufacturer_regulatory_affairs", "manufacturer_ceo", "platform_admin"],
  view_pharmacovigilance: ["manufacturer_med_science", "manufacturer_regulatory_affairs", "platform_admin"],
  view_adverse_events: ["manufacturer_med_science", "manufacturer_regulatory_affairs", "manufacturer_ceo", "platform_admin"],
  manage_controlled_substances: ["manufacturer_regulatory_affairs", "pharmacy_owner", "hospital_pharmacy_director", "platform_admin"],
  view_market_intelligence: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  view_territory_analytics: ["manufacturer_sales_director", "manufacturer_med_rep", "distributor_sales_manager", "platform_admin"],
  view_competitor_analysis: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  view_demand_forecasting: ["manufacturer_ceo", "manufacturer_supply_chain", "distributor_owner", "platform_admin"],
  view_demand_signals: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_expansion_engine: ["manufacturer_ceo", "manufacturer_sales_director", "distributor_owner", "platform_admin"],
  view_doctor_network: ["manufacturer_med_rep", "manufacturer_sales_director", "manufacturer_ceo", "platform_admin"],
  view_pharmacy_network: ["manufacturer_sales_director", "distributor_owner", "distributor_sales_manager", "platform_admin"],
  view_hospital_network: ["manufacturer_sales_director", "manufacturer_ceo", "platform_admin"],
  view_distributor_network: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_supply_chain", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: PharmaRole, permission: PharmaPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: PharmaRole, permissions: PharmaPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
