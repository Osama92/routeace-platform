import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, TrendingUp, AlertTriangle, Receipt, Banknote, BarChart3, ArrowUpRight, ArrowDownRight, Percent } from "lucide-react";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";
import FMCGZeroState from "../FMCGZeroState";

function useFinanceKPIs() {
  return useQuery({
    queryKey: ["fmcg-finance-kpis"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [invoices, ar, payments] = await Promise.all([
        supabase.from("invoices").select("id, total_amount, tax_amount, status, created_at").gte("created_at", startOfMonth),
        supabase.from("accounts_receivable").select("id, amount_due, amount_paid, balance, status, due_date"),
        supabase.from("ar_payments").select("id, amount, payment_date").gte("payment_date", startOfMonth),
      ]);

      const revenueMTD = invoices.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const collections = payments.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstandingAR = ar.data?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;

      // VAT from invoices this month
      const outputVAT = invoices.data?.reduce((sum, inv: any) => sum + (inv.tax_amount || 0), 0) || 0;

      // AR aging buckets
      const today = new Date();
      const aging = { current: 0, days30: 0, days60: 0, days90plus: 0 };
      (ar.data || []).forEach(a => {
        if (!a.due_date || a.balance <= 0) return;
        const daysOverdue = Math.floor((today.getTime() - new Date(a.due_date).getTime()) / 86400000);
        if (daysOverdue <= 30) aging.current += a.balance;
        else if (daysOverdue <= 60) aging.days30 += a.balance;
        else if (daysOverdue <= 90) aging.days60 += a.balance;
        else aging.days90plus += a.balance;
      });

      const hasData = (invoices.data?.length || 0) > 0 || (ar.data?.length || 0) > 0;
      return { revenueMTD, collections, outstandingAR, aging, hasData, outputVAT };
    },
  });
}

const fmt = (val: number) => {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toLocaleString()}`;
};

const FinanceDashboard = () => {
  const { data, isLoading } = useFinanceKPIs();

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!data?.hasData) return <FMCGZeroState role="finance_manager" />;

  const kpis = [
    { label: "Revenue MTD", value: fmt(data.revenueMTD), icon: TrendingUp },
    { label: "Collections", value: fmt(data.collections), icon: Banknote },
    { label: "Outstanding AR", value: fmt(data.outstandingAR), icon: Receipt },
    { label: "VAT Collected MTD", value: fmt(data.outputVAT), icon: Percent },
  ];

  const totalAR = data.aging.current + data.aging.days30 + data.aging.days60 + data.aging.days90plus;
  const agingBuckets = totalAR > 0 ? [
    { bucket: "0–30 days", amount: fmt(data.aging.current), pct: Math.round((data.aging.current / totalAR) * 100) },
    { bucket: "31–60 days", amount: fmt(data.aging.days30), pct: Math.round((data.aging.days30 / totalAR) * 100) },
    { bucket: "61–90 days", amount: fmt(data.aging.days60), pct: Math.round((data.aging.days60 / totalAR) * 100) },
    { bucket: "90+ days", amount: fmt(data.aging.days90plus), pct: Math.round((data.aging.days90plus / totalAR) * 100) },
  ] : [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FMCGAIInsightPanel role="finance" />

      {agingBuckets.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> AR Aging Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agingBuckets.map((b) => (
                <div key={b.bucket} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.bucket}</span>
                    <span>{b.amount} ({b.pct}%)</span>
                  </div>
                  <Progress value={b.pct} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default FinanceDashboard;
