// LC (Logistics Company / 3PL operator) navigation catalog for Zaza.
// SECURITY: This catalog is *strictly* LC-scoped. Do not add LD-only routes
// (anything under `/dept/*` or LD-only consoles) - Zaza must never suggest
// cross-scope links. The LD workspace has its own catalog.

import type { ZazaNavItem } from "./ldNavigationCatalog";

const LC_NAV: ZazaNavItem[] = [
  // Dashboard
  { name: "Super Admin Console", path: "/super-admin", description: "Top-level admin console.", roles: ["super_admin"] },
  { name: "My Savings & ROI", path: "/my-savings", description: "Personal ROI summary.", roles: ["super_admin", "admin", "org_admin", "finance_manager"] },
  { name: "COO Command", path: "/org-admin", description: "COO / org admin command center.", roles: ["org_admin"] },
  { name: "Approval Queue", path: "/org-admin?tab=approvals", description: "Pending approvals.", roles: ["org_admin"] },
  { name: "COO KPI Board", path: "/org-admin?tab=kpis", description: "Org KPI board.", roles: ["org_admin"] },
  { name: "Ops Manager", path: "/ops-manager", description: "Ops manager workspace.", roles: ["ops_manager"] },
  { name: "Finance Manager", path: "/finance-manager", description: "Finance manager workspace.", roles: ["finance_manager"] },
  { name: "Customer Portal", path: "/customer-portal", description: "Customer-facing portal.", roles: ["customer", "super_admin", "org_admin", "admin", "ops_manager", "support"] },
  { name: "Overview", path: "/", description: "Home overview dashboard.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
  { name: "Control Center", path: "/control-center", description: "Operational control center.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },

  // Operations
  { name: "Dispatch", path: "/dispatch", description: "Create and manage dispatches.", roles: ["admin", "dispatcher", "super_admin", "org_admin", "ops_manager"] },
  { name: "Route Planner", path: "/advanced-route-planner", description: "Multi-drop route optimizer.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "Routes Library", path: "/routes", description: "Saved routes library.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "dispatcher"] },
  { name: "SLA Management", path: "/operations/sla-management", description: "SLA targets and breaches.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Tracking", path: "/tracking", description: "Live shipment tracking.", roles: ["admin", "support", "dispatcher", "super_admin", "org_admin", "ops_manager"] },
  { name: "Fleet Command", path: "/fleet-command", description: "Real-time fleet command.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },

  // Fleet & Drivers
  { name: "Fleet", path: "/fleet", description: "Vehicle roster.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Fleet Intelligence", path: "/company/fleet-intelligence", description: "Fleet analytics.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Inspection & Safety", path: "/fleet-inspection", description: "Vehicle inspection workflow.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Fleet Compliance", path: "/fleet-compliance", description: "Document and regulatory compliance.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Driver Intelligence", path: "/company/driver-intelligence", description: "Driver scoring and risk.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "IoT Telemetry", path: "/iot-telemetry", description: "Sensor and telemetry feed.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Autonomous Fleet", path: "/autonomous-fleet", description: "Autonomous fleet controller.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Fuel Intelligence", path: "/fuel-intelligence", description: "Fuel usage and fraud detection.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "Predictive Maintenance", path: "/predictive-maintenance", description: "Predictive maintenance.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Asset Operations Control", path: "/asset-operations", description: "Asset operations control.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Maintenance ROI", path: "/maintenance-cost-optimizer", description: "Maintenance cost ROI.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Fuel Savings ROI", path: "/fuel-savings", description: "Fuel savings tracker.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Revenue Expansion", path: "/revenue-expansion", description: "Revenue expansion engine.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Autonomous Company", path: "/autonomous-company", description: "Autonomous company controller.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Executive Command", path: "/executive-command", description: "Executive command center.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Drivers", path: "/drivers", description: "Driver roster.", roles: ["admin", "dispatcher", "super_admin", "org_admin", "ops_manager"] },
  { name: "Customers", path: "/customers", description: "Customer book.", roles: ["admin", "support", "super_admin", "org_admin", "ops_manager"] },

  // Finance
  { name: "Invoices", path: "/invoices", description: "Customer invoices.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Bills", path: "/bills", description: "Vendor bills (payables).", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "AR/AP Ledger", path: "/accounts-ledger", description: "Receivables and payables ledger.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Expenses", path: "/expenses", description: "Operational expenses.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Unified Payroll", path: "/payroll", description: "Unified payroll.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Driver Payroll", path: "/driver-payroll", description: "Driver-specific payroll.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Driver Bonuses", path: "/driver-bonuses", description: "Driver bonuses.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Multi-Drop Billing", path: "/multidrop", description: "Multi-drop billing engine.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Payout Engine", path: "/payout-engine", description: "Payout engine.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Capital & Funding", path: "/loan-management", description: "Capital, loans, working capital.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Tax Filing", path: "/tax-filing-report", description: "Tax filing reports.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Chart of Accounts", path: "/chart-of-accounts", description: "Chart of accounts.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Tax Engines", path: "/tax-engines", description: "Tax engines and config.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Financial Statements", path: "/financial-statements", description: "P&L, balance sheet, cashflow.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Cashflow AI", path: "/cashflow-forecast", description: "AI cashflow forecast.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Financial Intelligence", path: "/financial-intelligence", description: "Financial intelligence.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Profitability Engine", path: "/profitability-engine", description: "Profitability tracker.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Revenue Optimization", path: "/revenue-optimization", description: "Revenue optimization.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Revenue Protection", path: "/revenue-protection", description: "Revenue leakage protection.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Billing Engine", path: "/billing-engine", description: "Billing engine config.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Fleet CCC", path: "/fleet-financial-intelligence", description: "Cash conversion cycle.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Revenue Recognition", path: "/revenue-recognition", description: "IFRS 15 revenue recognition.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Reconciliation", path: "/finance-reconciliation", description: "Finance reconciliation.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Period Closing", path: "/period-closing", description: "Month-end period closing.", roles: ["admin", "super_admin", "finance_manager"] },
  { name: "Finance Integrations", path: "/finance-integrations", description: "Finance integrations.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "AI Command Center", path: "/ai-command-center", description: "AI command center.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "AI Performance (Finance)", path: "/finance-ai-performance", description: "Finance AI performance.", roles: ["admin", "super_admin", "finance_manager"] },

  // Workforce
  { name: "My Leave", path: "/workforce/my-leave", description: "Personal leave requests.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
  { name: "Daily Sign-In", path: "/workforce/sign-in", description: "Daily sign-in.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
  { name: "My KPIs", path: "/workforce/my-kpis", description: "Personal KPIs.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
  { name: "My Payslips", path: "/workforce/my-payslips", description: "Personal payslips.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
  { name: "Leave Approvals", path: "/workforce/leave-inbox", description: "Approve team leave requests.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Performance Panel", path: "/workforce/performance", description: "Performance panel.", roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
  { name: "Team Performance", path: "/workforce/team-performance", description: "Team performance rollup.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "All Payslips", path: "/workforce/payslips", description: "All payslips (admin).", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Payroll Audit", path: "/workforce/payroll-audit", description: "Payroll audit.", roles: ["admin", "super_admin", "finance_manager"] },

  // Reports & Analytics
  { name: "Decision Cockpit", path: "/decision-cockpit", description: "Decision cockpit.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "Analytics", path: "/analytics", description: "Analytics dashboard.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "P&L Analytics", path: "/admin-analytics", description: "P&L analytics.", roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
  { name: "KPI Intelligence", path: "/kpi-dashboard", description: "KPI intelligence.", roles: ["admin", "super_admin", "finance_manager", "ops_manager"] },
  { name: "Investor Dashboard", path: "/investor", description: "Investor dashboard.", roles: ["admin", "super_admin", "finance_manager"] },

  // Intelligence
  { name: "AI Modules Hub", path: "/ai-modules", description: "AI modules hub.", roles: ["super_admin"] },
  { name: "GTM Brain (Logistics)", path: "/gtm-brain-logistics", description: "GTM brain.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "AI CEO Command", path: "/ai-ceo", description: "AI CEO command.", roles: ["super_admin"] },
  { name: "Executive Autopilot", path: "/executive-autopilot", description: "Executive autopilot.", roles: ["super_admin", "org_admin"] },
  { name: "AI Controller", path: "/ai-operations", description: "AI operations controller.", roles: ["admin", "super_admin", "ops_manager", "finance_manager"] },
  { name: "Market Intelligence", path: "/market-intelligence", description: "Market intelligence.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
  { name: "AI Performance", path: "/role-ai-performance", description: "Role AI performance.", roles: ["ops_manager", "support", "org_admin", "super_admin", "admin"] },
  { name: "Decision Simulator", path: "/decision-simulation", description: "Decision simulator.", roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
  { name: "Execution Engine", path: "/autonomous-execution", description: "Autonomous execution engine.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "AI Workforce", path: "/ai-workforce", description: "AI workforce.", roles: ["super_admin", "org_admin"] },

  // Partners & Staff
  { name: "Partners", path: "/partners", description: "Partner directory.", roles: ["admin", "super_admin"] },
  { name: "Vendor Performance", path: "/vendor-performance", description: "Vendor scorecards.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Staff", path: "/staff", description: "Staff directory.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Support Center", path: "/support-center", description: "Support center.", roles: ["admin", "super_admin", "org_admin", "support"] },

  // Administration
  { name: "Admin Governance", path: "/admin-governance", description: "Admin governance.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Operations Governance", path: "/governance-control", description: "Operations governance.", roles: ["admin", "super_admin"] },
  { name: "Decision Center", path: "/decision-center", description: "Decision center.", roles: ["admin", "super_admin", "ops_manager"] },
  { name: "Approval Center", path: "/approval-center", description: "Approval center.", roles: ["admin", "super_admin", "org_admin", "finance_manager", "ops_manager"] },
  { name: "Security Center", path: "/security-center", description: "Security center.", roles: ["admin", "super_admin"] },
  { name: "Invoice Approvals", path: "/invoice-approvals", description: "Invoice approvals queue.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Trip Rate Config", path: "/trip-rate-config", description: "Trip rate configuration.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "API Access", path: "/api-access", description: "API access keys.", roles: ["admin", "super_admin"] },
  { name: "Reseller Command", path: "/reseller-command-center", description: "Reseller command center.", roles: ["super_admin"] },
  { name: "Users", path: "/users", description: "User management.", roles: ["admin", "super_admin", "org_admin"] },
  { name: "Emails", path: "/emails", description: "Email center.", roles: ["admin", "super_admin", "org_admin", "support"] },
  { name: "Settings", path: "/settings", description: "Workspace settings.", roles: ["admin", "super_admin", "org_admin"] },
];

export function getLCNavCatalogForRole(role: string | null | undefined): ZazaNavItem[] {
  if (!role) return [];
  return LC_NAV.filter((item) => item.roles.includes(role));
}
