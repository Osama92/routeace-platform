import brandLogo from "@/assets/routeace-mark.png";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Truck, Users, MapPin, FileText, Package, Settings,
  ChevronLeft, ChevronRight, ChevronDown, Route, BarChart3, Mail,
  Building2, Handshake, UserCog, LogOut, CircleDollarSign, PieChart,
  TrendingUp, Briefcase, Receipt, Key, Crown, Shield, CreditCard,
  ClipboardList, Navigation, CheckCircle, Wallet, Radio, BookOpen,
  Brain, Gauge, Headphones, ShieldCheck, Cpu, Zap,
  Lock, Target, Sparkles, Fuel, Wrench, Store, Bot, Building, DollarSign, Megaphone,
  CalendarDays, UserCheck, Activity, Warehouse, AlertTriangle, PackageCheck, UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";
import useWhiteLabel from "@/hooks/useWhiteLabel";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import { SuperAdminBadge } from "@/components/auth/SuperAdminBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import WorkspaceSwitcher from "@/components/shell/WorkspaceSwitcher";
import { cn } from "@/lib/utils";
import { resolveTenantMode } from "@/lib/tenant/featureRegistry";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";

type AppRole = "admin" | "operations" | "support" | "dispatcher" | "driver" | "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "customer";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  region?: "NG" | "GLOBAL" | "BOTH";
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

const OPERATIONAL_INTELLIGENCE_ROUTES = new Set([
  "/ai-operations",
  "/market-intelligence",
  "/role-ai-performance",
  "/decision-simulation",
  "/autonomous-execution",
]);

const SHARED_INTELLIGENCE_ROLES: AppRole[] = [
  "admin",
  "super_admin",
  "org_admin",
  "ops_manager",
  "finance_manager",
  "operations",
  "dispatcher",
  "support",
  "driver",
  "customer",
];

// ─── Logistics OS Section Definitions ──────────────────────────────
// BOUNDARY RULE: Only logistics-relevant modules appear here.
// Distribution Exchange, PortoDash, FinTech, Platform Infrastructure → separate platforms.

const dashboardSection: NavSection = {
  title: "Dashboard",
  icon: LayoutDashboard,
  defaultOpen: true,
  items: [
    { name: "Super Admin Console", href: "/super-admin", icon: Crown, roles: ["super_admin"] },
    { name: "My Savings & ROI", href: "/my-savings", icon: TrendingUp, roles: ["super_admin", "admin", "org_admin", "finance_manager"] },
    { name: "COO Command", href: "/org-admin", icon: Building2, roles: ["org_admin"] },
    { name: "Ops Manager", href: "/ops-manager", icon: ClipboardList, roles: ["ops_manager"] },
    { name: "Finance Manager", href: "/finance-manager", icon: CreditCard, roles: ["finance_manager"] },
    { name: "Driver Super App", href: "/driver-super-app", icon: Navigation, roles: ["driver"] },
    { name: "3PL Transporter Portal", href: "/transporter-portal", icon: Navigation, roles: ["transporter" as any] },
    { name: "Vendor Portal", href: "/vendor-portal", icon: FileText, roles: ["transporter" as any] },
    { name: "Customer Portal", href: "/customer-portal", icon: Package, roles: ["customer", "super_admin", "org_admin", "admin", "ops_manager", "support"] },
    { name: "Overview", href: "/", icon: LayoutDashboard, roles: ["admin", "operations", "support", "dispatcher", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "Control Center", href: "/control-center", icon: Cpu, roles: ["admin", "super_admin", "org_admin"] },
    // NOTE: 'customer' role intentionally excluded from above - they only see Customer Portal entry above
  ],
};

const operationsSection: NavSection = {
  title: "Operations",
  icon: Truck,
  items: [
    { name: "Dispatch", href: "/dispatch", icon: Package, roles: ["admin", "operations", "dispatcher", "super_admin", "org_admin", "ops_manager"] },
    { name: "Route Planner", href: "/advanced-route-planner", icon: Route, roles: ["admin", "super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Routes Library", href: "/routes", icon: Navigation, roles: ["admin", "super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "SLA Management", href: "/operations/sla-management", icon: Shield, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Fleet Command", href: "/fleet-command", icon: Radio, roles: ["admin", "super_admin", "org_admin", "ops_manager"], region: "BOTH" },
  ],
};

const fleetSection: NavSection = {
  title: "Fleet & Drivers",
  icon: Truck,
  items: [
    { name: "Fleet", href: "/fleet", icon: Truck, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Fleet Intelligence", href: "/company/fleet-intelligence", icon: Brain, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Inspection & Safety", href: "/fleet-inspection", icon: ShieldCheck, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Fleet Compliance", href: "/fleet-compliance", icon: ClipboardList, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Driver Intelligence", href: "/company/driver-intelligence", icon: Brain, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Fuel Intelligence", href: "/fuel-intelligence", icon: Fuel, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "Predictive Maintenance", href: "/predictive-maintenance", icon: Wrench, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Asset Operations Control", href: "/asset-operations", icon: Activity, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    
    { name: "Maintenance ROI", href: "/maintenance-cost-optimizer", icon: Wrench, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Fuel Savings ROI", href: "/fuel-savings", icon: DollarSign, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Revenue Expansion", href: "/revenue-expansion", icon: Megaphone, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Autonomous Company", href: "/autonomous-company", icon: Bot, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Executive Command", href: "/executive-command", icon: Building, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Drivers", href: "/drivers", icon: Users, roles: ["admin", "dispatcher", "super_admin", "org_admin", "ops_manager"] },
    { name: "Customers", href: "/customers", icon: Building2, roles: ["admin", "support", "super_admin", "org_admin", "ops_manager"] },
  ],
};

const financeSection: NavSection = {
  title: "Finance",
  icon: CreditCard,
  items: [
    { name: "Invoices", href: "/invoices", icon: FileText, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Bills", href: "/bills", icon: Receipt, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "AR/AP Ledger", href: "/accounts-ledger", icon: BookOpen, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Expenses", href: "/expenses", icon: CircleDollarSign, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Unified Payroll", href: "/payroll", icon: Receipt, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Driver Payroll", href: "/driver-payroll", icon: Wallet, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Driver Bonuses", href: "/driver-bonuses", icon: TrendingUp, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Multi-Drop Billing", href: "/multidrop", icon: Package, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Payout Engine", href: "/payout-engine", icon: CreditCard, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Capital & Funding", href: "/loan-management", icon: Wallet, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Tax Filing", href: "/tax-filing-report", icon: FileText, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Tax Engines", href: "/tax-engines", icon: Receipt, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Financial Statements", href: "/financial-statements", icon: FileText, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Cashflow AI", href: "/cashflow-forecast", icon: TrendingUp, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Financial Intelligence", href: "/financial-intelligence", icon: Brain, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Profitability Engine", href: "/profitability-engine", icon: TrendingUp, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Revenue Optimization", href: "/revenue-optimization", icon: Target, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Revenue Protection", href: "/revenue-protection", icon: Shield, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Billing Engine", href: "/billing-engine", icon: CreditCard, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Fleet CCC", href: "/fleet-financial-intelligence", icon: Gauge, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Revenue Recognition", href: "/revenue-recognition", icon: CheckCircle, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Reconciliation", href: "/finance-reconciliation", icon: CheckCircle, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Period Closing", href: "/period-closing", icon: Lock, roles: ["admin", "super_admin", "finance_manager"] },
    { name: "Integrations", href: "/finance-integrations", icon: Zap, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "AI Command Center", href: "/ai-command-center", icon: Brain, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "AI Performance", href: "/finance-ai-performance", icon: Sparkles, roles: ["admin", "super_admin", "finance_manager"] },
  ],
};

const reportsSection: NavSection = {
  title: "Reports & Analytics",
  icon: BarChart3,
  items: [
    { name: "Decision Cockpit", href: "/decision-cockpit", icon: Gauge, roles: ["admin", "super_admin", "org_admin", "finance_manager"], region: "BOTH" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin", "super_admin", "org_admin", "finance_manager"], region: "BOTH" },
    { name: "P&L Analytics", href: "/admin-analytics", icon: PieChart, roles: ["admin", "super_admin", "org_admin", "finance_manager"], region: "BOTH" },
    { name: "KPI Intelligence", href: "/kpi-dashboard", icon: BarChart3, roles: ["admin", "super_admin", "finance_manager", "ops_manager"], region: "BOTH" },
    { name: "Investor Dashboard", href: "/investor", icon: TrendingUp, roles: ["admin", "super_admin", "finance_manager"], region: "BOTH" },
  ],
};

const intelligenceSection: NavSection = {
  title: "Intelligence",
  icon: Brain,
  items: [
    { name: "AI Modules Hub", href: "/ai-modules", icon: Sparkles, roles: ["super_admin"], region: "BOTH" },
    { name: "Zaza - AI Advisor", href: "/ai-advisor", icon: Sparkles, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "admin"] },
    { name: "GTM Brain (Logistics)", href: "/gtm-brain-logistics", icon: Radio, roles: ["admin", "super_admin", "org_admin"], region: "BOTH" },
    { name: "AI CEO Command", href: "/ai-ceo", icon: Crown, roles: ["super_admin"], region: "BOTH" },
    { name: "Executive Autopilot", href: "/executive-autopilot", icon: Zap, roles: ["super_admin", "org_admin"], region: "BOTH" },
    { name: "AI Controller", href: "/ai-operations", icon: Brain, roles: ["admin", "super_admin", "ops_manager", "finance_manager"], region: "BOTH" },
    { name: "Market Intelligence", href: "/market-intelligence", icon: Brain, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "AI Performance", href: "/role-ai-performance", icon: Sparkles, roles: ["ops_manager", "support", "org_admin", "super_admin", "admin"] },
    { name: "Decision Simulator", href: "/decision-simulation", icon: Target, roles: SHARED_INTELLIGENCE_ROLES },
    { name: "Execution Engine", href: "/autonomous-execution", icon: Cpu, roles: ["admin", "super_admin", "org_admin"] },
    { name: "AI Workforce", href: "/ai-workforce", icon: Users, roles: ["super_admin", "org_admin"] },
  ],
};

const partnersSection: NavSection = {
  title: "Partners & Staff",
  icon: Handshake,
  items: [
    { name: "Partners", href: "/partners", icon: Handshake, roles: ["admin", "super_admin"] },
    { name: "3PL Transporter Roster", href: "/dept/transporters", icon: Truck, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Vendor Performance", href: "/vendor-performance", icon: TrendingUp, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Staff", href: "/staff", icon: Briefcase, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Support Center", href: "/support-center", icon: Headphones, roles: ["admin", "super_admin", "org_admin", "support"], region: "BOTH" },
  ],
};

const adminSection: NavSection = {
  title: "Administration",
  icon: Settings,
  items: [
    { name: "Admin Governance", href: "/admin-governance", icon: Shield, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Operations Governance", href: "/governance-control", icon: Shield, roles: ["admin", "super_admin"] },
    { name: "Decision Center", href: "/decision-center", icon: Brain, roles: ["admin", "super_admin", "ops_manager"] },
    { name: "Approval Center", href: "/approval-center", icon: CheckCircle, roles: ["admin", "super_admin", "org_admin", "finance_manager", "ops_manager"] },
    { name: "Security Center", href: "/security-center", icon: ShieldCheck, roles: ["admin", "super_admin"] },
    { name: "Invoice Approvals", href: "/invoice-approvals", icon: FileText, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Trip Rate Config", href: "/trip-rate-config", icon: Settings, roles: ["admin", "super_admin", "org_admin"] },
    { name: "API Access", href: "/api-access", icon: Key, roles: ["admin", "super_admin"] },
    { name: "Reseller Command", href: "/reseller-command-center", icon: Crown, roles: ["super_admin"] },
    { name: "Users", href: "/users", icon: UserCog, roles: ["admin", "super_admin", "org_admin"] },
    { name: "Emails", href: "/emails", icon: Mail, roles: ["admin", "support", "operations", "super_admin", "org_admin"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["admin", "super_admin", "org_admin"] },
  ],
};

const workforceSection: NavSection = {
  title: "Workforce",
  icon: CalendarDays,
  defaultOpen: true,
  items: [
    // Self-service: visible to ALL operational roles
    { name: "My Leave", href: "/workforce/my-leave", icon: CalendarDays, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
    { name: "Daily Sign-In", href: "/workforce/sign-in", icon: UserCheck, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
    { name: "My KPIs", href: "/workforce/my-kpis", icon: Activity, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
    { name: "My Payslips", href: "/workforce/my-payslips", icon: Receipt, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support", "operations"] },
    // Admin-side
    { name: "Leave Approvals", href: "/workforce/leave-inbox", icon: CheckCircle, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Performance Panel", href: "/workforce/performance", icon: Sparkles, roles: ["admin", "super_admin", "org_admin", "ops_manager"] },
    { name: "Team Performance", href: "/workforce/team-performance", icon: Activity, roles: ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "Payroll", href: "/payroll", icon: Receipt, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "All Payslips", href: "/workforce/payslips", icon: FileText, roles: ["admin", "super_admin", "org_admin", "finance_manager"] },
    { name: "Payroll Audit", href: "/workforce/payroll-audit", icon: ShieldCheck, roles: ["admin", "super_admin", "finance_manager"] },
  ],
};

const ALL_SECTIONS: NavSection[] = [
  dashboardSection,
  operationsSection,
  fleetSection,
  financeSection,
  workforceSection,
  reportsSection,
  intelligenceSection,
  partnersSection,
  adminSection,
];

// ─── Logistics DEPARTMENT-only Sections ───────────────────────────
// Used when tenant_mode === "LOGISTICS_DEPARTMENT". Strips out company-only
// concepts (revenue, reseller, AI CEO, investor, multi-drop billing, etc.).

const DEPT_DASHBOARD_SECTION: NavSection = {
  title: "Dashboard",
  icon: LayoutDashboard,
  defaultOpen: true,
  items: [
    { name: "Logistics Director Console", href: "/super-admin", icon: Crown, roles: ["super_admin"] },
    { name: "Logistics Manager Command", href: "/org-admin", icon: Building2, roles: ["org_admin"] },
    { name: "Outbound & Inbound Desk", href: "/ops-manager", icon: ClipboardList, roles: ["ops_manager"] },
    { name: "Logistics Cost Control", href: "/finance-manager", icon: CreditCard, roles: ["finance_manager"] },
    { name: "3PL Transporter Portal", href: "/transporter-portal", icon: Navigation, roles: ["driver", "transporter" as any] },
    { name: "Sales & Distribution Tracker", href: "/dept/sales-tracker", icon: Package, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support", "customer"] },
    { name: "Zaza - AI Advisor", href: "/dept/ai-advisor", icon: Sparkles, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
    { name: "Route Approvals", href: "/dept/route-approvals", icon: ClipboardList, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
    { name: "Support Desk", href: "/support-center", icon: Headphones, roles: ["support"] },
    { name: "Overview", href: "/", icon: LayoutDashboard, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager", "support"] },
  ],
};

const DEPT_OPERATIONS_SECTION: NavSection = {
  title: "Operations",
  icon: Package,
  defaultOpen: true,
  items: [
    { name: "Dispatch", href: "/dispatch", icon: Package, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Outbound & Inbound", href: "/warehouse-outbound", icon: Warehouse, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Waybill Templates", href: "/waybill-templates", icon: FileText, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Inbound Receipts (GRN)", href: "/dept/inbound-receipts", icon: PackageCheck, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Route Planner", href: "/advanced-route-planner", icon: Route, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Routes Library", href: "/routes", icon: Navigation, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "Waybill Management", href: "/waybill-management", icon: FileText, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
    { name: "SLA Management", href: "/operations/sla-management", icon: Shield, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "Exception Management", href: "/dept/exceptions", icon: AlertTriangle, roles: ["super_admin", "org_admin", "ops_manager", "support"] },
    { name: "Risk Register", href: "/org-admin?tab=planning-kpis", icon: Shield, roles: ["super_admin", "org_admin"] },
    { name: "Fleet Command", href: "/fleet-command", icon: Radio, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "Approval Center", href: "/approval-center", icon: CheckCircle, roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },
  ],
};

const DEPT_FLEET_SECTION: NavSection = {
  title: "Fleet & Drivers",
  icon: Truck,
  items: [
    { name: "Fleet", href: "/fleet", icon: Truck, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "Fleet Cost Intelligence", href: "/fleet-intelligence", icon: Brain, roles: ["super_admin", "org_admin", "finance_manager"] },
    { name: "Driver & 3PL Compliance", href: "/driver-intelligence", icon: Brain, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "Drivers", href: "/drivers", icon: Users, roles: ["super_admin", "org_admin", "ops_manager", "dispatcher"] },
  ],
};

const DEPT_VENDOR_SECTION: NavSection = {
  title: "Vendor Management",
  icon: Handshake,
  items: [
    { name: "3PL Transporter Roster", href: "/dept/transporters", icon: Truck, roles: ["super_admin", "admin", "org_admin"] },
    { name: "Vendor Onboarding", href: "/dept/vendor-onboarding", icon: UserPlus, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "Vendor Performance", href: "/vendor-performance", icon: TrendingUp, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "Vendor Rate Cards", href: "/vendor-rate-cards", icon: FileText, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "Dynamic Pricing", href: "/dept-dynamic-pricing", icon: FileText, roles: ["super_admin", "org_admin", "ops_manager", "finance_manager"] },
    { name: "ERP Integrations", href: "/erp-integrations", icon: FileText, roles: ["super_admin", "org_admin"] },
    { name: "Vendor Payables", href: "/vendor-payables", icon: Receipt, roles: ["super_admin", "org_admin", "finance_manager"] },
  ],
};

const DEPT_COST_SECTION: NavSection = {
  title: "Cost Intelligence",
  icon: CircleDollarSign,
  items: [
    { name: "Cost Centre Dashboard", href: "/dept/cost-centre", icon: BarChart3, roles: ["super_admin", "org_admin", "finance_manager"] },
    { name: "Cost per Delivery", href: "/dept/cost-per-delivery", icon: Gauge, roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },
    { name: "Budget Planning", href: "/dept/budget-planning", icon: Target, roles: ["super_admin", "org_admin", "finance_manager"] },
    { name: "Reconciliation", href: "/finance-reconciliation", icon: CheckCircle, roles: ["super_admin", "org_admin", "finance_manager"] },
    { name: "Expenses", href: "/expenses", icon: CircleDollarSign, roles: ["super_admin", "org_admin", "finance_manager"] },
  ],
};

const DEPT_INTELLIGENCE_SECTION: NavSection = {
  title: "Intelligence",
  icon: Brain,
  items: [
    { name: "AI Operations Controller", href: "/ai-operations", icon: Brain, roles: ["super_admin", "org_admin", "ops_manager"] },
    { name: "KPI Intelligence", href: "/kpi-dashboard", icon: BarChart3, roles: ["super_admin", "org_admin", "finance_manager", "ops_manager"] },
    { name: "Delivery KPIs", href: "/org-admin?tab=delivery-kpis", icon: Target, roles: ["super_admin", "org_admin"] },
    { name: "Planning KPIs", href: "/org-admin?tab=planning-kpis", icon: BarChart3, roles: ["super_admin", "org_admin"] },
    { name: "Market Intelligence", href: "/market-intelligence", icon: Brain, roles: ["super_admin", "org_admin"] },
  ],
};

const DEPT_ADMIN_SECTION: NavSection = {
  title: "Administration",
  icon: Settings,
  items: [
    { name: "Admin Governance", href: "/admin-governance", icon: Shield, roles: ["super_admin", "org_admin"] },
    { name: "Team Management", href: "/users", icon: Users, roles: ["super_admin", "org_admin"] },
    { name: "Integrations", href: "/finance-integrations", icon: Zap, roles: ["super_admin", "org_admin"] },
    { name: "Jaggaer Integration", href: "/dept/jaggaer", icon: Zap, roles: ["super_admin", "org_admin"] },
    { name: "Support Center", href: "/support-center", icon: Headphones, roles: ["super_admin", "org_admin", "support"] },
    { name: "Analytics", href: "/admin-analytics", icon: PieChart, roles: ["super_admin", "org_admin", "finance_manager"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "org_admin"] },
  ],
};

const DEPT_ALL_SECTIONS: NavSection[] = [
  DEPT_DASHBOARD_SECTION,
  DEPT_OPERATIONS_SECTION,
  DEPT_FLEET_SECTION,
  DEPT_VENDOR_SECTION,
  DEPT_COST_SECTION,
  DEPT_INTELLIGENCE_SECTION,
  DEPT_ADMIN_SECTION,
];

const getDeptNavName = (name: string) => ({
  "Super Admin Console": "Logistics Director Console",
  "COO Command": "Logistics Manager Command",
  "COO KPI Board": "Logistics KPI Board",
  "Ops Manager": "Outbound & Inbound Desk",
  "Finance Manager": "Logistics Cost Control",
  "Customer Portal": "Sales & Distribution Tracker",
  "Autonomous Company": "Autonomous Department",
  "Customers": "Internal Stakeholders",
  "Revenue Expansion": "Cost Optimization",
  "Reseller Command": "Department Controls",
}[name] ?? name);

// ─── Collapsible Section Component ────────────────────────────────
const SidebarSection = ({
  section,
  collapsed,
  userRole,
  isSuperAdmin,
  isNGMode,
  isGlobalMode,
  pathname,
  canAccessRoute,
  tenantMode,
  openSection,
  setOpenSection,
}: {
  section: NavSection;
  collapsed: boolean;
  userRole: string | null;
  isSuperAdmin: boolean;
  isNGMode: boolean;
  isGlobalMode: boolean;
  pathname: string;
  canAccessRoute: (route: string) => boolean;
  tenantMode: string;
  openSection: string | null;
  setOpenSection: (s: string | null) => void;
}) => {
  const filteredItems = section.items.filter((item) => {
    if (item.href === "/transporter-portal" && (userRole as string) !== "transporter") return false;
    if (item.href === "/vendor-portal" && (userRole as string) !== "transporter") return false;
    if (item.href === "/driver-super-app" && userRole !== "driver") return false;
    // /customer-portal is now visible to staff (admins/ops/support) as a read-only preview
    //   and to customers as their primary workspace - no extra hard exclusion needed.
    if (!isSuperAdmin && userRole && !item.roles.includes(userRole as AppRole)) return false;
    const r = item.region || "BOTH";
    if (r === "NG" && !isNGMode) return false;
    if (r === "GLOBAL" && !isGlobalMode) return false;
    return true;
  });

  const canOpenItem = (item: NavItem) =>
    tenantMode === "LOGISTICS_DEPARTMENT" ||
    OPERATIONAL_INTELLIGENCE_ROUTES.has(item.href) ||
    canAccessRoute(item.href);

  const accessibleItems = filteredItems.filter(item => isSuperAdmin || canOpenItem(item));
  const lockedItems = filteredItems.filter(item => !isSuperAdmin && !canOpenItem(item));

  const hasActiveItem = filteredItems.some((item) => pathname === item.href);
  const open = openSection === section.title;
  const setOpen = (v: boolean) => setOpenSection(v ? section.title : null);

  if (accessibleItems.length === 0 && lockedItems.length === 0) return null;

  const SectionIcon = section.icon;

  if (collapsed) {
    // In collapsed mode, show only the first active item's icon or section icon
    return (
      <div className="py-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const label = tenantMode === "LOGISTICS_DEPARTMENT" ? getDeptNavName(item.name) : item.name;
          return (
            <Link
              key={item.href}
              to={item.href}
              title={label}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="py-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
          hasActiveItem ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <SectionIcon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{section.title}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-2 border-l border-border/50 pl-2 space-y-0.5 py-1">
              {accessibleItems.map((item) => {
                const isActive = pathname === item.href;
                const label = tenantMode === "LOGISTICS_DEPARTMENT" ? getDeptNavName(item.name) : item.name;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
              {lockedItems.length > 0 && lockedItems.slice(0, 2).map((item) => (
                <TooltipProvider key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground/40 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tenantMode === "LOGISTICS_DEPARTMENT" ? getDeptNavName(item.name) : item.name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Upgrade your plan to unlock
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sidebar Component ────────────────────────────────────────────
const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileSidebar();
  const location = useLocation();
  const { userRole, signOut, user, isSuperAdmin, tenantMode, industryCode } = useAuth();
  const { region, isNGMode, isGlobalMode } = useRegion();
  const navigate = useNavigate();
  const { canAccessRoute } = usePlanEntitlements();
  const { brandName, brandSuffix, logoUrl } = useWhiteLabel();
  const fullBrand = brandSuffix ? `${brandName} ${brandSuffix}` : brandName;

  // Phase 2/8: align sidebar with the same effective tenant mode used by
  // DeptRouteGuard so LD users never see LC entries that would just redirect.
  const resolvedMode = resolveTenantMode({
    tenantMode,
    industryCode,
    role: userRole,
  });
  const isDepMode = resolvedMode === "LOGISTICS_DEPARTMENT";


  const visibleSections = isDepMode
    ? (!isSuperAdmin && ((userRole as string) === "transporter" || userRole === "driver" || userRole === "customer")
        ? [DEPT_DASHBOARD_SECTION]
        : DEPT_ALL_SECTIONS)
    : (!isSuperAdmin && (userRole === "driver" || (userRole as string) === "transporter")
        ? [dashboardSection, workforceSection, intelligenceSection]
        : !isSuperAdmin && userRole === "customer"
          ? [dashboardSection, intelligenceSection]
          : ALL_SECTIONS);

  // Single-open accordion: opens the section containing the active route by default.
  const initialOpen = visibleSections.find((s) =>
    s.items.some((i) => location.pathname === i.href)
  )?.title ?? visibleSections.find((s) => s.defaultOpen)?.title ?? null;
  const [openSection, setOpenSection] = useState<string | null>(initialOpen);

  const handleSignOut = async () => {
    await signOut();
    navigate("/access-hub", { replace: true });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col",
        "transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <Link to="/" aria-label={`${fullBrand} home`} className="flex items-center gap-3 p-4 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        {logoUrl ? (
          <img src={logoUrl} alt={fullBrand} className="h-9 max-w-[36px] object-contain shrink-0" />
        ) : (
          <img src={brandLogo} alt={fullBrand} className="h-9 w-auto object-contain shrink-0" />
        )}
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h1 className="font-heading font-bold text-lg text-foreground">{fullBrand}</h1>
            <p className="text-[9px] text-muted-foreground leading-tight">Logistics OS</p>
          </motion.div>
        )}
      </Link>

      {/* Workspace Switcher + Region Badge */}
      {!collapsed && (
        <div className="px-3 py-2 space-y-2">
          <WorkspaceSwitcher />
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            isNGMode
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
          )}>
            <span>{region.flag}</span>
            <span>{region.label} Mode</span>
          </div>
        </div>
      )}

      {/* Role Badge */}
      {userRole && (
        <div className={cn("px-3 py-2 border-b border-sidebar-border", collapsed && "flex justify-center")}>
          {isSuperAdmin ? (
            <SuperAdminBadge variant={collapsed ? "compact" : "full"} />
          ) : (
            !collapsed ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Role:</span>
                <RoleBadge size="sm" />
              </div>
            ) : (
              <RoleBadge showIcon={true} size="sm" />
            )
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
        {visibleSections.map((section) => (
          <SidebarSection
            key={section.title}
            section={section}
            collapsed={collapsed}
            userRole={userRole}
            isSuperAdmin={isSuperAdmin}
            isNGMode={isNGMode}
            isGlobalMode={isGlobalMode}
            pathname={location.pathname}
            canAccessRoute={canAccessRoute}
            tenantMode={tenantMode}
            openSection={openSection}
            setOpenSection={setOpenSection}
          />
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-2 border-t border-sidebar-border">
        {user && (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={cn(
              "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
              collapsed ? "justify-center px-2" : "justify-start px-3"
            )}
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2 text-sm font-medium">Sign Out</span>}
          </Button>
        )}
      </div>

      {/* Collapse Toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 bg-secondary border border-border rounded-full items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
