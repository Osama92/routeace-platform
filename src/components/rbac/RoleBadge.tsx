import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";
import { 
  Crown, 
  Shield, 
  ClipboardList, 
  CreditCard, 
  Navigation, 
  Package,
  Users,
  Headphones,
  Settings,
  Wine,
  Building2,
  Store,
  Truck,
  Target,
  MapPin,
  Brain,
  Globe,
  Wallet,
} from "lucide-react";

const roleConfig: Record<string, { label: string; icon: React.ComponentType<any>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  super_admin: { label: "Super Admin", icon: Crown, variant: "destructive" },
  org_admin: { label: "Org Admin", icon: Shield, variant: "default" },
  ops_manager: { label: "Ops Manager", icon: ClipboardList, variant: "default" },
  finance_manager: { label: "Finance", icon: CreditCard, variant: "default" },
  dispatcher: { label: "Dispatcher", icon: Settings, variant: "secondary" },
  driver: { label: "Driver", icon: Navigation, variant: "secondary" },
  customer: { label: "Customer", icon: Package, variant: "outline" },
  admin: { label: "Admin", icon: Shield, variant: "default" },
  operations: { label: "Operations", icon: Users, variant: "secondary" },
  support: { label: "Support", icon: Headphones, variant: "secondary" },
  // Liquor OS roles
  distributor_owner: { label: "Distributor Owner", icon: Building2, variant: "default" },
  distributor_sales_manager: { label: "Sales Manager", icon: Target, variant: "default" },
  distributor_sales_rep: { label: "Sales Rep", icon: MapPin, variant: "secondary" },
  distributor_warehouse_manager: { label: "Warehouse Mgr", icon: Package, variant: "secondary" },
  distributor_finance_manager: { label: "Finance Mgr", icon: CreditCard, variant: "default" },
  distributor_logistics_manager: { label: "Logistics Mgr", icon: Truck, variant: "secondary" },
  supplier_brand_owner: { label: "Brand Owner", icon: Wine, variant: "default" },
  supplier_sales_director: { label: "Sales Director", icon: Target, variant: "default" },
  supplier_trade_marketing: { label: "Trade Marketing", icon: Store, variant: "default" },
  supplier_market_analyst: { label: "Market Analyst", icon: Brain, variant: "secondary" },
  supplier_distribution_manager: { label: "Dist. Manager", icon: Globe, variant: "secondary" },
  retailer_bar_owner: { label: "Bar Owner", icon: Wine, variant: "default" },
  retailer_restaurant_owner: { label: "Restaurant Owner", icon: Store, variant: "default" },
  retailer_procurement_manager: { label: "Procurement Mgr", icon: ClipboardList, variant: "secondary" },
  retailer_store_manager: { label: "Store Manager", icon: Store, variant: "secondary" },
  logistics_fleet_manager: { label: "Fleet Manager", icon: Truck, variant: "default" },
  logistics_delivery_driver: { label: "Delivery Driver", icon: Navigation, variant: "secondary" },
  logistics_route_planner: { label: "Route Planner", icon: Globe, variant: "secondary" },
  platform_admin: { label: "Platform Admin", icon: Crown, variant: "destructive" },
  data_intelligence_customer: { label: "Data Subscriber", icon: Brain, variant: "outline" },
  investor_viewer: { label: "Investor", icon: Wallet, variant: "outline" },
};

interface RoleBadgeProps {
  role?: string | null;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
}

export function RoleBadge({ role, showIcon = true, size = "default" }: RoleBadgeProps) {
  const { userRole, tenantMode } = useAuth();
  const displayRole = role || userRole;

  if (!displayRole) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Role
      </Badge>
    );
  }

  const config = roleConfig[displayRole] || { 
    label: displayRole.replace("_", " "), 
    icon: Users, 
    variant: "outline" as const 
  };
  const Icon = config.icon;
  const display = getRoleDisplay(displayRole, tenantMode);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge 
      variant={config.variant} 
      className={`capitalize flex items-center gap-1.5 ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />}
      {tenantMode === "LOGISTICS_DEPARTMENT" ? display.badge : config.label}
    </Badge>
  );
}

export default RoleBadge;
