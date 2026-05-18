import { type FMCGRole } from "@/hooks/useFMCGRole";

export type FMCGPermission =
  | "view_dashboard"
  | "view_sales_intelligence"
  | "view_retailers"
  | "view_journey_planning"
  | "view_sku_catalog"
  | "view_logistics"
  | "view_warehouse"
  | "view_procurement"
  | "view_finance"
  | "view_reconciliation"
  | "view_retailer_credit"
  | "view_trade_promotions"
  | "view_distributor_index"
  | "view_margin_dashboard"
  | "view_stock_intelligence"
  | "view_fleet_command"
  | "view_demand_forecasting"
  | "view_team_access"
  | "view_data_lake"
  | "manage_orders"
  | "manage_credit"
  | "manage_inventory"
  | "manage_fleet"
  | "manage_users";

const PERMISSION_MATRIX: Record<FMCGPermission, FMCGRole[]> = {
  view_dashboard: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
    "distributor",
    "warehouse_manager",
    "finance_manager",
    "logistics_coordinator",
  ],
  view_sales_intelligence: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
    "distributor",
  ],
  view_retailers: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
    "distributor",
  ],
  view_journey_planning: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
  ],
  view_sku_catalog: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
    "distributor",
    "warehouse_manager",
  ],
  view_logistics: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "logistics_coordinator",
    "distributor",
    "warehouse_manager",
  ],
  view_warehouse: [
    "strategic_leadership",
    "warehouse_manager",
    "logistics_coordinator",
    "distributor",
  ],
  view_procurement: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "distributor",
    "warehouse_manager",
  ],
  view_finance: [
    "strategic_leadership",
    "finance_manager",
    "regional_sales_manager",
    "distributor",
  ],
  view_reconciliation: [
    "strategic_leadership",
    "finance_manager",
    "distributor",
  ],
  view_retailer_credit: [
    "strategic_leadership",
    "finance_manager",
    "regional_sales_manager",
    "distributor",
  ],
  view_trade_promotions: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
    "sales_representative",
    "merchandiser",
  ],
  view_distributor_index: [
    "strategic_leadership",
    "regional_sales_manager",
    "distributor",
  ],
  view_margin_dashboard: [
    "strategic_leadership",
    "finance_manager",
    "regional_sales_manager",
    "distributor",
  ],
  view_stock_intelligence: [
    "strategic_leadership",
    "warehouse_manager",
    "distributor",
    "logistics_coordinator",
  ],
  view_fleet_command: [
    "strategic_leadership",
    "logistics_coordinator",
    "distributor",
  ],
  view_demand_forecasting: [
    "strategic_leadership",
    "regional_sales_manager",
    "finance_manager",
    "distributor",
  ],
  view_team_access: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
  ],
  view_data_lake: [
    "strategic_leadership",
    "finance_manager",
    "regional_sales_manager",
  ],
  manage_orders: [
    "strategic_leadership",
    "sales_supervisor",
    "sales_representative",
    "distributor",
    "warehouse_manager",
  ],
  manage_credit: [
    "strategic_leadership",
    "finance_manager",
    "distributor",
  ],
  manage_inventory: [
    "strategic_leadership",
    "warehouse_manager",
    "distributor",
  ],
  manage_fleet: [
    "strategic_leadership",
    "logistics_coordinator",
    "distributor",
  ],
  manage_users: [
    "strategic_leadership",
    "regional_sales_manager",
    "area_sales_manager",
    "sales_supervisor",
  ],
};

export const hasPermission = (role: FMCGRole, permission: FMCGPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: FMCGRole, permissions: FMCGPermission[]): boolean => {
  return permissions.some((p) => hasPermission(role, p));
};
