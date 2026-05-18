import { type BFSIRole } from "@/hooks/useBFSIRole";

export type BFSIPermission =
  | "view_executive_dashboard"
  | "view_bank_dashboard"
  | "view_branch_dashboard"
  | "view_agent_dashboard"
  | "view_field_dashboard"
  | "view_operations_dashboard"
  | "view_finance_dashboard"
  | "view_compliance_dashboard"
  | "view_investor_dashboard"
  | "view_loan_portfolio"
  | "manage_loan_applications"
  | "approve_loans"
  | "view_agent_productivity"
  | "manage_agent_network"
  | "view_collections"
  | "manage_collections"
  | "view_product_catalog"
  | "manage_product_config"
  | "view_customer_profiles"
  | "manage_kyc"
  | "view_disbursements"
  | "manage_disbursements"
  | "view_finance_data"
  | "view_portfolio_risk"
  | "view_par_reports"
  | "manage_write_offs"
  | "view_treasury"
  | "view_delivery_routes"
  | "track_agents"
  | "manage_territories"
  | "view_regulatory_compliance"
  | "manage_aml_kyc"
  | "view_fraud_detection"
  | "manage_audit_reports"
  | "view_cbn_reporting"
  | "view_market_intelligence"
  | "view_territory_analytics"
  | "view_demand_forecasting"
  | "view_demand_signals"
  | "view_expansion_engine"
  | "view_credit_scoring_ai"
  | "view_agent_network_map"
  | "view_branch_network"
  | "view_platform_analytics"
  | "manage_system_config";

export type BFSIOrgType = "bank" | "microfinance" | "insurance" | "fintech" | "agent_network" | "platform";

export const getOrgTypeFromRole = (role: BFSIRole): BFSIOrgType | null => {
  if (role.startsWith("bank_")) return "bank";
  if (role.startsWith("mfi_")) return "microfinance";
  if (role.startsWith("insurance_")) return "insurance";
  if (role.startsWith("fintech_")) return "fintech";
  if (role.startsWith("agent_")) return "agent_network";
  if (role.startsWith("platform_")) return "platform";
  return null;
};

const PERMISSION_MATRIX: Record<BFSIPermission, BFSIRole[]> = {
  view_executive_dashboard: ["bank_ceo", "mfi_ceo", "insurance_ceo", "fintech_ceo", "platform_admin"],
  view_bank_dashboard: ["bank_ceo", "bank_branch_manager", "bank_credit_officer", "bank_risk_officer", "bank_compliance_officer", "platform_admin"],
  view_branch_dashboard: ["bank_branch_manager", "mfi_branch_manager", "platform_admin"],
  view_agent_dashboard: ["agent_network_manager", "agent_field_officer", "agent_super_agent", "platform_admin"],
  view_field_dashboard: ["bank_credit_officer", "mfi_loan_officer", "agent_field_officer", "insurance_sales_agent", "platform_admin"],
  view_operations_dashboard: ["bank_ceo", "bank_branch_manager", "mfi_ceo", "mfi_branch_manager", "platform_admin"],
  view_finance_dashboard: ["bank_ceo", "mfi_ceo", "fintech_ceo", "platform_admin"],
  view_compliance_dashboard: ["bank_compliance_officer", "bank_risk_officer", "mfi_ceo", "platform_admin"],
  view_investor_dashboard: ["investor_viewer", "platform_admin"],
  view_loan_portfolio: ["bank_ceo", "bank_branch_manager", "bank_credit_officer", "bank_risk_officer", "mfi_ceo", "mfi_branch_manager", "mfi_loan_officer", "platform_admin"],
  manage_loan_applications: ["bank_credit_officer", "mfi_loan_officer", "fintech_product_manager", "platform_admin"],
  approve_loans: ["bank_branch_manager", "bank_ceo", "mfi_branch_manager", "mfi_ceo", "platform_admin"],
  view_agent_productivity: ["agent_network_manager", "agent_super_agent", "bank_branch_manager", "mfi_branch_manager", "platform_admin"],
  manage_agent_network: ["agent_network_manager", "bank_ceo", "mfi_ceo", "platform_admin"],
  view_collections: ["bank_branch_manager", "bank_credit_officer", "mfi_branch_manager", "mfi_loan_officer", "mfi_collections_officer", "platform_admin"],
  manage_collections: ["mfi_collections_officer", "bank_credit_officer", "platform_admin"],
  view_product_catalog: ["bank_ceo", "bank_branch_manager", "mfi_ceo", "fintech_ceo", "fintech_product_manager", "insurance_ceo", "insurance_product_manager", "platform_admin"],
  manage_product_config: ["bank_ceo", "mfi_ceo", "fintech_product_manager", "insurance_product_manager", "platform_admin"],
  view_customer_profiles: ["bank_credit_officer", "bank_branch_manager", "mfi_loan_officer", "mfi_branch_manager", "agent_field_officer", "platform_admin"],
  manage_kyc: ["bank_compliance_officer", "bank_credit_officer", "mfi_loan_officer", "agent_field_officer", "platform_admin"],
  view_disbursements: ["bank_ceo", "bank_branch_manager", "mfi_ceo", "mfi_branch_manager", "fintech_ceo", "platform_admin"],
  manage_disbursements: ["bank_branch_manager", "mfi_branch_manager", "fintech_ceo", "platform_admin"],
  view_finance_data: ["bank_ceo", "mfi_ceo", "fintech_ceo", "insurance_ceo", "platform_admin"],
  view_portfolio_risk: ["bank_risk_officer", "bank_ceo", "mfi_ceo", "platform_admin"],
  view_par_reports: ["bank_risk_officer", "bank_ceo", "bank_branch_manager", "mfi_ceo", "mfi_branch_manager", "platform_admin"],
  manage_write_offs: ["bank_ceo", "mfi_ceo", "platform_admin"],
  view_treasury: ["bank_ceo", "mfi_ceo", "fintech_ceo", "platform_admin"],
  view_delivery_routes: ["agent_field_officer", "agent_network_manager", "platform_admin"],
  track_agents: ["agent_network_manager", "agent_super_agent", "bank_branch_manager", "mfi_branch_manager", "platform_admin"],
  manage_territories: ["agent_network_manager", "bank_ceo", "mfi_ceo", "platform_admin"],
  view_regulatory_compliance: ["bank_compliance_officer", "bank_risk_officer", "bank_ceo", "mfi_ceo", "platform_admin"],
  manage_aml_kyc: ["bank_compliance_officer", "platform_admin"],
  view_fraud_detection: ["bank_risk_officer", "bank_compliance_officer", "fintech_ceo", "platform_admin"],
  manage_audit_reports: ["bank_compliance_officer", "bank_ceo", "platform_admin"],
  view_cbn_reporting: ["bank_compliance_officer", "bank_ceo", "mfi_ceo", "platform_admin"],
  view_market_intelligence: ["bank_ceo", "mfi_ceo", "fintech_ceo", "insurance_ceo", "platform_admin"],
  view_territory_analytics: ["bank_branch_manager", "mfi_branch_manager", "agent_network_manager", "platform_admin"],
  view_demand_forecasting: ["bank_ceo", "mfi_ceo", "fintech_ceo", "platform_admin"],
  view_demand_signals: ["bank_ceo", "mfi_ceo", "fintech_ceo", "platform_admin"],
  view_expansion_engine: ["bank_ceo", "mfi_ceo", "fintech_ceo", "platform_admin"],
  view_credit_scoring_ai: ["bank_risk_officer", "bank_credit_officer", "mfi_loan_officer", "fintech_product_manager", "platform_admin"],
  view_agent_network_map: ["agent_network_manager", "bank_ceo", "mfi_ceo", "platform_admin"],
  view_branch_network: ["bank_ceo", "mfi_ceo", "platform_admin"],
  view_platform_analytics: ["platform_admin"],
  manage_system_config: ["platform_admin"],
};

export const hasPermission = (role: BFSIRole, permission: BFSIPermission): boolean => {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
};

export const hasAnyPermission = (role: BFSIRole, permissions: BFSIPermission[]): boolean => {
  return permissions.some(p => hasPermission(role, p));
};
