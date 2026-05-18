import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Users, TrendingUp, Target, Globe, Zap,
  ArrowUpRight, ArrowDownRight, Building2, Truck, ShoppingCart,
  Network, BarChart3, DollarSign, RefreshCw, UserPlus
} from "lucide-react";
import { useGrowthMetrics } from "@/hooks/useGrowthMetrics";
import ExportDropdown from "@/components/analytics/ExportDropdown";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
  return `₦${v.toFixed(0)}`;
};

const GROWTH_LOOPS = [
  {
    id: "logistics",
    title: "Logistics Density Loop",
    icon: Truck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "More fleets → more deliveries → better data → better routing → attracts more fleets",
    signal: "Fleet & driver onboarding drives capacity growth",
  },
  {
    id: "distribution",
    title: "Distribution Liquidity Loop",
    icon: ShoppingCart,
    color: "text-green-500",
    bg: "bg-green-500/10",
    description: "More retailers → more demand → more distributors → faster fulfillment",
    signal: "Customer & order growth fuels marketplace liquidity",
  },
  {
    id: "data",
    title: "Data Intelligence Loop",
    icon: BarChart3,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "More usage → better AI → better decisions → better outcomes → more users",
    signal: "Every dispatch improves route & demand predictions",
  },
  {
    id: "revenue",
    title: "Revenue Flywheel",
    icon: DollarSign,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "More transactions → more revenue → more product investment → more value",
    signal: "Revenue growth enables rapid feature expansion",
  },
];

const EXPANSION_PHASES = [
  {
    phase: "Phase 1",
    title: "Beachhead - Lagos & Key Cities",
    targets: ["Logistics companies", "FMCG distributors", "Haulage operators"],
    status: "active",
  },
  {
    phase: "Phase 2",
    title: "Network Expansion",
    targets: ["Retailers", "Manufacturers", "Regional distributors"],
    status: "upcoming",
  },
  {
    phase: "Phase 3",
    title: "Infrastructure Layer",
    targets: ["API resellers", "Embedded commerce", "Trade finance partners"],
    status: "planned",
  },
  {
    phase: "Phase 4",
    title: "Continental Scale",
    targets: ["Pan-African corridors", "Cross-border trade", "Diaspora commerce"],
    status: "planned",
  },
];

export default function GTMGrowthEngine() {
  const m = useGrowthMetrics();

  const kpis = [
    { label: "Total Businesses", value: m.totalBusinesses, icon: Building2, color: "text-primary" },
    { label: "Active Users", value: m.activeUsers, icon: Users, color: "text-blue-500" },
    { label: "New This Month", value: m.newUsersThisMonth, icon: UserPlus, color: "text-green-500", change: m.userGrowthRate },
    { label: "Total Revenue", value: formatCurrency(m.totalInvoiceRevenue), icon: DollarSign, color: "text-amber-500", change: m.revenueGrowthRate },
    { label: "Dispatches", value: m.totalDispatches, icon: Truck, color: "text-purple-500" },
    { label: "Viral Coefficient", value: m.viralCoefficient.toFixed(2), icon: Network, color: "text-pink-500" },
  ];

  const exportData = kpis.map(k => ({
    Metric: k.label,
    Value: typeof k.value === "number" ? k.value : k.value,
    ...(k.change !== undefined ? { "Growth %": k.change } : {}),
  }));

  if (m.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-7 h-7 text-primary" />
            Go-To-Market Growth Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Acquire, activate, monetize, and retain businesses at scale
          </p>
        </div>
        <ExportDropdown options={{ data: exportData, columns: [{ key: "Metric", label: "Metric" }, { key: "Value", label: "Value" }], title: "Growth Metrics Report", filename: "gtm-growth-metrics" }} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                {kpi.change !== undefined && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${kpi.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.change)}% vs last month
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="loops" className="space-y-4">
        <TabsList>
          <TabsTrigger value="loops">Growth Loops</TabsTrigger>
          <TabsTrigger value="plg">PLG Funnel</TabsTrigger>
          <TabsTrigger value="expansion">Expansion Phases</TabsTrigger>
          <TabsTrigger value="channels">Distribution Channels</TabsTrigger>
        </TabsList>

        {/* Growth Loops */}
        <TabsContent value="loops">
          <div className="grid md:grid-cols-2 gap-4">
            {GROWTH_LOOPS.map((loop, i) => (
              <motion.div key={loop.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${loop.bg}`}>
                        <loop.icon className={`w-5 h-5 ${loop.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{loop.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{loop.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-3 rounded-lg ${loop.bg} border border-border`}>
                      <p className="text-xs text-muted-foreground">Live Signal</p>
                      <p className="text-sm font-medium mt-1">{loop.signal}</p>
                      {loop.id === "logistics" && (
                        <p className="text-xs font-semibold mt-1">{m.totalVehicles} vehicles • {m.totalDrivers} drivers</p>
                      )}
                      {loop.id === "distribution" && (
                        <p className="text-xs font-semibold mt-1">{m.totalCustomers} customers</p>
                      )}
                      {loop.id === "data" && (
                        <p className="text-xs font-semibold mt-1">{m.totalDispatches} dispatches processed</p>
                      )}
                      {loop.id === "revenue" && (
                        <p className="text-xs font-semibold mt-1">{formatCurrency(m.totalInvoiceRevenue)} total revenue</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* PLG Funnel */}
        <TabsContent value="plg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Product-Led Growth Funnel
              </CardTitle>
              <CardDescription>Real conversion metrics from signup to revenue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { stage: "Signups", count: m.activeUsers, pct: 100 },
                { stage: "Fleet/Order Created", count: m.totalVehicles + m.totalCustomers, pct: m.activeUsers > 0 ? Math.round((m.totalVehicles + m.totalCustomers) / m.activeUsers * 100) : 0 },
                { stage: "First Dispatch", count: m.totalDispatches > 0 ? Math.min(m.activeUsers, m.totalDispatches) : 0, pct: m.activeUsers > 0 ? Math.min(100, Math.round(m.totalDispatches / m.activeUsers * 100)) : 0 },
                { stage: "Revenue Generated", count: m.totalInvoiceRevenue > 0 ? 1 : 0, pct: m.totalInvoiceRevenue > 0 ? Math.min(100, Math.round(m.revenueThisMonth / Math.max(1, m.totalInvoiceRevenue) * 100)) : 0 },
              ].map((step, i) => (
                <div key={step.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{step.stage}</span>
                    <span className="text-muted-foreground">{step.count} ({step.pct}%)</span>
                  </div>
                  <Progress value={step.pct} className="h-2" />
                </div>
              ))}

              {m.activeUsers === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No users yet - share your signup link to start tracking the funnel</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expansion Phases */}
        <TabsContent value="expansion">
          <div className="grid md:grid-cols-2 gap-4">
            {EXPANSION_PHASES.map((phase, i) => (
              <motion.div key={phase.phase} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className={phase.status === "active" ? "border-primary/40" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{phase.phase}: {phase.title}</CardTitle>
                      <Badge variant={phase.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {phase.status === "active" ? "Active" : phase.status === "upcoming" ? "Next" : "Planned"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.targets.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Distribution Channels */}
        <TabsContent value="channels">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Product-Led Growth",
                icon: Zap,
                color: "text-primary",
                items: ["Self-serve onboarding", "Free tier → paid conversion", "Usage-based upgrade triggers", "In-app activation guides"],
              },
              {
                title: "Network Expansion",
                icon: Network,
                color: "text-green-500",
                items: ["Fleet invite system", "Distributor referrals", "Customer invitations", "Partner fleet sharing"],
              },
              {
                title: "Partner & Reseller",
                icon: Globe,
                color: "text-purple-500",
                items: ["API reseller program", "White-label licensing", "Commission-based onboarding", "Consultant partnerships"],
              },
            ].map((ch, i) => (
              <motion.div key={ch.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ch.icon className={`w-5 h-5 ${ch.color}`} />
                      {ch.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ch.items.map(item => (
                        <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
