import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Truck, TrendingUp, DollarSign, AlertTriangle, Target, Zap,
  BarChart3, Clock, Fuel, Users, Plus, Minus, Play, RefreshCw,
  ArrowUpRight, ArrowDownRight, Shield, Brain, Gauge,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie,
} from "recharts";

const fmt = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// ─── NRS 2025 Tax Bands ───
const TAX_BANDS = [
  { max: 800_000, rate: 0, label: "0% (Tax Free)" },
  { max: 3_000_000, rate: 0.15, label: "15%" },
  { max: 12_000_000, rate: 0.18, label: "18%" },
  { max: 25_000_000, rate: 0.21, label: "21%" },
  { max: 50_000_000, rate: 0.23, label: "23%" },
  { max: Infinity, rate: 0.25, label: "25%" },
];

// ─── Interfaces ───
interface AssetConfig {
  id: string;
  type: string;
  count: number;
  revenuePerTrip: number;
  tripsPerMonth: number;
  operatingCostPerMonth: number;
  purchaseCostNew: number;
  purchaseCostUsed: number;
  utilizationPct: number;
  downtimeDays: number;
}

interface FinancialConfig {
  fixedOverhead: number;
  cashBalance: number;
  instantPayPct: number;
  delayedPayPct: number;
  avgDelayDays: number;
}

interface ThirdPartyConfig {
  capitalDeployed: number;
  marginPct: number;
  paymentCycleDays: number;
  jobsPerMonth: number;
}

interface GrowthTarget {
  targetFleetSize: number;
  timelineMonths: number;
  maxReinvestPerMonth: number;
  riskTolerance: "low" | "medium" | "aggressive";
  hasFinancing: boolean;
}

const DEFAULT_ASSETS: AssetConfig[] = [
  { id: "1", type: "15T Truck", count: 3, revenuePerTrip: 450_000, tripsPerMonth: 8, operatingCostPerMonth: 280_000, purchaseCostNew: 28_000_000, purchaseCostUsed: 18_000_000, utilizationPct: 78, downtimeDays: 4 },
  { id: "2", type: "20T Truck", count: 2, revenuePerTrip: 650_000, tripsPerMonth: 6, operatingCostPerMonth: 380_000, purchaseCostNew: 42_000_000, purchaseCostUsed: 28_000_000, utilizationPct: 82, downtimeDays: 3 },
  { id: "3", type: "30T Truck", count: 1, revenuePerTrip: 950_000, tripsPerMonth: 5, operatingCostPerMonth: 520_000, purchaseCostNew: 58_000_000, purchaseCostUsed: 38_000_000, utilizationPct: 75, downtimeDays: 4 },
  { id: "4", type: "45T Flatbed", count: 1, revenuePerTrip: 1_200_000, tripsPerMonth: 4, operatingCostPerMonth: 650_000, purchaseCostNew: 72_000_000, purchaseCostUsed: 48_000_000, utilizationPct: 70, downtimeDays: 5 },
  { id: "5", type: "Van", count: 4, revenuePerTrip: 85_000, tripsPerMonth: 22, operatingCostPerMonth: 120_000, purchaseCostNew: 8_500_000, purchaseCostUsed: 5_200_000, utilizationPct: 88, downtimeDays: 2 },
  { id: "6", type: "Bike", count: 6, revenuePerTrip: 12_000, tripsPerMonth: 60, operatingCostPerMonth: 45_000, purchaseCostNew: 850_000, purchaseCostUsed: 450_000, utilizationPct: 92, downtimeDays: 1 },
  { id: "7", type: "Reefer (Cold Chain)", count: 0, revenuePerTrip: 1_800_000, tripsPerMonth: 4, operatingCostPerMonth: 850_000, purchaseCostNew: 95_000_000, purchaseCostUsed: 65_000_000, utilizationPct: 80, downtimeDays: 3 },
  { id: "8", type: "60T Lowbed", count: 0, revenuePerTrip: 2_500_000, tripsPerMonth: 3, operatingCostPerMonth: 950_000, purchaseCostNew: 120_000_000, purchaseCostUsed: 78_000_000, utilizationPct: 65, downtimeDays: 6 },
];

const DEFAULT_FINANCIALS: FinancialConfig = {
  fixedOverhead: 1_500_000,
  cashBalance: 15_000_000,
  instantPayPct: 40,
  delayedPayPct: 60,
  avgDelayDays: 45,
};

const DEFAULT_3PL: ThirdPartyConfig = {
  capitalDeployed: 5_000_000,
  marginPct: 15,
  paymentCycleDays: 30,
  jobsPerMonth: 20,
};

const DEFAULT_GROWTH: GrowthTarget = {
  targetFleetSize: 25,
  timelineMonths: 12,
  maxReinvestPerMonth: 8_000_000,
  riskTolerance: "medium",
  hasFinancing: false,
};

// ─── Computation Engine ───
function computeFleetIntelligence(
  assets: AssetConfig[],
  financials: FinancialConfig,
  thirdParty: ThirdPartyConfig,
  growth: GrowthTarget,
) {
  // Per-asset economics
  const assetEconomics = assets.map(a => {
    const monthlyRevenue = a.revenuePerTrip * a.tripsPerMonth * a.count;
    const monthlyCost = a.operatingCostPerMonth * a.count;
    const monthlyProfit = monthlyRevenue - monthlyCost;
    const marginPct = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
    const roi = a.purchaseCostUsed > 0 ? (monthlyProfit * 12 / a.purchaseCostUsed) * 100 : 0;
    const paybackMonths = monthlyProfit > 0 ? a.purchaseCostUsed / monthlyProfit : Infinity;
    const lostRevFromDowntime = (a.downtimeDays / 30) * monthlyRevenue;
    return { ...a, monthlyRevenue, monthlyCost, monthlyProfit, marginPct, roi, paybackMonths, lostRevFromDowntime };
  });

  const totalFleetSize = assets.reduce((s, a) => s + a.count, 0);
  const totalMonthlyRevenue = assetEconomics.reduce((s, a) => s + a.monthlyRevenue, 0);
  const totalMonthlyCost = assetEconomics.reduce((s, a) => s + a.monthlyCost, 0) + financials.fixedOverhead;
  const totalMonthlyProfit = totalMonthlyRevenue - totalMonthlyCost;

  // Cash flow vs profit distinction
  const instantCash = totalMonthlyRevenue * (financials.instantPayPct / 100);
  const delayedCash = totalMonthlyRevenue * (financials.delayedPayPct / 100);
  const lockedReceivables = delayedCash * (financials.avgDelayDays / 30);
  const freeCashFlow = instantCash - totalMonthlyCost;

  // 3PL income
  const thirdPartyRevenue = thirdParty.capitalDeployed * (thirdParty.marginPct / 100);

  // Growth simulation (12-month compounding)
  const timeline: Array<{
    month: number;
    fleetSize: number;
    cashPosition: number;
    action: string;
    revenue: number;
    profit: number;
  }> = [];

  let currentFleetSize = totalFleetSize;
  let currentCash = financials.cashBalance;
  const cheapestAsset = assetEconomics.length
    ? [...assetEconomics].sort((a, b) => a.purchaseCostUsed - b.purchaseCostUsed)[0]
    : null;
  const bestROIAsset = assetEconomics.length
    ? [...assetEconomics].sort((a, b) => b.roi - a.roi)[0]
    : null;

  for (let m = 1; m <= growth.timelineMonths && cheapestAsset; m++) {
    const monthlyRev = totalMonthlyRevenue * (currentFleetSize / totalFleetSize);
    const monthlyCost = totalMonthlyCost * (currentFleetSize / totalFleetSize);
    const monthlyFCF = monthlyRev * (financials.instantPayPct / 100) - monthlyCost + thirdPartyRevenue;

    currentCash += monthlyFCF;

    let action = "⏳ Accumulate";
    const reinvestCap = Math.min(growth.maxReinvestPerMonth, currentCash * 0.6);
    const bufferRequired = growth.riskTolerance === "low" ? monthlyCost * 3 : growth.riskTolerance === "medium" ? monthlyCost * 2 : monthlyCost;

    if (currentCash - cheapestAsset.purchaseCostUsed > bufferRequired && currentFleetSize < growth.targetFleetSize) {
      const canBuy = Math.min(
        Math.floor(reinvestCap / cheapestAsset.purchaseCostUsed),
        growth.targetFleetSize - currentFleetSize
      );
      if (canBuy > 0) {
        currentCash -= canBuy * cheapestAsset.purchaseCostUsed;
        currentFleetSize += canBuy;
        action = `✅ BUY ${canBuy}x ${cheapestAsset.type}`;
      }
    } else if (currentCash < bufferRequired) {
      action = "⚠️ CASH RISK - Hold";
    }

    timeline.push({
      month: m,
      fleetSize: currentFleetSize,
      cashPosition: Math.round(currentCash),
      action,
      revenue: Math.round(monthlyRev),
      profit: Math.round(monthlyFCF),
    });
  }

  // Decisions
  const decisions: Array<{ type: "buy" | "wait" | "warning" | "optimize"; message: string; impact: string }> = [];

  if (cheapestAsset && bestROIAsset && freeCashFlow > cheapestAsset.purchaseCostUsed * 0.5) {
    decisions.push({ type: "buy", message: `Strong FCF supports buying 1x ${bestROIAsset.type} (best ROI: ${bestROIAsset.roi.toFixed(0)}%)`, impact: fmt(bestROIAsset.monthlyProfit) + "/mo added profit" });
  } else if (!cheapestAsset) {
    decisions.push({ type: "wait", message: "No active fleet assets configured. Add vehicles or configure asset baseline to unlock recommendations.", impact: "Awaiting fleet data" });
  } else {
    decisions.push({ type: "wait", message: "Free cash flow is tight. Accumulate for 1-2 months before next purchase.", impact: "Protect cash reserves" });
  }

  if (financials.delayedPayPct > 50) {
    decisions.push({ type: "warning", message: `${financials.delayedPayPct}% of revenue is delayed by ~${financials.avgDelayDays} days. Negotiate faster terms.`, impact: fmt(lockedReceivables) + " locked in receivables" });
  }

  const underutilized = assetEconomics.filter(a => a.utilizationPct < 75);
  if (underutilized.length > 0) {
    decisions.push({ type: "optimize", message: `${underutilized.length} asset type(s) below 75% utilization. Cross-assign or backfill.`, impact: fmt(underutilized.reduce((s, a) => s + a.lostRevFromDowntime, 0)) + " recoverable" });
  }

  // Bottlenecks
  const bottlenecks: string[] = [];
  if (lockedReceivables > currentCash * 0.4) bottlenecks.push("Receivables lock > 40% of cash position");
  if (totalMonthlyProfit < 0) bottlenecks.push("Fleet is operating at a net loss");
  if (assetEconomics.some(a => a.marginPct < 10)) bottlenecks.push("Some asset types have margins below 10%");

  const onTrack = currentFleetSize >= growth.targetFleetSize;
  const monthsToTarget = timeline.findIndex(t => t.fleetSize >= growth.targetFleetSize);

  return {
    assetEconomics,
    totalFleetSize,
    totalMonthlyRevenue,
    totalMonthlyCost,
    totalMonthlyProfit,
    instantCash,
    lockedReceivables,
    freeCashFlow,
    thirdPartyRevenue,
    timeline,
    decisions,
    bottlenecks,
    onTrack,
    monthsToTarget: monthsToTarget >= 0 ? monthsToTarget + 1 : null,
    bestROIAsset,
    cheapestAsset,
  };
}

// ─── Component ───
const FleetIntelligenceEngine = () => {
  const { organizationId } = useAuth();
  const [assets, setAssets] = useState<AssetConfig[]>(DEFAULT_ASSETS);
  const [financials, setFinancials] = useState<FinancialConfig>(DEFAULT_FINANCIALS);
  const [thirdParty, setThirdParty] = useState<ThirdPartyConfig>(DEFAULT_3PL);
  const [growth, setGrowth] = useState<GrowthTarget>(DEFAULT_GROWTH);
  const [tab, setTab] = useState("command");
  const [hydrated, setHydrated] = useState(false);

  // Load real fleet data - strictly org-scoped
  const { data: fleetData } = useQuery({
    queryKey: ["fleet-intelligence-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, vehicle_type, truck_type, status")
        .eq("organization_id", organizationId!)
        .limit(500);
      return data || [];
    },
  });

  // Load real financial data - strictly org-scoped
  const { data: financeData } = useQuery({
    queryKey: ["fleet-intelligence-finance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const [inv, exp] = await Promise.all([
        supabase.from("invoices").select("total_amount, status, paid_at, due_date")
          .eq("organization_id", organizationId!).gte("created_at", startOfMonth),
        supabase.from("expenses").select("amount, approval_status")
          .eq("organization_id", organizationId!).gte("created_at", startOfMonth),
      ]);
      const revenue = inv.data?.reduce((s, i: any) => s + Number(i.total_amount || 0), 0) || 0;
      const expenses = exp.data?.filter((e: any) => e.approval_status === "approved")
        .reduce((s, e: any) => s + Number(e.amount || 0), 0) || 0;
      const outstanding = inv.data?.filter((i: any) => i.status !== "paid")
        .reduce((s, i: any) => s + Number(i.total_amount || 0), 0) || 0;
      const collected = inv.data?.filter((i: any) => i.status === "paid")
        .reduce((s, i: any) => s + Number(i.total_amount || 0), 0) || 0;
      const instantPct = revenue > 0 ? Math.round((collected / revenue) * 100) : 0;
      return { revenue, expenses, outstanding, collected, instantPct };
    },
  });

  // Downtime data (table not org-scoped at schema level - load minimal sample)
  const { data: downtimeData } = useQuery({
    queryKey: ["fleet-intelligence-downtime"],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("fleet_downtime_log" as any).select("*").limit(50);
      return (data || []) as any[];
    },
  });

  // Hydrate state from live data once on first load
  useEffect(() => {
    if (hydrated || !fleetData) return;
    if (fleetData.length === 0) {
      // No vehicles yet - collapse the asset baseline so KPIs reflect zero, not mock fleet
      setAssets((prev) => prev.map((a) => ({ ...a, count: 0 })));
    } else {
      const counts: Record<string, number> = {};
      for (const v of fleetData as any[]) {
        const t = (v.truck_type || v.vehicle_type || "").toString().toLowerCase();
        if (t.includes("bike")) counts["Bike"] = (counts["Bike"] || 0) + 1;
        else if (t.includes("van")) counts["Van"] = (counts["Van"] || 0) + 1;
        else if (t.includes("45") || t.includes("flatbed")) counts["45T Flatbed"] = (counts["45T Flatbed"] || 0) + 1;
        else if (t.includes("60") || t.includes("lowbed")) counts["60T Lowbed"] = (counts["60T Lowbed"] || 0) + 1;
        else if (t.includes("reefer") || t.includes("cold")) counts["Reefer (Cold Chain)"] = (counts["Reefer (Cold Chain)"] || 0) + 1;
        else if (t.includes("30")) counts["30T Truck"] = (counts["30T Truck"] || 0) + 1;
        else if (t.includes("20")) counts["20T Truck"] = (counts["20T Truck"] || 0) + 1;
        else counts["15T Truck"] = (counts["15T Truck"] || 0) + 1;
      }
      setAssets((prev) => prev.map((a) => ({ ...a, count: counts[a.type] ?? 0 })));
    }
    if (financeData) {
      setFinancials((prev) => ({
        ...prev,
        instantPayPct: financeData.instantPct,
        delayedPayPct: 100 - financeData.instantPct,
        fixedOverhead: financeData.expenses || prev.fixedOverhead,
      }));
    }
    setHydrated(true);
  }, [fleetData, financeData, hydrated]);


  const intel = useMemo(
    () => computeFleetIntelligence(assets.filter(a => a.count > 0), financials, thirdParty, growth),
    [assets, financials, thirdParty, growth]
  );

  const addCustomAsset = () => {
    const newId = String(Date.now());
    setAssets(prev => [...prev, {
      id: newId, type: "Custom Asset", count: 1, revenuePerTrip: 100_000,
      tripsPerMonth: 10, operatingCostPerMonth: 80_000, purchaseCostNew: 10_000_000,
      purchaseCostUsed: 6_000_000, utilizationPct: 80, downtimeDays: 2,
    }]);
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const decisionColors = { buy: "text-emerald-400", wait: "text-amber-400", warning: "text-destructive", optimize: "text-blue-400" };
  const decisionIcons = { buy: Zap, wait: Clock, warning: AlertTriangle, optimize: Target };

  return (
    <DashboardLayout title="Fleet Intelligence Engine" subtitle="Real-time fleet scaling, cash flow intelligence & capital allocation">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Fleet Size", value: intel.totalFleetSize, icon: Truck, color: "text-primary" },
          { label: "Monthly Revenue", value: fmt(intel.totalMonthlyRevenue), icon: DollarSign, color: "text-emerald-400" },
          { label: "Monthly Profit", value: fmt(intel.totalMonthlyProfit), icon: TrendingUp, color: intel.totalMonthlyProfit > 0 ? "text-emerald-400" : "text-destructive" },
          { label: "Free Cash Flow", value: fmt(intel.freeCashFlow), icon: Gauge, color: intel.freeCashFlow > 0 ? "text-emerald-400" : "text-destructive" },
          { label: "Locked Receivables", value: fmt(intel.lockedReceivables), icon: Clock, color: "text-amber-400" },
          { label: "3PL Income", value: fmt(intel.thirdPartyRevenue), icon: Users, color: "text-blue-400" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <kpi.icon className={`w-5 h-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="command"><Brain className="w-3.5 h-3.5 mr-1" />Command Center</TabsTrigger>
          <TabsTrigger value="assets"><Truck className="w-3.5 h-3.5 mr-1" />Asset Economics</TabsTrigger>
          <TabsTrigger value="cashflow"><DollarSign className="w-3.5 h-3.5 mr-1" />Cash Flow</TabsTrigger>
          <TabsTrigger value="growth"><TrendingUp className="w-3.5 h-3.5 mr-1" />Growth Simulator</TabsTrigger>
          <TabsTrigger value="scenarios"><Target className="w-3.5 h-3.5 mr-1" />Scenarios</TabsTrigger>
          <TabsTrigger value="config"><RefreshCw className="w-3.5 h-3.5 mr-1" />Configure</TabsTrigger>
        </TabsList>

        {/* ─── Command Center ─── */}
        <TabsContent value="command">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Decisions */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> AI Directives</CardTitle>
                  <CardDescription>Clear actions based on your fleet's current state</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {intel.decisions.map((d, i) => {
                    const Icon = decisionIcons[d.type];
                    return (
                      <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20">
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${decisionColors[d.type]}`} />
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-foreground">{d.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">Impact: {d.impact}</p>
                          </div>
                          <Badge variant={d.type === "buy" ? "default" : d.type === "warning" ? "destructive" : "secondary"} className="uppercase text-[10px]">
                            {d.type}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Growth Trajectory */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Growth Trajectory</CardTitle>
                    <Badge variant={intel.onTrack ? "default" : "destructive"}>
                      {intel.onTrack ? "On Track" : intel.monthsToTarget ? `Target in ${intel.monthsToTarget}mo` : "Off Track"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={intel.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={v => `M${v}`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="fleetSize" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Fleet Size" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="space-y-4">
              {/* Bottlenecks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Bottlenecks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {intel.bottlenecks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No critical bottlenecks detected ✓</p>
                  ) : (
                    intel.bottlenecks.map((b, i) => (
                      <Alert key={i} variant="destructive" className="py-2">
                        <AlertDescription className="text-xs">{b}</AlertDescription>
                      </Alert>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Best ROI Asset */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /> Best ROI Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
                    <p className="text-lg font-bold text-foreground">{intel.bestROIAsset?.type}</p>
                    <p className="text-2xl font-bold text-emerald-400">{intel.bestROIAsset?.roi.toFixed(0)}% ROI</p>
                    <p className="text-xs text-muted-foreground mt-1">Payback: {intel.bestROIAsset?.paybackMonths.toFixed(1)} months</p>
                  </div>
                </CardContent>
              </Card>

              {/* Strategic Insight */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Strategic Insight</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {financials.delayedPayPct > 50
                      ? `Your growth is being limited by payment delays, not profitability. ${financials.delayedPayPct}% of revenue arrives late. Reallocating 20% of capital to faster-paying clients will accelerate fleet growth by ~35%.`
                      : intel.freeCashFlow > 0
                        ? `Strong free cash flow position. You can compound growth by reinvesting ${fmt(Math.min(intel.freeCashFlow * 0.6, growth.maxReinvestPerMonth))} per month into ${intel.bestROIAsset?.type}s for maximum velocity.`
                        : "Cash flow is negative. Focus on utilization optimization and cost reduction before expanding fleet."
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Asset Economics ─── */}
        <TabsContent value="assets">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Per-Asset Profitability</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Revenue/mo</TableHead>
                      <TableHead>Profit/mo</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intel.assetEconomics.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.type}</TableCell>
                        <TableCell>{a.count}</TableCell>
                        <TableCell>{fmt(a.monthlyRevenue)}</TableCell>
                        <TableCell className={a.monthlyProfit >= 0 ? "text-emerald-400" : "text-destructive"}>
                          {fmt(a.monthlyProfit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.marginPct > 25 ? "default" : a.marginPct > 10 ? "secondary" : "destructive"}>
                            {a.marginPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{a.roi.toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ROI Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intel.assetEconomics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="roi" name="Annual ROI %" radius={[6, 6, 0, 0]}>
                      {intel.assetEconomics.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : `hsl(var(--primary) / ${0.8 - i * 0.15})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Utilization & Lost Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {intel.assetEconomics.map(a => (
                    <div key={a.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="font-semibold text-sm mb-2">{a.type}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${a.utilizationPct}%` }} />
                        </div>
                        <span className="text-xs font-medium">{a.utilizationPct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Downtime: {a.downtimeDays}d/mo</p>
                      <p className="text-xs text-amber-400 mt-1">Lost Rev: {fmt(a.lostRevFromDowntime)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Cash Flow ─── */}
        <TabsContent value="cashflow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">12-Month Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={intel.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={v => `M${v}`} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1_000_000).toFixed(0)}M`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="cashPosition" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Cash Position" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(142 71% 45%)" strokeWidth={1.5} dot={false} name="Monthly FCF" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Cash Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Available Cash", value: fmt(financials.cashBalance), color: "text-emerald-400" },
                    { label: "Monthly Instant Cash", value: fmt(intel.instantCash), color: "text-blue-400" },
                    { label: "Locked Receivables", value: fmt(intel.lockedReceivables), color: "text-amber-400" },
                    { label: "Monthly Costs", value: fmt(intel.totalMonthlyCost), color: "text-destructive" },
                    { label: "Free Cash Flow", value: fmt(intel.freeCashFlow), color: intel.freeCashFlow > 0 ? "text-emerald-400" : "text-destructive" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`font-semibold text-sm ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">3PL Engine</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Capital Deployed</span><span>{fmt(thirdParty.capitalDeployed)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly Income</span><span className="text-emerald-400">{fmt(intel.thirdPartyRevenue)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Margin</span><span>{thirdParty.marginPct}%</span></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Growth Simulator ─── */}
        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Month-by-Month Growth Timeline</CardTitle>
              <CardDescription>Fleet expansion based on reinvestment of free cash flow</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Fleet Size</TableHead>
                    <TableHead>Cash Position</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>FCF</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intel.timeline.map(t => (
                    <TableRow key={t.month}>
                      <TableCell className="font-medium">Month {t.month}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.fleetSize}</Badge>
                      </TableCell>
                      <TableCell className={t.cashPosition >= 0 ? "" : "text-destructive"}>{fmt(t.cashPosition)}</TableCell>
                      <TableCell>{fmt(t.revenue)}</TableCell>
                      <TableCell className={t.profit >= 0 ? "text-emerald-400" : "text-destructive"}>{fmt(t.profit)}</TableCell>
                      <TableCell className="text-xs max-w-[200px]">{t.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Scenarios ─── */}
        <TabsContent value="scenarios">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(["low", "medium", "aggressive"] as const).map(risk => {
              const scenarioGrowth = { ...growth, riskTolerance: risk };
              const scenario = computeFleetIntelligence(assets, financials, thirdParty, scenarioGrowth);
              const finalMonth = scenario.timeline[scenario.timeline.length - 1];
              return (
                <Card key={risk} className={risk === growth.riskTolerance ? "border-primary" : ""}>
                  <CardHeader>
                    <CardTitle className="text-sm capitalize flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${risk === "low" ? "text-blue-400" : risk === "medium" ? "text-amber-400" : "text-destructive"}`} />
                      {risk} Risk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="text-3xl font-bold text-foreground">{finalMonth?.fleetSize || 0}</p>
                      <p className="text-xs text-muted-foreground">Fleet at Month {growth.timelineMonths}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Final Cash</span>
                      <span className={finalMonth?.cashPosition >= 0 ? "text-emerald-400" : "text-destructive"}>{fmt(finalMonth?.cashPosition || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">On Track</span>
                      <Badge variant={scenario.onTrack ? "default" : "destructive"}>{scenario.onTrack ? "Yes" : "No"}</Badge>
                    </div>
                    <Button variant={risk === growth.riskTolerance ? "default" : "outline"} size="sm" className="w-full"
                      onClick={() => setGrowth(prev => ({ ...prev, riskTolerance: risk }))}>
                      {risk === growth.riskTolerance ? "Active" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Config ─── */}
        <TabsContent value="config">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Fleet Assets</CardTitle>
                  <Button size="sm" variant="outline" onClick={addCustomAsset}><Plus className="w-3 h-3 mr-1" />Add Asset Type</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {assets.map((a, idx) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Input value={a.type} className="h-7 text-sm font-semibold w-40" onChange={e => {
                        const updated = [...assets]; updated[idx] = { ...a, type: e.target.value }; setAssets(updated);
                      }} />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{a.count} units</Badge>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAsset(a.id)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Count</Label>
                        <Input type="number" value={a.count} className="h-8 text-sm" onChange={e => {
                          const updated = [...assets];
                          updated[idx] = { ...a, count: parseInt(e.target.value) || 0 };
                          setAssets(updated);
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">Rev/Trip (₦)</Label>
                        <Input type="number" value={a.revenuePerTrip} className="h-8 text-sm" onChange={e => {
                          const updated = [...assets];
                          updated[idx] = { ...a, revenuePerTrip: parseInt(e.target.value) || 0 };
                          setAssets(updated);
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">Trips/Month</Label>
                        <Input type="number" value={a.tripsPerMonth} className="h-8 text-sm" onChange={e => {
                          const updated = [...assets];
                          updated[idx] = { ...a, tripsPerMonth: parseInt(e.target.value) || 0 };
                          setAssets(updated);
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">Op. Cost/Mo (₦)</Label>
                        <Input type="number" value={a.operatingCostPerMonth} className="h-8 text-sm" onChange={e => {
                          const updated = [...assets];
                          updated[idx] = { ...a, operatingCostPerMonth: parseInt(e.target.value) || 0 };
                          setAssets(updated);
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Financial Parameters</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Cash Balance (₦)</Label>
                    <Input type="number" value={financials.cashBalance} className="h-8" onChange={e => setFinancials(prev => ({ ...prev, cashBalance: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Fixed Overhead/Mo (₦)</Label>
                    <Input type="number" value={financials.fixedOverhead} className="h-8" onChange={e => setFinancials(prev => ({ ...prev, fixedOverhead: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Instant Pay % ({financials.instantPayPct}%)</Label>
                    <Slider value={[financials.instantPayPct]} min={0} max={100} step={5} onValueChange={([v]) => setFinancials(prev => ({ ...prev, instantPayPct: v, delayedPayPct: 100 - v }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Avg Payment Delay (days)</Label>
                    <Input type="number" value={financials.avgDelayDays} className="h-8" onChange={e => setFinancials(prev => ({ ...prev, avgDelayDays: parseInt(e.target.value) || 0 }))} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Growth Targets</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Target Fleet Size</Label>
                    <Input type="number" value={growth.targetFleetSize} className="h-8" onChange={e => setGrowth(prev => ({ ...prev, targetFleetSize: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Timeline (months)</Label>
                    <Input type="number" value={growth.timelineMonths} className="h-8" onChange={e => setGrowth(prev => ({ ...prev, timelineMonths: parseInt(e.target.value) || 12 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Max Reinvest/Mo (₦)</Label>
                    <Input type="number" value={growth.maxReinvestPerMonth} className="h-8" onChange={e => setGrowth(prev => ({ ...prev, maxReinvestPerMonth: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Risk Tolerance</Label>
                    <Select value={growth.riskTolerance} onValueChange={(v: "low" | "medium" | "aggressive") => setGrowth(prev => ({ ...prev, riskTolerance: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Conservative)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="aggressive">Aggressive (Max Growth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default FleetIntelligenceEngine;
