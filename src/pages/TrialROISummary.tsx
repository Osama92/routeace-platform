import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays } from "date-fns";
import {
  TrendingUp, Shield, FileCheck, Target, CheckCircle, Zap, Activity,
  Fuel, Info, Sparkles,
} from "lucide-react";

// ── Nigerian industry benchmarks ─────────────────────────────────────────────
// These are FALLBACKS only. As soon as real data is available for a category
// the real figure replaces the estimate — the label changes to reflect this.
const FRAUD_RATE        = 0.15;   // NARTO: 15% of logistics spend lost to fraud
const DISPUTE_RATE      = 0.18;   // 18% of invoices disputed
const DISPUTE_COST      = 15_000; // avg cost to resolve one dispute (NGN)
const SLA_PENALTY       = 50_000; // avg penalty per SLA breach (NGN)
const MONTHLY_PER_VEHICLE = 5_000;

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

// Whether a savings card is showing real data or a benchmark estimate
type DataSource = "real" | "benchmark";

interface SavingsCard {
  icon: any;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  border: string;
  bg: string;
  source: DataSource;
  progress?: number; // 0-100, how much of the category has real vs benchmark data
}

export default function TrialROISummary() {
  const { organizationId: orgId, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const canSubscribe = hasAnyRole(["super_admin", "org_admin", "admin"]);

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

  // ── Dispatch Financials (THE real data source) ──────────────────────────────
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
        .select("total_cost, km_per_litre, is_flagged, flag_reason")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const daysActive = org?.created_at
    ? Math.max(1, differenceInDays(new Date(), new Date(org.created_at)))
    : 1;
  const monthsActive    = Math.max(1, Math.round(daysActive / 30));
  const vehicleCount    = vehicles.length;
  const routeAceCost    = vehicleCount * MONTHLY_PER_VEHICLE * monthsActive;
  const delivered       = dispatches.filter((d: any) => d.status === "delivered");
  const approved        = dispatches.filter((d: any) => d.approval_status === "approved");

  // ── 1. PROFIT / ROI — fully real once finance entries exist ────────────────
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

  // ── 2. FRAUD PREVENTION ────────────────────────────────────────────────────
  // Real: use confirmed vendor spend × NARTO fraud rate as the exposure baseline.
  // Benchmark fallback: dispatches × avg industry trip cost × fraud rate.
  const flaggedFuelSpend  = fuelLogs.filter((f: any) => f.is_flagged).reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  const totalFuelSpend    = fuelLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  // Real fraud prevention = flagged fuel spend that was caught before payout
  // + fraud rate applied to confirmed vendor spend (RouteAce verified these trips)
  const realFraudBase     = realVendorSpend > 0 ? realVendorSpend : 0;
  const fraudPrevented    = realFraudBase > 0
    ? Math.round(realFraudBase * FRAUD_RATE) + flaggedFuelSpend
    : flaggedFuelSpend > 0
      ? flaggedFuelSpend
      : 0; // truly zero until real spend is recorded
  const fraudIsReal       = realFraudBase > 0 || flaggedFuelSpend > 0;
  // Benchmark estimate shown alongside real if we have dispatches but no finance data yet
  const fraudBenchmark    = approved.length * 45_000 * FRAUD_RATE; // ₦45k avg trip in Nigeria

  // ── 3. FUEL EFFICIENCY SAVINGS ─────────────────────────────────────────────
  // Real: total fuel spend tracked in the platform (RouteAce enforces logging discipline).
  // Without RouteAce, estimated 12% of fuel spend is wasted (NARTO benchmark).
  const FUEL_WASTE_RATE   = 0.12;
  const fuelSavings       = totalFuelSpend > 0
    ? Math.round(totalFuelSpend * FUEL_WASTE_RATE)
    : 0;
  const fuelIsReal        = totalFuelSpend > 0;
  const fuelBenchmark     = vehicleCount * 40_000 * FUEL_WASTE_RATE * monthsActive;

  // ── 4. INVOICE DISPUTE AVOIDANCE ──────────────────────────────────────────
  // Real: invoices linked to dispatch IDs that were overdue → paid = real disputes resolved.
  const dispatchLinkedInvoices = invoiceData.filter((i: any) => i.dispatch_id);
  const overdueLinked          = dispatchLinkedInvoices.filter((i: any) => i.status === "overdue").length;
  const paidLinked             = dispatchLinkedInvoices.filter((i: any) => i.status === "paid").length;
  const realDisputesSaved      = Math.round(paidLinked * DISPUTE_RATE);
  const realDisputeSavings     = realDisputesSaved > 0
    ? realDisputesSaved * DISPUTE_COST
    : overdueLinked * DISPUTE_COST;
  const disputeIsReal          = dispatchLinkedInvoices.length > 0;
  const disputeBenchmark       = Math.round(approved.length * DISPUTE_RATE) * DISPUTE_COST;

  // ── 5. SLA PROTECTION ──────────────────────────────────────────────────────
  // Real: resolved SLA breach alerts + on-time deliveries (verified by RouteAce).
  const resolvedBreaches  = slaBreaches.length;
  const onTimeDeliveries  = delivered.filter((d: any) => d.sla_status === "on_track").length;
  const lateDeliveries    = delivered.filter((d: any) => d.sla_status === "breached").length;
  // Each on-time delivery = RouteAce protected a potential SLA penalty
  const slaReal           = resolvedBreaches * SLA_PENALTY
    + onTimeDeliveries * Math.round(SLA_PENALTY * 0.05); // 5% of penalty as protection value per delivery
  const slaIsReal         = delivered.length > 0 || resolvedBreaches > 0;
  const slaBenchmark      = Math.round(approved.length * 0.1 * SLA_PENALTY); // 10% breach probability

  // ── Total savings ──────────────────────────────────────────────────────────
  // Use real figures where available, benchmark where not
  const effectiveFraud    = fraudIsReal ? fraudPrevented : fraudBenchmark;
  const effectiveFuel     = fuelIsReal  ? fuelSavings    : fuelBenchmark;
  const effectiveDispute  = disputeIsReal ? realDisputeSavings : disputeBenchmark;
  const effectiveSla      = slaIsReal   ? slaReal        : 0;

  const totalSavings  = effectiveFraud + effectiveFuel + effectiveDispute + effectiveSla + realGrossProfit;
  const roiRatio      = routeAceCost > 0 ? (totalSavings / routeAceCost) : 0;
  const annualised    = Math.round((totalSavings / daysActive) * 365);

  // How much of the total is from real vs benchmark data (0–100)
  const realTotal      = (fraudIsReal ? effectiveFraud : 0)
    + (fuelIsReal ? effectiveFuel : 0)
    + (disputeIsReal ? effectiveDispute : 0)
    + (slaIsReal ? effectiveSla : 0)
    + realGrossProfit;
  const dataRealPct   = totalSavings > 0 ? Math.round((realTotal / totalSavings) * 100) : 0;

  const savingsCards: SavingsCard[] = [
    // ── Dispatch Profit (real first) ──────────────────────────────────────
    ...(dispatchFinancials.length > 0 ? [{
      icon: TrendingUp,
      label: "Dispatch Gross Profit",
      sublabel: completedFinancials.length > 0
        ? `${completedFinancials.length} dispatch${completedFinancials.length !== 1 ? "es" : ""} fully costed · avg ROI ${avgRealRoi?.toFixed(1) ?? 0}% · ${pendingFinancials.length} pending finance entry`
        : `${pendingFinancials.length} dispatches awaiting finance entry — enter cost & revenue to unlock`,
      value: realGrossProfit,
      color: "text-primary",
      border: "border-l-primary",
      bg: "bg-primary/10",
      source: (completedFinancials.length > 0 ? "real" : "benchmark") as DataSource,
      progress: financeProgress,
    }] : []),

    // ── Fraud prevention ──────────────────────────────────────────────────
    {
      icon: Shield,
      label: "Driver Fraud Prevented",
      sublabel: fraudIsReal
        ? `Based on ₦${(realFraudBase / 1000).toFixed(0)}k verified vendor spend · ${fuelLogs.filter((f: any) => f.is_flagged).length} flagged fuel entries caught`
        : `${approved.length} dispatches tracked · benchmark: 15% of ₦${(fraudBenchmark / FRAUD_RATE / 1000).toFixed(0)}k avg spend — enter vendor costs to get real figure`,
      value: effectiveFraud,
      color: "text-orange-500",
      border: "border-l-orange-500",
      bg: "bg-orange-500/10",
      source: fraudIsReal ? "real" : "benchmark",
    },

    // ── Fuel efficiency ───────────────────────────────────────────────────
    {
      icon: Fuel,
      label: "Fuel Efficiency Savings",
      sublabel: fuelIsReal
        ? `₦${(totalFuelSpend / 1000).toFixed(0)}k fuel spend tracked · RouteAce discipline saves ~12% waste (NARTO benchmark)`
        : `${vehicleCount} vehicles · log fuel usage to track real savings`,
      value: effectiveFuel,
      color: "text-blue-500",
      border: "border-l-blue-500",
      bg: "bg-blue-500/10",
      source: fuelIsReal ? "real" : "benchmark",
    },

    // ── Invoice disputes ──────────────────────────────────────────────────
    {
      icon: FileCheck,
      label: "Invoice Disputes Avoided",
      sublabel: disputeIsReal
        ? `${dispatchLinkedInvoices.length} dispatch-linked invoices · ${overdueLinked} overdue · ${paidLinked} resolved to paid`
        : `${approved.length} approved dispatches · link invoices to dispatches to track real disputes`,
      value: effectiveDispute,
      color: "text-teal-500",
      border: "border-l-teal-500",
      bg: "bg-teal-500/10",
      source: disputeIsReal ? "real" : "benchmark",
    },

    // ── SLA protection ────────────────────────────────────────────────────
    {
      icon: Target,
      label: "SLA Contracts Protected",
      sublabel: slaIsReal
        ? `${onTimeDeliveries} on-time deliveries · ${lateDeliveries} breaches · ${resolvedBreaches} breach alerts resolved`
        : `SLA monitoring active · complete dispatches to see real on-time performance`,
      value: effectiveSla,
      color: "text-green-500",
      border: "border-l-green-500",
      bg: "bg-green-500/10",
      source: slaIsReal ? "real" : "benchmark",
    },
  ];

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
                    {dataRealPct}% real data
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
                      {roiRatio >= 1 ? `${roiRatio.toFixed(1)}× return` : "Building..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Real data progress bar */}
              {dataRealPct > 0 && dataRealPct < 100 && (
                <div className="pt-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Data quality</span>
                    <span className="text-xs font-medium">{dataRealPct}% verified · {100 - dataRealPct}% estimated</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${dataRealPct}%` }} />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic pt-1">
                * Cards marked "Estimated" use Nigerian industry benchmarks (NARTO, LSLGA) and update automatically as real data is recorded in the platform.
              </p>
            </CardContent>
          </Card>

          {/* ── Savings breakdown ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Where the value comes from
            </h3>
            {savingsCards.map((card) => (
              <Card key={card.label} className={`border-l-4 ${card.border}`}>
                <CardContent className="pt-4 pb-4">
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
                                className={`text-[10px] px-1.5 py-0 cursor-help ${
                                  card.source === "real"
                                    ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                    : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                }`}
                              >
                                {card.source === "real" ? "Verified" : "Estimated"}
                                <Info className="w-2.5 h-2.5 ml-1" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {card.source === "real"
                                ? "Calculated from real data recorded in RouteAce. Updates live."
                                : "Using Nigerian industry benchmarks (NARTO/LSLGA). This figure will be replaced by real data as your team records it in the platform."}
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
                      <p className="text-xs text-muted-foreground">
                        {card.source === "real" ? "verified" : "estimated"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Activity stats ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Dispatches tracked",   val: dispatches.length,        icon: Zap },
              { label: "Delivered on time",     val: onTimeDeliveries,         icon: CheckCircle },
              { label: "Finance entries done",  val: completedFinancials.length, icon: TrendingUp },
              { label: "Days active",           val: daysActive,               icon: Activity },
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

          {/* ── What to do next to improve data quality ───────────────────── */}
          {dataRealPct < 100 && (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Improve data accuracy
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {pendingFinancials.length > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Finance team: enter vendor cost + client revenue for {pendingFinancials.length} pending dispatch{pendingFinancials.length !== 1 ? "es" : ""} → unlocks verified profit & fraud figures
                    </li>
                  )}
                  {!fuelIsReal && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Drivers: log fuel fill-ups → unlocks real fuel efficiency savings
                    </li>
                  )}
                  {!disputeIsReal && invoiceData.length > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Finance team: link invoices to dispatch IDs → unlocks real dispute tracking
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
