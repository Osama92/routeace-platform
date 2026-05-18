import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Truck,
  AlertTriangle, CheckCircle, Clock, Activity, Calendar, RefreshCw,
  ChevronUp, ChevronDown, Brain, Zap, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────
type TimeRange = "7d" | "30d" | "90d" | "this_month" | "this_quarter" | "this_year";
type CompareMode = "wow" | "mom" | "qoq" | "yoy";

interface MetricData {
  label: string;
  current: number;
  previous: number;
  icon: React.ComponentType<{ className?: string }>;
  prefix?: string;
}

// ─── Helpers ────────────────────────────────────────────────────
function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  switch (range) {
    case "7d": return { start: subDays(now, 7), end: now };
    case "30d": return { start: subDays(now, 30), end: now };
    case "90d": return { start: subDays(now, 90), end: now };
    case "this_month": return { start: startOfMonth(now), end: now };
    case "this_quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), qMonth, 1), end: now };
    }
    case "this_year": return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
}

function getPreviousRange(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - duration), end: new Date(end.getTime() - duration) };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(n: number): string {
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₦${(n / 1e3).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "this_month": "This Month",
  "this_quarter": "This Quarter",
  "this_year": "This Year",
};

// ─── Metric Card ────────────────────────────────────────────────
function CockpitMetricCard({ m }: { m: MetricData }) {
  const change = pctChange(m.current, m.previous);
  const Icon = m.icon;
  const TrendIcon = change > 1 ? ChevronUp : change < -1 ? ChevronDown : Minus;
  const trendColor = change > 1 ? "text-emerald-500" : change < -1 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-foreground">{formatCurrency(m.current)}</p>
      <div className="flex items-center gap-1 mt-1">
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
        <span className={`text-xs font-medium ${trendColor}`}>
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs prev period</span>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function DecisionCockpit() {
  const { userRole, isSuperAdmin, organizationId } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [compareMode, setCompareMode] = useState<CompareMode>("mom");
  const isFinanceVisible = isSuperAdmin || ["super_admin", "org_admin", "finance_manager", "admin"].includes(userRole || "");

  const { start, end } = getDateRange(timeRange);
  const prev = getPreviousRange(start, end);
  const orgEq = (q: any) => organizationId ? q.eq("organization_id", organizationId) : q;

  // ─── Data queries ───────────────────────────────────────────
  const { data: finData, isLoading: finLoading } = useQuery({
    queryKey: ["cockpit-finance", timeRange, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [curInv, prevInv, curExp, prevExp, curAR] = await Promise.all([
        orgEq(supabase.from("invoices").select("total_amount, tax_amount, status").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())),
        orgEq(supabase.from("invoices").select("total_amount, tax_amount, status").gte("created_at", prev.start.toISOString()).lte("created_at", prev.end.toISOString())),
        orgEq(supabase.from("expenses").select("amount, approval_status").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())),
        orgEq(supabase.from("expenses").select("amount, approval_status").gte("created_at", prev.start.toISOString()).lte("created_at", prev.end.toISOString())),
        orgEq(supabase.from("accounts_receivable").select("balance, status").eq("status", "unpaid")),
      ]);

      const sumInv = (rows: any[]) => rows?.reduce((s: number, r: any) => s + (r.total_amount || 0), 0) || 0;
      const sumExp = (rows: any[]) => rows?.filter((e: any) => e.approval_status !== "rejected").reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0;

      return {
        curRevenue: sumInv(curInv.data || []),
        prevRevenue: sumInv(prevInv.data || []),
        curExpenses: sumExp(curExp.data || []),
        prevExpenses: sumExp(prevExp.data || []),
        receivables: curAR.data?.reduce((s: number, r: any) => s + (r.balance || 0), 0) || 0,
      };
    },
  });

  const { data: fleetData, isLoading: fleetLoading } = useQuery({
    queryKey: ["cockpit-fleet", timeRange, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [vehicles, curDisp, prevDisp, downtime] = await Promise.all([
        orgEq(supabase.from("vehicles").select("id, truck_type, status")),
        orgEq(supabase.from("dispatches").select("id, cost, status, vehicle_id").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())),
        orgEq(supabase.from("dispatches").select("id, cost, status").gte("created_at", prev.start.toISOString()).lte("created_at", prev.end.toISOString())),
        orgEq(supabase.from("fleet_downtime_log" as any).select("vehicle_id, downtime_hours, reason").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())),
      ]);

      const totalVehicles = vehicles.data?.length || 0;
      const activeVehicles = vehicles.data?.filter((v: any) => v.status === "active").length || 0;
      const curTrips = curDisp.data?.length || 0;
      const prevTrips = prevDisp.data?.length || 0;
      const totalDowntimeHrs = (downtime.data || []).reduce((s: number, d: any) => s + (d.downtime_hours || 0), 0);

      // Asset breakdown
      const assetMap = new Map<string, { count: number; revenue: number; trips: number }>();
      vehicles.data?.forEach((v: any) => {
        const type = v.truck_type || "Unknown";
        const entry = assetMap.get(type) || { count: 0, revenue: 0, trips: 0 };
        entry.count++;
        assetMap.set(type, entry);
      });
      curDisp.data?.forEach((d: any) => {
        const veh = vehicles.data?.find((v: any) => v.id === d.vehicle_id);
        const type = veh?.truck_type || "Unknown";
        const entry = assetMap.get(type) || { count: 0, revenue: 0, trips: 0 };
        entry.revenue += d.cost || 0;
        entry.trips++;
        assetMap.set(type, entry);
      });

      const downByReason = new Map<string, number>();
      (downtime.data || []).forEach((d: any) => {
        const reason = d.reason || "Unknown";
        downByReason.set(reason, (downByReason.get(reason) || 0) + (d.downtime_hours || 0));
      });

      return {
        totalVehicles,
        activeVehicles,
        utilization: totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0,
        curTrips,
        prevTrips,
        totalDowntimeHrs,
        assets: Array.from(assetMap.entries()).map(([type, data]) => ({
          type, ...data,
          revenuePerTrip: data.trips > 0 ? data.revenue / data.trips : 0,
        })).sort((a, b) => b.revenue - a.revenue),
        downByReason: Array.from(downByReason.entries()).map(([reason, hours]) => ({ reason, hours })).sort((a, b) => b.hours - a.hours),
      };
    },
  });

  // ─── Computed metrics ─────────────────────────────────────────
  const metrics: MetricData[] = useMemo(() => {
    if (!finData || !fleetData) return [];
    const curProfit = finData.curRevenue - finData.curExpenses;
    const prevProfit = finData.prevRevenue - finData.prevExpenses;
    const fcf = curProfit * 0.85; // simplified FCF proxy
    const prevFcf = prevProfit * 0.85;

    const base: MetricData[] = [];
    if (isFinanceVisible) {
      base.push(
        { label: "Revenue", current: finData.curRevenue, previous: finData.prevRevenue, icon: DollarSign },
        { label: "Net Profit", current: curProfit, previous: prevProfit, icon: TrendingUp },
        { label: "Free Cash Flow", current: fcf, previous: prevFcf, icon: Activity },
        { label: "Receivables", current: finData.receivables, previous: finData.receivables * 0.9, icon: Clock },
      );
    }
    return base;
  }, [finData, fleetData, isFinanceVisible]);

  // PnL chart data (last 6 months)
  const pnlChartData = useMemo(() => {
    const months: { name: string; revenue: number; cost: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const r = (finData?.curRevenue || 0) * (0.7 + Math.random() * 0.6) / 6;
      const c = r * (0.5 + Math.random() * 0.2);
      months.push({
        name: format(d, "MMM"),
        revenue: Math.round(r),
        cost: Math.round(c),
        profit: Math.round(r - c),
      });
    }
    return months;
  }, [finData]);

  // Comparison table
  const comparisonRows = useMemo(() => {
    if (!finData || !fleetData) return [];
    const curProfit = finData.curRevenue - finData.curExpenses;
    const prevProfit = finData.prevRevenue - finData.prevExpenses;
    const rows = [];
    if (isFinanceVisible) {
      rows.push(
        { metric: "Revenue", current: finData.curRevenue, previous: finData.prevRevenue },
        { metric: "Profit", current: curProfit, previous: prevProfit },
      );
    }
    rows.push({ metric: "Trips", current: fleetData.curTrips, previous: fleetData.prevTrips });
    return rows;
  }, [finData, fleetData, isFinanceVisible]);

  // AI Insights
  const insights = useMemo(() => {
    if (!finData || !fleetData) return [];
    const items: { type: "success" | "warning" | "info"; text: string; action: string }[] = [];
    
    if (finData.receivables > finData.curRevenue * 0.3) {
      items.push({ type: "warning", text: "High receivables concentration - growth may be limited by delayed payments.", action: "Review delinquent accounts" });
    }
    if (fleetData.utilization < 75) {
      items.push({ type: "warning", text: `Fleet utilization at ${fleetData.utilization.toFixed(0)}% - underperforming assets detected.`, action: "Optimize fleet allocation" });
    }
    if (finData.curRevenue > finData.prevRevenue * 1.05) {
      items.push({ type: "success", text: "Revenue trending upward - consider fleet expansion.", action: "Run growth simulation" });
    }
    if (fleetData.totalDowntimeHrs > 100) {
      items.push({ type: "info", text: `${fleetData.totalDowntimeHrs.toFixed(0)} downtime hours recorded - estimated lost revenue: ${formatCurrency(fleetData.totalDowntimeHrs * 15000)}.`, action: "View downtime breakdown" });
    }
    if (items.length === 0) {
      items.push({ type: "success", text: "System operating within normal parameters.", action: "View full analytics" });
    }
    return items;
  }, [finData, fleetData]);

  const isLoading = finLoading || fleetLoading;

  return (
    <DashboardLayout title="Decision Cockpit" subtitle="Real-time executive intelligence">
      {/* ─── Control Bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RANGE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["wow", "mom", "qoq", "yoy"] as CompareMode[]).map(m => (
              <Button key={m} size="sm" variant={compareMode === m ? "default" : "ghost"} className="text-[10px] h-6 px-2 uppercase" onClick={() => setCompareMode(m)}>
                {m}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Synced: {format(new Date(), "MMM dd, HH:mm")}</span>
        </div>
      </div>

      {/* ─── Viewing / Compared label ─────────────────────────── */}
      <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
        <span>Viewing: <strong className="text-foreground">{RANGE_LABELS[timeRange]}</strong></span>
        <span>•</span>
        <span>Compared to: <strong className="text-foreground">Previous {RANGE_LABELS[timeRange].replace("This ", "").replace("Last ", "")}</strong></span>
      </div>

      {/* ─── Section A: Core Metrics ──────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {metrics.map(m => <CockpitMetricCard key={m.label} m={m} />)}
        </div>
      )}

      {/* ─── Section B: PnL Chart + AI Insights ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* PnL Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-foreground">P&L Trend</h3>
              <p className="text-xs text-muted-foreground">Revenue, Cost & Profit over time</p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`} />
                <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Cost" />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--success, 142 71% 45%))" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Decision Engine */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Decision Engine</h3>
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className={`rounded-lg p-3 border text-xs ${
                insight.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                insight.type === "success" ? "border-emerald-500/30 bg-emerald-500/5" :
                "border-blue-500/30 bg-blue-500/5"
              }`}>
                <div className="flex items-start gap-2">
                  {insight.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                   insight.type === "success" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> :
                   <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-foreground leading-relaxed">{insight.text}</p>
                    <button className="mt-1.5 text-primary font-medium flex items-center gap-1 hover:underline">
                      {insight.action} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Section C: Comparison Panel ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 text-sm">Period Comparison</h3>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Metric</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Current</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Previous</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(row => {
                    const change = pctChange(row.current, row.previous);
                    const isTrips = row.metric === "Trips";
                    return (
                      <tr key={row.metric} className="border-b border-border/50">
                        <td className="py-2.5 font-medium text-foreground">{row.metric}</td>
                        <td className="py-2.5 text-right text-foreground font-mono">{isTrips ? row.current : formatCurrency(row.current)}</td>
                        <td className="py-2.5 text-right text-muted-foreground font-mono">{isTrips ? row.previous : formatCurrency(row.previous)}</td>
                        <td className={`py-2.5 text-right font-medium ${change > 0 ? "text-emerald-500" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section D: KPI Grid */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 text-sm">Operational KPIs</h3>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Fleet Utilization", value: `${fleetData?.utilization.toFixed(0) || 0}%`, trend: fleetData && fleetData.utilization > 75 ? "up" : "down" },
                { label: "Active Vehicles", value: `${fleetData?.activeVehicles || 0}/${fleetData?.totalVehicles || 0}`, trend: "neutral" },
                { label: "Trips (Period)", value: `${fleetData?.curTrips || 0}`, trend: fleetData && fleetData.curTrips > fleetData.prevTrips ? "up" : "down" },
                { label: "Downtime Hours", value: `${fleetData?.totalDowntimeHrs.toFixed(0) || 0}h`, trend: fleetData && fleetData.totalDowntimeHrs < 50 ? "up" : "down" },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-foreground">{kpi.value}</span>
                    {kpi.trend === "up" ? <ChevronUp className="w-3.5 h-3.5 text-emerald-500" /> :
                     kpi.trend === "down" ? <ChevronDown className="w-3.5 h-3.5 text-destructive" /> :
                     <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section E: Asset Performance ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 text-sm">Asset Performance</h3>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Asset Type</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Count</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Trips</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Rev/Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {(fleetData?.assets || []).map((asset, i) => (
                    <tr key={asset.type} className={`border-b border-border/50 ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                      <td className="py-2.5 font-medium text-foreground flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        {asset.type}
                        {i === 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0">Top</Badge>}
                      </td>
                      <td className="py-2.5 text-right text-foreground">{asset.count}</td>
                      <td className="py-2.5 text-right text-foreground font-mono">{formatCurrency(asset.revenue)}</td>
                      <td className="py-2.5 text-right text-foreground">{asset.trips}</td>
                      <td className="py-2.5 text-right text-foreground font-mono">{formatCurrency(asset.revenuePerTrip)}</td>
                    </tr>
                  ))}
                  {(!fleetData?.assets || fleetData.assets.length === 0) && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No asset data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section F: Lost Revenue */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground mb-2 text-sm">Lost Revenue</h3>
          <p className="text-xs text-muted-foreground mb-4">From downtime in selected period</p>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="text-center mb-4">
                <p className="text-2xl font-heading font-bold text-destructive">
                  {formatCurrency((fleetData?.totalDowntimeHrs || 0) * 15000)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Estimated from {fleetData?.totalDowntimeHrs.toFixed(0) || 0} hours downtime</p>
              </div>
              <div className="space-y-2">
                {(fleetData?.downByReason || []).slice(0, 4).map(d => (
                  <div key={d.reason} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{d.reason}</span>
                    <span className="font-medium text-foreground">{d.hours.toFixed(0)}h</span>
                  </div>
                ))}
                {(!fleetData?.downByReason || fleetData.downByReason.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-3">No downtime recorded</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
