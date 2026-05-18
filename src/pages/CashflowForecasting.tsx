import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, Brain, Download, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function CashflowForecasting() {
  const { data: arData = [] } = useQuery({
    queryKey: ["cf-ar"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_receivable").select("*").neq("status", "paid").neq("status", "cancelled");
      return data || [];
    },
  });

  const { data: apData = [] } = useQuery({
    queryKey: ["cf-ap"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*").neq("status", "paid").neq("status", "cancelled");
      return data || [];
    },
  });

  const { data: glData = [] } = useQuery({
    queryKey: ["cf-gl"],
    queryFn: async () => {
      const { data } = await supabase.from("accounting_ledger").select("*");
      return data || [];
    },
  });

  const totalArOutstanding = arData.reduce((s, e) => s + Number(e.balance || 0), 0);
  const totalApOutstanding = apData.reduce((s, e) => s + Number(e.balance || 0), 0);

  // Cash position from GL
  const cashBalance = glData
    .filter(e => e.account_name === "cash" || e.account_name === "bank")
    .reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0);

  // Monthly revenue estimate from GL
  const monthlyRevenue = glData
    .filter(e => e.account_type === "revenue" || e.account_name?.includes("revenue"))
    .reduce((s, e) => s + Number(e.credit || 0), 0);

  const monthlyExpenses = glData
    .filter(e => e.account_type === "expense" || e.account_name?.includes("cost") || e.account_name?.includes("expense"))
    .reduce((s, e) => s + Number(e.debit || 0), 0);

  const monthlyCashBurn = monthlyExpenses > 0 ? monthlyExpenses : 1;
  const cashRunwayMonths = cashBalance > 0 ? Math.round((cashBalance / monthlyCashBurn) * 10) / 10 : 0;

  // AR aging
  const arAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    arData.forEach(e => {
      const due = e.due_date ? new Date(e.due_date) : new Date(e.posting_date);
      const daysPast = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const bal = Number(e.balance || 0);
      if (daysPast <= 0) buckets.current += bal;
      else if (daysPast <= 30) buckets.days30 += bal;
      else if (daysPast <= 60) buckets.days60 += bal;
      else if (daysPast <= 90) buckets.days90 += bal;
      else buckets.over90 += bal;
    });
    return buckets;
  }, [arData]);

  // Collection probability
  const collectionProbability = totalArOutstanding > 0
    ? Math.round(((arAging.current * 0.95 + arAging.days30 * 0.85 + arAging.days60 * 0.65 + arAging.days90 * 0.40 + arAging.over90 * 0.15) / totalArOutstanding) * 100)
    : 0;

  // Forecasts
  const forecast30 = cashBalance + (totalArOutstanding * collectionProbability / 100 * 0.4) - (totalApOutstanding * 0.5);
  const forecast90 = cashBalance + (totalArOutstanding * collectionProbability / 100) - totalApOutstanding;

  const riskLevel = cashRunwayMonths > 6 ? "Low" : cashRunwayMonths > 3 ? "Moderate" : "Critical";
  const riskColor = riskLevel === "Low" ? "text-green-600" : riskLevel === "Moderate" ? "text-amber-600" : "text-destructive";
  const riskBg = riskLevel === "Low" ? "bg-green-500/10" : riskLevel === "Moderate" ? "bg-amber-500/10" : "bg-destructive/10";

  // AI insight
  const insights = useMemo(() => {
    const items: string[] = [];
    if (arAging.over90 > 0) items.push(`⚠️ ${fmt(arAging.over90)} in receivables are over 90 days past due - collection risk is high.`);
    if (cashRunwayMonths < 3) items.push(`🔴 Cash runway is only ${cashRunwayMonths} months. Consider accelerating AR collection or reducing discretionary spend.`);
    if (collectionProbability < 70) items.push(`📉 AR collection probability is ${collectionProbability}% - aging receivables are dragging down projected inflows.`);
    if (totalApOutstanding > cashBalance) items.push(`⚠️ AP outstanding (${fmt(totalApOutstanding)}) exceeds cash balance. Prioritize payables scheduling.`);
    if (items.length === 0) items.push("✅ Cash position is healthy. Continue monitoring AR aging for early risk signals.");
    return items;
  }, [arAging, cashRunwayMonths, collectionProbability, totalApOutstanding, cashBalance]);

  return (
    <DashboardLayout title="Cashflow Forecasting AI" subtitle="Predictive cash position with AR aging and runway analysis">
      <div className="flex gap-2 mb-6">
        <Button variant="outline"><Download className="w-4 h-4 mr-1" />Export Forecast</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Cash Position", value: fmt(cashBalance), icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Cash Runway", value: `${cashRunwayMonths} months`, icon: Clock, color: riskColor, bg: riskBg },
          { label: "AR Outstanding", value: fmt(totalArOutstanding), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "AP Outstanding", value: fmt(totalApOutstanding), icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
              <div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* AR Aging */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">AR Aging Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Current", value: arAging.current, color: "bg-green-500", pct: totalArOutstanding > 0 ? (arAging.current / totalArOutstanding) * 100 : 0 },
              { label: "1-30 Days", value: arAging.days30, color: "bg-blue-500", pct: totalArOutstanding > 0 ? (arAging.days30 / totalArOutstanding) * 100 : 0 },
              { label: "31-60 Days", value: arAging.days60, color: "bg-amber-500", pct: totalArOutstanding > 0 ? (arAging.days60 / totalArOutstanding) * 100 : 0 },
              { label: "61-90 Days", value: arAging.days90, color: "bg-orange-500", pct: totalArOutstanding > 0 ? (arAging.days90 / totalArOutstanding) * 100 : 0 },
              { label: "90+ Days", value: arAging.over90, color: "bg-destructive", pct: totalArOutstanding > 0 ? (arAging.over90 / totalArOutstanding) * 100 : 0 },
            ].map(b => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{b.label}</span><span className="font-medium">{fmt(b.value)}</span></div>
                <Progress value={b.pct} className={`h-2 [&>div]:${b.color}`} />
              </div>
            ))}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm">Collection Probability: <strong>{collectionProbability}%</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Cash Position Forecast</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Current Cash", value: cashBalance, color: "text-green-600" },
              { label: "30-Day Forecast", value: forecast30, color: forecast30 >= 0 ? "text-green-600" : "text-destructive" },
              { label: "90-Day Forecast", value: forecast90, color: forecast90 >= 0 ? "text-green-600" : "text-destructive" },
            ].map(f => (
              <div key={f.label} className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{f.label}</span>
                <span className={`text-xl font-bold ${f.color}`}>{fmt(f.value)}</span>
              </div>
            ))}
            <div className={`p-3 rounded-lg flex items-center gap-2 border ${riskBg} ${riskLevel === "Critical" ? "border-destructive/30" : riskLevel === "Moderate" ? "border-amber-500/30" : "border-green-500/30"}`}>
              <AlertTriangle className={`w-4 h-4 ${riskColor}`} />
              <span className={`text-sm font-medium ${riskColor}`}>Risk Level: {riskLevel}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" />AI Cash Intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/30 text-sm">{insight}</div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
