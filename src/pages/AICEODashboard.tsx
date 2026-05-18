import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain, TrendingUp, TrendingDown, Shield, Truck, DollarSign,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Zap, Target, BarChart3, Wallet, Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (v: number) => {
  if (v >= 1e9) return `₦${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `₦${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `₦${(v / 1e3).toFixed(0)}K`;
  return `₦${v.toLocaleString()}`;
};

const riskColors: Record<string, string> = {
  low: "bg-green-500/15 text-green-700 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  critical: "bg-red-500/15 text-red-700 border-red-500/30",
};

const modeColors: Record<string, string> = {
  SURVIVAL: "bg-red-500 text-white",
  STABILIZE: "bg-orange-500 text-white",
  HOLD: "bg-yellow-500 text-black",
  GROWTH: "bg-green-500 text-white",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700",
  high: "bg-orange-500/15 text-orange-700",
  medium: "bg-yellow-500/15 text-yellow-700",
  low: "bg-green-500/15 text-green-700",
};

const AICEODashboard = () => {
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ai-ceo-engine"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-ceo-engine");
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const handleExecuteDecision = (decision: any) => {
    toast({
      title: `${decision.action}: ${decision.title}`,
      description: "Decision queued for execution via Autonomous Engine.",
    });
  };

  return (
    <DashboardLayout
      title="AI CEO Command Center"
      subtitle="Autonomous strategic intelligence - real-time business decisions"
    >
      <div className="space-y-6">
        {/* ── Mode + Health Bar ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4">
          {data && (
            <>
              <Badge className={`text-sm px-4 py-1.5 font-bold ${modeColors[data.mode] || modeColors.HOLD}`}>
                {data.mode} MODE
              </Badge>
              <Badge variant="outline" className={riskColors[data.riskLevel] || ""}>
                Risk: {data.riskLevel?.toUpperCase()} ({data.riskScore}/100)
              </Badge>
            </>
          )}
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Intelligence
            </Button>
          </div>
        </div>

        {/* ── AI Narrative ─────────────────────────────── */}
        {data?.aiNarrative && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 flex gap-3">
              <Brain className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{data.aiNarrative}</p>
            </CardContent>
          </Card>
        )}

        {/* ── Health Score + Top KPIs ──────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-primary">{data?.healthScore ?? "-"}</div>
              <Progress value={data?.healthScore || 0} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">Business Health</p>
            </CardContent>
          </Card>
          <KPICard icon={DollarSign} label="Revenue (30d)" value={data ? formatCurrency(data.finance.revenue30d) : "-"}
            trend={data?.finance.revenueGrowth} />
          <KPICard icon={TrendingUp} label="Profit Margin" value={data ? `${data.finance.profitMargin}%` : "-"}
            trend={data?.finance.profitMargin > 15 ? 1 : -1} />
          <KPICard icon={Wallet} label="Cash Runway" value={data ? `${data.finance.cashRunwayDays}d` : "-"}
            trend={data?.finance.cashRunwayDays > 60 ? 1 : -1} />
          <KPICard icon={Truck} label="Fleet Utilization" value={data ? `${data.fleet.utilization}%` : "-"}
            trend={data?.fleet.utilization > 70 ? 1 : -1} />
          <KPICard icon={AlertTriangle} label="Overdue AR" value={data ? formatCurrency(data.finance.overdueReceivables) : "-"}
            trend={data?.finance.overdueReceivables > 0 ? -1 : 1} />
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <Tabs defaultValue="decisions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="decisions" className="gap-2"><Zap className="w-4 h-4" />CEO Decisions</TabsTrigger>
            <TabsTrigger value="finance" className="gap-2"><DollarSign className="w-4 h-4" />Finance</TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2"><Truck className="w-4 h-4" />Fleet</TabsTrigger>
            <TabsTrigger value="risk" className="gap-2"><Shield className="w-4 h-4" />Risk</TabsTrigger>
          </TabsList>

          {/* ── Decisions Tab ──────────────────────────── */}
          <TabsContent value="decisions" className="space-y-4">
            {isLoading ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                Analyzing business data...
              </CardContent></Card>
            ) : !data?.decisions?.length ? (
              <Card><CardContent className="py-12 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                <p className="font-medium">No urgent decisions required</p>
                <p className="text-sm text-muted-foreground">Business operating within optimal parameters</p>
              </CardContent></Card>
            ) : (
              data.decisions.map((d: any, i: number) => (
                <Card key={i} className="border-l-4" style={{ borderLeftColor: d.priority === "critical" ? "rgb(239,68,68)" : d.priority === "high" ? "rgb(249,115,22)" : d.priority === "medium" ? "rgb(234,179,8)" : "rgb(34,197,94)" }}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={priorityColors[d.priority]}>{d.priority.toUpperCase()}</Badge>
                          <Badge variant="outline" className="text-xs">{d.type.replace(/_/g, " ")}</Badge>
                        </div>
                        <h3 className="font-semibold text-base mt-2">{d.title}</h3>
                        <p className="text-sm text-muted-foreground">{d.description}</p>
                        <p className="text-xs text-primary font-medium mt-1">Impact: {d.impact}</p>
                      </div>
                      <Button size="sm" onClick={() => handleExecuteDecision(d)} className="shrink-0">
                        <Zap className="w-4 h-4 mr-1" />{d.action}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Finance Tab ────────────────────────────── */}
          <TabsContent value="finance">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard label="Revenue (30d)" value={data ? formatCurrency(data.finance.revenue30d) : "-"} sub={`${data?.finance.revenueGrowth > 0 ? "+" : ""}${data?.finance.revenueGrowth || 0}% MoM`} />
              <MetricCard label="Expenses (30d)" value={data ? formatCurrency(data.finance.expenses30d) : "-"} />
              <MetricCard label="Net Profit" value={data ? formatCurrency(data.finance.netProfit30d) : "-"} sub={`${data?.finance.profitMargin || 0}% margin`} />
              <MetricCard label="Cash Inflows" value={data ? formatCurrency(data.finance.cashInflows) : "-"} />
              <MetricCard label="Cash Outflows" value={data ? formatCurrency(data.finance.cashOutflows) : "-"} />
              <MetricCard label="Net Cash Flow" value={data ? formatCurrency(data.finance.netCashFlow) : "-"} />
              <MetricCard label="Overdue Receivables" value={data ? formatCurrency(data.finance.overdueReceivables) : "-"} sub={`${data?.finance.overdueCount || 0} invoices`} />
              <MetricCard label="Outstanding Debt" value={data ? formatCurrency(data.debt.outstandingDebt) : "-"} sub={`D/R ratio: ${data?.debt.debtToRevenueRatio || 0}%`} />
              <MetricCard label="Active Facilities" value={data?.debt.activeFacilities?.toString() || "0"} />
            </div>
          </TabsContent>

          {/* ── Fleet Tab ──────────────────────────────── */}
          <TabsContent value="fleet">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard label="Total Vehicles" value={data?.fleet.totalVehicles?.toString() || "0"} />
              <MetricCard label="Active Vehicles" value={data?.fleet.activeVehicles?.toString() || "0"} />
              <MetricCard label="Idle Vehicles" value={data?.fleet.idleVehicles?.toString() || "0"} />
              <MetricCard label="Fleet Utilization" value={`${data?.fleet.utilization || 0}%`} />
              <MetricCard label="Deployed Rate" value={`${data?.fleet.deployedRate || 0}%`} />
              <MetricCard label="Active Dispatches" value={data?.fleet.activeDispatches?.toString() || "0"} />
              <MetricCard label="Completed Trips (30d)" value={data?.fleet.completedTrips30d?.toString() || "0"} />
              <MetricCard label="Avg Revenue/Trip" value={data ? formatCurrency(data.fleet.avgRevenuePerTrip) : "-"} />
            </div>
          </TabsContent>

          {/* ── Risk Tab ───────────────────────────────── */}
          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{data?.riskScore ?? 0}<span className="text-lg text-muted-foreground">/100</span></div>
                  <Badge className={`text-base px-4 py-1 ${riskColors[data?.riskLevel || "low"]}`}>
                    {data?.riskLevel?.toUpperCase() || "LOW"}
                  </Badge>
                </div>
                <Progress value={data?.riskScore || 0} className="h-3" />
                {data?.riskFactors?.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Active Risk Factors:</p>
                    {data.riskFactors.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <MetricCard label="Open Support Tickets" value={data?.operations.openTickets?.toString() || "0"} sub={`${data?.operations.criticalTickets || 0} critical`} />
              <MetricCard label="Pending Approvals" value={data?.operations.pendingApprovals?.toString() || "0"} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// ── Helper Components ──────────────────────────────────
const KPICard = ({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend?: number }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {trend !== undefined && (
          trend > 0 ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="text-xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

const MetricCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="pt-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

export default AICEODashboard;
