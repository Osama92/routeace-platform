import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store, MapPin, Package, Truck, BarChart3, CreditCard,
  Users, TrendingUp, ShieldCheck, Target, Globe, ChevronLeft,
  ChevronRight, LogOut, ClipboardList, Route, Boxes,
  Receipt, Brain, Gauge, UserCheck, Warehouse, LineChart,
  Compass, ShoppingCart, Activity, Database, Wallet, Banknote,
  MessageCircle, ArrowDownUp, Shield, ScanLine, Radio,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useFMCGRole, type FMCGRole } from "@/hooks/useFMCGRole";

// FMCG-specific role taxonomy per master prompt - now sourced from useFMCGRole hook

interface FMCGNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: FMCGRole[];
}

// Role groups - pure FMCG roles only (super_admin bypass handled in filterByRole)
const EXECUTIVE: FMCGRole[] = ["strategic_leadership"];
const MANAGEMENT: FMCGRole[] = ["strategic_leadership", "regional_sales_manager", "area_sales_manager"];
const OPERATIONS: FMCGRole[] = ["strategic_leadership", "regional_sales_manager", "area_sales_manager", "sales_supervisor", "logistics_coordinator", "warehouse_manager"];
const SALES_TEAM: FMCGRole[] = ["strategic_leadership", "regional_sales_manager", "area_sales_manager", "sales_supervisor", "logistics_coordinator", "warehouse_manager", "sales_representative", "merchandiser"];
const FINANCE_TEAM: FMCGRole[] = ["strategic_leadership", "finance_manager"];
const ALL_ROLES: FMCGRole[] = ["strategic_leadership", "regional_sales_manager", "area_sales_manager", "sales_supervisor", "logistics_coordinator", "warehouse_manager", "sales_representative", "merchandiser", "finance_manager", "distributor"];

const commandNav: FMCGNavItem[] = [
  { name: "Executive Command", href: "/fmcg", icon: Gauge, roles: ALL_ROLES },
  { name: "Sales KPI Engine", href: "/fmcg/sales-kpi", icon: Activity, roles: OPERATIONS },
  { name: "Distributor Super-App", href: "/fmcg/distributor-app", icon: Store, roles: [...EXECUTIVE, "distributor"] },
  { name: "Field Sales App", href: "/fmcg/sales-rep-app", icon: UserCheck, roles: [...OPERATIONS, "sales_representative", "merchandiser"] },
];

const salesNav: FMCGNavItem[] = [
  { name: "Sales Intelligence", href: "/fmcg/sales-intelligence", icon: Target, roles: MANAGEMENT },
  { name: "Sales Rep Intelligence", href: "/fmcg/rep-intelligence", icon: UserCheck, roles: MANAGEMENT },
  { name: "Retailer Management", href: "/fmcg/retailers", icon: Store, roles: OPERATIONS },
  { name: "AI Journey Planning", href: "/fmcg/journey-planning", icon: Compass, roles: OPERATIONS },
  { name: "SKU Catalog", href: "/fmcg/sku-catalog", icon: Boxes, roles: ALL_ROLES },
];

const supplyNav: FMCGNavItem[] = [
  { name: "Stock Intelligence", href: "/fmcg/stock-intelligence", icon: Package, roles: OPERATIONS },
  { name: "Warehouse Management", href: "/fmcg/warehouse", icon: Warehouse, roles: [...EXECUTIVE, "warehouse_manager", "logistics_coordinator", "distributor"] },
  { name: "Warehouse Handheld", href: "/fmcg/warehouse-handheld", icon: ScanLine, roles: [...EXECUTIVE, "warehouse_manager", "logistics_coordinator"] },
  { name: "Procurement & S&OP AI", href: "/fmcg/procurement", icon: ShoppingCart, roles: MANAGEMENT },
  { name: "WhatsApp Orders", href: "/fmcg/whatsapp-orders", icon: MessageCircle, roles: [...EXECUTIVE, "warehouse_manager", "logistics_coordinator"] },
];

const distributionNav: FMCGNavItem[] = [
  { name: "Order-to-Delivery", href: "/fmcg/order-to-delivery", icon: ArrowDownUp, roles: [...EXECUTIVE, "logistics_coordinator", "warehouse_manager"] },
  { name: "Fleet Command", href: "/fmcg/fleet-command", icon: Truck, roles: [...EXECUTIVE, "logistics_coordinator"] },
  { name: "Logistics Command", href: "/fmcg/logistics-command", icon: Shield, roles: [...EXECUTIVE, "logistics_coordinator"] },
  { name: "Outbound Operations", href: "/fmcg/outbound-ops", icon: Boxes, roles: [...EXECUTIVE, "logistics_coordinator", "warehouse_manager"] },
  { name: "Distribution Logistics", href: "/fmcg/logistics", icon: Truck, roles: [...EXECUTIVE, "logistics_coordinator"] },
  { name: "Route Plans", href: "/fmcg/route-plans", icon: Route, roles: [...EXECUTIVE, "logistics_coordinator"] },
  { name: "Digital POD", href: "/fmcg/deliveries", icon: ClipboardList, roles: OPERATIONS },
];

const financeNav: FMCGNavItem[] = [
  { name: "Finance Dashboard", href: "/fmcg/finance", icon: LineChart, roles: FINANCE_TEAM },
  { name: "Reconciliation", href: "/fmcg/reconciliation", icon: Receipt, roles: FINANCE_TEAM },
  { name: "Retailer Credit", href: "/fmcg/retailer-credit", icon: CreditCard, roles: FINANCE_TEAM },
  { name: "Distributor Financing", href: "/fmcg/distributor-financing", icon: Wallet, roles: EXECUTIVE },
  { name: "Trade Promotions", href: "/fmcg/trade-promotions", icon: TrendingUp, roles: MANAGEMENT },
];

const intelligenceNav: FMCGNavItem[] = [
  { name: "GTM Brain", href: "/gtm-brain-fmcg", icon: Radio, roles: EXECUTIVE },
  { name: "Intelligence Center", href: "/fmcg/intelligence", icon: Brain, roles: MANAGEMENT },
  { name: "Data Lake", href: "/fmcg/data-lake", icon: Database, roles: EXECUTIVE },
  { name: "Distributor Index", href: "/fmcg/distributor-index", icon: Users, roles: MANAGEMENT },
  { name: "Africa Benchmark", href: "/fmcg/benchmark", icon: Globe, roles: EXECUTIVE },
  { name: "Margin Protection", href: "/fmcg/margin-dashboard", icon: ShieldCheck, roles: [...EXECUTIVE, "finance_manager"] },
];

const flywheelNav: FMCGNavItem[] = [
  { name: "Retail Credit Network", href: "/fmcg/retail-credit-network", icon: Banknote, roles: [...EXECUTIVE, "finance_manager", "distributor"] },
  { name: "Distributor Marketplace", href: "/fmcg/distributor-marketplace", icon: Users, roles: MANAGEMENT },
  { name: "AI Demand Forecasting", href: "/fmcg/demand-forecasting", icon: Brain, roles: MANAGEMENT },
];

const governanceNav: FMCGNavItem[] = [
  { name: "Team Access Console", href: "/fmcg/team-access", icon: ShieldCheck, roles: MANAGEMENT },
];

const FMCGSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, signOut, user, isSuperAdmin } = useAuth();
  const { fmcgRole } = useFMCGRole();

  const filterByRole = (items: FMCGNavItem[]) => {
    if (!fmcgRole && !isSuperAdmin) return [];
    if (isSuperAdmin) return items;
    // Use FMCG-specific role from fmcg_team_members table
    const mappedRole = fmcgRole as FMCGRole;
    return items.filter((item) => item.roles.includes(mappedRole));
  };

  const renderSection = (items: FMCGNavItem[], title?: string) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <>
        {!collapsed && title && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          </div>
        )}
        {filtered.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-3" : ""}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium">{item.name}</motion.span>}
            </Link>
          );
        })}
      </>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
    >
      <Link to="/" className="flex items-center gap-3 p-6 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="font-heading font-bold text-xl text-foreground">FMCG OS</h1>
            <p className="text-xs text-muted-foreground">Distribution Intelligence</p>
          </motion.div>
        )}
      </Link>

      <div className={`px-4 py-2 border-b border-sidebar-border ${collapsed ? "flex justify-center" : ""}`}>
        <Link to="/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          {!collapsed && "Back to RouteAce"}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {renderSection(commandNav, "Command Center")}
        {renderSection(salesNav, "Sales Execution")}
        {renderSection(supplyNav, "Supply Chain")}
        {renderSection(distributionNav, "Distribution")}
        {renderSection(financeNav, "Finance & Credit")}
        {renderSection(intelligenceNav, "Intelligence")}
        {renderSection(flywheelNav, "Platform Flywheel")}
        {renderSection(governanceNav, "Governance")}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        {user && (
          <Button
            variant="ghost"
            onClick={async () => { await signOut(); navigate("/industry/fmcg/auth", { replace: true }); }}
            className={`w-full nav-link text-destructive hover:text-destructive hover:bg-destructive/10 ${collapsed ? "justify-center px-3" : ""}`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </Button>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-secondary border border-border rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
};

export default FMCGSidebar;
