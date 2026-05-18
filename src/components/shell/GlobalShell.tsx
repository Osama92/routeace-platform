import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Truck, ChevronLeft, ChevronRight, ChevronDown, LogOut, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRegion } from "@/contexts/RegionContext";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";
import WorkspaceSwitcher from "@/components/shell/WorkspaceSwitcher";
import UniversalCommandBar from "@/components/command/UniversalCommandBar";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { OnboardingTeleprompter } from "@/components/guidance/OnboardingTeleprompter";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import { SuperAdminBadge } from "@/components/auth/SuperAdminBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveWorkspaceFromRoute, WORKSPACE_REGISTRY } from "@/lib/workspace/workspaceRegistry";

// ── Icon resolver for sidebar items ───────────────────────────────
import * as LucideIcons from "lucide-react";

const getIcon = (name: string): React.ComponentType<{ className?: string }> => {
  return (LucideIcons as any)[name] || LucideIcons.Circle;
};

interface GlobalShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const GlobalShell = ({ children, title, subtitle }: GlobalShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, signOut, isSuperAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { region, isNGMode } = useRegion();
  const { canAccessRoute } = usePlanEntitlements();
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Fetch avatar
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single()
        .then(async ({ data }) => {
          if (data?.avatar_url) {
            const { resolveStorageUrl } = await import("@/lib/storage/signedUrl");
            const signed = await resolveStorageUrl("profile-pictures", data.avatar_url);
            if (signed) setAvatarUrl(signed);
          }
        });
    }
  }, [user]);

  // Determine if we should use the workspace sidebar or the Logistics OS sidebar
  const isLogisticsOS = activeWorkspace.id === "logistics";
  const workspaceSidebarGroups = activeWorkspace.sidebarGroups || [];

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/access-hub", { replace: true });
  };

  // If this is Logistics OS, render the existing layout (DashboardLayout handles it)
  // For other workspaces, render the global shell with workspace-specific sidebar
  if (isLogisticsOS) {
    return null; // handled by DashboardLayout
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
      >
        {/* Workspace Identity */}
        <Link to="/" aria-label="RouteAce home" className="flex items-center gap-3 p-4 border-b border-sidebar-border hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-heading font-bold text-lg text-foreground">RouteAce</h1>
              <p className="text-[9px] text-muted-foreground leading-tight">{activeWorkspace.name}</p>
            </motion.div>
          )}
        </Link>

        {/* Workspace Switcher (compact) */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <WorkspaceSwitcher />
          </div>
        )}

        {/* Role Badge */}
        {userRole && !collapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            {isSuperAdmin ? (
              <SuperAdminBadge variant="full" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Role:</span>
                <RoleBadge size="sm" />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
          {workspaceSidebarGroups.map((group) => {
            const GroupIcon = getIcon(group.icon);
            const isOpen = openGroups[group.title] ?? (group.defaultOpen || false);
            const hasActive = group.items.some(item => location.pathname === item.href);

            if (collapsed) {
              return (
                <div key={group.title} className="py-1">
                  {group.items.map(item => {
                    const ItemIcon = getIcon(item.icon);
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        title={item.name}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-lg transition-colors",
                          isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.title} className="py-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GroupIcon className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">{group.title}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-2 border-l border-border/50 pl-2 space-y-0.5 py-1">
                        {group.items.map(item => {
                          const ItemIcon = getIcon(item.icon);
                          const isActive = location.pathname === item.href;
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
                              <ItemIcon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 bg-secondary border border-border rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className={cn("transition-all duration-300", collapsed ? "ml-16" : "ml-[280px]")}>
        {/* Header Bar */}
        <header className="flex items-center justify-between py-4 px-6 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {title && (
              <div>
                <h1 className="text-xl font-heading font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Command Bar Trigger */}
            <Button
              variant="outline"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="relative h-8 w-52 justify-start rounded-md border border-input bg-secondary/50 px-3 text-xs text-muted-foreground"
            >
              <Search className="mr-2 h-3.5 w-3.5" />
              <span className="hidden lg:inline-flex">Search...</span>
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            <NotificationBell />

            {/* User */}
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {userName && <span className="text-sm font-medium text-foreground hidden md:block">{userName}</span>}
            </div>
          </div>
        </header>

        <Breadcrumbs />
        <div className="p-6">{children}</div>
      </main>

      <UniversalCommandBar />
      <OnboardingTeleprompter />
    </div>
  );
};

export default GlobalShell;
