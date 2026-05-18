import { useNavigate, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Ship, Globe, Package, FileText, Shield, DollarSign,
  Users, BarChart3, Brain, Truck, Search, CreditCard,
  MapPin, Building2, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { name: "Command Center", href: "/portodash", icon: Ship },
      { name: "Export Orders", href: "/portodash/orders", icon: Package },
      { name: "Product Catalog", href: "/portodash/catalog", icon: Search },
      { name: "Buyer Marketplace", href: "/portodash/marketplace", icon: Globe },
    ],
  },
  {
    label: "Logistics",
    items: [
      { name: "Shipment Tracking", href: "/portodash/tracking", icon: MapPin },
      { name: "Freight Booking", href: "/portodash/freight", icon: Truck },
      { name: "Port Logistics", href: "/portodash/port-logistics", icon: Building2 },
    ],
  },
  {
    label: "Compliance & Docs",
    items: [
      { name: "Trade Documents", href: "/portodash/documents", icon: FileText },
      { name: "Customs Compliance", href: "/portodash/compliance", icon: Shield },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Trade Finance", href: "/portodash/finance", icon: CreditCard },
      { name: "FX Repatriation", href: "/portodash/fx", icon: DollarSign },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Export Intelligence", href: "/portodash/intelligence", icon: Brain },
      { name: "Analytics", href: "/portodash/analytics", icon: BarChart3 },
      { name: "Partner Network", href: "/portodash/partners", icon: Users },
      { name: "Global Trade Graph", href: "/trade-graph", icon: Globe },
    ],
  },
  {
    label: "Platform",
    items: [
      { name: "Sales CRM", href: "/sales-crm", icon: Users },
      { name: "Commerce Data Cloud", href: "/commerce-data-cloud", icon: Globe },
      { name: "Embedded Commerce", href: "/embedded-commerce", icon: Ship },
    ],
  },
];

const PortoDashSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-border bg-card flex flex-col z-40">
      {/* Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-primary flex items-center justify-center">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm text-foreground">PortoDash</h1>
            <p className="text-[10px] text-muted-foreground">ExportTech Platform</p>
          </div>
        </div>
        <Badge variant="outline" className="mt-3 text-[10px] border-info/40 text-info">
          Africa's Export Infrastructure
        </Badge>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
        <button
          onClick={() => navigate("/access-hub")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Back to RouteAce
        </button>
      </div>
    </aside>
  );
};

export default PortoDashSidebar;
