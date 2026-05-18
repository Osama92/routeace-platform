/**
 * BillingEngine - Unified billing & revenue orchestration dashboard.
 * Shows real-time usage, running costs, invoices, and revenue metrics.
 */
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Truck, Zap, Globe, TrendingUp, DollarSign,
  FileText, ArrowDownRight, ArrowUpRight, CreditCard, Activity,
} from "lucide-react";
import { useBillingEngine } from "@/hooks/useBillingEngine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(262 83% 58%)", "hsl(38 92% 50%)"];

export default function BillingEngine() {
  const { plans, usageEvents, invoices, revenueSnapshots, metrics, isLoading } = useBillingEngine();

  if (isLoading) {
    return (
      <DashboardLayout title="Billing Engine" subtitle="Revenue orchestration">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const usagePieData = [
    { name: "Drops", value: metrics.dropCostMTD },
    { name: "API Calls", value: metrics.apiCostMTD },
    { name: "Subscription", value: metrics.subscriptionCost },
  ].filter((d) => d.value > 0);

  const revenueChartData = revenueSnapshots.slice(0, 12).reverse().map((s) => ({
    date: s.snapshotDate,
    revenue: s.totalRevenue,
    mrr: s.mrr,
  }));

  const kpis = [
    { label: "Running Cost (MTD)", value: metrics.totalRunningCost, icon: DollarSign, format: "currency" },
    { label: "Drops This Month", value: metrics.dropsThisMonth, icon: Truck, format: "number" },
    { label: "API Calls", value: metrics.apiCallsThisMonth, icon: Globe, format: "number" },
    { label: "Est. Month-End", value: metrics.estimatedMonthEnd, icon: TrendingUp, format: "currency" },
  ];

  const hasNGN = metrics.dropCostMTD > 100; // heuristic
  const currencySymbol = hasNGN ? "₦" : "$";
  const fmt = (v: number) => `${currencySymbol}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <DashboardLayout title="Billing Engine" subtitle="Unified billing & revenue orchestration across all OS">
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold">
                    {kpi.format === "currency" ? fmt(kpi.value) : kpi.value.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Savings Banner */}
        {metrics.savings > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="pt-5 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">TCO Savings vs Competitors</p>
                  <p className="text-2xl font-bold text-primary">{fmt(metrics.savings)}</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 text-lg px-4 py-1">
                  {metrics.savingsPercent}% cheaper
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="usage" className="space-y-4">
          <TabsList>
            <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Usage meters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Current Period Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Deliveries (Drops)", value: metrics.dropsThisMonth, cost: metrics.dropCostMTD, icon: Truck },
                    { label: "API Calls", value: metrics.apiCallsThisMonth, cost: metrics.apiCostMTD, icon: Globe },
                    { label: "AI Credits", value: metrics.aiCreditsThisMonth, cost: 0, icon: Zap },
                    { label: "Route Optimizations", value: metrics.routeOptsThisMonth, cost: 0, icon: TrendingUp },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <m.icon className="w-3.5 h-3.5" /> {m.label}
                        </span>
                        <span className="font-medium">{m.value.toLocaleString()}</span>
                      </div>
                      {m.cost > 0 && (
                        <p className="text-xs text-muted-foreground ml-5">Cost: {fmt(m.cost)}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Cost breakdown pie */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Cost Breakdown (MTD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usagePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={usagePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {usagePieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                      No usage recorded yet this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Billing Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Invoice</th>
                          <th className="pb-2 font-medium">Period</th>
                          <th className="pb-2 font-medium text-right">Subscription</th>
                          <th className="pb-2 font-medium text-right">Usage</th>
                          <th className="pb-2 font-medium text-right">API</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-border/50">
                            <td className="py-2.5 font-medium">{inv.invoiceNumber}</td>
                            <td className="py-2.5 text-muted-foreground">{inv.billingPeriod}</td>
                            <td className="py-2.5 text-right">{fmt(inv.subscriptionAmount)}</td>
                            <td className="py-2.5 text-right">{fmt(inv.usageAmount)}</td>
                            <td className="py-2.5 text-right">{fmt(inv.apiAmount)}</td>
                            <td className="py-2.5 text-right font-medium">{fmt(inv.totalAmount)}</td>
                            <td className="py-2.5">
                              <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "outline"} className="text-xs">
                                {inv.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">No billing invoices generated yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "MRR", value: fmt(metrics.mrr), icon: TrendingUp, color: "text-primary" },
                { label: "ARR", value: fmt(metrics.arr), icon: ArrowUpRight, color: "text-primary" },
                { label: "ARPU", value: fmt(metrics.arpu), icon: DollarSign, color: "text-muted-foreground" },
                { label: "Total Revenue", value: fmt(metrics.totalRevenueAllTime), icon: ArrowDownRight, color: "text-primary" },
              ].map((m) => (
                <Card key={m.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <p className="text-lg font-bold">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={revenueChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">Revenue data will appear as billing invoices are generated</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{plan.planName}</CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">{plan.pricingModel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-bold">
                      {plan.currency === "USD" ? "$" : "₦"}{plan.basePrice.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/{plan.billingCycle}</span>
                    </p>
                    {plan.pricePerDrop && (
                      <p className="text-xs text-muted-foreground">
                        + {plan.currency === "USD" ? "$" : "₦"}{plan.pricePerDrop}/drop
                        {plan.includedDrops > 0 && ` (${plan.includedDrops} included)`}
                      </p>
                    )}
                    {plan.pricePerApiCall && (
                      <p className="text-xs text-muted-foreground">
                        + {plan.currency === "USD" ? "$" : "₦"}{plan.pricePerApiCall}/API call
                        {plan.includedApiCalls > 0 && ` (${plan.includedApiCalls.toLocaleString()} included)`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
