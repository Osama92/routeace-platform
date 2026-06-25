import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, getPlanLimits } from "@/hooks/useTenantConfig";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";
import {
  PLAN_MODULES,
  PLAN_LIMITS as ENTITLEMENT_LIMITS,
  AI_CREDIT_ACTIONS,
  LogisticsModule,
  PlanTier,
} from "@/lib/plans/entitlements";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  LayoutDashboard, Building2, CreditCard, Shield, Users, Settings2,
  Truck, Package, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle2,
  Zap, Brain, Lock, Unlock, Crown, ChevronRight, Activity, Search,
  UserCheck, Save,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SIDEBAR_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "business", label: "Business Setup", icon: Building2 },
  { id: "subscription", label: "Subscription & Billing", icon: CreditCard },
  { id: "entitlements", label: "Feature Entitlements", icon: Unlock },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "operations", label: "Operations Controls", icon: Settings2 },
  { id: "security", label: "Security & Trust", icon: Shield },
];

const MODEL_INFO = {
  haulage: { icon: Truck, emoji: "🚛", label: "Haulage", color: "text-blue-500" },
  multidrop: { icon: Package, emoji: "📦", label: "Multi-Drop", color: "text-green-500" },
  hybrid: { icon: RefreshCw, emoji: "🔁", label: "Hybrid", color: "text-purple-500" },
};

const PLAN_BADGES: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-500/10 text-blue-500",
  growth: "bg-green-500/10 text-green-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

// All platform roles with labels grouped by category
const ALL_ROLES: { value: string; label: string; category: string }[] = [
  // Org-level
  { value: "super_admin",     label: "Super Admin",       category: "Organisation" },
  { value: "admin",           label: "Admin",             category: "Organisation" },
  { value: "org_admin",       label: "Org Admin",         category: "Organisation" },
  // Operations
  { value: "ops_manager",     label: "Operations Manager", category: "Operations" },
  { value: "dispatcher",      label: "Dispatcher",         category: "Operations" },
  { value: "operations",      label: "Operations",         category: "Operations" },
  { value: "driver",          label: "Driver",             category: "Operations" },
  // Finance / Support
  { value: "finance_manager", label: "Finance Manager",   category: "Finance & Support" },
  { value: "support",         label: "Support",           category: "Finance & Support" },
  { value: "customer",        label: "Customer",          category: "Finance & Support" },
  // Core team (internal)
  { value: "internal_team",   label: "Internal Team",     category: "Core (Internal)" },
  { value: "core_founder",    label: "Core Founder",      category: "Core (Internal)" },
  { value: "core_builder",    label: "Core Builder",      category: "Core (Internal)" },
  { value: "core_product",    label: "Core Product",      category: "Core (Internal)" },
  { value: "core_engineer",   label: "Core Engineer",     category: "Core (Internal)" },
  { value: "core_cofounder",  label: "Core Co-Founder",   category: "Core (Internal)" },
  { value: "core_analyst",    label: "Core Analyst",      category: "Core (Internal)" },
];

// Group roles by category for display
const ROLE_CATEGORIES = ALL_ROLES.reduce<Record<string, typeof ALL_ROLES>>((acc, r) => {
  (acc[r.category] = acc[r.category] || []).push(r);
  return acc;
}, {});

export default function AdminGovernance() {
  const navigate = useNavigate();
  const { user, organizationId } = useAuth();
  const { config, isLoading, upsertConfig } = useTenantConfig();
  const { settings: companySettings } = useCompanySettings();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Team & Roles state
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const queryClient = useQueryClient();

  // Source-of-truth resolution: General Settings (company_settings) wins over
  // legacy onboarding values stored in tenant_config. Falls back to org name.
  const { data: orgRow } = useQuery({
    queryKey: ["governance-org", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data } = await supabase
        .from("organizations")
        .select("id,name")
        .eq("id", organizationId)
        .maybeSingle();
      return data;
    },
    enabled: !!organizationId,
  });

  const effectiveCompanyName = useMemo(() => {
    return (
      companySettings?.company_name?.trim() ||
      orgRow?.name?.trim() ||
      config?.company_name?.trim() ||
      ""
    );
  }, [companySettings?.company_name, orgRow?.name, config?.company_name]);

  const effectiveBusinessEmail = useMemo(() => {
    return companySettings?.email || config?.business_email || "";
  }, [companySettings?.email, config?.business_email]);

  // Auto-heal: if General Settings has a name and tenant_config drifted,
  // sync tenant_config so downstream consumers stay consistent.
  useEffect(() => {
    if (!config || !companySettings?.company_name) return;
    const live = companySettings.company_name.trim();
    const stored = (config.company_name || "").trim();
    if (live && stored && live !== stored) {
      upsertConfig.mutate({
        company_name: live,
        ...(companySettings.email ? { business_email: companySettings.email } : {}),
      } as any);
    }
  }, [companySettings?.company_name, companySettings?.email, config?.company_name]);

  // Live counts
  const { data: counts } = useQuery({
    queryKey: ["governance-counts", user?.id],
    queryFn: async () => {
      const [users, vehicles, dispatches, invoices] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
        supabase.from("dispatches").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
      ]);
      return {
        users: users.count || 0,
        vehicles: vehicles.count || 0,
        dispatches: dispatches.count || 0,
        overdueInvoices: invoices.count || 0,
      };
    },
    enabled: !!user,
  });

  // Fetch all users in this org for the team dropdown
  const { data: orgUsers } = useQuery({
    queryKey: ["governance-org-users", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId)
        .order("full_name");
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch the selected user's current roles
  const { data: selectedUserRoles } = useQuery({
    queryKey: ["governance-user-roles", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", selectedUserId);
      return (data || []).map((r: any) => r.role as string);
    },
    enabled: !!selectedUserId,
  });

  // Sync pending roles when selected user changes
  useEffect(() => {
    if (selectedUserRoles !== undefined) {
      setPendingRoles(selectedUserRoles);
    }
  }, [selectedUserRoles]);

  const handleUserSelect = (userId: string, displayName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(displayName);
    setUserSearchOpen(false);
    setPendingRoles([]);
  };

  const toggleRole = (role: string) => {
    setPendingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveUserRoles = async () => {
    if (!selectedUserId) return;
    setSavingRoles(true);
    try {
      const current = selectedUserRoles || [];
      const toAdd = pendingRoles.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !pendingRoles.includes(r));

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("user_roles")
          .insert(toAdd.map((role) => ({ user_id: selectedUserId, role })));
        if (error) throw error;
      }

      for (const role of toRemove) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUserId)
          .eq("role", role);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["governance-user-roles", selectedUserId] });
      toast.success(`Access updated for ${selectedUserName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update roles");
    } finally {
      setSavingRoles(false);
    }
  };

  const limits = config ? getPlanLimits(config.plan_tier) : getPlanLimits("free");
  const aiRemaining = (config?.ai_credits_total || 0) - (config?.ai_credits_used || 0);

  const handleOpsToggle = async (key: string, value: boolean) => {
    try {
      await upsertConfig.mutateAsync({ [key]: value } as any);
      toast.success(`Permission updated`);
    } catch {
      toast.error("Failed to update");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Crown className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle>Complete Onboarding First</CardTitle>
            <CardDescription>
              Set up your business identity, operating model, and governance rules before accessing the Admin workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/onboarding")} className="gap-2">
              Start Setup <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const model = MODEL_INFO[config.operating_model] || MODEL_INFO.haulage;

  // Alerts
  const alerts: { text: string; level: "warning" | "error" }[] = [];
  if (aiRemaining <= 10 && config.plan_tier !== "free") alerts.push({ text: "AI credits running low", level: "warning" });
  if ((counts?.vehicles || 0) >= (limits.max_vehicles || 1)) alerts.push({ text: "Vehicle limit reached - upgrade to add more", level: "error" });
  if ((counts?.users || 0) >= (limits.max_users || 3)) alerts.push({ text: "User limit reached for current plan", level: "error" });
  if ((counts?.overdueInvoices || 0) > 0) alerts.push({ text: `${counts!.overdueInvoices} overdue invoice(s)`, level: "warning" });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 mb-3 w-full justify-start">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="font-bold text-lg">Admin Governance</h2>
          <p className="text-xs text-muted-foreground mt-1">Logistics OS Control Center</p>
        </div>
        <ScrollArea className="flex-1 p-2">
          {SIDEBAR_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <s.icon className="w-4 h-4 flex-shrink-0" />
              {s.label}
            </button>
          ))}
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <ScrollArea className="h-screen">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* ===== DASHBOARD ===== */}
            {activeSection === "dashboard" && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Governance Dashboard</h1>
                  <p className="text-muted-foreground">Overview of your Logistics OS tenant</p>
                </div>

                {/* Status Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Operating Model</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{model.emoji}</span>
                        <span className="font-semibold capitalize">{config.operating_model}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <Badge className={`mt-1 ${PLAN_BADGES[config.plan_tier]}`}>
                        {config.plan_tier.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">AI Credits</p>
                      <p className="font-semibold text-lg">{aiRemaining}</p>
                      <p className="text-xs text-muted-foreground">of {config.ai_credits_total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p className="font-semibold truncate">{effectiveCompanyName || "Business setup incomplete"}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage vs Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Usage vs Plan Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Users", current: counts?.users || 0, max: limits.max_users || 3 },
                      { label: "Vehicles", current: counts?.vehicles || 0, max: limits.max_vehicles || 1 },
                      { label: "Dispatches (month)", current: counts?.dispatches || 0, max: limits.max_monthly_dispatches || 10 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.label}</span>
                          <span className={item.current >= item.max ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {item.current} / {item.max}
                          </span>
                        </div>
                        <Progress value={Math.min((item.current / item.max) * 100, 100)} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <Card className="border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {alerts.map((a, i) => (
                        <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${
                          a.level === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          {a.text}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===== BUSINESS SETUP ===== */}
            {activeSection === "business" && (
              <>
                <h1 className="text-2xl font-bold">Business Setup</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Company Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{effectiveCompanyName || "Business setup incomplete"}</span></div>
                      <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{config.country}</span></div>
                      <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{config.billing_currency}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{effectiveBusinessEmail || "Not set"}</span></div>
                      <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{config.company_size || "Not set"}</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Operating Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border">
                        <model.icon className={`w-8 h-8 ${model.color}`} />
                        <div>
                          <p className="font-bold text-lg capitalize">{config.operating_model}</p>
                          <p className="text-sm text-muted-foreground">
                            {config.operating_model === "haulage" && "Point-to-point, long-haul, contract haulage"}
                            {config.operating_model === "multidrop" && "Route-based distribution, multiple stops per trip"}
                            {config.operating_model === "hybrid" && "Both haulage and multi-drop operations"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Vehicles:</span> <span className="font-medium">{config.vehicle_count}</span></div>
                        <div><span className="text-muted-foreground">Branches:</span> <span className="font-medium">{config.branch_count}</span></div>
                        <div><span className="text-muted-foreground">Ownership:</span> <span className="font-medium capitalize">{config.ownership_type}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Intake Channels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(config.order_channels || ["manual"]).map((ch) => (
                        <Badge key={ch} variant="secondary" className="capitalize">{ch}</Badge>
                      ))}
                    </div>
                    {config.order_channels?.length === 1 && config.order_channels[0] === "manual" && (
                      <p className="text-sm text-muted-foreground mt-3">
                        Connect WhatsApp, Instagram, API, or Customer Portal for automated order intake.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===== SUBSCRIPTION & BILLING ===== */}
            {activeSection === "subscription" && (
              <>
                <h1 className="text-2xl font-bold">Subscription & Billing</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Current Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className={`text-lg px-4 py-1 ${PLAN_BADGES[config.plan_tier]}`}>
                          {config.plan_tier.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Since {new Date(config.plan_started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>Model: <strong className="capitalize">{config.operating_model}</strong></p>
                        <p>Billing: <strong className="capitalize">{config.billing_cycle}</strong></p>
                        <p>Currency: <strong>{config.billing_currency}</strong></p>
                      </div>
                      {config.plan_tier !== "enterprise" && (
                        <Button variant="outline" className="mt-4 gap-2" size="sm">
                          <Zap className="w-4 h-4" /> Upgrade Plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4" /> AI Credits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Used</span>
                        <span>{config.ai_credits_used} / {config.ai_credits_total}</span>
                      </div>
                      <Progress value={config.ai_credits_total > 0 ? (config.ai_credits_used / config.ai_credits_total) * 100 : 0} className="h-2" />
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>Remaining: <strong className="text-foreground">{aiRemaining}</strong></p>
                        <p>Rollover: <strong className="text-foreground">{config.ai_credits_rollover}</strong></p>
                      </div>
                      {config.ai_credits_total === 0 && (
                        <p className="text-sm text-muted-foreground italic">No AI credits purchased yet. Upgrade to Growth or Enterprise for AI features.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* ===== FEATURE ENTITLEMENTS ===== */}
            {activeSection === "entitlements" && (
              <>
                <h1 className="text-2xl font-bold">Feature Entitlements</h1>
                <p className="text-muted-foreground">
                  Complete module access matrix for your <strong className="capitalize">{config.plan_tier}</strong> plan
                </p>

                {/* Plan comparison strip */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Plan Limits Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Resource</th>
                            {(["free", "starter", "growth", "enterprise"] as PlanTier[]).map(t => (
                              <th key={t} className={`text-center py-2 px-3 font-medium capitalize ${t === config.plan_tier ? "text-primary bg-primary/5 rounded" : "text-muted-foreground"}`}>
                                {t}
                                {t === config.plan_tier && <span className="block text-[10px]">Current</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {([
                            ["Users", "max_users"],
                            ["Vehicles", "max_vehicles"],
                            ["Branches", "max_branches"],
                            ["Dispatches/mo", "max_monthly_dispatches"],
                            ["Daily Stops", "max_daily_stops"],
                            ["API Calls", "max_api_calls"],
                            ["Integrations", "max_integrations"],
                            ["AI Credits/mo", "ai_credits_monthly"],
                          ] as [string, string][]).map(([label, key]) => (
                            <tr key={key} className="border-b border-border/50">
                              <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                              {(["free", "starter", "growth", "enterprise"] as PlanTier[]).map(t => {
                                const val = (ENTITLEMENT_LIMITS[t] as any)[key];
                                return (
                                  <td key={t} className={`text-center py-2 px-3 ${t === config.plan_tier ? "font-semibold text-foreground" : ""}`}>
                                    {val >= 9999 ? "∞" : val.toLocaleString()}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Module access matrix */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Module Access Matrix</CardTitle>
                    <CardDescription>Green = included on your plan. Locked = requires upgrade.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(Object.keys(PLAN_MODULES.free) as LogisticsModule[]).map(mod => {
                        const accessible = PLAN_MODULES[config.plan_tier as PlanTier]?.[mod] ?? false;
                        const label = mod.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                        return (
                          <div key={mod} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                            accessible ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-50"
                          }`}>
                            {accessible ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Credit Actions */}
                {(config.plan_tier === "growth" || config.plan_tier === "enterprise") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4" /> AI Credit Consumption Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {AI_CREDIT_ACTIONS.map(action => (
                          <div key={action.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                            <div>
                              <p className="text-sm font-medium">{action.label}</p>
                              <p className="text-xs text-muted-foreground capitalize">Module: {action.module.replace(/_/g, " ")}</p>
                            </div>
                            <Badge variant="secondary">{action.credits_per_use} credits</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {config.plan_tier !== "enterprise" && (
                  <Card className="border-primary/30">
                    <CardContent className="pt-6 text-center">
                      <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold mb-1">Unlock More Features</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to access AI tools, advanced integrations, and higher limits.
                      </p>
                      <Button className="gap-2">
                        <Zap className="w-4 h-4" /> View Upgrade Options
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===== TEAM & ROLES ===== */}
            {activeSection === "team" && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Team & Roles</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Select a team member and assign platform access roles using the toggles below.
                  </p>
                </div>

                {/* User picker */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> Select Team Member
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {selectedUserName || "Search and select a user..."}
                          <Search className="w-4 h-4 ml-2 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search by name or email..." />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {(orgUsers || []).map((u: any) => (
                                <CommandItem
                                  key={u.id}
                                  value={`${u.full_name} ${u.email}`}
                                  onSelect={() => handleUserSelect(u.id, u.full_name || u.email)}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{u.full_name || "Unnamed"}</span>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </CardContent>
                </Card>

                {/* Role assignment — only shown once a user is selected */}
                {selectedUserId && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold">Access Roles for {selectedUserName}</h2>
                        <p className="text-sm text-muted-foreground">Toggle roles on/off then click Save.</p>
                      </div>
                      <Button onClick={saveUserRoles} disabled={savingRoles} className="gap-2">
                        <Save className="w-4 h-4" />
                        {savingRoles ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>

                    {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                      <Card key={category}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                            {category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {roles.map((r) => (
                            <div key={r.value} className="flex items-center justify-between">
                              <div>
                                <Label className="text-sm font-medium">{r.label}</Label>
                                <p className="text-xs text-muted-foreground font-mono">{r.value}</p>
                              </div>
                              <Switch
                                checked={pendingRoles.includes(r.value)}
                                onCheckedChange={() => toggleRole(r.value)}
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}

                    <div className="flex justify-end pb-6">
                      <Button onClick={saveUserRoles} disabled={savingRoles} className="gap-2">
                        <Save className="w-4 h-4" />
                        {savingRoles ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ===== OPERATIONS CONTROLS ===== */}
            {activeSection === "operations" && (
              <>
                <h1 className="text-2xl font-bold">Operations Controls</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Dispatch Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Require Dispatch Approval</Label>
                        <Switch
                          checked={config.dispatch_approval_required}
                          onCheckedChange={(v) => handleOpsToggle("dispatch_approval_required", v)}
                        />
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">High-Value Threshold:</span>{" "}
                        <strong>{config.billing_currency} {config.high_value_dispatch_threshold?.toLocaleString()}</strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Waybill Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Auto-Generate on Dispatch Release</Label>
                        <Switch
                          checked={config.waybill_auto_generate}
                          onCheckedChange={(v) => handleOpsToggle("waybill_auto_generate", v)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Maintenance Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Require Maintenance Logging</Label>
                        <Switch
                          checked={config.maintenance_logging_required}
                          onCheckedChange={(v) => handleOpsToggle("maintenance_logging_required", v)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* ===== SECURITY & TRUST ===== */}
            {activeSection === "security" && (
              <>
                <h1 className="text-2xl font-bold">Security & Trust</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Login Security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Unique email enforcement
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        12-character password policy
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Session expiry controls
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        Audit trail logging active
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Access Audit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" onClick={() => navigate("/audit-logs")}>
                        View Full Audit Logs
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
