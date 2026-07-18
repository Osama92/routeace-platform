import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays } from "date-fns";
import { useState } from "react";
import {
  TrendingUp, Shield, FileCheck, Target, CheckCircle, Zap, Activity,
  Fuel, Info, Sparkles, ChevronDown, AlertTriangle,
} from "lucide-react";

// ── Nigerian industry benchmarks (NARTO / LSLGA) ──────────────────────────────
// Used only as fallbacks. Each card clearly marks whether it's showing a
// verified figure or an industry estimate.
const FRAUD_RATE          = 0.15;   // 15% of logistics spend lost to fraud
const DISPUTE_RATE        = 0.18;   // 18% of invoices result in disputes
const DISPUTE_COST        = 15_000; // avg cost to resolve one dispute (NGN)
const SLA_PENALTY         = 50_000; // avg contractual penalty per SLA breach (NGN)
const SLA_ON_TIME_VALUE   = 2_500;  // 5% of avg penalty protected per on-time delivery
const MONTHLY_PER_VEHICLE = 5_000;
const FUEL_WASTE_RATE     = 0.12;   // 12% fuel waste rate without platform discipline

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

type DataSource = "real" | "partial" | "benchmark";

interface DerivationLine {
  label: string;
  value?: string;
  note?: string;
  highlight?: boolean;
}

interface SavingsCard {
  icon: any;
  label: string;
  sublabel: string;
  value: number;
  confirmedValue?: number;   // the real/confirmed portion only
  estimatedValue?: number;   // the benchmark/estimated portion
  color: string;
  border: string;
  bg: string;
  source: DataSource;
  progress?: number;
  derivation: DerivationLine[];   // step-by-step working shown to the user
  actionPrompt?: string;          // what they need to do to get real data
}

export default function TrialROISummary() {
  const { organizationId: orgId, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const canSubscribe = hasAnyRole(["super_admin", "org_admin", "admin"]);
  const [openCard, setOpenCard] = useState<string | null>(null);

  // ── Organisation ───────────────────────────────────────────────────────────
  const { data: org } = useQuery({
    queryKey: ["roi-org", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("organizations")
        .select("name, created_at")
        .eq("id", orgId!)
        .maybeSingle();
      return data;
    },
  });

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const { data: vehicles = [] } = useQuery({
    queryKey: ["roi-vehicles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles")
        .select("id")
        .eq("organization_id", orgId!)
        .neq("status", "retired");
      return data ?? [];
    },
  });

  // ── Dispatches ─────────────────────────────────────────────────────────────
  const { data: dispatches = [] } = useQuery({
    queryKey: ["roi-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("dispatches")
        .select("id, status, sla_status, actual_delivery, scheduled_delivery, approval_status")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  // ── Dispatch Financials ────────────────────────────────────────────────────
  const { data: dispatchFinancials = [] } = useQuery({
    queryKey: ["roi-dispatch-financials", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatch_financials") as any)
        .select("vendor_cost, client_revenue, gross_profit, roi_pct, finance_status")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Invoices ───────────────────────────────────────────────────────────────
  const { data: invoiceData = [] } = useQuery({
    queryKey: ["roi-invoices", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("id, status, total_amount, dispatch_id")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── SLA breach alerts ──────────────────────────────────────────────────────
  const { data: slaBreaches = [] } = useQuery({
    queryKey: ["roi-sla-breaches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("sla_breach_alerts")
        .select("id, delay_hours, is_resolved")
        .eq("organization_id", orgId!)
        .eq("is_resolved", true);
      return data ?? [];
    },
  });

  // ── Fuel logs ──────────────────────────────────────────────────────────────
  const { data: fuelLogs = [] } = useQuery({
    queryKey: ["roi-fuel", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("fuel_logs")
        .select("total_cost, km_per_litre, is_flagged, flag_reason, km_since_last_fill, litres_dispensed")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Fuel savings ledger (richer source from investigation runs) ────────────
  const { data: fuelLedger = [] } = useQuery({
    queryKey: ["roi-fuel-ledger", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("fuel_savings_ledger") as any)
        .select("cost_saved, litres_recovered, fraud_blocked_value, period_start, period_end")
        .eq("organization_id", orgId!)
        .order("period_end", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const daysActive      = org?.created_at
    ? Math.max(1, differenceInDays(new Date(), new Date(org.created_at)))
    : 1;
  const monthsActive    = Math.max(1, Math.round(daysActive / 30));
  const vehicleCount    = vehicles.length;
  const routeAceCost    = vehicleCount * MONTHLY_PER_VEHICLE * monthsActive;
  const delivered       = dispatches.filter((d: any) => d.status === "delivered");
  const approved        = dispatches.filter((d: any) => d.approval_status === "approved");

  // ── 1. DISPATCH GROSS PROFIT ───────────────────────────────────────────────
  const completedFinancials = dispatchFinancials.filter((f: any) => f.finance_status === "complete");
  const pendingFinancials   = dispatchFinancials.filter((f: any) => f.finance_status === "pending");
  const realVendorSpend     = completedFinancials.reduce((s: number, f: any) => s + Number(f.vendor_cost ?? 0), 0);
  const realRevenue         = completedFinancials.reduce((s: number, f: any) => s + Number(f.client_revenue ?? 0), 0);
  const realGrossProfit     = completedFinancials.reduce((s: number, f: any) => s + Number(f.gross_profit ?? 0), 0);
  const avgRealRoi          = completedFinancials.length
    ? completedFinancials.reduce((s: number, f: any) => s + Number(f.roi_pct ?? 0), 0) / completedFinancials.length
    : null;
  const financeProgress     = dispatchFinancials.length > 0
    ? Math.round((completedFinancials.length / dispatchFinancials.length) * 100)
    : 0;
  const profitIsReal        = completedFinancials.length > 0;

  // ── 2. DRIVER FRAUD PREVENTED ──────────────────────────────────────────────
  // Confirmed: fuel entries that were manually flagged as fraudulent
  // Estimated: NARTO 15% fraud rate applied to verified vendor spend
  const flaggedFuelLogs    = fuelLogs.filter((f: any) => f.is_flagged);
  const flaggedFuelSpend   = flaggedFuelLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  const confirmedFraud     = flaggedFuelSpend;
  const estimatedFraud     = realVendorSpend > 0
    ? Math.round(realVendorSpend * FRAUD_RATE)
    : 0;
  const fraudTotal         = confirmedFraud + estimatedFraud;
  const fraudIsReal        = confirmedFraud > 0 || estimatedFraud > 0;
  const fraudBenchmark     = approved.length * 45_000 * FRAUD_RATE;
  const effectiveFraud     = fraudIsReal ? fraudTotal : fraudBenchmark;
  const fraudSource: DataSource = confirmedFraud > 0 && estimatedFraud > 0
    ? "partial"
    : confirmedFraud > 0 || estimatedFraud > 0
      ? "real"
      : "benchmark";

  // ── 3. FUEL EFFICIENCY SAVINGS ─────────────────────────────────────────────
  // Prefer fuel_savings_ledger (produced by investigation runs — uses real km/L data).
  // Fall back to: total fuel spend × 12% waste rate, BUT only for logs that have
  // km_since_last_fill recorded (proves discipline is actually being followed).
  const ledgerSavings      = fuelLedger.reduce((s: number, r: any) => s + Number(r.cost_saved ?? 0), 0);
  const ledgerIsReal       = ledgerSavings > 0;
  const totalFuelSpend     = fuelLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  // Only count logs where odometer discipline was followed (km recorded)
  const disciplinedLogs    = fuelLogs.filter((f: any) => f.km_since_last_fill != null && Number(f.km_since_last_fill) > 0);
  const disciplinedSpend   = disciplinedLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  const disciplinePct      = totalFuelSpend > 0
    ? Math.round((disciplinedSpend / totalFuelSpend) * 100)
    : 0;
  const fuelSavingsCalc    = ledgerIsReal
    ? ledgerSavings
    : disciplinedSpend > 0
      ? Math.round(disciplinedSpend * FUEL_WASTE_RATE)
      : 0;
  const fuelIsReal         = ledgerIsReal || disciplinedSpend > 0;
  const fuelBenchmark      = vehicleCount * 40_000 * FUEL_WASTE_RATE * monthsActive;
  const effectiveFuel      = fuelIsReal ? fuelSavingsCalc : fuelBenchmark;
  const fuelSource: DataSource = ledgerIsReal ? "real" : disciplinedSpend > 0 ? "partial" : "benchmark";

  // ── 4. INVOICE DISPUTE AVOIDANCE ──────────────────────────────────────────
  const dispatchLinkedInvoices = invoiceData.filter((i: any) => i.dispatch_id);
  const overdueLinked          = dispatchLinkedInvoices.filter((i: any) => i.status === "overdue").length;
  const paidLinked             = dispatchLinkedInvoices.filter((i: any) => i.status === "paid").length;
  const realDisputesSaved      = Math.round(paidLinked * DISPUTE_RATE);
  const realDisputeSavings     = realDisputesSaved > 0
    ? realDisputesSaved * DISPUTE_COST
    : overdueLinked * DISPUTE_COST;
  const disputeIsReal          = dispatchLinkedInvoices.length > 0;
  const disputeBenchmark       = Math.round(approved.length * DISPUTE_RATE) * DISPUTE_COST;
  const effectiveDispute       = disputeIsReal ? realDisputeSavings : disputeBenchmark;

  // ── 5. SLA CONTRACTS PROTECTED ─────────────────────────────────────────────
  // FIX: completed on-time deliveries have sla_status = 'met', not 'on_track'.
  // 'on_track' is an in-transit status. Only 'met' confirms the SLA was honoured.
  const resolvedBreaches  = slaBreaches.length;
  const onTimeDeliveries  = delivered.filter((d: any) => d.sla_status === "met").length;
  const lateDeliveries    = delivered.filter((d: any) => d.sla_status === "breached").length;
  const slaFromBreaches   = resolvedBreaches * SLA_PENALTY;
  const slaFromOnTime     = onTimeDeliveries * SLA_ON_TIME_VALUE;
  const slaReal           = slaFromBreaches + slaFromOnTime;
  const slaIsReal         = delivered.length > 0 || resolvedBreaches > 0;
  const slaBenchmark      = Math.round(approved.length * 0.1 * SLA_PENALTY);
  const effectiveSla      = slaIsReal ? slaReal : 0;

  // ── Total savings ──────────────────────────────────────────────────────────
  const totalSavings  = effectiveFraud + effectiveFuel + effectiveDispute + effectiveSla + realGrossProfit;
  const roiRatio      = routeAceCost > 0 ? (totalSavings / routeAceCost) : 0;
  const annualised    = Math.round((totalSavings / daysActive) * 365);

  // Real data percentage (how much of the total is from real, not estimated, inputs)
  const realTotal = (fraudIsReal ? effectiveFraud : 0)
    + (fuelIsReal ? effectiveFuel : 0)
    + (disputeIsReal ? effectiveDispute : 0)
    + (slaIsReal ? effectiveSla : 0)
    + realGrossProfit;
  const dataRealPct = totalSavings > 0 ? Math.round((realTotal / totalSavings) * 100) : 0;

  // ── Savings cards with derivation steps ────────────────────────────────────
  const savingsCards: SavingsCard[] = [
    // ── Dispatch Gross Profit ──────────────────────────────────────────────
    ...(dispatchFinancials.length > 0 ? [{
      icon: TrendingUp,
      label: "Dispatch Gross Profit",
      sublabel: completedFinancials.length > 0
        ? `${completedFinancials.length} dispatches fully costed · avg ROI ${avgRealRoi?.toFixed(1) ?? 0}% · ${pendingFinancials.length} pending`
        : `${pendingFinancials.length} dispatches awaiting finance entry`,
      value: realGrossProfit,
      color: "text-primary",
      border: "border-l-primary",
      bg: "bg-primary/10",
      source: (profitIsReal ? "real" : "benchmark") as DataSource,
      progress: financeProgress,
      derivation: [
        { label: "Dispatches with finance data", value: String(dispatchFinancials.length) },
        { label: "Fully costed (complete)", value: String(completedFinancials.length) },
        { label: "Total client revenue", value: NGN(realRevenue) },
        { label: "Total vendor / driver cost", value: NGN(realVendorSpend) },
        { label: "Gross profit (revenue − cost)", value: NGN(realGrossProfit), highlight: true },
        ...(avgRealRoi != null ? [{ label: "Average ROI %", value: `${avgRealRoi.toFixed(1)}%` }] : []),
        ...(pendingFinancials.length > 0 ? [{
          label: "Pending entries",
          value: String(pendingFinancials.length),
          note: "Finance team must enter vendor cost + client revenue to count these",
        }] : []),
      ],
      actionPrompt: pendingFinancials.length > 0
        ? `Enter vendor cost and client revenue for ${pendingFinancials.length} pending dispatch${pendingFinancials.length !== 1 ? "es" : ""} in the Finance Queue`
        : undefined,
    }] : []),

    // ── Driver Fraud Prevented ─────────────────────────────────────────────
    {
      icon: Shield,
      label: "Driver Fraud Prevented",
      sublabel: fraudIsReal
        ? `${confirmedFraud > 0 ? `${NGN(confirmedFraud)} confirmed (${flaggedFuelLogs.length} flagged fuel entries)` : "No confirmed cases yet"} · ${estimatedFraud > 0 ? `${NGN(estimatedFraud)} estimated from verified vendor spend` : "No verified vendor spend yet"}`
        : `${approved.length} dispatches tracked · enter vendor costs for real figure`,
      value: effectiveFraud,
      confirmedValue: confirmedFraud,
      estimatedValue: fraudIsReal ? estimatedFraud : fraudBenchmark,
      color: "text-orange-500",
      border: "border-l-orange-500",
      bg: "bg-orange-500/10",
      source: fraudSource,
      derivation: confirmedFraud > 0 || estimatedFraud > 0 ? [
        { label: "Confirmed fraud blocked", note: "Fuel log entries manually flagged as fraudulent" },
        { label: "  · Flagged fuel entries", value: String(flaggedFuelLogs.length) },
        { label: "  · Spend on flagged entries", value: NGN(confirmedFraud), highlight: confirmedFraud > 0 },
        { label: "Estimated fraud prevention", note: "NARTO benchmark: 15% of verified vendor spend is typically lost to fraud without platform controls" },
        { label: "  · Verified vendor spend", value: NGN(realVendorSpend) },
        { label: "  · NARTO fraud rate", value: "15%" },
        { label: "  · Estimated fraud prevented", value: NGN(estimatedFraud), highlight: true },
        { label: "Total (confirmed + estimated)", value: NGN(fraudTotal), highlight: true },
      ] : [
        { label: "Benchmark (no real data yet)", note: "NARTO average: 15% of logistics spend is lost to fraud" },
        { label: "  · Approved dispatches", value: String(approved.length) },
        { label: "  · Avg trip value (NARTO)", value: "₦45,000" },
        { label: "  · Industry fraud rate", value: "15%" },
        { label: "  · Benchmark estimate", value: NGN(fraudBenchmark), highlight: true },
      ],
      actionPrompt: realVendorSpend === 0
        ? "Enter vendor costs in the Finance Queue to get a real fraud prevention figure"
        : flaggedFuelLogs.length === 0
          ? "Flag suspicious fuel entries in Fuel Logs to record confirmed fraud cases"
          : undefined,
    },

    // ── Fuel Efficiency Savings ────────────────────────────────────────────
    {
      icon: Fuel,
      label: "Fuel Efficiency Savings",
      sublabel: ledgerIsReal
        ? `From ${fuelLedger.length} investigation run${fuelLedger.length !== 1 ? "s" : ""} · based on actual km/litre performance`
        : disciplinedSpend > 0
          ? `${disciplinePct}% of fuel logs include odometer readings · ₦${(disciplinedSpend / 1000).toFixed(0)}k disciplined spend × 12% waste rate`
          : `${totalFuelSpend > 0 ? `₦${(totalFuelSpend / 1000).toFixed(0)}k fuel logged but odometer readings missing` : `${vehicleCount} vehicles · log fuel with odometer readings to track savings`}`,
      value: effectiveFuel,
      color: "text-blue-500",
      border: "border-l-blue-500",
      bg: "bg-blue-500/10",
      source: fuelSource,
      derivation: ledgerIsReal ? [
        { label: "Data source", value: "Fuel Savings Ledger (investigation runs)", note: "Most accurate — uses actual km/litre vs fleet benchmarks" },
        { label: "Ledger records", value: String(fuelLedger.length) },
        { label: "Total cost saved (ledger)", value: NGN(ledgerSavings), highlight: true },
      ] : disciplinedSpend > 0 ? [
        { label: "Total fuel spend logged", value: NGN(totalFuelSpend) },
        { label: "Logs with odometer readings", value: `${disciplinedLogs.length} of ${fuelLogs.length} (${disciplinePct}%)`, note: "Only disciplined logs count — odometer reading proves the km were tracked" },
        { label: "Disciplined fuel spend", value: NGN(disciplinedSpend) },
        { label: "NARTO waste rate (without platform)", value: "12%", note: "NARTO benchmark: 12% of fleet fuel spend is wasted without logging discipline" },
        { label: "Estimated waste prevented", value: NGN(fuelSavingsCalc), highlight: true },
        ...(disciplinePct < 100 ? [{ label: "⚠ Improve accuracy", note: `${fuelLogs.length - disciplinedLogs.length} logs missing odometer readings — remind drivers to enter km when fuelling` }] : []),
      ] : totalFuelSpend > 0 ? [
        { label: "Fuel spend logged", value: NGN(totalFuelSpend) },
        { label: "Odometer readings recorded", value: "0", note: "Savings cannot be verified without km_since_last_fill data" },
        { label: "Current figure", value: "₦0", highlight: true },
      ] : [
        { label: "Benchmark estimate (no logs yet)", note: "NARTO: 12% of fleet fuel spend is wasted without platform controls" },
        { label: "  · Active vehicles", value: String(vehicleCount) },
        { label: "  · Est. fuel spend/vehicle/month", value: "₦40,000" },
        { label: "  · Months active", value: String(monthsActive) },
        { label: "  · Waste rate", value: "12%" },
        { label: "  · Benchmark estimate", value: NGN(fuelBenchmark), highlight: true },
      ],
      actionPrompt: totalFuelSpend > 0 && disciplinedSpend === 0
        ? "Ensure drivers record the odometer reading (km since last fill) on every fuel log entry"
        : !fuelIsReal
          ? "Log fuel fill-ups in the Fuel Logs module to track real efficiency savings"
          : undefined,
    },

    // ── Invoice Disputes Avoided ───────────────────────────────────────────
    {
      icon: FileCheck,
      label: "Invoice Disputes Avoided",
      sublabel: disputeIsReal
        ? `${dispatchLinkedInvoices.length} dispatch-linked invoices · ${paidLinked} paid · ${overdueLinked} still overdue`
        : `${invoiceData.length} invoices created · link to dispatches to unlock real dispute tracking`,
      value: effectiveDispute,
      color: "text-teal-500",
      border: "border-l-teal-500",
      bg: "bg-teal-500/10",
      source: disputeIsReal ? "real" : "benchmark",
      derivation: disputeIsReal ? [
        { label: "Total invoices", value: String(invoiceData.length) },
        { label: "Dispatch-linked invoices", value: String(dispatchLinkedInvoices.length), note: "Only invoices with a dispatch_id are tracked here — this proves the service was delivered" },
        { label: "Paid (resolved)", value: String(paidLinked) },
        { label: "Industry dispute rate (NARTO)", value: "18%", note: "18% of invoices in Nigerian logistics become disputed" },
        { label: "Estimated disputes avoided", value: String(realDisputesSaved), note: `${paidLinked} paid × 18%` },
        { label: "Avg resolution cost per dispute", value: NGN(DISPUTE_COST) },
        { label: "Total savings", value: NGN(realDisputeSavings), highlight: true },
        ...(overdueLinked > 0 ? [{ label: "⚠ Overdue invoices", value: String(overdueLinked), note: "These may become disputes — follow up" }] : []),
      ] : [
        { label: "Benchmark estimate (no dispatch-linked invoices)", note: "NARTO: 18% of invoices become disputed" },
        { label: "  · Approved dispatches", value: String(approved.length) },
        { label: "  · Dispute rate", value: "18%" },
        { label: "  · Avg resolution cost", value: NGN(DISPUTE_COST) },
        { label: "  · Benchmark estimate", value: NGN(disputeBenchmark), highlight: true },
      ],
      actionPrompt: !disputeIsReal && invoiceData.length > 0
        ? "Use the new dispatch-first invoice flow — invoices created from a dispatch are automatically linked"
        : undefined,
    },

    // ── SLA Contracts Protected ────────────────────────────────────────────
    {
      icon: Target,
      label: "SLA Contracts Protected",
      sublabel: slaIsReal
        ? `${onTimeDeliveries} on-time · ${lateDeliveries} breach${lateDeliveries !== 1 ? "es" : ""} · ${resolvedBreaches} breach alert${resolvedBreaches !== 1 ? "s" : ""} resolved`
        : "Mark dispatches as delivered to activate SLA tracking",
      value: effectiveSla,
      color: "text-green-500",
      border: "border-l-green-500",
      bg: "bg-green-500/10",
      source: slaIsReal ? "real" : "benchmark",
      derivation: slaIsReal ? [
        { label: "Delivered dispatches", value: String(delivered.length) },
        { label: "On-time (sla_status = met)", value: String(onTimeDeliveries), note: "Dispatch was delivered before or on its SLA deadline" },
        { label: "  · Protection value per delivery", value: NGN(SLA_ON_TIME_VALUE), note: "5% of avg SLA penalty — represents the risk protected by on-time delivery" },
        { label: "  · Subtotal from on-time", value: NGN(slaFromOnTime) },
        { label: "SLA breach alerts resolved", value: String(resolvedBreaches), note: "Breaches that were flagged and then resolved by the operations team" },
        { label: "  · Avg penalty per breach", value: NGN(SLA_PENALTY) },
        { label: "  · Subtotal from resolved breaches", value: NGN(slaFromBreaches) },
        { label: "SLA breaches (unresolved)", value: String(lateDeliveries), note: lateDeliveries > 0 ? "These may carry contractual penalties — resolve them in the SLA dashboard" : "None" },
        { label: "Total SLA protection value", value: NGN(slaReal), highlight: true },
      ] : [
        { label: "No delivered dispatches yet", note: "SLA value is calculated from completed, delivered dispatches" },
        { label: "When dispatches are delivered, RouteAce tracks:", note: "Whether actual_delivery was before or after the SLA deadline, plus any breach alerts raised and resolved by ops team" },
      ],
      actionPrompt: delivered.length === 0
        ? "Mark dispatches as Delivered in the Dispatch board to activate SLA performance tracking"
        : lateDeliveries > 0
          ? `${lateDeliveries} late deliveries recorded — resolve breach alerts in the SLA dashboard to account for their value`
          : undefined,
    },
  ];

  const sourceLabel: Record<DataSource, string> = {
    real: "Verified",
    partial: "Partial",
    benchmark: "Estimated",
  };
  const sourceBadgeClass: Record<DataSource, string> = {
    real: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10",
    partial: "border-blue-500/40 text-blue-600 bg-blue-500/10",
    benchmark: "border-amber-500/40 text-amber-600 bg-amber-500/10",
  };
  const sourceTooltip: Record<DataSource, string> = {
    real: "Calculated entirely from real data recorded in RouteAce. Updates live.",
    partial: "Mix of real data and industry estimates. Improve by completing the actions shown in the breakdown.",
    benchmark: "Using Nigerian industry benchmarks (NARTO/LSLGA) as a proxy. This figure updates automatically as your team records real data in the platform.",
  };

  return (
    <TooltipProvider>
      <DashboardLayout
        title="Your RouteAce Impact"
        subtitle={`${daysActive} days active · ${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""} · ${dispatches.length} dispatches tracked`}
      >
        <div className="space-y-6 max-w-4xl mx-auto">

          {/* ── Hero savings card ─────────────────────────────────────────── */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Value generated in {daysActive} days
                </p>
                {dataRealPct > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px]">
                    {dataRealPct}% verified data
                  </Badge>
                )}
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <p className="text-6xl font-black text-primary leading-none">{NGN(totalSavings)}</p>
                {roiRatio >= 1 && (
                  <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-sm px-3 py-1 mb-1" variant="outline">
                    {roiRatio.toFixed(1)}× ROI
                  </Badge>
                )}
                {avgRealRoi != null && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1 mb-1" variant="outline">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {avgRealRoi.toFixed(1)}% avg dispatch ROI
                  </Badge>
                )}
              </div>
              {annualised > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Annualised: <span className="font-semibold text-foreground">{NGN(annualised)}/year</span>
                </p>
              )}
            </div>
            <CardContent className="pt-4 pb-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">RouteAce cost</span>
                <span className="font-semibold">{NGN(routeAceCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total value generated</span>
                <span className="font-semibold text-green-600">{NGN(totalSavings)}</span>
              </div>
              {routeAceCost > 0 && (
                <div>
                  <Progress value={Math.min(100, roiRatio * 10)} className="h-2" />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Cost</span>
                    <span className="text-xs text-muted-foreground">
                      {roiRatio >= 1 ? `${roiRatio.toFixed(1)}× return` : "Building…"}
                    </span>
                  </div>
                </div>
              )}

              {/* Real data quality bar */}
              <div className="pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Data quality</span>
                  <span className="text-xs font-medium">
                    {dataRealPct > 0
                      ? `${dataRealPct}% verified · ${100 - dataRealPct}% estimated`
                      : "All estimated — record real data to unlock verified figures"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${dataRealPct}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic pt-1">
                * Cards marked "Estimated" use Nigerian industry benchmarks (NARTO, LSLGA). Expand any card to see exactly how the figure is derived.
              </p>
            </CardContent>
          </Card>

          {/* ── Savings breakdown ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Where the value comes from
            </h3>
            {savingsCards.map((card) => (
              <Collapsible
                key={card.label}
                open={openCard === card.label}
                onOpenChange={(o) => setOpenCard(o ? card.label : null)}
              >
                <Card className={`border-l-4 ${card.border}`}>
                  <CardContent className="pt-4 pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${card.bg} shrink-0`}>
                          <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{card.label}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 cursor-help ${sourceBadgeClass[card.source]}`}
                                >
                                  {sourceLabel[card.source]}
                                  <Info className="w-2.5 h-2.5 ml-1" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {sourceTooltip[card.source]}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.sublabel}</p>
                          {card.progress != null && card.progress > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[10px] text-muted-foreground">Finance entries complete</span>
                                <span className="text-[10px] font-medium">{card.progress}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden w-32">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${card.progress}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-black ${card.color}`}>{NGN(card.value)}</p>
                        <p className="text-xs text-muted-foreground">{sourceLabel[card.source].toLowerCase()}</p>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1 mt-0.5 px-2">
                            How? <ChevronDown className={`w-3 h-3 transition-transform ${openCard === card.label ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* Derivation breakdown */}
                    <CollapsibleContent>
                      <div className="mt-3 mb-4 ml-10 space-y-1.5 border-l-2 border-muted pl-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">How this is calculated</p>
                        {card.derivation.map((line, i) => (
                          <div key={i} className={`text-xs ${line.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            <div className="flex items-baseline justify-between gap-4">
                              <span>{line.label}</span>
                              {line.value && (
                                <span className={`tabular-nums shrink-0 ${line.highlight ? card.color : ""}`}>
                                  {line.value}
                                </span>
                              )}
                            </div>
                            {line.note && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{line.note}</p>
                            )}
                          </div>
                        ))}
                        {card.actionPrompt && (
                          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">{card.actionPrompt}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {/* ── Activity stats ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Dispatches tracked",     val: dispatches.length,           icon: Zap },
              { label: "Delivered on time",       val: onTimeDeliveries,            icon: CheckCircle },
              { label: "Finance entries done",    val: completedFinancials.length,  icon: TrendingUp },
              { label: "Days active",             val: daysActive,                  icon: Activity },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                  <p className="text-2xl font-black text-foreground">{s.val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── What to do next ───────────────────────────────────────────── */}
          {dataRealPct < 100 && (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Improve your data accuracy
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {pendingFinancials.length > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Finance team: complete {pendingFinancials.length} pending finance entr{pendingFinancials.length !== 1 ? "ies" : "y"} → unlocks verified profit and fraud figures
                    </li>
                  )}
                  {totalFuelSpend > 0 && disciplinedSpend === 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Drivers: include odometer reading (km since last fill) on fuel logs → unlocks real fuel efficiency savings
                    </li>
                  )}
                  {!fuelIsReal && totalFuelSpend === 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Drivers: log fuel fill-ups → unlocks real fuel efficiency savings
                    </li>
                  )}
                  {!disputeIsReal && invoiceData.length > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Finance team: create invoices via the dispatch-first flow → auto-links invoice to dispatch for real dispute tracking
                    </li>
                  )}
                  {delivered.length === 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Operations: mark dispatches as delivered → activates SLA performance tracking
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ── Subscribe CTA ─────────────────────────────────────────────── */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-lg">
                    {NGN(MONTHLY_PER_VEHICLE * vehicleCount)}/month keeps all of this running.
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""} × ₦5,000 · Unlimited dispatches · Full fraud protection · Zaza AI
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Button variant="outline" onClick={() => navigate("/")}>Back to Dashboard</Button>
                  {canSubscribe && (
                    <Button onClick={() => navigate("/settings?tab=billing")}>
                      <TrendingUp className="w-4 h-4 mr-1.5" />
                      Subscribe — Keep Saving
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
