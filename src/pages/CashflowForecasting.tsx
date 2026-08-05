import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, Brain, Download, ShieldCheck, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

// Note: COGS/OPEX split is driven by the expenses.is_cogs flag platform-wide.
// This page only needs total burn, so it sums all approved expenses.

export default function CashflowForecasting() {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [saving, setSaving] = useState(false);

  // AR = outstanding (unpaid) invoices — same live source as Accounts Ledger.
  // accounts_receivable/accounts_payable/accounting_ledger are never written
  // to by the invoice/bill flow, so this page previously always showed zero
  // (and had no organization_id scoping at all, leaking data across orgs).
  const { data: invoices = [] } = useQuery({
    queryKey: ["cf-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, subtotal, total_amount, status, due_date, invoice_date, created_at, customers(company_name)")
        .eq("organization_id", organizationId)
        // Draft invoices are unissued — they are not collectable receivables.
        .not("status", "in", '("cancelled","draft")');
      return data || [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["cf-bills", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("id, bill_number, total_amount, payment_status, due_date, bill_date, created_at, vendor_name")
        .eq("organization_id", organizationId)
        .neq("payment_status", "cancelled");
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["cf-expenses", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, amount, category, expense_date")
        .eq("organization_id", organizationId)
        .eq("approval_status", "approved");
      return data || [];
    },
  });

  // Cash balance — no bank/cash sync exists yet, so the user enters it
  // manually. Persisted as today's snapshot in cash_balance_daily (a table
  // that already exists with org scoping/RLS but was never written to).
  const { data: cashSnapshot, refetch: refetchCash } = useQuery({
    queryKey: ["cf-cash-balance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_balance_daily")
        .select("*")
        .eq("organization_id", organizationId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const cashBalance = Number(cashSnapshot?.closing_balance ?? 0);
  const hasCashBalance = !!cashSnapshot;

  const saveCashBalance = async () => {
    const amount = parseFloat(cashInput);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Invalid amount", description: "Enter a valid cash balance", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("cash_balance_daily").upsert({
        organization_id: organizationId,
        snapshot_date: today,
        opening_balance: amount,
        closing_balance: amount,
        total_inflow: 0,
        total_outflow: 0,
      } as any, { onConflict: "organization_id,snapshot_date" });
      if (error) throw error;
      toast({ title: "Cash balance saved" });
      setCashDialogOpen(false);
      setCashInput("");
      refetchCash();
      qc.invalidateQueries({ queryKey: ["cf-cash-balance", organizationId] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // AR/AP outstanding from live invoices/bills
  const outstandingInvoices = invoices.filter((inv: any) => !["paid", "cancelled"].includes(inv.status));
  const outstandingBills = bills.filter((b: any) => b.payment_status !== "paid");
  const totalArOutstanding = outstandingInvoices.reduce((s, inv: any) => s + (inv.total_amount || 0), 0);
  const totalApOutstanding = outstandingBills.reduce((s, b: any) => s + (b.total_amount || 0), 0);

  // Monthly burn from real expenses (last 30 days), used for cash runway
  const monthlyExpenses = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return expenses
      .filter((e: any) => new Date(e.expense_date) >= cutoff)
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  }, [expenses]);

  const monthlyCashBurn = monthlyExpenses > 0 ? monthlyExpenses : 1;
  const cashRunwayMonths = hasCashBalance && cashBalance > 0 ? Math.round((cashBalance / monthlyCashBurn) * 10) / 10 : 0;

  // AR aging — bucketed by days past due_date (falls back to invoice_date if no due_date)
  const arAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    outstandingInvoices.forEach((inv: any) => {
      const due = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date || inv.created_at);
      const daysPast = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const bal = Number(inv.total_amount || 0);
      if (daysPast <= 0) buckets.current += bal;
      else if (daysPast <= 30) buckets.days30 += bal;
      else if (daysPast <= 60) buckets.days60 += bal;
      else if (daysPast <= 90) buckets.days90 += bal;
      else buckets.over90 += bal;
    });
    return buckets;
  }, [outstandingInvoices]);

  // Collection probability — weighted by aging bucket
  const collectionProbability = totalArOutstanding > 0
    ? Math.round(((arAging.current * 0.95 + arAging.days30 * 0.85 + arAging.days60 * 0.65 + arAging.days90 * 0.40 + arAging.over90 * 0.15) / totalArOutstanding) * 100)
    : 0;

  // AP aging — how much is due within the next 30/90 days, used for forecast outflows
  const apDueWithin = (days: number) => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + days);
    return outstandingBills
      .filter((b: any) => {
        const due = b.due_date ? new Date(b.due_date) : new Date(b.bill_date || b.created_at);
        return due <= cutoff;
      })
      .reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
  };
  const apDue30 = apDueWithin(30);
  const apDue90 = apDueWithin(90);

  // Forecasts: cash + expected AR collections (weighted by collection probability) - AP due in the window
  const forecast30 = hasCashBalance ? cashBalance + (totalArOutstanding * collectionProbability / 100 * 0.4) - apDue30 : null;
  const forecast90 = hasCashBalance ? cashBalance + (totalArOutstanding * collectionProbability / 100) - apDue90 : null;

  const riskLevel = !hasCashBalance ? "Unknown" : cashRunwayMonths > 6 ? "Low" : cashRunwayMonths > 3 ? "Moderate" : "Critical";
  const riskColor = riskLevel === "Low" ? "text-green-600" : riskLevel === "Moderate" ? "text-amber-600" : riskLevel === "Unknown" ? "text-muted-foreground" : "text-destructive";
  const riskBg = riskLevel === "Low" ? "bg-green-500/10" : riskLevel === "Moderate" ? "bg-amber-500/10" : riskLevel === "Unknown" ? "bg-muted/50" : "bg-destructive/10";

  // AI insight
  const insights = useMemo(() => {
    const items: string[] = [];
    if (!hasCashBalance) items.push("💰 Enter your current cash balance to unlock runway and forecast projections.");
    if (arAging.over90 > 0) items.push(`⚠️ ${fmt(arAging.over90)} in receivables are over 90 days past due - collection risk is high.`);
    if (hasCashBalance && cashRunwayMonths < 3) items.push(`🔴 Cash runway is only ${cashRunwayMonths} months. Consider accelerating AR collection or reducing discretionary spend.`);
    if (totalArOutstanding > 0 && collectionProbability < 70) items.push(`📉 AR collection probability is ${collectionProbability}% - aging receivables are dragging down projected inflows.`);
    if (hasCashBalance && totalApOutstanding > cashBalance) items.push(`⚠️ AP outstanding (${fmt(totalApOutstanding)}) exceeds cash balance. Prioritize payables scheduling.`);
    if (items.length === 0) items.push("✅ Cash position is healthy. Continue monitoring AR aging for early risk signals.");
    return items;
  }, [hasCashBalance, arAging, cashRunwayMonths, collectionProbability, totalArOutstanding, totalApOutstanding, cashBalance]);

  return (
    <DashboardLayout title="Cashflow Forecasting AI" subtitle="Predictive cash position with AR aging and runway analysis">
      <div className="flex gap-2 mb-6">
        <Button variant="outline" onClick={() => { setCashInput(cashBalance ? String(cashBalance) : ""); setCashDialogOpen(true); }}>
          <Pencil className="w-4 h-4 mr-1" />{hasCashBalance ? "Update" : "Set"} Cash Balance
        </Button>
        <Button variant="outline"><Download className="w-4 h-4 mr-1" />Export Forecast</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Cash Position", value: hasCashBalance ? fmt(cashBalance) : "Not set", icon: DollarSign, color: hasCashBalance ? "text-green-500" : "text-muted-foreground", bg: hasCashBalance ? "bg-green-500/10" : "bg-muted/50" },
          { label: "Cash Runway", value: hasCashBalance ? `${cashRunwayMonths} months` : "Not set", icon: Clock, color: riskColor, bg: riskBg },
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
            {totalArOutstanding === 0 && <p className="text-center py-4 text-muted-foreground text-sm">No outstanding invoices</p>}
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
              { label: "Current Cash", value: cashBalance, show: hasCashBalance, color: "text-green-600" },
              { label: "30-Day Forecast", value: forecast30 ?? 0, show: hasCashBalance, color: (forecast30 ?? 0) >= 0 ? "text-green-600" : "text-destructive" },
              { label: "90-Day Forecast", value: forecast90 ?? 0, show: hasCashBalance, color: (forecast90 ?? 0) >= 0 ? "text-green-600" : "text-destructive" },
            ].map(f => (
              <div key={f.label} className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{f.label}</span>
                <span className={`text-xl font-bold ${f.show ? f.color : "text-muted-foreground"}`}>{f.show ? fmt(f.value) : "Set cash balance"}</span>
              </div>
            ))}
            <div className={`p-3 rounded-lg flex items-center gap-2 border ${riskBg} ${riskLevel === "Critical" ? "border-destructive/30" : riskLevel === "Moderate" ? "border-amber-500/30" : riskLevel === "Unknown" ? "border-border/50" : "border-green-500/30"}`}>
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

      {/* Set/Update Cash Balance Dialog */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{hasCashBalance ? "Update" : "Set"} Cash Balance</DialogTitle>
            <DialogDescription>
              The platform doesn't sync a bank account yet, so enter your current cash/bank balance manually.
              Runway and forecasts are computed from this figure plus live AR/AP data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cash-balance">Current Cash & Bank Balance (₦)</Label>
            <Input id="cash-balance" type="number" value={cashInput} onChange={e => setCashInput(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCashBalance} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
