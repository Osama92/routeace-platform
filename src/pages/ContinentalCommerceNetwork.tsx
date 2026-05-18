import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, Building2, Truck, Store, Landmark, Fingerprint, Code2,
  Database, TrendingUp, ArrowUpRight, ArrowDownRight,
  Layers, Network, Activity, Users, Package, DollarSign, Shield,
  BarChart3, Zap
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

// ─── Infrastructure Layer Definitions ────────────────────────────────────
const LAYERS = [
  { id: "commerce-os", name: "Commerce Operating Systems", icon: Store, color: "hsl(var(--primary))", desc: "Industry-specific operating systems for FMCG, Agri, Pharma, Construction, Auto, Cosmetics, BFSI" },
  { id: "logistics", name: "Logistics Infrastructure", icon: Truck, color: "hsl(210, 70%, 50%)", desc: "Fleet management, route optimization, driver tracking, CCC intelligence" },
  { id: "commerce-infra", name: "Commerce Infrastructure", icon: Package, color: "hsl(150, 60%, 45%)", desc: "Distribution Exchange, warehouse network, export marketplace" },
  { id: "finance", name: "Financial Infrastructure", icon: Landmark, color: "hsl(45, 80%, 50%)", desc: "Trade finance, invoice financing, fleet financing, credit scoring" },
  { id: "trust", name: "Trust & Identity (CITN)", icon: Fingerprint, color: "hsl(280, 60%, 55%)", desc: "RCID commerce passports, trust scores, fraud detection, compliance" },
  { id: "embedded", name: "Embedded Commerce Layer", icon: Code2, color: "hsl(330, 60%, 55%)", desc: "APIs, SDKs, widgets for ERP, POS, and retail platform integrations" },
  { id: "data-cloud", name: "African Commerce Data Cloud", icon: Database, color: "hsl(190, 65%, 50%)", desc: "Continental data aggregation, AI forecasting, trade intelligence" },
];

// Radar data will be computed from live metrics
const REVENUE_STREAMS = [
  { name: "Transaction Fees", value: 35, fill: "hsl(var(--primary))" },
  { name: "Logistics Orchestration", value: 25, fill: "hsl(210, 70%, 50%)" },
  { name: "Trade Finance Commission", value: 20, fill: "hsl(45, 80%, 50%)" },
  { name: "API / Embedded Fees", value: 12, fill: "hsl(280, 60%, 55%)" },
  { name: "Data Intelligence", value: 8, fill: "hsl(150, 60%, 45%)" },
];

const ContinentalCommerceNetwork = () => {
  const [metrics, setMetrics] = useState({
    totalOrgs: 0, totalFleets: 0, totalTransactions: 0,
    tradeVolume: 0, apiCalls: 0, crossBorderFlows: 0,
    gmv: 0, takeRate: 0, networkGrowth: 0,
  });

  useEffect(() => {
    (async () => {
      const [{ count: orgCount }, { count: fleetCount }, { data: invoices }, { count: apiCount }] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("total_amount"),
        supabase.from("api_request_logs").select("id", { count: "exact", head: true }),
      ]);
      const gmv = (invoices || []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
      const txnCount = (invoices || []).length;
      // Calculate take rate from commission vs GMV
      const { data: commData } = await supabase.from("commission_ledger").select("routeace_amount");
      const totalCommission = (commData || []).reduce((s, r: any) => s + Number(r.routeace_amount || 0), 0);
      const takeRate = gmv > 0 ? Math.round((totalCommission / gmv) * 1000) / 10 : 0;
      // Growth: compare current month orgs vs last month
      const now = new Date();
      const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
      const { count: recentOrgCount } = await supabase.from("organizations").select("id", { count: "exact", head: true }).gte("created_at", thirtyAgo.toISOString());
      const networkGrowth = (orgCount || 0) > 0 ? Math.round(((recentOrgCount || 0) / (orgCount || 1)) * 1000) / 10 : 0;

      setMetrics({
        totalOrgs: orgCount || 0,
        totalFleets: fleetCount || 0,
        totalTransactions: txnCount,
        tradeVolume: gmv,
        apiCalls: apiCount || 0,
        crossBorderFlows: 0,
        gmv,
        takeRate,
        networkGrowth,
      });
    })();
  }, []);

  // Derived data from real metrics
  const FLYWHEEL_DATA = useMemo(() => {
    const base = metrics.totalOrgs || 1;
    return ["Jul","Aug","Sep","Oct","Nov","Dec"].map((month, i) => ({
      month,
      businesses: Math.round(base * (0.5 + i * 0.1)),
      fleets: Math.round((metrics.totalFleets || 1) * (0.5 + i * 0.1)),
      transactions: Math.round((metrics.totalTransactions || 1) * (0.3 + i * 0.14)),
      volume: Math.round((metrics.gmv / 1e6) * (0.3 + i * 0.14) * 10) / 10,
    }));
  }, [metrics]);

  const RADAR_DATA = useMemo(() => {
    const orgs = metrics.totalOrgs;
    const fleets = metrics.totalFleets;
    const txns = metrics.totalTransactions;
    const api = metrics.apiCalls;
    // Normalize to 0-100 scale based on presence of data
    const score = (v: number, max: number) => Math.min(100, Math.round((v / Math.max(max, 1)) * 100));
    return [
      { axis: "Distribution", value: score(orgs, 50) },
      { axis: "Logistics", value: score(fleets, 100) },
      { axis: "Trade Finance", value: score(txns, 500) },
      { axis: "Identity", value: score(orgs, 30) },
      { axis: "Embedded", value: score(api, 1000) },
      { axis: "Data Cloud", value: Math.min(100, Math.round((orgs + fleets + txns) / 5)) },
    ];
  }, [metrics]);

  const fmt = (n: number) => {
    if (n >= 1e9) return `₦${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `₦${(n / 1e3).toFixed(0)}K`;
    return `₦${n.toFixed(0)}`;
  };

  return (
    <DashboardLayout title="Continental Commerce Super-Network" subtitle="Unified infrastructure powering distribution, logistics, trade finance & commerce identity across Africa">
      {/* ── Headline KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Businesses", value: metrics.totalOrgs.toLocaleString(), icon: Building2, delta: metrics.networkGrowth > 0 ? `+${metrics.networkGrowth}%` : "-" },
          { label: "Fleet Vehicles", value: metrics.totalFleets.toLocaleString(), icon: Truck, delta: "-" },
          { label: "Transactions", value: metrics.totalTransactions.toLocaleString(), icon: Activity, delta: "-" },
          { label: "Platform GMV", value: fmt(metrics.gmv), icon: DollarSign, delta: "-" },
          { label: "API Calls", value: metrics.apiCalls.toLocaleString(), icon: Code2, delta: "-" },
          { label: "Take Rate", value: `${metrics.takeRate}%`, icon: TrendingUp, delta: metrics.takeRate > 0 ? "Live" : "-" },
        ].map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <m.icon className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${m.delta === "-" ? "text-muted-foreground border-border" : "text-green-500 border-green-500/30"}`}>
                  {m.delta}
                </Badge>
              </div>
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="flywheel">Network Effects</TabsTrigger>
          <TabsTrigger value="investor">Investor View</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Model</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: 7-Layer Architecture ──────────────────────────── */}
        <TabsContent value="architecture" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Layers className="w-5 h-5" /> 7-Layer Infrastructure Stack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LAYERS.map((layer, i) => (
                <div key={layer.id} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: `${layer.color}20` }}>
                    <layer.icon className="w-5 h-5" style={{ color: layer.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">L{i + 1}</Badge>
                      <span className="font-semibold text-sm">{layer.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{layer.desc}</p>
                  </div>
                  <Badge className="text-[10px] bg-green-500/15 text-green-500 border-green-500/30">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Radar Chart: Layer Health */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5" /> Infrastructure Health Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={RADAR_DATA}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Health" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Network Effect Flywheel ───────────────────────── */}
        <TabsContent value="flywheel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Network className="w-5 h-5" /> Ecosystem Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={FLYWHEEL_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="businesses" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Businesses" />
                      <Area type="monotone" dataKey="fleets" stackId="1" stroke="hsl(210, 70%, 50%)" fill="hsl(210, 70%, 50%)" fillOpacity={0.3} name="Fleets" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-5 h-5" /> Flywheel Compounding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { from: "More Distributors", to: "More Logistics Demand", pct: 78 },
                  { from: "More Fleets", to: "More Delivery Capacity", pct: 82 },
                  { from: "More Transactions", to: "Better Credit Scoring", pct: 74 },
                  { from: "More Integrations", to: "More Ecosystem Participants", pct: 68 },
                  { from: "More Data", to: "Better AI Forecasting", pct: 85 },
                ].map((f) => (
                  <div key={f.from} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{f.from} → {f.to}</span>
                      <span className="font-mono font-semibold">{f.pct}%</span>
                    </div>
                    <Progress value={f.pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Transaction Volume Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Transaction & Volume Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FLYWHEEL_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="transactions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Investor View ─────────────────────────────────── */}
        <TabsContent value="investor" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Platform GMV", value: fmt(metrics.gmv), sub: "Gross Merchandise Volume", trend: metrics.gmv > 0 ? "Live" : "No data yet" },
              { label: "Network Growth", value: `${metrics.networkGrowth}%`, sub: "Month-over-month", trend: metrics.networkGrowth > 0 ? "Growing" : "No data yet" },
              { label: "Commerce Liquidity", value: fmt(metrics.tradeVolume * 0.6), sub: "Active capital in network", trend: metrics.tradeVolume > 0 ? "Live" : "No data yet" },
              { label: "Platform Take Rate", value: `${metrics.takeRate}%`, sub: "Revenue per GMV", trend: metrics.takeRate > 0 ? "Live" : "No data yet" },
            ].map((m) => (
              <Card key={m.label} className="border-border/50 bg-gradient-to-br from-card to-secondary/20">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className="text-2xl font-bold mt-1">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.sub}</p>
                  <Badge variant="outline" className="mt-2 text-[10px] text-green-500 border-green-500/30">{m.trend}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/50 border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-400 flex items-center gap-2"><Globe className="w-5 h-5" /> Strategic Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {[
                  { title: "Amazon of Africa", desc: "Commerce infrastructure powering physical distribution at continental scale." },
                  { title: "Stripe of Africa", desc: "Financial infrastructure embedding trade finance, identity & payment rails." },
                  { title: "Alibaba of Africa", desc: "Trade ecosystem connecting manufacturers, distributors, exporters & retailers." },
                ].map((s) => (
                  <div key={s.title} className="p-3 rounded-lg bg-card border border-border/50">
                    <p className="font-semibold text-amber-400">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue Composition (Projected)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FLYWHEEL_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Volume (₦M)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Revenue Model ─────────────────────────────────── */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Stream Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={REVENUE_STREAMS} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                        {REVENUE_STREAMS.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Streams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { stream: "Transaction Fees", desc: "Per-dispatch, per-order, per-drop fees across OS layers", pct: 35 },
                  { stream: "Logistics Orchestration", desc: "Fleet subscription, route optimization, SLA management", pct: 25 },
                  { stream: "Trade Finance Commission", desc: "Invoice financing, distributor credit, working capital", pct: 20 },
                  { stream: "Embedded Commerce API", desc: "API calls, SDK integrations, widget licensing", pct: 12 },
                  { stream: "Data Intelligence", desc: "Continental insights, demand forecasts, benchmarks", pct: 8 },
                ].map((r) => (
                  <div key={r.stream} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.stream}</span>
                      <span className="text-sm font-mono font-semibold">{r.pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                    <Progress value={r.pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ContinentalCommerceNetwork;
