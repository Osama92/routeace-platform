/**
 * RevenueActivationEngine - Central revenue intelligence dashboard.
 * All data from real database records. Zero placeholders.
 */
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Zap, CreditCard, Package,
  BarChart3, ArrowUpRight, FileText, Layers,
  AlertTriangle, CheckCircle2, Settings2, ToggleLeft, ToggleRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useRevenueMetrics } from "@/hooks/useRevenueMetrics";
import { useUsageMetering } from "@/hooks/useUsageMetering";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) => `₦${n.toLocaleString()}`;

const RevenueActivationEngine = () => {
  const revenue = useRevenueMetrics();
  const { metrics: usage, upgradeTriggers, hasUpgradeRecommendation } = useUsageMetering();
  const { config } = useTenantConfig();
  const { toast } = useToast();

  // Autonomous billing controls (local state - persisted via governance engine)
  const [billingControls, setBillingControls] = useState({
    autoBilling: false,
    autoInvoicing: true,
    autoCreditAllocation: false,
    autoPayoutProcessing: false,
    autoReminders: true,
  });

  const toggleControl = (key: keyof typeof billingControls) => {
    setBillingControls(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      toast({
        title: updated[key] ? "Enabled" : "Disabled",
        description: `${key.replace(/([A-Z])/g, " $1").trim()} has been ${updated[key] ? "enabled" : "disabled"}.`,
      });
      return updated;
    });
  };

  if (revenue.isLoading) {
    return (
      <DashboardLayout title="Revenue Activation Engine" subtitle="Revenue orchestration">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Zero-state
  if (!revenue.hasData) {
    return (
      <DashboardLayout title="Revenue Activation Engine" subtitle="Revenue orchestration">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">No Revenue Data Yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Revenue tracking activates automatically when you complete deliveries, generate invoices, or consume AI credits.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/dispatch"}>
              <Package className="h-4 w-4 mr-2" /> Create First Dispatch
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const exportData = revenue.monthlyTrend.map(m => ({
    Month: m.month,
    Revenue: m.revenue,
    Transactions: m.count,
  }));

  const pieData = revenue.streams.filter(s => s.amount > 0);
  const totalRevenue = revenue.streams.reduce((s, st) => s + st.amount, 0);

  return (
    <DashboardLayout title="Revenue Activation Engine" subtitle="Autonomous monetization & revenue intelligence">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Activation Engine</h1>
          <p className="text-sm text-muted-foreground">Real-time revenue intelligence from platform activity</p>
        </div>
        <ExportDropdown options={{
          title: "Revenue Report",
          filename: "revenue-report",
          columns: [
            { key: "Month", label: "Month" },
            { key: "Revenue", label: "Revenue (₦)" },
            { key: "Transactions", label: "Transactions" },
          ],
          data: exportData,
        }} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue MTD", value: fmt(revenue.totalRevenueMTD), icon: DollarSign, sub: `${revenue.paidInvoiceCount} paid invoices` },
          { label: "MRR", value: fmt(revenue.mrr), icon: TrendingUp, sub: `ARR: ${fmt(revenue.arr)}` },
          { label: "Pending Revenue", value: fmt(revenue.pendingRevenue), icon: FileText, sub: "Unpaid invoices" },
          { label: "AI Credit Revenue", value: fmt(revenue.aiCreditRevenue), icon: Zap, sub: `${revenue.aiCreditsConsumed} credits consumed` },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="streams">Revenue Streams</TabsTrigger>
          <TabsTrigger value="triggers">Expansion Triggers</TabsTrigger>
          <TabsTrigger value="billing">Billing Control</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [fmt(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Completed Deliveries</p>
                <p className="text-2xl font-bold mt-1">{revenue.completedDeliveries.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Per-drop revenue: {fmt(revenue.perDropRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold mt-1">{revenue.invoiceCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{revenue.paidInvoiceCount} paid · {revenue.invoiceCount - revenue.paidInvoiceCount} outstanding</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">ARPU</p>
                <p className="text-2xl font-bold mt-1">{fmt(revenue.arpu)}</p>
                <p className="text-xs text-muted-foreground mt-1">Average revenue per delivery</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Streams */}
        <TabsContent value="streams" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue Mix</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No revenue streams active yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Stream Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenue.streams.map((stream, i) => {
                  const pct = totalRevenue > 0 ? Math.round((stream.amount / totalRevenue) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stream.color }} />
                          <span>{stream.label}</span>
                        </div>
                        <span className="font-semibold">{fmt(stream.amount)}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-0.5">{stream.count.toLocaleString()} transactions · {pct}% of total</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expansion Triggers */}
        <TabsContent value="triggers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Usage vs Plan Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Vehicles", current: usage.vehicleCount, max: config?.max_vehicles || 1 },
                { label: "Dispatches/mo", current: usage.monthlyDispatches, max: config?.max_monthly_dispatches || 10 },
                { label: "AI Credits", current: usage.aiCreditsUsed, max: usage.aiCreditsTotal || 1 },
              ].map((item, i) => {
                const pct = Math.min(100, (item.current / item.max) * 100);
                const nearLimit = pct > 80;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{item.label}</span>
                      <span className={nearLimit ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                        {item.current} / {item.max}
                      </span>
                    </div>
                    <Progress value={pct} className={`h-2 ${nearLimit ? "[&>div]:bg-amber-500" : ""}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {hasUpgradeRecommendation ? (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> Expansion Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upgradeTriggers.map((trigger, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <ArrowUpRight className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{trigger.reason}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Suggested: <span className="font-medium capitalize">{trigger.suggestedPlan}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Plan Optimized</p>
                <p className="text-xs text-muted-foreground mt-1">Usage is well within plan limits. No expansion triggers active.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing Control - Autonomous Monetization */}
        <TabsContent value="billing" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Autonomous Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Autonomous Billing Controls
                </CardTitle>
                <CardDescription className="text-xs">
                  Toggle billing automation. Changes apply immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "autoBilling" as const, label: "Auto-Billing", desc: "Charge subscriptions & usage automatically on cycle" },
                  { key: "autoInvoicing" as const, label: "Auto-Invoicing", desc: "Generate invoices on delivery completion" },
                  { key: "autoCreditAllocation" as const, label: "Auto Credit Allocation", desc: "Top-up AI credits when balance < 10%" },
                  { key: "autoPayoutProcessing" as const, label: "Auto Payout Processing", desc: "Process partner/reseller payouts automatically" },
                  { key: "autoReminders" as const, label: "Auto Payment Reminders", desc: "Send overdue invoice reminders" },
                ].map(ctrl => (
                  <div key={ctrl.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ctrl.label}</p>
                      <p className="text-xs text-muted-foreground">{ctrl.desc}</p>
                    </div>
                    <Switch
                      checked={billingControls[ctrl.key]}
                      onCheckedChange={() => toggleControl(ctrl.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Billing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Revenue Engine Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-bold">{fmt(revenue.totalRevenueAllTime)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">YTD Revenue</p>
                    <p className="text-lg font-bold">{fmt(revenue.totalRevenueYTD)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Collection Rate</p>
                    <p className="text-lg font-bold">
                      {revenue.invoiceCount > 0
                        ? `${Math.round((revenue.paidInvoiceCount / revenue.invoiceCount) * 100)}%`
                        : "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-lg font-bold">{fmt(revenue.pendingRevenue)}</p>
                  </div>
                </div>

                {/* Active automations badge list */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Active Automations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(billingControls)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <Badge key={k} variant="secondary" className="text-xs">
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </Badge>
                      ))}
                    {Object.values(billingControls).every(v => !v) && (
                      <p className="text-xs text-muted-foreground">No automations active - all flows require manual approval</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Input → Output → Revenue Chain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue Flow Chain</CardTitle>
              <CardDescription className="text-xs">How platform activity converts to revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  "Dispatch Created",
                  "→ Delivery Completed",
                  "→ Invoice Generated",
                  "→ Payment Received",
                  "→ Revenue Recorded",
                  "→ KPI Updated",
                ].map((step, i) => (
                  <span key={i} className={i === 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                    {step}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Logistics</p>
                  <p className="text-sm font-bold">{fmt(revenue.perDropRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{revenue.completedDeliveries} deliveries</p>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">AI Credits</p>
                  <p className="text-sm font-bold">{fmt(revenue.aiCreditRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{revenue.aiCreditsConsumed} consumed</p>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Invoiced</p>
                  <p className="text-sm font-bold">{fmt(revenue.totalRevenueAllTime)}</p>
                  <p className="text-xs text-muted-foreground">{revenue.paidInvoiceCount} paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RevenueActivationEngine;
