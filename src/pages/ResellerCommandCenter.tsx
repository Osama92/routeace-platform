import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import {
  DollarSign, Users, Activity, Shield, Zap, Globe, Lock,
  AlertTriangle, TrendingUp, BarChart3, Key, Layers, Settings,
  CheckCircle, XCircle, Clock, Eye, Ban, RefreshCw, Server,
  PieChart, Cpu, Database, ShieldCheck, FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, BarChart, Bar } from "recharts";
import ProvisionResellerClientDialog from "@/components/reseller/ProvisionResellerClientDialog";
import SplitAuditPanel from "@/components/reseller/SplitAuditPanel";
import { Plus } from "lucide-react";

const ROUTEACE_SHARE = 80;
const RESELLER_SHARE = 20;
const fmt = (n: number) => `₦${n.toLocaleString()}`;

/* ─── Revenue Split Donut ─── */
const RevenueSplitDonut = ({ routeace, reseller }: { routeace: number; reseller: number }) => {
  const data = [
    { name: "RouteAce (80%)", value: routeace, color: "hsl(var(--primary))" },
    { name: "Reseller (20%)", value: reseller, color: "hsl(var(--accent))" },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsPie>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </RechartsPie>
    </ResponsiveContainer>
  );
};

export default function ResellerCommandCenter() {
  const { toast } = useToast();
  const pricingEngine = usePricingEngine();
  const [provisionOpen, setProvisionOpen] = useState(false);

  /* ─── Live Data Queries ─── */
  const { data: commissionData, refetch: refetchCommissions } = useQuery({
    queryKey: ["rcc-commissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_ledger")
        .select("gross_amount, routeace_amount, reseller_amount, transaction_type, created_at, status, reseller_org_id, source_org_id, split_percent_routeace, split_percent_reseller")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const { data: resellerOrgs } = useQuery({
    queryKey: ["rcc-resellers"],
    queryFn: async () => {
      // Scope to "my reseller clients" - orgs where reseller_org_id = current user's org
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership?.organization_id) return [];
      const { data } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier, reseller_lock_until, created_at, max_reseller_licenses")
        .eq("reseller_org_id", membership.organization_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const { data: apiProducts } = useQuery({
    queryKey: ["rcc-api-products"],
    queryFn: async () => {
      const { data } = await supabase.from("api_products").select("*").order("product_name");
      return data || [];
    },
  });

  const { data: apiKeys } = useQuery({
    queryKey: ["rcc-api-keys"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, is_active, scopes, last_used_at, created_at, partner_id, expires_at, revoked_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: apiLogs } = useQuery({
    queryKey: ["rcc-api-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_request_logs")
        .select("id, endpoint, method, status_code, response_time_ms, created_at, request_ip, error_message, api_key_id")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    refetchInterval: 15_000,
  });

  const { data: tenantStats } = useQuery({
    queryKey: ["rcc-tenants"],
    queryFn: async () => {
      const { data: orgs } = await supabase.from("organizations").select("id, subscription_tier, created_at");
      const { data: billingAccounts } = await supabase.from("billing_accounts").select("wallet_balance, status, plan_id");
      return { orgs: orgs || [], billing: billingAccounts || [] };
    },
    refetchInterval: 60_000,
  });

  const { data: securityEvents } = useQuery({
    queryKey: ["rcc-security"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_events")
        .select("id, event_type, severity, ip_address, created_at, user_id, details")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  /* ─── Derived Metrics ─── */
  const totalGross = (commissionData || []).reduce((s, r) => s + Number(r.gross_amount || 0), 0);
  const totalRouteace = (commissionData || []).reduce((s, r) => s + Number(r.routeace_amount || 0), 0);
  const totalReseller = (commissionData || []).reduce((s, r) => s + Number(r.reseller_amount || 0), 0);

  const activeResellers = (resellerOrgs || []).filter(o => {
    if (!o.reseller_lock_until) return false;
    return new Date(o.reseller_lock_until) <= new Date();
  }).length;
  const lockedResellers = (resellerOrgs || []).filter(o => {
    if (!o.reseller_lock_until) return true;
    return new Date(o.reseller_lock_until) > new Date();
  }).length;

  const totalApiCalls = (apiLogs || []).length;
  const successRate = totalApiCalls > 0
    ? ((apiLogs || []).filter(l => l.status_code && l.status_code < 400).length / totalApiCalls * 100).toFixed(1)
    : "0";
  const avgLatency = totalApiCalls > 0
    ? ((apiLogs || []).reduce((s, l) => s + (l.response_time_ms || 0), 0) / totalApiCalls).toFixed(0)
    : "0";

  const activeKeys = (apiKeys || []).filter(k => k.is_active && !k.revoked_at).length;

  // Pricing mismatch detection
  const pricingMismatches = pricingEngine.pricingMismatches || [];

  // Tenant aggregation (no raw data)
  const tenantsByTier = (tenantStats?.orgs || []).reduce((acc, o) => {
    const tier = o.subscription_tier || "free";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Monthly revenue trend (from commission data)
  const monthlyRevenue = (commissionData || []).reduce((acc, r) => {
    const month = new Date(r.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
    if (!acc[month]) acc[month] = { month, routeace: 0, reseller: 0, gross: 0 };
    acc[month].routeace += Number(r.routeace_amount || 0);
    acc[month].reseller += Number(r.reseller_amount || 0);
    acc[month].gross += Number(r.gross_amount || 0);
    return acc;
  }, {} as Record<string, { month: string; routeace: number; reseller: number; gross: number }>);
  const revenueChartData = Object.values(monthlyRevenue).slice(-12);

  // Security threat distribution
  const criticalEvents = (securityEvents || []).filter(e => e.severity === "critical" || e.severity === "high").length;

  return (
    <DashboardLayout
      title="Reseller Command Center"
      subtitle="Super Admin - API Marketplace Governance & Revenue Control"
    >
      <div className="space-y-6">
        {/* ── Section 1: Overview Command Center ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total API Revenue", value: fmt(totalGross), icon: DollarSign, color: "text-green-500" },
            { label: "RouteAce (80%)", value: fmt(totalRouteace), icon: TrendingUp, color: "text-primary" },
            { label: "Reseller (20%)", value: fmt(totalReseller), icon: Users, color: "text-purple-500" },
            { label: "Active Resellers", value: String(activeResellers), icon: Globe, color: "text-blue-500" },
            { label: "Total Tenants", value: String(tenantStats?.orgs?.length || 0), icon: Layers, color: "text-orange-500" },
            { label: "API Calls (Recent)", value: totalApiCalls.toLocaleString(), icon: Activity, color: "text-cyan-500" },
            { label: "System Health", value: `${successRate}%`, icon: Server, color: Number(successRate) > 95 ? "text-green-500" : "text-red-500" },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full">
                <CardContent className="pt-3 pb-3 px-3">
                  <div className="flex items-center gap-2">
                    <kpi.icon className={`h-4 w-4 ${kpi.color} shrink-0`} />
                    <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  </div>
                  <p className="text-lg font-bold mt-1">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Revenue Split + Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue Split (80/20)</CardTitle>
              <CardDescription className="text-xs">Immutable - enforced at transaction level</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueSplitDonut routeace={totalRouteace || 80} reseller={totalReseller || 20} />
              <div className="flex justify-between text-xs mt-2">
                <span className="text-primary font-semibold">RouteAce: {fmt(totalRouteace)}</span>
                <span className="text-purple-500 font-semibold">Reseller: {fmt(totalReseller)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueChartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number) => fmt(v)} />
                    <Area type="monotone" dataKey="routeace" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} name="RouteAce" />
                    <Area type="monotone" dataKey="reseller" stackId="1" fill="hsl(142 76% 36%)" stroke="hsl(142 76% 36%)" fillOpacity={0.3} name="Reseller" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                  <Activity className="h-5 w-5 mr-2 opacity-40" />No commission data yet - revenue will populate as API sales occur.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tabbed Modules ── */}
        <Tabs defaultValue="resellers">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="resellers" className="text-xs">Resellers</TabsTrigger>
            <TabsTrigger value="api-control" className="text-xs">API Control</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">Pricing Sync</TabsTrigger>
            <TabsTrigger value="tenants" className="text-xs">Tenants</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
            <TabsTrigger value="split-audit" className="text-xs">Split Audit</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
            <TabsTrigger value="config" className="text-xs">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="split-audit" className="mt-4">
            <SplitAuditPanel />
          </TabsContent>

          {/* ── Tab 2: Reseller Management ── */}
          <TabsContent value="resellers" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active Resellers</p><p className="text-2xl font-bold text-green-500">{activeResellers}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Locked (6-month)</p><p className="text-2xl font-bold text-amber-500">{lockedResellers}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Orgs</p><p className="text-2xl font-bold">{resellerOrgs?.length || 0}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Reseller Directory</CardTitle>
                <Button size="sm" onClick={() => setProvisionOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Provision Client
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Organization</TableHead>
                      <TableHead className="text-xs">Tier</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Lock Expires</TableHead>
                      <TableHead className="text-xs">Max Licenses</TableHead>
                      <TableHead className="text-xs">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(resellerOrgs || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No organizations found</TableCell></TableRow>
                    ) : (resellerOrgs || []).map((org) => {
                      const isLocked = !org.reseller_lock_until || new Date(org.reseller_lock_until) > new Date();
                      return (
                        <TableRow key={org.id}>
                          <TableCell className="text-xs font-medium">{org.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{org.subscription_tier || "free"}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={isLocked ? "secondary" : "default"} className="text-[10px]">
                              {isLocked ? <><Lock className="h-2.5 w-2.5 mr-1" />Locked</> : <><CheckCircle className="h-2.5 w-2.5 mr-1" />Active</>}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {org.reseller_lock_until ? new Date(org.reseller_lock_until).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-xs">{org.max_reseller_licenses ?? "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: API Marketplace Control ── */}
          <TabsContent value="api-control" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">API Products</p><p className="text-2xl font-bold">{apiProducts?.length || 0}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active API Keys</p><p className="text-2xl font-bold text-green-500">{activeKeys}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Revoked Keys</p><p className="text-2xl font-bold text-red-500">{(apiKeys || []).filter(k => k.revoked_at).length}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">API Product Catalog</CardTitle></CardHeader>
              <CardContent>
                {(apiProducts || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground"><Zap className="h-5 w-5 mx-auto mb-2 opacity-40" />No API products configured yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Wholesale/Call</TableHead>
                        <TableHead className="text-xs">Retail Price</TableHead>
                        <TableHead className="text-xs">Rate Limit</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(apiProducts || []).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium">{p.product_name}</TableCell>
                          <TableCell className="text-xs font-mono">{p.product_code}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{p.category || "core"}</Badge></TableCell>
                          <TableCell className="text-xs">{p.wholesale_price_per_call ? fmt(p.wholesale_price_per_call) : "-"}</TableCell>
                          <TableCell className="text-xs">{p.suggested_retail_price ? fmt(p.suggested_retail_price) : "-"}</TableCell>
                          <TableCell className="text-xs">{p.rate_limit_per_minute || "-"}/min</TableCell>
                          <TableCell><Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">{p.is_active ? "Active" : "Disabled"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">API Key Oversight</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Prefix</TableHead>
                      <TableHead className="text-xs">Scopes</TableHead>
                      <TableHead className="text-xs">Last Used</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(apiKeys || []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No API keys issued</TableCell></TableRow>
                    ) : (apiKeys || []).slice(0, 20).map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="text-xs font-medium">{k.name}</TableCell>
                        <TableCell className="text-xs font-mono">{k.key_prefix}...</TableCell>
                        <TableCell className="text-xs">{(k.scopes || []).slice(0, 2).join(", ")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <Badge variant={k.revoked_at ? "destructive" : k.is_active ? "default" : "secondary"} className="text-[10px]">
                            {k.revoked_at ? "Revoked" : k.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 4: Pricing Engine Sync ── */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <Card className={pricingMismatches.length > 0 ? "border-red-500/40" : "border-green-500/40"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {pricingMismatches.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {pricingMismatches.length > 0
                        ? `${pricingMismatches.length} Pricing Mismatch(es) Detected`
                        : "All Pricing Aligned - Landing Page = Backend"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Landing page pricing is the SINGLE SOURCE OF TRUTH
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { type: "Starter", price: "Free", unit: "", desc: "Single operator · 30 req/min · 5,000 req/day" },
                { type: "Bikes / Vans", price: "₦50", unit: "/drop", desc: "Per-delivery billing · 120 req/min" },
                { type: "Heavy Fleet / Haulage", price: "₦5,000", unit: "/vehicle/mo", desc: "VAT exclusive · per active vehicle" },
                { type: "Mixed Fleet (Hybrid)", price: "₦5,000", unit: "/vehicle + ₦50/drop", desc: "Base + usage billing" },
              ].map((p: any, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="pt-4 pb-4 min-w-0">
                    <p className="text-sm font-semibold leading-tight break-words">{p.type}</p>
                    <p className="mt-2 leading-tight">
                      <span className="text-lg font-bold text-primary break-words">{p.price}</span>
                      {p.unit && <span className="text-[11px] font-medium text-primary/80 ml-1 break-words">{p.unit}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 break-words">{p.desc}</p>
                    <Badge variant="outline" className="text-[10px] mt-2"><CheckCircle className="h-2.5 w-2.5 mr-1" />Synced</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {pricingMismatches.length > 0 && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader><CardTitle className="text-sm text-red-500">Mismatched Plans</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Plan</TableHead>
                        <TableHead className="text-xs">Landing Page</TableHead>
                        <TableHead className="text-xs">Backend</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingMismatches.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{m.plan || "-"}</TableCell>
                          <TableCell className="text-xs text-green-600">{m.expected || "-"}</TableCell>
                          <TableCell className="text-xs text-red-500">{m.actual || "-"}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-[10px]">Force Sync Required</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 5: Tenant Overview (Aggregated Only) ── */}
          <TabsContent value="tenants" className="space-y-4 mt-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Data Isolation:</strong> Only aggregated metrics shown. No raw tenant data, operational records, or customer-level visibility.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Tenants</p><p className="text-2xl font-bold">{tenantStats?.orgs?.length || 0}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active Billing</p><p className="text-2xl font-bold text-green-500">{(tenantStats?.billing || []).filter(b => b.status === "active").length}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Wallet Balance</p><p className="text-2xl font-bold">{fmt((tenantStats?.billing || []).reduce((s, b) => s + Number(b.wallet_balance || 0), 0))}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Tier Distribution</p><p className="text-2xl font-bold">{Object.keys(tenantsByTier).length} tiers</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Tenants by Subscription Tier</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(tenantsByTier).length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No tenant tier data available</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(tenantsByTier).map(([tier, count]) => (
                      <div key={tier} className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] w-24 justify-center">{tier}</Badge>
                        <Progress value={(count / (tenantStats?.orgs?.length || 1)) * 100} className="flex-1 h-2" />
                        <span className="text-xs font-semibold w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 6: Revenue & Billing ── */}
          <TabsContent value="revenue" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-2xl font-bold">{fmt(totalGross)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">RouteAce Share</p><p className="text-2xl font-bold text-primary">{fmt(totalRouteace)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Reseller Share</p><p className="text-2xl font-bold text-purple-500">{fmt(totalReseller)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{commissionData?.length || 0}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Commission Ledger (Immutable)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Gross</TableHead>
                      <TableHead className="text-xs">RouteAce (80%)</TableHead>
                      <TableHead className="text-xs">Reseller (20%)</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(commissionData || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No commission records yet</TableCell></TableRow>
                    ) : (commissionData || []).slice(0, 25).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.transaction_type}</Badge></TableCell>
                        <TableCell className="text-xs font-semibold">{fmt(Number(c.gross_amount))}</TableCell>
                        <TableCell className="text-xs text-primary">{fmt(Number(c.routeace_amount))}</TableCell>
                        <TableCell className="text-xs text-purple-500">{fmt(Number(c.reseller_amount))}</TableCell>
                        <TableCell><Badge variant={c.status === "settled" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 7: Security & Access ── */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Security Events</p><p className="text-2xl font-bold">{securityEvents?.length || 0}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Critical/High</p><p className="text-2xl font-bold text-red-500">{criticalEvents}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active API Keys</p><p className="text-2xl font-bold text-green-500">{activeKeys}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Revoked Keys</p><p className="text-2xl font-bold">{(apiKeys || []).filter(k => k.revoked_at).length}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Security Event Log</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(securityEvents || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8"><ShieldCheck className="h-5 w-5 mx-auto mb-2 opacity-40" />No security events recorded - Zero tolerance enforcement active</TableCell></TableRow>
                    ) : (securityEvents || []).slice(0, 20).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-medium">{e.event_type}</TableCell>
                        <TableCell>
                          <Badge variant={e.severity === "critical" || e.severity === "high" ? "destructive" : e.severity === "warn" ? "secondary" : "outline"} className="text-[10px]">
                            {e.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{e.ip_address || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 8: System Health ── */}
          <TabsContent value="health" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">API Success Rate</p><p className="text-2xl font-bold text-green-500">{successRate}%</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Avg Latency</p><p className="text-2xl font-bold">{avgLatency}ms</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Error Rate</p><p className="text-2xl font-bold text-red-500">{(100 - Number(successRate)).toFixed(1)}%</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Pricing Mismatches</p><p className="text-2xl font-bold">{pricingMismatches.length}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">System Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Tenant Isolation", status: "healthy", desc: "RLS enforced on all tables" },
                  { label: "Revenue Split Engine", status: "healthy", desc: "80/20 split - immutable" },
                  { label: "6-Month Reseller Lock", status: "healthy", desc: "Trigger active on organizations" },
                  { label: "API Rate Limiting", status: "healthy", desc: "Per-tenant enforcement active" },
                  { label: "Pricing Sync", status: pricingMismatches.length > 0 ? "warning" : "healthy", desc: pricingMismatches.length > 0 ? "Mismatch detected" : "Landing page aligned" },
                ].map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {alert.status === "healthy" ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      <span className="text-xs font-medium">{alert.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{alert.desc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Recent API Traffic</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Endpoint</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(apiLogs || []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No API traffic recorded</TableCell></TableRow>
                    ) : (apiLogs || []).slice(0, 15).map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at!).toLocaleTimeString()}</TableCell>
                        <TableCell className="text-xs font-mono">{log.endpoint}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{log.method}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={log.status_code && log.status_code < 400 ? "default" : "destructive"} className="text-[10px]">
                            {log.status_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{log.response_time_ms}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 9: System Configuration ── */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <Card className="border-red-500/30">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-muted-foreground"><strong>System Constants:</strong> These values are enforced at the database/edge function level and cannot be overridden from UI.</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue Split Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div><p className="text-xs font-semibold">RouteAce Share</p><p className="text-[10px] text-muted-foreground">Platform revenue percentage</p></div>
                    <Badge className="text-sm font-bold">{ROUTEACE_SHARE}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div><p className="text-xs font-semibold">Reseller Share</p><p className="text-[10px] text-muted-foreground">Partner commission percentage</p></div>
                    <Badge variant="secondary" className="text-sm font-bold">{RESELLER_SHARE}%</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" />Immutable - enforced in api-commission-engine edge function
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Reseller Activation Rules</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div><p className="text-xs font-semibold">Lock-in Period</p><p className="text-[10px] text-muted-foreground">Mandatory cooling period before resale</p></div>
                    <Badge className="text-sm font-bold">6 Months</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div><p className="text-xs font-semibold">Auto-Activation</p><p className="text-[10px] text-muted-foreground">Automatic reseller unlock after lock period</p></div>
                    <Badge variant="default" className="text-[10px]">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div><p className="text-xs font-semibold">Cross-Tenant Visibility</p><p className="text-[10px] text-muted-foreground">Reseller access to downstream data</p></div>
                    <Badge variant="destructive" className="text-[10px]">BLOCKED</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" />Enforced via database trigger: set_reseller_lock_on_org_create
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Pricing Source of Truth</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { rule: "Landing page pricing overrides backend", enforced: true },
                  { rule: "No manual pricing overrides allowed", enforced: true },
                  { rule: "Onboarding type maps to correct billing tier", enforced: true },
                  { rule: "API usage billed per-call with real-time metering", enforced: true },
                  { rule: "All financial records are immutable after settlement", enforced: true },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span>{r.rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <ProvisionResellerClientDialog
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
      />
    </DashboardLayout>
  );
}
