import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Package, Truck, Users, MapPin, FileText, Route, Settings,
  Plus, Search, Clock, Star, Wrench, CheckCircle, XCircle,
  Inbox, ClipboardList, Navigation, BarChart3, Shield, Mail,
  Building2, Wallet, Brain, AlertTriangle, RefreshCw, Gauge,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: "navigation" | "action" | "search";
  keywords: string[];
}

const UniversalCommandBar = () => {
  const [open, setOpen] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, isSuperAdmin } = useAuth();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const trackCommand = useCallback((id: string) => {
    setRecentCommands((prev) => {
      const updated = [id, ...prev.filter((c) => c !== id)].slice(0, 5);
      try { localStorage.setItem("ra-recent-cmds", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ra-recent-cmds");
      if (saved) setRecentCommands(JSON.parse(saved));
    } catch {}
  }, []);

  const go = useCallback((path: string, id: string) => {
    trackCommand(id);
    navigate(path);
    setOpen(false);
  }, [navigate, trackCommand]);

  // Build context-aware actions based on current route
  const getContextActions = (): CommandAction[] => {
    const base = location.pathname;
    const actions: CommandAction[] = [];

    if (base.includes("dispatch") || base.includes("ops-manager")) {
      actions.push(
        { id: "ctx-assign-driver", label: "Assign driver to dispatch", description: "Select and assign an available driver", icon: Users, action: () => go("/dispatch", "ctx-assign-driver"), category: "action", keywords: ["assign", "driver"] },
        { id: "ctx-assign-vehicle", label: "Assign vehicle to dispatch", description: "Select and assign a vehicle", icon: Truck, action: () => go("/dispatch", "ctx-assign-vehicle"), category: "action", keywords: ["assign", "vehicle"] },
        { id: "ctx-mark-delivered", label: "Mark dispatch as delivered", description: "Complete an active dispatch", icon: CheckCircle, action: () => go("/dispatch", "ctx-mark-delivered"), category: "action", keywords: ["delivered", "complete"] },
      );
    }

    if (base.includes("order") || base.includes("inbox")) {
      actions.push(
        { id: "ctx-convert-order", label: "Convert order to dispatch", description: "Transform pending order into dispatch plan", icon: RefreshCw, action: () => go("/ops-manager", "ctx-convert-order"), category: "action", keywords: ["convert", "order"] },
        { id: "ctx-reject-order", label: "Reject order", description: "Decline an incoming order", icon: XCircle, action: () => go("/ops-manager", "ctx-reject-order"), category: "action", keywords: ["reject", "order"] },
      );
    }

    return actions;
  };

  const navigationCommands: CommandAction[] = [
    // Dashboard
    { id: "nav-overview", label: "Overview Dashboard", description: "Main platform overview", icon: BarChart3, action: () => go("/", "nav-overview"), category: "navigation", keywords: ["home", "dashboard"] },
    { id: "nav-ops", label: "Ops Manager Dashboard", description: "Operations command center", icon: ClipboardList, action: () => go("/ops-manager", "nav-ops"), category: "navigation", keywords: ["operations", "manager"] },
    // Operations
    { id: "nav-dispatch", label: "Dispatch Management", description: "View and manage all dispatches", icon: Package, action: () => go("/dispatch", "nav-dispatch"), category: "navigation", keywords: ["dispatch", "trips"] },
    { id: "nav-routes", label: "Route Planner", description: "Plan and optimize routes", icon: Route, action: () => go("/routes", "nav-routes"), category: "navigation", keywords: ["route", "plan"] },
    { id: "nav-adv-routes", label: "Advanced Route Planner", description: "Multi-drop and VRP optimization", icon: Navigation, action: () => go("/advanced-route-planner", "nav-adv-routes"), category: "navigation", keywords: ["advanced", "multi-drop", "vrp"] },
    { id: "nav-tracking", label: "Live Tracking", description: "Real-time shipment tracking", icon: MapPin, action: () => go("/tracking", "nav-tracking"), category: "navigation", keywords: ["tracking", "live", "gps"] },
    { id: "nav-drivers", label: "Driver Management", description: "View and manage drivers", icon: Users, action: () => go("/drivers", "nav-drivers"), category: "navigation", keywords: ["driver", "manage"] },
    { id: "nav-fleet", label: "Fleet Management", description: "Vehicles and fleet health", icon: Truck, action: () => go("/fleet", "nav-fleet"), category: "navigation", keywords: ["fleet", "vehicles"] },
    { id: "nav-customers", label: "Customer Management", description: "View and manage customers", icon: Building2, action: () => go("/customers", "nav-customers"), category: "navigation", keywords: ["customer", "client"] },
    { id: "nav-fleet-cmd", label: "Fleet Command Center", description: "Real-time fleet operations", icon: Gauge, action: () => go("/fleet-command", "nav-fleet-cmd"), category: "navigation", keywords: ["fleet", "command"] },
    // Finance
    { id: "nav-invoices", label: "Invoices", description: "Invoice management", icon: FileText, action: () => go("/invoices", "nav-invoices"), category: "navigation", keywords: ["invoice", "billing"] },
    { id: "nav-expenses", label: "Expenses", description: "Expense tracking", icon: Wallet, action: () => go("/expenses", "nav-expenses"), category: "navigation", keywords: ["expense", "cost"] },
    // Intelligence
    { id: "nav-intel", label: "Market Intelligence", description: "AI-powered market insights", icon: Brain, action: () => go("/market-intelligence", "nav-intel"), category: "navigation", keywords: ["intelligence", "ai", "market"] },
    { id: "nav-sla", label: "SLA Management", description: "Service level agreements", icon: Shield, action: () => go("/operations/sla-management", "nav-sla"), category: "navigation", keywords: ["sla", "service"] },
    // Admin
    { id: "nav-approvals", label: "Approval Center", description: "Pending approvals queue", icon: CheckCircle, action: () => go("/approval-center", "nav-approvals"), category: "navigation", keywords: ["approval", "pending"] },
    { id: "nav-settings", label: "Settings", description: "Platform settings", icon: Settings, action: () => go("/settings", "nav-settings"), category: "navigation", keywords: ["settings", "config"] },
    { id: "nav-emails", label: "Email Notifications", description: "Manage email communications", icon: Mail, action: () => go("/emails", "nav-emails"), category: "navigation", keywords: ["email", "notification"] },
  ];

  const quickActions: CommandAction[] = [
    { id: "act-new-dispatch", label: "Create new dispatch", description: "Start a new delivery dispatch", icon: Plus, action: () => go("/dispatch", "act-new-dispatch"), category: "action", keywords: ["create", "new", "dispatch"] },
    { id: "act-add-driver", label: "Add new driver", description: "Register a new driver", icon: Plus, action: () => go("/drivers", "act-add-driver"), category: "action", keywords: ["add", "new", "driver"] },
    { id: "act-add-vehicle", label: "Add new vehicle", description: "Register a new vehicle", icon: Plus, action: () => go("/fleet", "act-add-vehicle"), category: "action", keywords: ["add", "new", "vehicle"] },
    { id: "act-add-customer", label: "Add new customer", description: "Create a new customer record", icon: Plus, action: () => go("/customers", "act-add-customer"), category: "action", keywords: ["add", "new", "customer"] },
    { id: "act-create-route", label: "Create route plan", description: "Build a new delivery route", icon: Route, action: () => go("/advanced-route-planner", "act-create-route"), category: "action", keywords: ["create", "route", "plan"] },
    { id: "act-create-invoice", label: "Create invoice", description: "Generate a new invoice", icon: FileText, action: () => go("/invoices", "act-create-invoice"), category: "action", keywords: ["create", "invoice"] },
    { id: "act-add-maintenance", label: "Add maintenance record", description: "Log a vehicle maintenance entry", icon: Wrench, action: () => go("/fleet", "act-add-maintenance"), category: "action", keywords: ["maintenance", "repair", "service"] },
    { id: "act-view-inbox", label: "Open order inbox", description: "View incoming orders", icon: Inbox, action: () => go("/ops-manager", "act-view-inbox"), category: "action", keywords: ["inbox", "orders", "incoming"] },
    { id: "act-view-alerts", label: "View active alerts", description: "Check system alerts and exceptions", icon: AlertTriangle, action: () => go("/ops-manager", "act-view-alerts"), category: "action", keywords: ["alerts", "exceptions", "warnings"] },
  ];

  const contextActions = getContextActions();

  const recentItems = recentCommands
    .map((id) => [...navigationCommands, ...quickActions].find((c) => c.id === id))
    .filter(Boolean) as CommandAction[];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search... (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Context Actions */}
        {contextActions.length > 0 && (
          <>
            <CommandGroup heading="Context Actions">
              {contextActions.map((cmd) => (
                <CommandItem key={cmd.id} onSelect={cmd.action} keywords={cmd.keywords}>
                  <cmd.icon className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span>{cmd.label}</span>
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent */}
        {recentItems.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentItems.map((cmd) => (
                <CommandItem key={`recent-${cmd.id}`} onSelect={cmd.action} keywords={cmd.keywords}>
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{cmd.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          {quickActions.map((cmd) => (
            <CommandItem key={cmd.id} onSelect={cmd.action} keywords={cmd.keywords}>
              <cmd.icon className="mr-2 h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span>{cmd.label}</span>
                <span className="text-xs text-muted-foreground">{cmd.description}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem key={cmd.id} onSelect={cmd.action} keywords={cmd.keywords}>
              <cmd.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{cmd.label}</span>
                <span className="text-xs text-muted-foreground">{cmd.description}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default UniversalCommandBar;
