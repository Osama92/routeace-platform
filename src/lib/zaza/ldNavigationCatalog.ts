// LD (Logistics Department) navigation catalog for Zaza.
// SECURITY: This catalog is *strictly* LD-scoped. Do not add LC (Logistics
// Company / 3PL operator) routes here - Zaza must never suggest cross-scope
// links. The LC workspace must build its own catalog from its own sidebar.

export type ZazaNavItem = {
  name: string;
  path: string;
  description: string;
  roles: string[]; // roles allowed to see this entry
};

const LD_NAV: ZazaNavItem[] = [
  // Command
  { name: "Logistics Director Console", path: "/super-admin", description: "Org-wide director console.", roles: ["super_admin"] },
  { name: "Logistics Manager Command", path: "/org-admin", description: "Manager command center.", roles: ["org_admin", "super_admin"] },
  { name: "Approval Queue", path: "/org-admin?tab=approvals", description: "Pending approvals across LD.", roles: ["org_admin", "super_admin"] },
  { name: "Logistics KPI Board", path: "/org-admin?tab=kpis", description: "KPI rollup for LD.", roles: ["org_admin", "super_admin"] },
  { name: "Outbound & Inbound Desk", path: "/ops-manager", description: "Ops manager workspace.", roles: ["ops_manager", "super_admin", "org_admin"] },
  { name: "Logistics Cost Control", path: "/finance-manager", description: "Finance manager cost control.", roles: ["finance_manager", "super_admin", "org_admin"] },
  { name: "Sales & Distribution Tracker", path: "/dept/sales-tracker", description: "Sales and distribution tracker.", roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
  { name: "Route Approvals", path: "/dept/route-approvals", description: "Approve proposed routes.", roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
  { name: "Support Desk", path: "/support-center", description: "Support tickets and SLA resolution.", roles: ["support", "super_admin", "org_admin"] },

  // Operations
  { name: "Dispatch", path: "/dispatch", description: "Create and manage dispatches.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Outbound & Inbound", path: "/warehouse-outbound", description: "Warehouse movement.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Waybill Templates", path: "/waybill-templates", description: "Waybill template manager.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Inbound Receipts (GRN)", path: "/dept/inbound-receipts", description: "Goods received notes.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Route Planner", path: "/advanced-route-planner", description: "Multi-drop route optimizer.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Routes Library", path: "/routes", description: "Saved routes library.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Waybill Management", path: "/waybill-management", description: "Issued waybills.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "SLA Management", path: "/operations/sla-management", description: "SLA targets and breaches.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "Exception Management", path: "/dept/exceptions", description: "Delivery exceptions queue.", roles: ["super_admin", "org_admin", "ops_manager", "support"] },
  { name: "Tracking", path: "/tracking", description: "Live shipment tracking.", roles: ["super_admin", "org_admin", "ops_manager", "support", "dispatcher"] },
  { name: "Fleet Command", path: "/fleet-command", description: "Real-time fleet command.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "Approval Center", path: "/approval-center", description: "Cross-domain approvals.", roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },

  // Fleet & Drivers
  { name: "Fleet", path: "/fleet", description: "Vehicle roster.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "Fleet Cost Intelligence", path: "/fleet-intelligence", description: "Fleet cost analytics.", roles: ["super_admin", "org_admin", "finance_manager"] },
  { name: "Driver & 3PL Compliance", path: "/driver-intelligence", description: "Driver and vendor compliance scoring.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "Drivers", path: "/drivers", description: "Driver roster.", roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },

  // Vendor (3PL) Management
  { name: "3PL Transporter Roster", path: "/dept/transporters", description: "Approve and manage 3PL transporters.", roles: ["super_admin", "admin", "org_admin"] },
  { name: "Vendor Onboarding", path: "/dept/vendor-onboarding", description: "Onboard new vendors.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "Vendor Performance", path: "/vendor-performance", description: "Vendor scorecards.", roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "Vendor Rate Cards", path: "/vendor-rate-cards", description: "Vendor rate cards.", roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "Dynamic Pricing", path: "/dept-dynamic-pricing", description: "Dynamic vendor pricing.", roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "ERP Integrations", path: "/erp-integrations", description: "ERP sync configuration.", roles: ["super_admin", "org_admin"] },
  { name: "Vendor Payables", path: "/vendor-payables", description: "Vendor invoices and payables.", roles: ["super_admin", "org_admin", "finance_manager"] },

  // Cost Intelligence
  { name: "Cost Centre Dashboard", path: "/dept/cost-centre", description: "Cost centre rollup.", roles: ["super_admin", "org_admin", "finance_manager"] },
  { name: "Cost per Delivery", path: "/dept/cost-per-delivery", description: "Cost-per-drop analytics.", roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },
  { name: "Budget Planning", path: "/dept/budget-planning", description: "Plan vs actual budgeting.", roles: ["super_admin", "org_admin", "finance_manager"] },
  { name: "Reconciliation", path: "/finance-reconciliation", description: "Finance reconciliation.", roles: ["super_admin", "org_admin", "finance_manager"] },
  { name: "Expenses", path: "/expenses", description: "Operational expenses.", roles: ["super_admin", "org_admin", "finance_manager"] },

  // Intelligence
  { name: "AI Operations Controller", path: "/ai-operations", description: "AI ops controller.", roles: ["super_admin", "org_admin", "ops_manager"] },
  { name: "KPI Intelligence", path: "/kpi-dashboard", description: "KPI dashboard.", roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },
  { name: "Market Intelligence", path: "/market-intelligence", description: "Market intelligence.", roles: ["super_admin", "org_admin"] },

  // Administration
  { name: "Admin Governance", path: "/admin-governance", description: "Admin governance.", roles: ["super_admin", "org_admin"] },
  { name: "Team Management", path: "/users", description: "Manage team members.", roles: ["super_admin", "org_admin"] },
  { name: "Integrations", path: "/finance-integrations", description: "Finance integrations.", roles: ["super_admin", "org_admin"] },
  { name: "Jaggaer Integration", path: "/dept/jaggaer", description: "Jaggaer connector.", roles: ["super_admin", "org_admin"] },
  { name: "Analytics", path: "/admin-analytics", description: "Org-wide analytics.", roles: ["super_admin", "org_admin", "finance_manager"] },
  { name: "Settings", path: "/settings", description: "Workspace settings.", roles: ["super_admin", "org_admin"] },
];

export function getLDNavCatalogForRole(role: string | null | undefined): ZazaNavItem[] {
  if (!role) return [];
  return LD_NAV.filter((item) => item.roles.includes(role));
}
