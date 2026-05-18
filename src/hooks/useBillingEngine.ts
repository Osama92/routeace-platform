/**
 * useBillingEngine - Unified billing orchestration hook.
 * Aggregates plans, usage events, invoices, and revenue metrics.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export interface BillingPlan {
  id: string;
  planCode: string;
  planName: string;
  pricingModel: string;
  basePrice: number;
  pricePerDrop: number | null;
  pricePerApiCall: number | null;
  currency: string;
  includedDrops: number;
  includedApiCalls: number;
  billingCycle: string;
}

export interface UsageEvent {
  id: string;
  eventType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  referenceType: string | null;
  billingPeriod: string | null;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  billingPeriod: string;
  subscriptionAmount: number;
  usageAmount: number;
  apiAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
}

export interface RevenueSnapshot {
  snapshotDate: string;
  mrr: number;
  usageRevenue: number;
  apiRevenue: number;
  totalRevenue: number;
  activeAccounts: number;
  arpu: number;
}

export interface BillingMetrics {
  // Current period usage
  dropsThisMonth: number;
  apiCallsThisMonth: number;
  aiCreditsThisMonth: number;
  routeOptsThisMonth: number;
  // Costs
  dropCostMTD: number;
  apiCostMTD: number;
  subscriptionCost: number;
  totalRunningCost: number;
  estimatedMonthEnd: number;
  // Revenue
  mrr: number;
  arr: number;
  arpu: number;
  totalRevenueAllTime: number;
  // Savings
  competitorEstimate: number;
  savings: number;
  savingsPercent: number;
}

function currentBillingPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useBillingEngine() {
  const { user } = useAuth();
  const period = currentBillingPeriod();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_plans")
        .select("*")
        .eq("is_active", true)
        .order("base_price");
      return (data || []).map((r: any) => ({
        id: r.id,
        planCode: r.plan_code,
        planName: r.plan_name,
        pricingModel: r.pricing_model,
        basePrice: Number(r.base_price),
        pricePerDrop: r.price_per_drop ? Number(r.price_per_drop) : null,
        pricePerApiCall: r.price_per_api_call ? Number(r.price_per_api_call) : null,
        currency: r.currency,
        includedDrops: r.included_drops || 0,
        includedApiCalls: r.included_api_calls || 0,
        billingCycle: r.billing_cycle,
      })) as BillingPlan[];
    },
    staleTime: 600_000,
  });

  const { data: usageEvents, isLoading: usageLoading } = useQuery({
    queryKey: ["billing-usage", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_events")
        .select("*")
        .eq("billing_period", period)
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data || []).map((r: any) => ({
        id: r.id,
        eventType: r.event_type,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unit_price),
        totalCost: Number(r.total_cost),
        referenceType: r.reference_type,
        billingPeriod: r.billing_period,
        createdAt: r.created_at,
      })) as UsageEvent[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);
      return (data || []).map((r: any) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        billingPeriod: r.billing_period,
        subscriptionAmount: Number(r.subscription_amount),
        usageAmount: Number(r.usage_amount),
        apiAmount: Number(r.api_amount),
        taxAmount: Number(r.tax_amount),
        totalAmount: Number(r.total_amount),
        currency: r.currency,
        status: r.status,
        dueDate: r.due_date,
        paidAt: r.paid_at,
      })) as BillingInvoice[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: revenueSnapshots, isLoading: revLoading } = useQuery({
    queryKey: ["revenue-snapshots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(90);
      return (data || []).map((r: any) => ({
        snapshotDate: r.snapshot_date,
        mrr: Number(r.mrr),
        usageRevenue: Number(r.usage_revenue),
        apiRevenue: Number(r.api_revenue),
        totalRevenue: Number(r.total_revenue),
        activeAccounts: r.active_accounts,
        arpu: Number(r.arpu),
      })) as RevenueSnapshot[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isLoading = plansLoading || usageLoading || invoicesLoading || revLoading;

  const metrics = useMemo<BillingMetrics>(() => {
    const events = usageEvents || [];
    const byType = (t: string) => events.filter((e) => e.eventType === t);

    const drops = byType("drop");
    const apiCalls = byType("api_call");
    const aiCredits = byType("ai_credit");
    const routeOpts = byType("route_optimization");

    const dropsThisMonth = drops.reduce((s, e) => s + e.quantity, 0);
    const apiCallsThisMonth = apiCalls.reduce((s, e) => s + e.quantity, 0);
    const aiCreditsThisMonth = aiCredits.reduce((s, e) => s + e.quantity, 0);
    const routeOptsThisMonth = routeOpts.reduce((s, e) => s + e.quantity, 0);

    const dropCostMTD = drops.reduce((s, e) => s + e.totalCost, 0);
    const apiCostMTD = apiCalls.reduce((s, e) => s + e.totalCost, 0);
    const subscriptionCost = (invoices || []).length > 0 ? (invoices![0]?.subscriptionAmount || 0) : 0;
    const totalRunningCost = subscriptionCost + dropCostMTD + apiCostMTD;

    // Estimate month end (linear projection)
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const estimatedMonthEnd = dayOfMonth > 0 ? Math.round((totalRunningCost / dayOfMonth) * daysInMonth) : totalRunningCost;

    // Revenue from snapshots
    const latestSnap = (revenueSnapshots || [])[0];
    const mrr = latestSnap?.mrr || 0;
    const arr = mrr * 12;
    const arpu = latestSnap?.arpu || 0;

    const totalRevenueAllTime = (invoices || [])
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.totalAmount, 0);

    // TCO comparison (competitor benchmark: $0.06/drop or ₦80/drop)
    const competitorDropRate = dropCostMTD > 0 && dropsThisMonth > 0
      ? (drops[0]?.unitPrice > 1 ? 80 : 0.06) // NGN vs USD heuristic
      : 80;
    const competitorEstimate = dropsThisMonth * competitorDropRate;
    const savings = competitorEstimate - dropCostMTD;
    const savingsPercent = competitorEstimate > 0 ? Math.round((savings / competitorEstimate) * 100) : 0;

    return {
      dropsThisMonth,
      apiCallsThisMonth,
      aiCreditsThisMonth,
      routeOptsThisMonth,
      dropCostMTD,
      apiCostMTD,
      subscriptionCost,
      totalRunningCost,
      estimatedMonthEnd,
      mrr,
      arr,
      arpu,
      totalRevenueAllTime,
      competitorEstimate,
      savings,
      savingsPercent,
    };
  }, [usageEvents, invoices, revenueSnapshots]);

  return {
    plans: plans || [],
    usageEvents: usageEvents || [],
    invoices: invoices || [],
    revenueSnapshots: revenueSnapshots || [],
    metrics,
    isLoading,
  };
}
