import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, DollarSign, Shield, Activity, BarChart3,
  Loader2, ArrowUpRight, ArrowDownRight, AlertTriangle, Gauge, Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, startOfYear, subMonths, format } from "date-fns";
import { motion } from "framer-motion";

interface HealthMetric {
  label: string;
  value: string;
  numericValue: number;
  target: number;
  status: "good" | "warning" | "critical";
  icon: any;
}

const CFODashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [stressScore, setStressScore] = useState(0);

  useEffect(() => {
    fetchCFOData();
  }, []);

  const fetchCFOData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const ytdStart = startOfYear(now).toISOString();
      const mtdStart = startOfMonth(now).toISOString();
      const nowISO = now.toISOString();

      const [invRes, expRes, arRes, cashRes] = await Promise.all([
        supabase.from("invoices").select("total_amount, tax_amount, amount, status, created_at").gte("created_at", ytdStart),
        supabase.from("expenses").select("amount, created_at").gte("created_at", ytdStart),
        supabase.from("accounts_receivable").select("amount_due, amount_paid, balance, status"),
        supabase.from("cashflow_forecasts").select("projected_inflow, projected_outflow, actual_inflow, actual_outflow").gte("forecast_date", mtdStart),
      ]);

      const invoices = invRes.data || [];
      const expenses = expRes.data || [];
      const arRecords = arRes.data || [];

      const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
      const netProfit = totalRevenue - totalExpenses;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // AR aging
      const totalAR = arRecords.reduce((s, a) => s + (a.balance || 0), 0);
      const paidAR = arRecords.filter(a => a.status === "paid").length;
      const collectionRate = arRecords.length > 0 ? (paidAR / arRecords.length) * 100 : 0;

      // Cash runway (monthly burn)
      const monthsElapsed = now.getMonth() + 1;
      const monthlyBurn = monthsElapsed > 0 ? totalExpenses / monthsElapsed : 0;

      // Working capital ratio
      const currentAssets = totalRevenue * 0.3; // simplified
      const currentLiabilities = totalExpenses * 0.25;
      const wcRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

      const getStatus = (val: number, goodThreshold: number, warnThreshold: number, higher = true): "good" | "warning" | "critical" => {
        if (higher) return val >= goodThreshold ? "good" : val >= warnThreshold ? "warning" : "critical";
        return val <= goodThreshold ? "good" : val <= warnThreshold ? "warning" : "critical";
      };

      setMetrics([
        { label: "Revenue (YTD)", value: `₦${(totalRevenue / 1e6).toFixed(1)}M`, numericValue: totalRevenue, target: totalRevenue * 1.2, status: "good", icon: DollarSign },
        { label: "Gross Margin", value: `${grossMargin.toFixed(1)}%`, numericValue: grossMargin, target: 40, status: getStatus(grossMargin, 30, 15), icon: TrendingUp },
        { label: "Net Profit Margin", value: `${netMargin.toFixed(1)}%`, numericValue: netMargin, target: 20, status: getStatus(netMargin, 15, 5), icon: BarChart3 },
        { label: "Operating Expenses", value: `₦${(totalExpenses / 1e6).toFixed(1)}M`, numericValue: totalExpenses, target: totalRevenue * 0.7, status: getStatus(totalExpenses, totalRevenue * 0.7, totalRevenue * 0.85, false), icon: Wallet },
        { label: "AR Outstanding", value: `₦${(totalAR / 1e6).toFixed(1)}M`, numericValue: totalAR, target: 0, status: getStatus(totalAR, totalRevenue * 0.1, totalRevenue * 0.3, false), icon: AlertTriangle },
        { label: "Collection Rate", value: `${collectionRate.toFixed(0)}%`, numericValue: collectionRate, target: 90, status: getStatus(collectionRate, 80, 60), icon: Activity },
        { label: "Monthly Burn", value: `₦${(monthlyBurn / 1e6).toFixed(1)}M`, numericValue: monthlyBurn, target: totalRevenue * 0.08, status: "warning", icon: Gauge },
        { label: "Working Capital Ratio", value: wcRatio.toFixed(2), numericValue: wcRatio, target: 1.5, status: getStatus(wcRatio, 1.2, 0.8), icon: Shield },
      ]);

      // Stress score
      const stress = Math.min(100, Math.max(0, 
        (grossMargin < 15 ? 30 : grossMargin < 30 ? 15 : 0) +
        (collectionRate < 60 ? 25 : collectionRate < 80 ? 10 : 0) +
        (wcRatio < 1 ? 25 : wcRatio < 1.5 ? 10 : 0) +
        (netMargin < 5 ? 20 : netMargin < 15 ? 10 : 0)
      ));
      setStressScore(stress);

      // Revenue by month
      const monthMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        monthMap[format(m, "MMM yyyy")] = 0;
      }
      invoices.forEach((inv: any) => {
        const key = format(new Date(inv.created_at), "MMM yyyy");
        if (monthMap[key] !== undefined) monthMap[key] += inv.total_amount || 0;
      });
      setRevenueByMonth(Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })));

    } catch (err) {
      console.error("CFO data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    good: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    critical: "text-destructive bg-destructive/10",
  };

  const stressColor = stressScore < 30 ? "text-emerald-500" : stressScore < 60 ? "text-amber-500" : "text-destructive";
  const stressLabel = stressScore < 30 ? "Healthy" : stressScore < 60 ? "Moderate Risk" : "High Risk";

  return (
    <DashboardLayout title="CFO Intelligence" subtitle="Executive-grade financial visibility and stress analysis">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stress Index */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold font-heading">Financial Stress Index</h3>
                    <p className="text-sm text-muted-foreground">Composite risk score based on margin, liquidity, and collections</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-4xl font-bold ${stressColor}`}>{stressScore}</p>
                    <Badge className={stressScore < 30 ? "bg-emerald-500/15 text-emerald-600" : stressScore < 60 ? "bg-amber-500/15 text-amber-600" : "bg-destructive/15 text-destructive"}>
                      {stressLabel}
                    </Badge>
                  </div>
                </div>
                <Progress value={stressScore} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Health Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="border-border/50 h-full hover:border-border transition-colors">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${statusColors[metric.status]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${
                          metric.status === "good" ? "border-emerald-500/30 text-emerald-500" :
                          metric.status === "warning" ? "border-amber-500/30 text-amber-500" :
                          "border-destructive/30 text-destructive"
                        }`}>
                          {metric.status === "good" ? "Healthy" : metric.status === "warning" ? "Monitor" : "Alert"}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold font-heading">{metric.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Revenue Trend */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {revenueByMonth.map((m, i) => {
                  const max = Math.max(...revenueByMonth.map(r => r.revenue), 1);
                  const height = (m.revenue / max) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {m.revenue >= 1e6 ? `₦${(m.revenue / 1e6).toFixed(1)}M` : `₦${(m.revenue / 1e3).toFixed(0)}K`}
                      </span>
                      <motion.div
                        className="w-full bg-primary/80 rounded-t min-h-[4px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 3)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      />
                      <span className="text-[10px] text-muted-foreground">{m.month.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CFODashboard;
