import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, Brain,
  ShieldCheck, Truck, Wallet, Target, Activity, Shield, Zap,
  ArrowUpRight, ArrowDownRight, BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

type Period = "7d" | "30d" | "90d" | "ytd";

export default function FinanceIntelligenceEngine() {
  const [period, setPeriod] = useState<Period>("30d");
  const [stressScenario, setStressScenario] = useState<string>("normal");
  const { organizationId, tenantMode } = useAuth();

  // Period -> ISO start date for time-bounded queries
  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "ytd") return new Date(now.getFullYear(), 0, 1).toISOString();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    return new Date(now.getTime() - days * 86400000).toISOString();
  }, [period]);

  // ─── Tenant guard: ensures any row with mismatched org_id is dropped client-side
  // even if RLS were misconfigured. Belt-and-suspenders against cross-tenant leak.
  const guardOrg = (rows: any): any[] =>
    (rows || []).filter((r: any) => !r?.organization_id || r.organization_id === organizationId);

  // ─── Data Fetching (org-scoped + RLS-enforced + client guard) ─────────────────
  const invoicesQ = useQuery({
    queryKey: ["fie-invoices", organizationId, periodStart],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices")
        .select("id, organization_id, total_amount, status, invoice_date, due_date, customer_id, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return guardOrg(data);
    },
  });
  const invoices = invoicesQ.data || [];

  const expensesQ = useQuery({
    queryKey: ["fie-expenses", organizationId, periodStart],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses")
        .select("id, organization_id, amount, category, expense_date, approval_status, created_at")
        .eq("organization_id", organizationId!)
        .eq("approval_status", "approved")
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return guardOrg(data);
    },
  });
  const expenses = expensesQ.data || [];

  const arQ = useQuery({
    queryKey: ["fie-ar", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_receivable").select("*")
        .eq("organization_id", organizationId!)
        .neq("status", "paid").neq("status", "cancelled");
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const arData = arQ.data || [];

  const apQ = useQuery({
    queryKey: ["fie-ap", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_payable").select("*")
        .eq("organization_id", organizationId!)
        .neq("status", "paid").neq("status", "cancelled");
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const apData = apQ.data || [];

  const fundingQ = useQuery({
    queryKey: ["fie-funding", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("capital_funding").select("*")
        .eq("organization_id", organizationId!)
        .eq("status", "active");
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const funding = fundingQ.data || [];

  const repaymentsQ = useQuery({
    queryKey: ["fie-repayments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("capital_repayments").select("*")
        .eq("organization_id", organizationId!)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const repayments = repaymentsQ.data || [];

  const glQ = useQuery({
    queryKey: ["fie-gl", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_ledger").select("*")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const glData = glQ.data || [];

  const vehiclesQ = useQuery({
    queryKey: ["fie-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles")
        .select("id, organization_id, truck_type, status, registration_number")
        .eq("organization_id", organizationId!).limit(200);
      if (error) throw error;
      return guardOrg(data);
    },
  });
  const vehicles = vehiclesQ.data || [];

  const dispatchesQ = useQuery({
    queryKey: ["fie-dispatches", organizationId, periodStart],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("dispatches")
        .select("id, organization_id, vehicle_id, cost, status, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", periodStart).limit(500);
      if (error) throw error;
      return guardOrg(data);
    },
  });
  const dispatches = dispatchesQ.data || [];

  const billsQ = useQuery({
    queryKey: ["fie-bills", organizationId, periodStart],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bills")
        .select("id, organization_id, total_amount, payment_status, category, bill_date, due_date")
        .eq("organization_id", organizationId!)
        .gte("bill_date", periodStart.slice(0, 10)).limit(500);
      if (error) throw error;
      return guardOrg(data as any);
    },
  });
  const bills = billsQ.data || [];

  // Aggregate query state for per-tab loading/error
  const allQueries = [invoicesQ, expensesQ, arQ, apQ, fundingQ, repaymentsQ, glQ, vehiclesQ, dispatchesQ, billsQ];
  const isLoadingAny = allQueries.some(q => q.isLoading);
  const firstError = allQueries.find(q => q.error)?.error as Error | undefined;
  const tabState = (extras: Array<{ isLoading: boolean; error?: unknown }> = []) => ({
    loading: isLoadingAny || extras.some(e => e.isLoading),
    error: firstError || (extras.find(e => e.error)?.error as Error | undefined),
  });

  // ─── Core Financial Computations ───────────────────────────────
  const financials = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const pendingRevenue = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paidBills = bills.filter(b => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalOutflows = totalExpenses + paidBills;

    const accountingProfit = totalRevenue - totalOutflows;
    const arOutstanding = arData.reduce((s, e) => s + Number(e.balance || 0), 0);
    const apOutstanding = apData.reduce((s, e) => s + Number(e.balance || 0), 0);

    // Cash position from GL (case-insensitive account match)
    const cashBalance = glData
      .filter(e => {
        const name = String(e.account_name || "").toLowerCase();
        return name === "cash" || name === "bank" || name.includes("cash") || name.includes("bank");
      })
      .reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0);

    const cashInflow = totalRevenue;
    const cashOutflow = totalOutflows;
    const freeCashFlow = cashInflow - cashOutflow;

    // Debt metrics
    const totalDebt = funding.reduce((s, f) => s + Number(f.amount || 0), 0);
    const totalRepaid = funding.reduce((s, f) => s + Number(f.total_repaid || 0), 0);
    const remainingDebt = totalDebt - totalRepaid;
    const monthlyRepayment = repayments
      .filter(r => r.status === "pending" || r.status === "upcoming")
      .slice(0, 1)
      .reduce((s, r) => s + Number(r.net_payable || 0), 0);

    const debtToInflowRatio = cashInflow > 0 ? (monthlyRepayment / cashInflow) * 100 : 0;
    const profitToRepaymentRatio = monthlyRepayment > 0 ? accountingProfit / monthlyRepayment : Infinity;

    return {
      totalRevenue, pendingRevenue, totalExpenses, paidBills, totalOutflows,
      accountingProfit, arOutstanding, apOutstanding, cashBalance, freeCashFlow,
      totalDebt, totalRepaid, remainingDebt, monthlyRepayment,
      debtToInflowRatio, profitToRepaymentRatio, cashInflow, cashOutflow,
    };
  }, [invoices, expenses, arData, apData, glData, funding, repayments, bills]);

  // ─── Stress Test Engine ────────────────────────────────────────
  const stressResults = useMemo(() => {
    const base = { ...financials };
    const scenarios: Record<string, { label: string; cashInflow: number; expenses: number; profit: number; status: string }> = {
      normal: {
        label: "Normal Operations",
        cashInflow: base.cashInflow,
        expenses: base.totalOutflows,
        profit: base.accountingProfit,
        status: "healthy",
      },
      payment_delay: {
        label: "50% Payment Delay",
        cashInflow: base.cashInflow * 0.5,
        expenses: base.totalOutflows,
        profit: base.cashInflow * 0.5 - base.totalOutflows,
        status: base.cashInflow * 0.5 - base.totalOutflows > 0 ? "warning" : "critical",
      },
      utilization_drop: {
        label: "30% Utilization Drop",
        cashInflow: base.cashInflow * 0.7,
        expenses: base.totalOutflows * 0.85,
        profit: base.cashInflow * 0.7 - base.totalOutflows * 0.85,
        status: base.cashInflow * 0.7 - base.totalOutflows * 0.85 > 0 ? "warning" : "critical",
      },
      cost_spike: {
        label: "20% Cost Increase",
        cashInflow: base.cashInflow,
        expenses: base.totalOutflows * 1.2,
        profit: base.cashInflow - base.totalOutflows * 1.2,
        status: base.cashInflow - base.totalOutflows * 1.2 > 0 ? "warning" : "critical",
      },
      worst_case: {
        label: "Combined Worst Case",
        cashInflow: base.cashInflow * 0.5,
        expenses: base.totalOutflows * 1.2,
        profit: base.cashInflow * 0.5 - base.totalOutflows * 1.2,
        status: "critical",
      },
    };
    return scenarios;
  }, [financials]);

  // ─── Fleet Growth Simulator (live data only - no synthetic fallbacks) ──
  const fleetSimulation = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === "active").length;
    const profitPerTruck = activeVehicles > 0 ? financials.accountingProfit / activeVehicles : 0;
    const loanPerTruck = financials.monthlyRepayment > 0 && funding.length > 0
      ? financials.monthlyRepayment / funding.length
      : 0;

    const months: Array<{ month: number; trucks: number; profit: number; debt: number; cashFlow: number }> = [];

    if (activeVehicles === 0 || profitPerTruck === 0) {
      return { months, profitPerTruck, loanPerTruck, currentFleet: activeVehicles, hasData: false };
    }

    let trucks = activeVehicles;
    let cumulativeDebt = financials.remainingDebt;

    for (let m = 1; m <= 12; m++) {
      const monthProfit = trucks * profitPerTruck;
      const monthRepayment = trucks * loanPerTruck * 0.3;
      const netCash = monthProfit - monthRepayment;

      if (m % 3 === 0 && monthProfit >= 2 * monthRepayment && netCash > loanPerTruck) {
        trucks += 1;
        cumulativeDebt += loanPerTruck * 12;
      }

      cumulativeDebt = Math.max(0, cumulativeDebt - monthRepayment);
      months.push({ month: m, trucks, profit: monthProfit, debt: cumulativeDebt, cashFlow: netCash });
    }
    return { months, profitPerTruck, loanPerTruck, currentFleet: activeVehicles, hasData: true };
  }, [vehicles, financials, funding]);

  // ─── Tax Engine (FIRS) ─────────────────────────────────────────
  const taxComputation = useMemo(() => {
    const taxableProfit = Math.max(0, financials.accountingProfit);
    const revenue = financials.totalRevenue;

    const cit = taxableProfit * 0.30;
    const tet = taxableProfit * 0.025;
    const minimumTax = revenue * 0.005;
    const appliedCIT = Math.max(cit, minimumTax);

    // VAT
    const outputVAT = invoices.reduce((s, i) => s + Number(i.total_amount || 0) * 0.075, 0);
    const inputVAT = expenses.reduce((s, e) => s + Number(e.amount || 0) * 0.075 * 0.3, 0); // estimated
    const netVAT = outputVAT - inputVAT;

    const totalTax = appliedCIT + tet + Math.max(0, netVAT);

    return { cit, tet, minimumTax, appliedCIT, outputVAT, inputVAT, netVAT, totalTax, taxableProfit };
  }, [financials, invoices, expenses]);

  // ─── AR Aging & Client Intelligence ────────────────────────────
  const arIntelligence = useMemo(() => {
    const now = new Date();
    const clients: Record<string, { total: number; current: number; delayed: number; over90: number }> = {};

    arData.forEach(ar => {
      const key = ar.customer_id || "unknown";
      if (!clients[key]) clients[key] = { total: 0, current: 0, delayed: 0, over90: 0 };
      const bal = Number(ar.balance || 0);
      const due = ar.due_date ? new Date(ar.due_date) : new Date(ar.posting_date);
      const daysPast = Math.floor((now.getTime() - due.getTime()) / 86400000);

      clients[key].total += bal;
      if (daysPast <= 0) clients[key].current += bal;
      else if (daysPast <= 90) clients[key].delayed += bal;
      else clients[key].over90 += bal;
    });

    const fastPaying = Object.entries(clients).filter(([, v]) => v.current / Math.max(v.total, 1) > 0.7);
    const slowPaying = Object.entries(clients).filter(([, v]) => v.delayed / Math.max(v.total, 1) > 0.5 || v.over90 > 0);

    return { clients, fastPaying: fastPaying.length, slowPaying: slowPaying.length };
  }, [arData]);

  // ─── AI Decision Engine ────────────────────────────────────────
  const aiInsights = useMemo(() => {
    const insights: Array<{ type: "success" | "warning" | "critical"; title: string; detail: string; action: string }> = [];

    // Cash vs Profit gap
    if (financials.freeCashFlow < financials.accountingProfit * 0.5) {
      insights.push({
        type: "warning",
        title: "Cash ≠ Profit Gap Detected",
        detail: `Accounting profit is ${fmt(financials.accountingProfit)} but free cash flow is only ${fmt(financials.freeCashFlow)}. ${fmt(financials.arOutstanding)} locked in receivables.`,
        action: "Accelerate AR collections. Consider offering early-payment discounts.",
      });
    }

    // Debt pressure
    if (financials.debtToInflowRatio > 40) {
      insights.push({
        type: "critical",
        title: "Debt Pressure Exceeds Safe Limit",
        detail: `Debt repayment is ${financials.debtToInflowRatio.toFixed(1)}% of cash inflow (safe: ≤40%).`,
        action: "Pause new asset acquisitions. Negotiate longer repayment terms.",
      });
    }

    // Profit < 2x repayment
    if (financials.profitToRepaymentRatio < 2 && financials.monthlyRepayment > 0) {
      insights.push({
        type: "critical",
        title: "Profit Below 2× Debt Repayment",
        detail: `Monthly profit covers only ${financials.profitToRepaymentRatio.toFixed(1)}× loan repayments. Rule: must be ≥2×.`,
        action: "Block new truck purchases. Shift loads to 3PL to preserve cash.",
      });
    }

    // Cash buffer
    const requiredBuffer = financials.monthlyRepayment * 3;
    if (financials.cashBalance < requiredBuffer && financials.monthlyRepayment > 0) {
      insights.push({
        type: "critical",
        title: "Cash Buffer Below Safety Threshold",
        detail: `Cash: ${fmt(financials.cashBalance)}. Required buffer (3× debt): ${fmt(requiredBuffer)}.`,
        action: "Build emergency reserve before any expansion. Reduce discretionary spend.",
      });
    }

    // Slow-paying clients
    if (arIntelligence.slowPaying > 0) {
      insights.push({
        type: "warning",
        title: `${arIntelligence.slowPaying} Slow-Paying Clients Detected`,
        detail: "Clients with >50% delayed or 90+ day receivables risk cash flow.",
        action: "Assign 3PL-only for delayed-paying clients. Fast-paying clients get owned trucks.",
      });
    }

    // Healthy
    if (insights.length === 0) {
      insights.push({
        type: "success",
        title: "Financial Health: Strong",
        detail: "Cash flow, debt ratios, and receivables are within safe ranges.",
        action: "Continue monitoring. Consider fleet expansion if utilization >85%.",
      });
    }

    return insights;
  }, [financials, arIntelligence]);

  // ─── Utilization ───────────────────────────────────────────────
  const utilization = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === "active").length;
    const tripsThisMonth = dispatches.filter(d => {
      const created = new Date(d.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const avgTripsPerTruck = activeVehicles > 0 ? tripsThisMonth / activeVehicles : 0;
    const utilizationRate = Math.min(100, avgTripsPerTruck / 20 * 100); // 20 trips/month = 100%

    return { activeVehicles, tripsThisMonth, avgTripsPerTruck, utilizationRate };
  }, [vehicles, dispatches]);

  // ─── Risk Level ────────────────────────────────────────────────
  const riskLevel = useMemo(() => {
    const criticalCount = aiInsights.filter(i => i.type === "critical").length;
    if (criticalCount >= 2) return { level: "Critical", color: "text-destructive", bg: "bg-destructive/10" };
    if (criticalCount >= 1 || aiInsights.some(i => i.type === "warning")) return { level: "Moderate", color: "text-amber-600", bg: "bg-amber-500/10" };
    return { level: "Low", color: "text-green-600", bg: "bg-green-500/10" };
  }, [aiInsights]);

  const selectedStress = stressResults[stressScenario] || stressResults.normal;

  // Aggregate "any data?" check - if all live sources are empty for this org
  // we render an explicit empty state instead of misleading ₦0 metrics.
  const hasAnyData =
    invoices.length + expenses.length + arData.length + apData.length +
    funding.length + repayments.length + glData.length + vehicles.length +
    dispatches.length + bills.length > 0;

  // Per-tab state shell - renders skeleton or error so users don't see ₦0 metrics during loads.
  const TabShell = ({ children }: { children: React.ReactNode }) => {
    if (!organizationId) {
      return (
        <div className="p-6 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> No tenant context - sign in to load live data.
        </div>
      );
    }
    if (isLoadingAny) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
          <Activity className="w-4 h-4 animate-pulse" /> Loading live, tenant-scoped data…
        </div>
      );
    }
    if (firstError) {
      return (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load data: {firstError.message}
        </div>
      );
    }
    return <>{children}</>;
  };

  // ─── AI Decision Inputs panel - surfaces the live figures the AI is reasoning over,
  // strictly tenant-scoped and period-aware. Visible in Stress Test and AI Decisions tabs.
  const DecisionInputs = () => (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI Decision Inputs (live · {period} · org {organizationId?.slice(0, 8)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {[
            { k: "Invoices (period)", v: `${invoices.length} · ${fmt(financials.totalRevenue + financials.pendingRevenue)}` },
            { k: "Expenses (approved)", v: `${expenses.length} · ${fmt(financials.totalExpenses)}` },
            { k: "Bills paid", v: `${bills.filter((b: any) => b.payment_status === "paid").length} · ${fmt(financials.paidBills)}` },
            { k: "Cash (GL)", v: fmt(financials.cashBalance) },
            { k: "Vehicles active / total", v: `${vehicles.filter((v: any) => v.status === "active").length} / ${vehicles.length}` },
            { k: "Dispatches (period)", v: `${dispatches.length}` },
            { k: "AR open", v: `${arData.length} · ${fmt(financials.arOutstanding)}` },
            { k: "AP open", v: `${apData.length} · ${fmt(financials.apOutstanding)}` },
            { k: "Funding active", v: `${funding.length} · ${fmt(financials.totalDebt)}` },
            { k: "Next repayment", v: fmt(financials.monthlyRepayment) },
          ].map((row) => (
            <div key={row.k} className="p-2 rounded-md bg-background/60 border border-border/40">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.k}</p>
              <p className="font-semibold mt-0.5 truncate">{row.v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Scenario: <span className="font-medium">{stressScenario}</span> · All figures filtered by <span className="font-mono">organization_id = {organizationId?.slice(0, 8)}…</span> with a client-side guard rejecting any cross-tenant row that bypasses RLS.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* ─── Top Controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className={`${riskLevel.bg} ${riskLevel.color} border-0`}>
          <Shield className="w-3 h-3 mr-1" /> Risk: {riskLevel.level}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" /> Live · {tenantMode === "LOGISTICS_COMPANY" ? "LC" : tenantMode === "LOGISTICS_DEPARTMENT" ? "LD" : tenantMode}
        </Badge>
        {organizationId && (
          <Badge variant="outline" className="text-muted-foreground font-mono text-[10px]">
            org · {organizationId.slice(0, 8)}
          </Badge>
        )}
      </div>

      {!organizationId && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No organization context. Sign in as a member of an LC organization to load live financial data.
          </CardContent>
        </Card>
      )}

      {organizationId && !hasAnyData && (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" />
            No financial activity recorded yet for this organization. Metrics will populate as invoices, expenses, dispatches and funding records are created - strictly scoped to your tenant.
          </CardContent>
        </Card>
      )}

      {/* ─── Core Metrics Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Revenue", value: financials.totalRevenue, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Net Profit", value: financials.accountingProfit, icon: TrendingUp, color: financials.accountingProfit >= 0 ? "text-green-500" : "text-destructive", bg: financials.accountingProfit >= 0 ? "bg-green-500/10" : "bg-destructive/10" },
          { label: "Free Cash Flow", value: financials.freeCashFlow, icon: Wallet, color: financials.freeCashFlow >= 0 ? "text-blue-500" : "text-destructive", bg: financials.freeCashFlow >= 0 ? "bg-blue-500/10" : "bg-destructive/10" },
          { label: "Receivables", value: financials.arOutstanding, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Payables", value: financials.apOutstanding, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Total Debt", value: financials.remainingDebt, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-md ${k.bg}`}><k.icon className={`w-3.5 h-3.5 ${k.color}`} /></div>
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-lg font-bold">{fmt(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Main Tabbed Content ──────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><Activity className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="debt"><Wallet className="w-3.5 h-3.5 mr-1" />Debt & Financing</TabsTrigger>
          <TabsTrigger value="fleet"><Truck className="w-3.5 h-3.5 mr-1" />Fleet Growth</TabsTrigger>
          <TabsTrigger value="tax"><ShieldCheck className="w-3.5 h-3.5 mr-1" />Tax Engine</TabsTrigger>
          <TabsTrigger value="stress"><AlertTriangle className="w-3.5 h-3.5 mr-1" />Stress Test</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="w-3.5 h-3.5 mr-1" />AI Decisions</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ───────────────────────────────────── */}
        <TabsContent value="overview">
          <TabShell>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash vs Profit */}
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cash vs Profit Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Accounting Profit</span>
                    <span className={`font-bold ${financials.accountingProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(financials.accountingProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Cash Position</span>
                    <span className={`font-bold ${financials.cashBalance >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(financials.cashBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Free Cash Flow</span>
                    <span className={`font-bold ${financials.freeCashFlow >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(financials.freeCashFlow)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-sm">Locked in Receivables</span>
                    <span className="font-bold text-amber-600">{fmt(financials.arOutstanding)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Utilization */}
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Utilization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{utilization.utilizationRate.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">Fleet Utilization Rate</p>
                </div>
                <Progress value={utilization.utilizationRate} className="h-3" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-lg font-bold">{utilization.activeVehicles}</p><p className="text-xs text-muted-foreground">Active Trucks</p></div>
                  <div><p className="text-lg font-bold">{utilization.tripsThisMonth}</p><p className="text-xs text-muted-foreground">Trips (MTD)</p></div>
                  <div><p className="text-lg font-bold">{utilization.avgTripsPerTruck.toFixed(1)}</p><p className="text-xs text-muted-foreground">Trips/Truck</p></div>
                </div>
                {utilization.utilizationRate < 70 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low utilization. Do NOT acquire new assets until ≥85%.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PnL Structure */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">P&L Structure</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Revenue</TableCell><TableCell className="text-right font-bold text-green-600">{fmt(financials.totalRevenue)}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium text-muted-foreground pl-6">− Operational Expenses</TableCell><TableCell className="text-right text-destructive">({fmt(financials.totalExpenses)})</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium text-muted-foreground pl-6">− Paid Bills</TableCell><TableCell className="text-right text-destructive">({fmt(financials.paidBills)})</TableCell></TableRow>
                    <TableRow className="border-t-2"><TableCell className="font-bold">Net Profit</TableCell><TableCell className={`text-right font-bold text-lg ${financials.accountingProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(financials.accountingProfit)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          </TabShell>
        </TabsContent>

        {/* ─── DEBT TAB ───────────────────────────────────────── */}
        <TabsContent value="debt">
          <TabShell>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Debt Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Debt</p>
                    <p className="text-xl font-bold">{fmt(financials.totalDebt)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-xl font-bold">{fmt(financials.remainingDebt)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Monthly Repayment</p>
                    <p className="text-xl font-bold">{fmt(financials.monthlyRepayment)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Debt-to-Inflow</p>
                    <p className={`text-xl font-bold ${financials.debtToInflowRatio > 40 ? "text-destructive" : "text-green-600"}`}>{financials.debtToInflowRatio.toFixed(1)}%</p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${financials.debtToInflowRatio > 40 ? "bg-destructive/10 border-destructive/30" : "bg-green-500/10 border-green-500/30"}`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {financials.debtToInflowRatio > 40 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-green-600" />}
                    <span>{financials.debtToInflowRatio > 40 ? "UNSAFE: Debt repayment exceeds 40% of inflow" : "SAFE: Debt ratio within limits (≤40%)"}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${financials.profitToRepaymentRatio < 2 ? "bg-destructive/10 border-destructive/30" : "bg-green-500/10 border-green-500/30"}`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {financials.profitToRepaymentRatio < 2 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-green-600" />}
                    <span>Profit/Repayment: {financials.profitToRepaymentRatio === Infinity ? "∞" : `${financials.profitToRepaymentRatio.toFixed(1)}×`} (min: 2×)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Loans */}
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Active Funding ({funding.length})</CardTitle></CardHeader>
              <CardContent>
                {funding.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No active funding records</div>
                ) : (
                  <div className="space-y-3">
                    {funding.map(f => {
                      const remaining = Number(f.amount || 0) - Number(f.total_repaid || 0);
                      const progress = Number(f.amount) > 0 ? (Number(f.total_repaid || 0) / Number(f.amount)) * 100 : 0;
                      return (
                        <div key={f.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{f.investor_name}</span>
                            <Badge variant="outline">{f.funding_type}</Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Principal: {fmt(Number(f.amount))}</span>
                            <span>Remaining: {fmt(remaining)}</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabShell>
        </TabsContent>

        {/* ─── FLEET GROWTH TAB ───────────────────────────────── */}
        <TabsContent value="fleet">
          <TabShell>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">12-Month Fleet Growth Projection</CardTitle></CardHeader>
              <CardContent>
                {fleetSimulation.hasData ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fleetSimulation.months}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(m) => `M${m}`} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`} />
                        <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(m) => `Month ${m}`} />
                        <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Monthly Profit" />
                        <Area type="monotone" dataKey="cashFlow" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.1)" name="Net Cash Flow" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-2">
                    <Truck className="w-8 h-8 opacity-50" />
                    <p>Fleet projection requires at least 1 active vehicle and recorded profit.</p>
                    <p className="text-xs">Add vehicles and close paid invoices to unlock the simulator.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Scaling Timeline</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Trucks</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Debt</TableHead>
                      <TableHead>Cash Flow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetSimulation.months.filter((_, i) => i % 3 === 2 || i === 0).map(m => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">M{m.month}</TableCell>
                        <TableCell><Badge variant="outline">{m.trucks}</Badge></TableCell>
                        <TableCell className="text-green-600">{fmt(m.profit)}</TableCell>
                        <TableCell className="text-amber-600">{fmt(m.debt)}</TableCell>
                        <TableCell className={m.cashFlow >= 0 ? "text-green-600" : "text-destructive"}>{fmt(m.cashFlow)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p><strong>Current Fleet:</strong> {fleetSimulation.currentFleet} vehicles</p>
                  <p><strong>Profit/Truck:</strong> {fmt(fleetSimulation.profitPerTruck)}/mo</p>
                  <p><strong>Projected (12mo):</strong> {fleetSimulation.months[11]?.trucks || fleetSimulation.currentFleet} vehicles</p>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabShell>
        </TabsContent>

        {/* ─── TAX ENGINE TAB ─────────────────────────────────── */}
        <TabsContent value="tax">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">🇳🇬 FIRS Tax Computation</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Taxable Profit</TableCell><TableCell className="text-right font-bold">{fmt(taxComputation.taxableProfit)}</TableCell></TableRow>
                    <TableRow><TableCell>CIT (30%)</TableCell><TableCell className="text-right">{fmt(taxComputation.cit)}</TableCell></TableRow>
                    <TableRow><TableCell>Minimum Tax (0.5% Revenue)</TableCell><TableCell className="text-right">{fmt(taxComputation.minimumTax)}</TableCell></TableRow>
                    <TableRow className="bg-muted/50"><TableCell className="font-medium">Applied CIT (higher of above)</TableCell><TableCell className="text-right font-bold">{fmt(taxComputation.appliedCIT)}</TableCell></TableRow>
                    <TableRow><TableCell>TET (2.5%)</TableCell><TableCell className="text-right">{fmt(taxComputation.tet)}</TableCell></TableRow>
                    <TableRow><TableCell>Output VAT</TableCell><TableCell className="text-right">{fmt(taxComputation.outputVAT)}</TableCell></TableRow>
                    <TableRow><TableCell>Input VAT (Credit)</TableCell><TableCell className="text-right text-green-600">({fmt(taxComputation.inputVAT)})</TableCell></TableRow>
                    <TableRow><TableCell>Net VAT Payable</TableCell><TableCell className="text-right">{fmt(Math.max(0, taxComputation.netVAT))}</TableCell></TableRow>
                    <TableRow className="border-t-2 bg-primary/5"><TableCell className="font-bold text-lg">Total Tax Liability</TableCell><TableCell className="text-right font-bold text-lg text-destructive">{fmt(taxComputation.totalTax)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tax Optimization Insights</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1"><Brain className="w-4 h-4 text-blue-500" /> Capital Allowance</div>
                  <p className="text-muted-foreground">Buying fleet assets reduces taxable profit. Each truck acquisition creates capital allowance deductions.</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1"><ShieldCheck className="w-4 h-4 text-green-600" /> WHT Credits</div>
                  <p className="text-muted-foreground">Withholding tax deducted at source counts as credit against CIT liability.</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> Provision Recommendation</div>
                  <p className="text-muted-foreground">Set aside {fmt(taxComputation.totalTax / 12)}/month for tax provisioning to avoid year-end surprises.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── STRESS TEST TAB ────────────────────────────────── */}
        <TabsContent value="stress">
          <TabShell>
            <div className="space-y-4">
              <DecisionInputs />
            <div className="flex flex-wrap gap-2">
              {Object.entries(stressResults).map(([key, val]) => (
                <Button key={key} variant={stressScenario === key ? "default" : "outline"} size="sm" onClick={() => setStressScenario(key)}>
                  {val.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cash Inflow</p>
                  <p className="text-2xl font-bold">{fmt(selectedStress.cashInflow)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-2xl font-bold text-destructive">{fmt(selectedStress.expenses)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Position</p>
                  <p className={`text-2xl font-bold ${selectedStress.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(selectedStress.profit)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className={`border-border/50 ${selectedStress.status === "critical" ? "border-destructive/50" : selectedStress.status === "warning" ? "border-amber-500/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {selectedStress.status === "critical" ? (
                    <div className="p-3 rounded-full bg-destructive/10"><AlertTriangle className="w-6 h-6 text-destructive" /></div>
                  ) : selectedStress.status === "warning" ? (
                    <div className="p-3 rounded-full bg-amber-500/10"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                  ) : (
                    <div className="p-3 rounded-full bg-green-500/10"><ShieldCheck className="w-6 h-6 text-green-600" /></div>
                  )}
                  <div>
                    <p className="font-bold text-lg">{selectedStress.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStress.status === "critical" ? "Business cannot service debt under this scenario. Immediate action required." :
                       selectedStress.status === "warning" ? "Margins compressed. Pause expansion and review costs." :
                       "Business is healthy under normal operating conditions."}
                    </p>
                  </div>
                  <Badge className={`ml-auto ${selectedStress.status === "critical" ? "bg-destructive" : selectedStress.status === "warning" ? "bg-amber-500" : "bg-green-500"}`}>
                    {selectedStress.status.toUpperCase()}
                  </Badge>
                </div>
                {selectedStress.profit < 0 && financials.monthlyRepayment > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive font-medium">
                    ⚠️ Cannot service debt repayment of {fmt(financials.monthlyRepayment)}/month. Survival at risk.
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabShell>
        </TabsContent>

        {/* ─── AI DECISIONS TAB ───────────────────────────────── */}
        <TabsContent value="ai">
          <TabShell>
            <div className="space-y-4">
              <DecisionInputs />
              {aiInsights.map((insight, i) => (
                <Card key={i} className={`border-border/50 ${insight.type === "critical" ? "border-destructive/30" : insight.type === "warning" ? "border-amber-500/30" : "border-green-500/30"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${
                        insight.type === "critical" ? "bg-destructive/10" : insight.type === "warning" ? "bg-amber-500/10" : "bg-green-500/10"
                      }`}>
                        {insight.type === "critical" ? <AlertTriangle className="w-5 h-5 text-destructive" /> :
                         insight.type === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                         <ShieldCheck className="w-5 h-5 text-green-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{insight.detail}</p>
                        <div className="mt-2 p-2 rounded-lg bg-primary/5 text-sm flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          <span className="font-medium">Action: {insight.action}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
