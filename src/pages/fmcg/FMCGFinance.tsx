import { useState, useEffect } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CreditCard, AlertTriangle, CheckCircle, TrendingUp, Clock, Inbox } from "lucide-react";
import { AnalyticsDateFilterBar, useAnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import { supabase } from "@/integrations/supabase/client";

interface ARRecord {
  name: string;
  amount: number;
  days: number;
  risk: string;
}

const FMCGFinance = () => {
  const { range, periodType, offset, goBack, goForward, changePeriod } = useAnalyticsDateFilter("month");
  const [kpis, setKpis] = useState({ invoiced: 0, received: 0, outstanding: 0, creditAlerts: 0, arTurnover: 0, collectionEff: 0 });
  const [arRecords, setArRecords] = useState<ARRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const start = range.start.toISOString();
      const end = range.end.toISOString();

      const [invoicesRes, paymentsRes, arRes] = await Promise.all([
        supabase.from("invoices").select("total_amount, status, customer_id").gte("created_at", start).lte("created_at", end),
        supabase.from("ar_payments").select("amount").gte("payment_date", start).lte("payment_date", end),
        supabase.from("accounts_receivable").select("amount_due, amount_paid, balance, status, customer_id, posting_date, due_date"),
      ]);

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const ar = arRes.data || [];

      const invoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const received = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const outstanding = ar.filter(r => r.status !== "paid").reduce((s, r) => s + (r.balance || 0), 0);
      const creditAlerts = ar.filter(r => {
        if (!r.due_date) return false;
        const daysPast = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
        return daysPast > 30;
      }).length;
      const collectionEff = invoiced > 0 ? Math.round((received / invoiced) * 100) : 0;
      const arTurnover = outstanding > 0 ? Number((invoiced / outstanding).toFixed(1)) : 0;

      setKpis({ invoiced, received, outstanding, creditAlerts, arTurnover, collectionEff });

      // Build AR aging by customer
      const customerMap = new Map<string, { amount: number; oldestDue: number }>();
      ar.filter(r => r.status !== "paid" && r.balance > 0).forEach(r => {
        const cid = r.customer_id || "unknown";
        const days = r.due_date ? Math.max(0, Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000)) : 0;
        const existing = customerMap.get(cid);
        if (existing) {
          existing.amount += r.balance;
          existing.oldestDue = Math.max(existing.oldestDue, days);
        } else {
          customerMap.set(cid, { amount: r.balance, oldestDue: days });
        }
      });

      const records: ARRecord[] = Array.from(customerMap.entries()).map(([id, v]) => ({
        name: id.substring(0, 12) + "...",
        amount: v.amount,
        days: v.oldestDue,
        risk: v.oldestDue > 30 ? "high" : v.oldestDue > 14 ? "medium" : "low",
      })).sort((a, b) => b.amount - a.amount).slice(0, 10);

      setArRecords(records);
      setLoading(false);
    };
    fetchData();
  }, [range]);

  const fmt = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`;

  const financeKPIs = [
    { label: "Invoices Issued MTD", value: fmt(kpis.invoiced), icon: Receipt, color: "text-blue-600" },
    { label: "Payments Received", value: fmt(kpis.received), icon: CheckCircle, color: "text-green-600" },
    { label: "Outstanding Balance", value: fmt(kpis.outstanding), icon: Clock, color: "text-orange-600" },
    { label: "Credit Risk Alerts", value: String(kpis.creditAlerts), icon: AlertTriangle, color: "text-red-600" },
    { label: "AR Turnover", value: `${kpis.arTurnover}x`, icon: TrendingUp, color: "text-teal-600" },
    { label: "Collection Efficiency", value: `${kpis.collectionEff}%`, icon: CreditCard, color: "text-purple-600" },
  ];

  const exportColumns = [
    { key: "name", label: "Customer" },
    { key: "amount", label: "Outstanding (₦)", format: (v: number) => `₦${v.toLocaleString()}` },
    { key: "days", label: "Days Overdue" },
    { key: "risk", label: "Risk Level" },
  ];

  return (
    <FMCGLayout title="Finance Dashboard" subtitle="Invoices, payments, collections & credit risk intelligence">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <AnalyticsDateFilterBar
          range={range}
          periodType={periodType}
          onPeriodChange={changePeriod}
          onBack={goBack}
          onForward={goForward}
          canGoForward={offset < 0}
        />
        <ExportDropdown options={{ title: "FMCG Finance Report", columns: exportColumns, data: arRecords, periodLabel: range.label }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {financeKPIs.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="pt-6">
                  <kpi.icon className={`w-6 h-6 ${kpi.color} mb-2`} />
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Outstanding Accounts - Aging Analysis</CardTitle></CardHeader>
            <CardContent>
              {arRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No outstanding accounts</p>
                  <p className="text-xs text-muted-foreground mt-1">Create invoices and track receivables to see aging analysis here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {arRecords.map((a) => (
                    <div key={a.name} className="flex items-center gap-4 py-3 border-b last:border-0">
                      <span className="flex-1 font-medium">{a.name}</span>
                      <span className="text-sm font-semibold w-24">₦{a.amount.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground w-20">{a.days} days</span>
                      <Badge variant={a.risk === "high" ? "destructive" : a.risk === "medium" ? "secondary" : "default"}>{a.risk} risk</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </FMCGLayout>
  );
};

export default FMCGFinance;
