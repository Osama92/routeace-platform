import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useFleetCCC } from "@/hooks/useFleetCCC";
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Wallet, BarChart3, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Zap, Target, Shield, RefreshCw, Download,
  Lightbulb, Gauge, ArrowRight, CheckCircle, Info
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";

const formatCurrency = (val: number) => {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toFixed(0)}`;
};

const CCCGauge = ({ value, isNegative }: { value: number; isNegative: boolean }) => {
  const gaugeColor = isNegative ? "text-[hsl(var(--success))]" : value < 20 ? "text-primary" : value < 40 ? "text-[hsl(var(--warning))]" : "text-destructive";
  return (
    <div className="flex flex-col items-center">
      <div className={`text-6xl font-bold ${gaugeColor} font-heading`}>
        {isNegative && "−"}{Math.abs(value)}
      </div>
      <p className="text-sm text-muted-foreground mt-1">days</p>
      {isNegative && (
        <Badge variant="default" className="mt-2 bg-[hsl(var(--success))] text-white">
          <Zap className="w-3 h-3 mr-1" /> Supplier-Financed
        </Badge>
      )}
    </div>
  );
};

const MetricTile = ({ label, value, unit, icon: Icon, trend, subtitle }: {
  label: string; value: number; unit: string; icon: any; trend?: string; subtitle?: string;
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <p className="text-2xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trend === "good" ? "text-[hsl(var(--success))]" : trend === "poor" ? "text-destructive" : "text-[hsl(var(--warning))]"}`}>
            {trend === "good" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            {trend === "good" ? "Optimal" : trend === "poor" ? "Needs attention" : "Fair"}
          </p>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const FleetCCCDashboard = () => {
  const { data, isLoading, refetch, isRefetching } = useFleetCCC();
  const [activeTab, setActiveTab] = useState("overview");

  // Fallback data when loading or no data
  const ccc = data?.ccc ?? { value: 0, isNegative: false, trend: "fair" };
  const dso = data?.dso ?? { value: 0, totalAR: 0, arAging: { current: 0, days30: 0, days60: 0, days90plus: 0 } };
  const dpo = data?.dpo ?? { value: 0, totalAP: 0, byCategory: {} };
  const dio = data?.dio ?? { value: 0, avgInventory: 0 };
  const liquidityScore = data?.liquidityScore ?? 0;
  const benchmark = data?.benchmark ?? { regionalAvg: 32, advantage: 0, advantageLabel: "-" };
  const trend = data?.trend ?? [];
  const recommendations = data?.recommendations ?? [];
  const revenue = data?.revenue ?? { total: 0, cogs: 0 };

  return (
    <DashboardLayout title="Fleet Financial Intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Gauge className="w-6 h-6 text-primary" />
              Fleet Financial Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">Cash Conversion Cycle analytics · Working capital optimization</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <ExportDropdown options={{
              title: "Fleet CCC Report",
              columns: [
                { key: "metric", label: "Metric" },
                { key: "value", label: "Value" },
                { key: "status", label: "Status" },
              ],
              data: [
                { metric: "CCC", value: `${ccc.isNegative ? "-" : ""}${ccc.value} days`, status: ccc.trend },
                { metric: "DSO", value: `${dso.value} days`, status: dso.value < 30 ? "good" : "fair" },
                { metric: "DPO", value: `${dpo.value} days`, status: dpo.value > 30 ? "good" : "fair" },
                { metric: "DIO", value: `${dio.value} days`, status: dio.value < 15 ? "good" : "fair" },
                { metric: "Liquidity Score", value: `${liquidityScore}%`, status: liquidityScore > 70 ? "good" : "fair" },
                { metric: "Revenue", value: formatCurrency(revenue.total), status: "-" },
              ],
            }} />
          </div>
        </div>

        {/* CCC Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cash Conversion Cycle</CardTitle>
              <CardDescription>DSO + DIO − DPO</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <CCCGauge value={ccc.value} isNegative={ccc.isNegative} />
              {ccc.isNegative && (
                <p className="text-xs text-center text-muted-foreground mt-3 max-w-xs">
                  Your fleet is operating on supplier-financed cash flow - this is institutional-grade performance.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">CCC Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="ccc" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="CCC" />
                  <Area type="monotone" dataKey="dso" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="DSO" />
                  <Area type="monotone" dataKey="dpo" stroke="hsl(var(--success))" fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="DPO" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricTile label="DSO" value={dso.value} unit="days" icon={Clock} trend={dso.value < 30 ? "good" : dso.value < 45 ? "fair" : "poor"} subtitle="Client payment speed" />
          <MetricTile label="DPO" value={dpo.value} unit="days" icon={Wallet} trend={dpo.value > 30 ? "good" : dpo.value > 15 ? "fair" : "poor"} subtitle="Supplier payment cycle" />
          <MetricTile label="DIO" value={dio.value} unit="days" icon={BarChart3} trend={dio.value < 15 ? "good" : dio.value < 30 ? "fair" : "poor"} subtitle="Parts inventory holding" />
          <MetricTile label="Liquidity Score" value={liquidityScore} unit="/100" icon={Gauge} trend={liquidityScore > 70 ? "good" : liquidityScore > 40 ? "fair" : "poor"} subtitle="Fleet financial health" />
          <MetricTile label="vs Regional Avg" value={benchmark.advantage} unit="days" icon={Target} trend={benchmark.advantage > 0 ? "good" : "poor"} subtitle={benchmark.advantageLabel} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Working Capital</TabsTrigger>
            <TabsTrigger value="receivables">Receivables (DSO)</TabsTrigger>
            <TabsTrigger value="payables">Payables (DPO)</TabsTrigger>
            <TabsTrigger value="optimization">AI Optimization</TabsTrigger>
            <TabsTrigger value="policies">Credit Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue vs Receivables</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="font-medium">{formatCurrency(revenue.total)}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Outstanding AR</span>
                        <span className="font-medium">{formatCurrency(dso.totalAR)}</span>
                      </div>
                      <Progress value={revenue.total > 0 ? (dso.totalAR / revenue.total) * 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">COGS / Expenses</span>
                        <span className="font-medium">{formatCurrency(revenue.cogs)}</span>
                      </div>
                      <Progress value={revenue.total > 0 ? (revenue.cogs / revenue.total) * 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Supplier Obligations</span>
                        <span className="font-medium">{formatCurrency(dpo.totalAP)}</span>
                      </div>
                      <Progress value={revenue.total > 0 ? (dpo.totalAP / revenue.total) * 100 : 0} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">CCC Components Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[
                      { name: "DSO", value: dso.value, fill: "hsl(var(--destructive))" },
                      { name: "DIO", value: dio.value, fill: "hsl(var(--warning))" },
                      { name: "DPO", value: dpo.value, fill: "hsl(var(--success))" },
                      { name: "CCC", value: ccc.value, fill: "hsl(var(--primary))" },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Benchmark Card */}
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="py-4 flex items-center gap-4">
                <Target className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Pan-African Fleet Benchmark</p>
                  <p className="text-xs text-muted-foreground">
                    Your CCC is <span className="font-bold text-foreground">{benchmark.advantageLabel}</span> than the regional fleet average of {benchmark.regionalAvg} days.
                    {benchmark.advantage > 0 && " This positions your fleet in the top performance tier."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receivables" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-xl font-bold text-[hsl(var(--success))]">{formatCurrency(dso.arAging.current)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">1–30 Days</p>
                  <p className="text-xl font-bold text-[hsl(var(--warning))]">{formatCurrency(dso.arAging.days30)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">31–60 Days</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(dso.arAging.days60)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">90+ Days</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(dso.arAging.days90plus)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Collection Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {dso.value > 45
                    ? `DSO of ${dso.value} days is above the 45-day threshold. Implement automated collection reminders and consider early-payment discounts.`
                    : dso.value > 30
                    ? `DSO of ${dso.value} days is acceptable but can be improved. Review clients exceeding 30-day terms.`
                    : `DSO of ${dso.value} days indicates strong collection discipline. Maintain current processes.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payables" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Supplier Credit Utilization</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dpo.byCategory).length > 0 ? (
                      Object.entries(dpo.byCategory).map(([cat, info]) => (
                        <div key={cat} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-sm capitalize">{cat}</p>
                            <p className="text-xs text-muted-foreground">{info.count} suppliers</p>
                          </div>
                          <span className="font-semibold text-sm">{formatCurrency(info.total)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No supplier category data available yet. Add expense categories to see breakdowns.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">DPO Intelligence</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                      <p className="text-sm font-medium">Current DPO: {dpo.value} days</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dpo.value > 30
                          ? "Supplier credit float is strong. You're retaining cash longer before paying suppliers."
                          : "Consider negotiating extended payment terms with key suppliers to improve cash position."}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">Optimal DPO Target</p>
                      <p className="text-lg font-bold text-primary">30–45 days</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">Total AP Outstanding</p>
                      <p className="text-lg font-bold">{formatCurrency(dpo.totalAP)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full hover:border-primary/20 transition-colors">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={rec.impact === "high" ? "destructive" : rec.impact === "medium" ? "secondary" : "default"} className="text-xs">
                          {rec.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">{rec.category}</Badge>
                      </div>
                      <h3 className="font-semibold text-sm mt-2">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                        <Lightbulb className="w-3 h-3" />
                        <span>Est. improvement: {rec.estimatedImprovement}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Credit Policy Configuration</CardTitle>
                <CardDescription>Define credit terms for clients and suppliers to optimize your CCC.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Client Credit Days", value: "30 days", desc: "Maximum payment terms offered to clients" },
                    { label: "Fuel Supplier Credit", value: "45 days", desc: "Credit terms with fuel providers" },
                    { label: "Maintenance Credit", value: "30 days", desc: "Credit terms for maintenance vendors" },
                    { label: "Spare Parts Credit", value: "60 days", desc: "Credit terms for parts suppliers" },
                    { label: "Tire Supplier Credit", value: "90 days", desc: "Credit terms for tire providers" },
                    { label: "Fuel Credit Limit", value: "₦5M", desc: "Maximum fuel credit exposure" },
                  ].map((policy) => (
                    <div key={policy.label} className="p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{policy.label}</p>
                        <Badge variant="outline">{policy.value}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{policy.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="py-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Trade Finance Integration</p>
                  <p className="text-xs text-muted-foreground">
                    Fleet operators with strong CCC performance receive better financing offers, higher credit limits, and lower interest rates through the RouteAce Trade Finance Network.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Finance Alert Strip */}
        {(dso.value > 45 || dio.value > 30 || ccc.value > 40) && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Financial Health Alert</p>
                <p className="text-xs text-muted-foreground">
                  {dso.value > 45 && `Receivables at ${dso.value} days exceed threshold. `}
                  {dio.value > 30 && `Inventory holding at ${dio.value} days is too high. `}
                  {ccc.value > 40 && `CCC of ${ccc.value} days indicates slow cash conversion.`}
                </p>
              </div>
              <Button size="sm" variant="outline">View Actions</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FleetCCCDashboard;
