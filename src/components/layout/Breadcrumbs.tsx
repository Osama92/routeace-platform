import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "dispatch": "Dispatch",
  "routes": "Routes",
  "customers": "Customers",
  "invoices": "Invoices",
  "fleet": "Fleet",
  "drivers": "Drivers",
  "expenses": "Expenses",
  "settings": "Settings",
  "users": "Users",
  "analytics": "Analytics",
  "tracking": "Tracking",
  "partners": "Partners",
  "emails": "Email Notifications",
  "payroll": "Payroll",
  "driver-payroll": "Driver Payroll",
  "driver-bonuses": "Driver Bonuses",
  "approval-center": "Approval Center",
  "invoice-approvals": "Invoice Approvals",
  "trip-rate-config": "Trip Rate Config",
  "staff": "Staff",
  "vendor-performance": "Vendor Performance",
  "super-admin": "Super Admin",
  "ops-manager": "Operations Manager",
  "finance-manager": "Finance Manager",
  "org-admin": "Org Admin",
  "market-intelligence": "Market Intelligence",
  "fleet-command": "Fleet Command",
  "support-center": "Support Center",
  "accounts-ledger": "AR/AP Ledger",
  "advanced-route-planner": "Advanced Route Planner",
  "multidrop": "Multi-Drop Billing",
  "payout-engine": "Payout Engine",
  "chart-of-accounts": "Chart of Accounts",
  "financial-statements": "Financial Statements",
  "cashflow-forecast": "Cashflow AI",
  "financial-intelligence": "Financial Intelligence",
  "tax-automation": "Tax Automation",
  "finance-erp": "Finance ERP",
  "control-center": "Control Center",
  "commerce-identity-network": "Commerce Identity",
  "infrastructure-flywheel": "Infrastructure Flywheel",
  "continental-intelligence-graph": "Intelligence Graph",
  "infrastructure-control-tower": "Control Tower",
  "fleet-network-activation": "Fleet Network",
  "fleet-financial-intelligence": "Fleet CCC",
  "driver-super-app": "Driver Super App",
  "transporter-portal": "3PL Transporter Portal",
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground px-8 pt-4 pb-0">
      <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {pathSegments.map((segment, index) => {
        const path = "/" + pathSegments.slice(0, index + 1).join("/");
        const label = routeLabels[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const isLast = index === pathSegments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
