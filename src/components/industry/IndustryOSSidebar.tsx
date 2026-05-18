/**
 * Industry OS Dynamic Sidebar
 * 
 * Renders only modules the user's role + plan permits.
 * Enforces cross-OS delineation by excluding logistics modules.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Store, Contact, Target, Kanban, FileText,
  ShoppingCart, Package, DollarSign, Megaphone, Map, Footprints,
  BarChart3, TrendingUp, Award, Wallet, RotateCcw, Building2,
  Handshake, BrainCircuit, Settings, Shield, Globe,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { IndustryModule, IndustryRole, SalesPlanTier, IndustryVertical } from "@/lib/industry/featureSeparationMatrix";
import { useIndustryFeatureAccess } from "@/hooks/useIndustryFeatureAccess";

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: IndustryModule;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "Sales Workspace",
    items: [
      { title: "Dashboard", url: "/sales/dashboard", icon: LayoutDashboard, module: "sales_dashboard" },
      { title: "Leads", url: "/sales/leads", icon: Target, module: "leads" },
      { title: "Pipeline", url: "/sales/pipeline", icon: Kanban, module: "pipeline" },
      { title: "Opportunities", url: "/sales/pipeline", icon: TrendingUp, module: "opportunities" },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Accounts", url: "/sales/accounts", icon: Building2, module: "accounts" },
      { title: "Outlets", url: "/sales/accounts", icon: Store, module: "outlets" },
      { title: "Contacts", url: "/sales/accounts", icon: Contact, module: "contacts" },
    ],
  },
  {
    label: "Catalog & Pricing",
    items: [
      { title: "Products", url: "/sales/quotes", icon: Package, module: "products" },
      { title: "Price Books", url: "/sales/quotes", icon: DollarSign, module: "price_books" },
      { title: "Quotations", url: "/sales/quotes", icon: FileText, module: "quotes" },
    ],
  },
  {
    label: "Orders & Execution",
    items: [
      { title: "Orders", url: "/sales/quotes", icon: ShoppingCart, module: "orders" },
      { title: "Returns", url: "/sales/quotes", icon: RotateCcw, module: "returns" },
      { title: "Collections", url: "/sales/quotes", icon: Wallet, module: "collections_visibility" },
    ],
  },
  {
    label: "Field Operations",
    items: [
      { title: "Field Execution", url: "/sales/activities", icon: Footprints, module: "field_execution" },
      { title: "Visit Planning", url: "/sales/activities", icon: Map, module: "visit_planning" },
      { title: "Promotions", url: "/sales/activities", icon: Megaphone, module: "promotions" },
      { title: "Territories", url: "/sales/forecast", icon: Globe, module: "territories" },
    ],
  },
  {
    label: "Channels & Partners",
    items: [
      { title: "Distributors", url: "/sales/accounts", icon: Handshake, module: "distributor_portal" },
      { title: "Partners", url: "/sales/accounts", icon: Users, module: "partner_management" },
    ],
  },
  {
    label: "Forecast & Performance",
    items: [
      { title: "Forecasting", url: "/sales/forecast", icon: TrendingUp, module: "forecasting" },
      { title: "Incentives", url: "/sales/forecast", icon: Award, module: "incentives" },
      { title: "Analytics", url: "/sales/dashboard", icon: BarChart3, module: "sales_analytics" },
      { title: "Market Intel", url: "/sales/dashboard", icon: BrainCircuit, module: "market_intelligence" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "AI Assistant", url: "/sales/dashboard", icon: BrainCircuit, module: "ai_sales_assistant" },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Sales Settings", url: "/sales/dashboard", icon: Settings, module: "sales_settings" },
      { title: "Admin", url: "/sales/dashboard", icon: Shield, module: "sales_admin" },
    ],
  },
];

interface IndustryOSSidebarProps {
  role: IndustryRole | null;
  plan?: SalesPlanTier;
  industry?: IndustryVertical;
}

export function IndustryOSSidebar({
  role,
  plan = "free",
  industry = "fmcg",
}: IndustryOSSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const access = useIndustryFeatureAccess(role, plan, industry);

  const filteredGroups = useMemo(() => {
    return SIDEBAR_GROUPS
      .map(group => ({
        ...group,
        items: group.items.filter(item => access.canAccess(item.module)),
      }))
      .filter(group => group.items.length > 0);
  }, [access]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-border">
          {!collapsed && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry OS</p>
              <p className="text-sm font-medium text-foreground capitalize mt-0.5">{industry} Sales</p>
            </div>
          )}
        </div>

        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default IndustryOSSidebar;
