import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CashPosition {
  currentBalance: number;
  todayInflow: number;
  todayOutflow: number;
  monthInflow: number;
  monthOutflow: number;
}

export interface ARAgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export interface CashForecastWeek {
  weekLabel: string;
  startDate: string;
  projectedInflow: number;
  projectedOutflow: number;
  netFlow: number;
  cumulativeBalance: number;
}

export interface ClientRisk {
  customerId: string;
  customerName: string;
  outstanding: number;
  avgDaysOverdue: number;
  behavior: string;
  riskScore: number;
}

export interface RiskAlert {
  type: "critical" | "warning" | "info";
  message: string;
  metric?: string;
}

export function useFinancialIntelligence() {
  const { organizationId } = useAuth();
  const orgId = organizationId || null;

  // AR data
  const { data: arData = [] } = useQuery({
    queryKey: ["fi-ar", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("accounts_receivable")
        .select("*, customers(company_name)")
        .eq("organization_id", orgId!)
        .neq("status", "paid")
        .neq("status", "cancelled");
      return data || [];
    },
    staleTime: 60_000,
  });

  // AP data
  const { data: apData = [] } = useQuery({
    queryKey: ["fi-ap", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("accounts_payable")
        .select("*")
        .eq("organization_id", orgId!)
        .neq("status", "paid")
        .neq("status", "cancelled");
      return data || [];
    },
    staleTime: 60_000,
  });

  // GL data for cash position
  const { data: glData = [] } = useQuery({
    queryKey: ["fi-gl", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("accounting_ledger").select("*").eq("organization_id", orgId!);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Invoices for revenue
  const { data: invoices = [] } = useQuery({
    queryKey: ["fi-invoices", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, customers(company_name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ["fi-expenses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", orgId!)
        .order("expense_date", { ascending: false })
        .limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Cash position from GL
  const cashPosition = useMemo<CashPosition>(() => {
    const cashEntries = glData.filter(
      (e: any) => e.account_name === "cash" || e.account_name === "bank"
    );
    const currentBalance = cashEntries.reduce(
      (s: number, e: any) => s + Number(e.debit || 0) - Number(e.credit || 0),
      0
    );
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    const todayInflow = cashEntries
      .filter((e: any) => e.entry_date?.startsWith(todayStr))
      .reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
    const todayOutflow = cashEntries
      .filter((e: any) => e.entry_date?.startsWith(todayStr))
      .reduce((s: number, e: any) => s + Number(e.credit || 0), 0);

    const monthInflow = cashEntries
      .filter((e: any) => e.entry_date?.startsWith(monthStr))
      .reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
    const monthOutflow = cashEntries
      .filter((e: any) => e.entry_date?.startsWith(monthStr))
      .reduce((s: number, e: any) => s + Number(e.credit || 0), 0);

    return { currentBalance, todayInflow, todayOutflow, monthInflow, monthOutflow };
  }, [glData]);

  // AR Aging
  const arAging = useMemo<ARAgingBuckets>(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    arData.forEach((e: any) => {
      const due = e.due_date ? new Date(e.due_date) : new Date(e.posting_date);
      const daysPast = Math.floor((now.getTime() - due.getTime()) / 86400000);
      const bal = Number(e.balance || 0);
      buckets.total += bal;
      if (daysPast <= 0) buckets.current += bal;
      else if (daysPast <= 30) buckets.days30 += bal;
      else if (daysPast <= 60) buckets.days60 += bal;
      else if (daysPast <= 90) buckets.days90 += bal;
      else buckets.over90 += bal;
    });
    return buckets;
  }, [arData]);

  // Collection probability
  const collectionProbability = useMemo(() => {
    if (arAging.total === 0) return 0;
    return Math.round(
      ((arAging.current * 0.95 +
        arAging.days30 * 0.85 +
        arAging.days60 * 0.65 +
        arAging.days90 * 0.4 +
        arAging.over90 * 0.15) /
        arAging.total) *
        100
    );
  }, [arAging]);

  // Total AP outstanding
  const totalAP = useMemo(
    () => apData.reduce((s: number, e: any) => s + Number(e.balance || 0), 0),
    [apData]
  );

  // Monthly expenses
  const monthlyExpenses = useMemo(() => {
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7);
    return expenses
      .filter((e: any) => e.expense_date?.startsWith(monthStr))
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  }, [expenses]);

  // Monthly revenue
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7);
    return invoices
      .filter((i: any) => i.invoice_date?.startsWith(monthStr))
      .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  }, [invoices]);

  // Gross margin
  const grossMargin = monthlyRevenue > 0 ? Math.round(((monthlyRevenue - monthlyExpenses) / monthlyRevenue) * 100) : 0;

  // Cash runway
  const monthlyCashBurn = monthlyExpenses > 0 ? monthlyExpenses : 1;
  const cashRunwayMonths = cashPosition.currentBalance > 0 ? Math.round((cashPosition.currentBalance / monthlyCashBurn) * 10) / 10 : 0;

  // CCC components
  const dso = monthlyRevenue > 0 ? Math.round((arAging.total / (monthlyRevenue / 30)) * 10) / 10 : 0;
  const dpo = monthlyExpenses > 0 ? Math.round((totalAP / (monthlyExpenses / 30)) * 10) / 10 : 0;
  const ccc = dso - dpo; // DIO omitted when no inventory

  // 8-week forecast
  const forecast = useMemo<CashForecastWeek[]>(() => {
    const weeks: CashForecastWeek[] = [];
    let cumulative = cashPosition.currentBalance;
    const weeklyInflow = (arAging.total * collectionProbability) / 100 / 8;
    const weeklyOutflow = (totalAP + monthlyExpenses * 2) / 8;

    for (let i = 0; i < 8; i++) {
      const start = new Date();
      start.setDate(start.getDate() + i * 7);
      const confidenceDecay = 1 - i * 0.05;
      const inflow = weeklyInflow * confidenceDecay;
      const outflow = weeklyOutflow;
      const net = inflow - outflow;
      cumulative += net;

      weeks.push({
        weekLabel: `Week ${i + 1}`,
        startDate: start.toISOString().slice(0, 10),
        projectedInflow: Math.round(inflow),
        projectedOutflow: Math.round(outflow),
        netFlow: Math.round(net),
        cumulativeBalance: Math.round(cumulative),
      });
    }
    return weeks;
  }, [cashPosition.currentBalance, arAging.total, collectionProbability, totalAP, monthlyExpenses]);

  // Client risk profiles
  const clientRisks = useMemo<ClientRisk[]>(() => {
    const map = new Map<string, { name: string; outstanding: number; daysSum: number; count: number }>();
    arData.forEach((e: any) => {
      const cid = e.customer_id || "unknown";
      const name = (e.customers as any)?.company_name || cid.substring(0, 12);
      const days = e.due_date ? Math.max(0, Math.floor((Date.now() - new Date(e.due_date).getTime()) / 86400000)) : 0;
      const bal = Number(e.balance || 0);
      const existing = map.get(cid);
      if (existing) {
        existing.outstanding += bal;
        existing.daysSum += days;
        existing.count++;
      } else {
        map.set(cid, { name, outstanding: bal, daysSum: days, count: 1 });
      }
    });

    return Array.from(map.entries())
      .map(([id, v]) => {
        const avgDays = v.count > 0 ? Math.round(v.daysSum / v.count) : 0;
        const riskScore = Math.min(100, avgDays * 1.2 + (v.outstanding > 1_000_000 ? 20 : 0));
        const behavior = avgDays > 60 ? "delinquent" : avgDays > 30 ? "slow" : avgDays > 0 ? "normal" : "fast";
        return { customerId: id, customerName: v.name, outstanding: v.outstanding, avgDaysOverdue: avgDays, behavior, riskScore };
      })
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 15);
  }, [arData]);

  // Risk alerts
  const riskAlerts = useMemo<RiskAlert[]>(() => {
    const alerts: RiskAlert[] = [];
    if (cashRunwayMonths < 3)
      alerts.push({ type: "critical", message: `Cash runway is only ${cashRunwayMonths} months. Accelerate collections.`, metric: `${cashRunwayMonths}mo` });
    if (arAging.over90 > 0)
      alerts.push({ type: "critical", message: `₦${(arAging.over90 / 1e6).toFixed(1)}M in receivables past 90 days.`, metric: "90+ days" });
    if (totalAP > cashPosition.currentBalance)
      alerts.push({ type: "warning", message: `AP (₦${(totalAP / 1e6).toFixed(1)}M) exceeds cash. Prioritize payables.`, metric: "AP > Cash" });
    if (collectionProbability < 70)
      alerts.push({ type: "warning", message: `Collection probability at ${collectionProbability}% - aging receivables drag inflows.`, metric: `${collectionProbability}%` });
    const negativeWeek = forecast.find((w) => w.cumulativeBalance < 0);
    if (negativeWeek)
      alerts.push({ type: "critical", message: `Cash deficit expected by ${negativeWeek.weekLabel}.`, metric: negativeWeek.weekLabel });
    if (grossMargin < 15)
      alerts.push({ type: "warning", message: `Gross margin at ${grossMargin}% - review cost structure.`, metric: `${grossMargin}%` });
    if (alerts.length === 0)
      alerts.push({ type: "info", message: "Cash position healthy. Continue monitoring AR aging.", metric: "OK" });
    return alerts;
  }, [cashRunwayMonths, arAging, totalAP, cashPosition, collectionProbability, forecast, grossMargin]);

  return {
    cashPosition,
    arAging,
    collectionProbability,
    totalAP,
    monthlyRevenue,
    monthlyExpenses,
    grossMargin,
    cashRunwayMonths,
    dso,
    dpo,
    ccc,
    forecast,
    clientRisks,
    riskAlerts,
    invoices,
    expenses,
  };
}
