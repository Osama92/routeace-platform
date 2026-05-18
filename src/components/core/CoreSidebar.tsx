import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  LayoutDashboard,
  DollarSign,
  BarChart3,
  Cpu,
  AlertTriangle,
  Users,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  Package,
} from "lucide-react";

type CoreRole = "core_founder" | "core_builder" | "core_product" | "core_engineer" | "internal_team";

interface CoreSidebarProps {
  coreRole: CoreRole | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: CoreRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/core/dashboard",
    icon: LayoutDashboard,
    roles: ["core_founder", "core_builder", "core_product", "core_engineer", "internal_team"],
  },
  {
    label: "Revenue",
    href: "/core/dashboard?tab=revenue",
    icon: DollarSign,
    roles: ["core_founder", "internal_team"],
  },
  {
    label: "Product Analytics",
    href: "/core/dashboard?tab=product",
    icon: BarChart3,
    roles: ["core_founder", "core_product", "internal_team"],
  },
  {
    label: "System Health",
    href: "/core/dashboard?tab=system",
    icon: Activity,
    roles: ["core_founder", "core_builder", "core_engineer", "internal_team"],
  },
  {
    label: "Engineering",
    href: "/core/dashboard?tab=engineering",
    icon: Cpu,
    roles: ["core_founder", "core_engineer", "internal_team"],
  },
  {
    label: "API Usage",
    href: "/core/api-usage",
    icon: Zap,
    roles: ["core_founder", "core_builder", "core_engineer", "internal_team"],
  },
  {
    label: "Tenants",
    href: "/core/tenants",
    icon: Users,
    roles: ["core_founder", "core_builder", "internal_team"],
  },
  {
    label: "Feature Adoption",
    href: "/core/features",
    icon: Package,
    roles: ["core_founder", "core_product", "internal_team"],
  },
  {
    label: "Growth Metrics",
    href: "/core/growth",
    icon: TrendingUp,
    roles: ["core_founder", "core_product", "internal_team"],
  },
  {
    label: "Error Tracking",
    href: "/core/errors",
    icon: AlertTriangle,
    roles: ["core_founder", "core_engineer", "internal_team"],
    badge: "3",
  },
  {
    label: "Settings",
    href: "/core/settings",
    icon: Settings,
    roles: ["core_founder", "internal_team"],
  },
];

const CoreSidebar = ({ coreRole }: CoreSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const filteredNavItems = navItems.filter(
    (item) => coreRole && item.roles.includes(coreRole)
  );

  const getRoleBadgeColor = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "bg-amber-500/20 text-amber-400";
      case "core_builder": return "bg-blue-500/20 text-blue-400";
      case "core_product": return "bg-purple-500/20 text-purple-400";
      case "core_engineer": return "bg-green-500/20 text-green-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getRoleLabel = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "Founder";
      case "core_builder": return "Builder";
      case "core_product": return "Product";
      case "core_engineer": return "Engineer";
      case "internal_team": return "Internal";
      default: return "";
    }
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-border/50 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sm">RouteAce Core</h1>
              <Badge className={cn("text-[10px] mt-1", getRoleBadgeColor(coreRole))}>
                {getRoleLabel(coreRole)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href.includes("?") && location.pathname + location.search === item.href);
          
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
};

export default CoreSidebar;
