import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import useTenantMode from "@/hooks/useTenantMode";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { useIsPaidPlan } from "@/hooks/useIsPaidPlan";
import {
  Brain, Users, Globe, Trophy, Eye, DollarSign, Handshake, Target,
  Network, Sparkles, TrendingUp, Building2, Layers, Warehouse, Crown,
  Search, Lock, ArrowLeft, Wallet, PiggyBank, Briefcase, LineChart, ShieldCheck,
  Wrench, TrendingDown, Receipt, FileText, Plug, CalendarDays,
} from "lucide-react";

type GatedKey = "aiBoard" | "aiCeo" | "websiteBuilder" | "financeEngine" | "reseller" | "investorMode";

const GATE_REASONS: Record<GatedKey, string> = {
  aiBoard: "Available in Logistics Company mode only. Department mode disables strategic boardroom tools.",
  aiCeo: "Available in Logistics Company mode only. Switch to Company mode to unlock the AI CEO.",
  websiteBuilder: "Website Generator is a Company-mode growth tool. Department mode hides external acquisition features.",
  financeEngine: "Finance Engine requires Company mode (revenue/billing focus).",
  reseller: "Reseller program is restricted to Company mode super admins.",
  investorMode: "Investor mode is enabled in Company mode only.",
};

const PAID_LOCK_REASON = "Available on a paid plan. Upgrade to unlock advanced executive AI engines.";

const MODULES: Array<{
  group: string; title: string; desc: string; to: string;
  icon: any; gated?: GatedKey; paid?: boolean;
  /** LD-only modules — hidden for Logistics Company (LC) tenants */
  ldOnly?: boolean;
  /** Cross-tenant ecosystem modules — only visible to super admin / core team */
  ecosystemOnly?: boolean;
}> = [
  { group: "AI Strategy", title: "AI Board of Directors", desc: "6-persona executive debates on strategy", to: "/ai-board", icon: Crown, gated: "aiBoard" },
  { group: "AI Strategy", title: "AI CEO", desc: "Strategic autonomous decision-layer", to: "/ai-ceo", icon: Brain, gated: "aiCeo" },
  { group: "AI Strategy", title: "AI Employees", desc: "Ops, Finance, Support, Growth agents", to: "/ai-workforce", icon: Users },
  // Executive AI (Paid Plan only)
  { group: "Executive AI", title: "AI CFO Engine", desc: "Cash, AR, cost & profit command layer", to: "/ai-cfo", icon: Wallet, paid: true },
  { group: "Executive AI", title: "Autonomous Capital Allocation", desc: "Where to invest, cut, expand fleet/routes", to: "/ai-cfo?module=capital-allocation", icon: PiggyBank, paid: true },
  { group: "Executive AI", title: "AI Capital Allocator", desc: "Allocate drivers, trucks, capital, fuel", to: "/ai-cfo?module=resource-allocator", icon: LineChart, paid: true },
  { group: "Executive AI", title: "Autonomous M&A Engine", desc: "Acquisition targets + partnership signals", to: "/ai-cfo?module=ma-engine", icon: Briefcase, paid: true },
  { group: "Executive AI", title: "Immutable Ledger Viewer", desc: "SHA256-chained financial audit trail", to: "/ledger-viewer", icon: ShieldCheck, paid: true },
  { group: "Growth", title: "Self-Expanding Network", desc: "Auto lead-gen + referral signals", to: "/self-expanding-network", icon: Network },
  { group: "Growth", title: "AI Deal Closer", desc: "Enterprise targets + objection handling", to: "/ai-deal-closer", icon: Handshake },
  { group: "Growth", title: "Partnerships Engine", desc: "Cross-tenant FMCG ↔ 3PL matchmaking (ecosystem operators only)", to: "/partnerships-engine", icon: Users, ecosystemOnly: true },
  { group: "Growth", title: "Website Generator", desc: "AI-built SEO landing pages", to: "/website-generator", icon: Sparkles, gated: "websiteBuilder" },
  { group: "Market", title: "Ecosystem Control", desc: "Vendors, insurers, partners graph", to: "/ecosystem-control", icon: Layers },
  { group: "Market", title: "Global Expansion", desc: "Market scoring + roadmaps", to: "/global-expansion", icon: Globe },
  { group: "Market", title: "Monopoly Strategy", desc: "Lock-in tactics + market mapping", to: "/monopoly-strategy", icon: Trophy },
  { group: "Market", title: "Competitive Intel", desc: "Competitor tracking + win strategies", to: "/competitive-intel", icon: Eye },
  { group: "Market", title: "Pricing Dominance", desc: "Value-based pricing recommendations", to: "/pricing-dominance", icon: DollarSign },
  { group: "Operations", title: "Warehouse Outbound", desc: "Warehouse → Dispatch sync", to: "/warehouse-outbound", icon: Warehouse, ldOnly: true },
  { group: "Operations", title: "Autonomous Execution", desc: "AI-driven operational actions", to: "/autonomous-execution", icon: TrendingUp },
  { group: "Operations", title: "Maintenance Intelligence", desc: "Predictive workshop queue, injector watch, grounding", to: "/maintenance-intelligence", icon: Wrench },
  { group: "Operations", title: "Profitability Engine", desc: "True cost per truck, route, driver & client", to: "/profitability-engine", icon: TrendingDown },
  { group: "Operations", title: "System Integrity Auditor", desc: "Live audit of routes, data flow, AI engines & go-live readiness", to: "/system-integrity", icon: ShieldCheck },
  { group: "Workforce", title: "My Leave", desc: "Request leave & track your balances", to: "/workforce/my-leave", icon: CalendarDays },
  { group: "Workforce", title: "Leave Inbox", desc: "Approve, reject or modify staff leave with operational impact scoring", to: "/workforce/leave-inbox", icon: Users },
  { group: "Workforce", title: "Daily Sign-In", desc: "Check in for the day with GPS-verified attendance", to: "/workforce/sign-in", icon: ShieldCheck },
  { group: "Workforce", title: "My KPIs", desc: "Log and track your daily performance metrics", to: "/workforce/my-kpis", icon: Target },
  { group: "Workforce", title: "AI Performance Panel", desc: "Score teammates from attendance + KPI signals and publish recommendations", to: "/workforce/performance", icon: Sparkles },
  { group: "Finance Ops", title: "AP Workspace", desc: "Accounts payable aging & enforcement", to: "/cfo/ap", icon: Receipt, paid: true },
  { group: "Finance Ops", title: "AR Workspace", desc: "Accounts receivable aging & collections", to: "/cfo/ar", icon: FileText, paid: true },
  { group: "Platform", title: "Integration Hub", desc: "Self-serve 3-step connect for accounting, CRM, payments & comms", to: "/integration-hub", icon: Plug },
];

const GROUPS = ["AI Strategy", "Executive AI", "Growth", "Market", "Operations", "Workforce", "Finance Ops", "Platform"] as const;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
const STORAGE_KEY = "ai-modules-hub:group";

export default function AIModulesHub() {
  const navigate = useNavigate();
  const { mode, canAccessModule, isDepartment } = useTenantMode();
  const { isSuperAdmin, userRole } = useAuth();
  const isCoreTeam = !!userRole && (userRole.startsWith("core_") || userRole === "internal_team");
  const isEcosystemOperator = isSuperAdmin || isCoreTeam;
  const { isPaid } = useIsPaidPlan();
  const [activeGroup, setActiveGroup] = useState<string | "all">(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(STORAGE_KEY) || "all";
  });
  const [search, setSearch] = useState("");

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/super-admin");
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeGroup);
  }, [activeGroup]);

  const q = search.trim().toLowerCase();
  // Modules visible to this tenant before applying group/search filters.
  const visibleModules = MODULES.filter((m) => {
    if (m.ldOnly && !isDepartment) return false;
    if (m.ecosystemOnly && !isEcosystemOperator) return false;
    return true;
  });
  const filtered = visibleModules.filter((m) => {
    if (activeGroup !== "all" && m.group !== activeGroup) return false;
    if (!q) return true;
    return m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
  });

  const visibleGroups = GROUPS.filter((g) => filtered.some((m) => m.group === g));

  const handleDisabledClick = (title: string, reason: string) => {
    toast.error(`${title} is locked`, { description: reason });
  };

  // Back to Dashboard always returns to super-admin landing for clarity
  const handleBackToDashboard = () => navigate("/super-admin");

  return (
    <DashboardLayout title="AI Modules Hub" subtitle="Strategic, growth, and operational AI engines">
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 -ml-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleBackToDashboard} className="gap-2">
            ← Back to Dashboard
          </Button>
        </div>
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/super-admin">Super Admin</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {activeGroup === "all" ? (
                <BreadcrumbPage>AI Modules Hub</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <button onClick={() => setActiveGroup("all")}>AI Modules Hub</button>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {activeGroup !== "all" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeGroup}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Mode: <Badge variant="outline">{mode === "LOGISTICS_DEPARTMENT" ? "Department" : "Company"}</Badge>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" /> AI Modules Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            All strategic, growth, and operational AI engines in one place.
            {isDepartment && " Some modules are disabled in Department Mode."}
          </p>
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col gap-3 border-b border-border/50 pb-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeGroup === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveGroup("all")}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" /> All
              <Badge variant="outline" className="text-[10px] ml-1">{visibleModules.length}</Badge>
            </Button>
            {GROUPS.map((g) => {
              const count = visibleModules.filter((m) => m.group === g).length;
              return (
                <Button
                  key={g}
                  variant={activeGroup === g ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveGroup(g)}
                  className="gap-2"
                >
                  <Layers className="w-4 h-4" /> {g}
                  <Badge variant="outline" className="text-[10px] ml-1">{count}</Badge>
                </Button>
              );
            })}
          </div>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules by name or description..."
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No modules match "{search}". Try a different search or category.
          </div>
        )}

        {visibleGroups.map((group) => {
          const items = filtered.filter((m) => m.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} id={slug(group)} className="space-y-3 scroll-mt-4">
              <h2 className="text-lg font-semibold">{group}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((m) => {
                  const modeBlocked = !!(m.gated && !canAccessModule(m.gated as any));
                  const planBlocked = !!(m.paid && !isPaid);
                  const disabled = modeBlocked || planBlocked;
                  const reason = modeBlocked
                    ? GATE_REASONS[m.gated as GatedKey]
                    : planBlocked ? PAID_LOCK_REASON : "";
                  const lockLabel = planBlocked ? "Paid plan" : "Company only";

                  const card = (
                    <Card id={slug(m.title)} className={`h-full transition-all scroll-mt-4 ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50 hover:shadow-md cursor-pointer"}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <m.icon className="w-4 h-4 text-primary" /> {m.title}
                          {disabled && (
                            <Badge variant="outline" className="ml-auto text-[10px] gap-1">
                              <Lock className="w-3 h-3" /> {lockLabel}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{m.desc}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-2 font-mono">{m.to}</p>
                        {disabled && (
                          <p className="text-[11px] text-warning mt-2 leading-snug">{reason}</p>
                        )}
                      </CardContent>
                    </Card>
                  );

                  if (disabled) {
                    return (
                      <Tooltip key={m.to}>
                        <TooltipTrigger asChild>
                          <div onClick={() => handleDisabledClick(m.title, reason)}>
                            {card}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <Link key={m.to} to={m.to}>{card}</Link>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
    </DashboardLayout>
  );
}
