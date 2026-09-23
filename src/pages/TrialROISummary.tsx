import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays } from "date-fns";
import { useState } from "react";
import {
  TrendingUp, ShieldCheck, AlertTriangle, Wallet, Gauge,
  Fuel, FileCheck, Wrench, Truck, Info, ChevronDown,
} from "lucide-react";

// ── Nigerian industry benchmark (NARTO) ───────────────────────────────────
// Used only as a fallback for Fuel Recovered when no verified fleet baseline
// exists. Clearly marked "Benchmark" wherever it appears — never presented
// as measured.
const FUEL_WASTE_RATE = 0.12;
const MONTHLY_PER_VEHICLE = 5_000;

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
  value: number | string;
  valueSuffix?: string;
  color: string;
  border: string;
  bg: string;
  source: DataSource;
  derivation: DerivationLine[];
  actionPrompt?: string;
}

const sourceLabel: Record<DataSource, string> = {
  real: "Real",
  partial: "Partial",
  benchmark: "Benchmark",
};
const sourceBadgeClass: Record<DataSource, string> = {
  real: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10",
  partial: "border-amber-500/40 text-amber-600 bg-amber-500/10",
  benchmark: "border-muted-foreground/30 text-muted-foreground bg-muted",
};
const sourceTooltip: Record<DataSource, string> = {
  real: "Calculated entirely from real data recorded in RouteAce. Updates live.",
  partial: "Mix of real data and an industry estimate. Improve by completing the action shown below.",
  benchmark: "Using a Nigerian industry benchmark (NARTO) as a stand-in — no verified data exists for this yet. Replaced automatically once real data is recorded.",
};

export default function TrialROISummary() {
  const { organizationId: orgId, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const canSubscribe = hasAnyRole(["super_admin", "org_admin", "admin"]);
  const [openCard, setOpenCard] = useState<string | null>(null);

  // ── Organisation ─────────────────────────────────────────────────────────
  const { data: org } = useQuery({
    queryKey: ["impact-org", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("organizations")
        .select("name, created_at")
        .eq("id", orgId!)
        .maybeSingle();
      return data;
    },
  });

  // ── Vehicles ─────────────────────────────────────────────────────────────
  const { data: vehicles = [] } = useQuery({
    queryKey: ["impact-vehicles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles")
        .select("id, ownership_type")
        .eq("organization_id", orgId!)
        .neq("status", "retired");
      return data ?? [];
    },
  });

  // ── Dispatch financials ──────────────────────────────────────────────────
  const { data: dispatchFinancials = [] } = useQuery({
    queryKey: ["impact-dispatch-financials", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatch_financials") as any)
        .select("client_revenue, vendor_cost, gross_profit, finance_status, invoice_id, dispatch_id")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Delivered dispatches (for the unbilled backlog) ─────────────────────
  const { data: deliveredDispatches = [] } = useQuery({
    queryKey: ["impact-delivered-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("dispatches")
        .select("id, created_at")
        .eq("organization_id", orgId!)
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data ?? [];
    },
  });

  // ── Invoices ─────────────────────────────────────────────────────────────
  const { data: invoiceData = [] } = useQuery({
    queryKey: ["impact-invoices", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("id, status, total_amount, balance_due, dispatch_id, due_date, paid_date")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Fuel logs ────────────────────────────────────────────────────────────
  const { data: fuelLogs = [] } = useQuery({
    queryKey: ["impact-fuel", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("fuel_logs")
        .select("total_cost, km_since_last_fill")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  // ── Vehicle repairs (Maintenance Shifted) ───────────────────────────────
  const { data: repairs = [] } = useQuery({
    queryKey: ["impact-repairs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicle_repairs") as any)
        .select("cost, is_breakdown, status")
        .eq("organization_id", orgId!)
        .eq("status", "approved");
      return data ?? [];
    },
  });

  // ── Fleet utilisation (from the audit-log-backed RPC) ───────────────────
  const { data: utilizationSummary } = useQuery({
    queryKey: ["impact-utilization", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_fleet_utilization_summary", {
        p_organization_id: orgId,
        p_days: 30,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: utilizationRows = [] } = useQuery({
    queryKey: ["impact-utilization-rows", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_fleet_utilization", {
        p_organization_id: orgId,
        p_days: 30,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Derived values ───────────────────────────────────────────────────────
  const daysActive   = org?.created_at
    ? Math.max(1, differenceInDays(new Date(), new Date(org.created_at)))
    : 1;
  const monthsActive = Math.max(1, Math.round(daysActive / 30));
  const vehicleCount = vehicles.length;
  const routeAceCost = vehicleCount * MONTHLY_PER_VEHICLE * monthsActive;

  // ══════════════════════════════════════════════════════════════════════
  // TAB 1 — THE OPERATION
  // ══════════════════════════════════════════════════════════════════════

  // 1. Profit Generated — real, from dispatch_financials rows finance has completed
  const completedFinancials = dispatchFinancials.filter((f: any) => f.finance_status === "complete");
  const pendingFinancials   = dispatchFinancials.filter((f: any) => f.finance_status !== "complete");
  const profitGenerated     = completedFinancials.reduce((s: number, f: any) => s + Number(f.gross_profit ?? 0), 0);
  const totalRevenue        = completedFinancials.reduce((s: number, f: any) => s + Number(f.client_revenue ?? 0), 0);
  const totalCost           = completedFinancials.reduce((s: number, f: any) => s + Number(f.vendor_cost ?? 0), 0);
  const profitIsReal        = completedFinancials.length > 0;

  // 2. Revenue Protected — invoiced (sent/paid), whether or not dispatch-linked
  const invoicedRevenue = invoiceData
    .filter((i: any) => ["sent", "paid", "overdue"].includes(i.status))
    .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
  const paidCount   = invoiceData.filter((i: any) => i.status === "paid").length;
  const sentCount    = invoiceData.filter((i: any) => i.status === "sent").length;
  const overdueCount = invoiceData.filter((i: any) => i.status === "overdue").length;

  // 3. Revenue At Risk — delivered dispatches with resolved revenue but no linked invoice
  const linkedDispatchIds = new Set(
    invoiceData.filter((i: any) => i.dispatch_id).map((i: any) => i.dispatch_id),
  );
  const unbilledFinancials = dispatchFinancials.filter(
    (f: any) => f.client_revenue != null && f.dispatch_id && !linkedDispatchIds.has(f.dispatch_id),
  );
  const revenueAtRisk   = unbilledFinancials.reduce((s: number, f: any) => s + Number(f.client_revenue ?? 0), 0);
  const unbilledCount   = unbilledFinancials.length;
  const oldestUnbilled  = deliveredDispatches
    .filter((d: any) => unbilledFinancials.some((f: any) => f.dispatch_id === d.id))
    .reduce((oldest: number, d: any) => {
      const days = differenceInDays(new Date(), new Date(d.created_at));
      return Math.max(oldest, days);
    }, 0);

  // 4. Cash Outstanding — invoiced, unpaid (sent + overdue)
  const cashOutstanding = invoiceData
    .filter((i: any) => ["sent", "overdue"].includes(i.status))
    .reduce((s: number, i: any) => s + Number(i.balance_due ?? i.total_amount ?? 0), 0);
  const overdueAmount = invoiceData
    .filter((i: any) => i.status === "overdue")
    .reduce((s: number, i: any) => s + Number(i.balance_due ?? i.total_amount ?? 0), 0);
  const worstDaysOverdue = invoiceData
    .filter((i: any) => i.status === "overdue" && i.due_date)
    .reduce((worst: number, i: any) => {
      const days = differenceInDays(new Date(), new Date(i.due_date));
      return Math.max(worst, days);
    }, 0);

  // 5. Cash Flow Risk — banded across not-invoiced / overdue / healthy
  const paidAmount = invoiceData
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
  const healthyAmount   = paidAmount + invoiceData
    .filter((i: any) => i.status === "sent")
    .reduce((s: number, i: any) => s + Number(i.balance_due ?? i.total_amount ?? 0), 0);
  const riskTotal = revenueAtRisk + overdueAmount + healthyAmount;
  const notInvoicedPct = riskTotal > 0 ? Math.round((revenueAtRisk / riskTotal) * 100) : 0;
  const overduePct      = riskTotal > 0 ? Math.round((overdueAmount / riskTotal) * 100) : 0;
  const healthyPct       = Math.max(0, 100 - notInvoicedPct - overduePct);
  // Weighted: not-yet-invoiced counts fully, overdue is weighted by how
  // stale it is (worse the longer it sits), healthy counts for nothing.
  const riskScore = notInvoicedPct + overduePct * (worstDaysOverdue > 30 ? 1.5 : 1);
  const riskLevel: "low" | "med" | "high" =
    riskScore >= 50 ? "high" : riskScore >= 20 ? "med" : "low";
  const riskLabel = { low: "Low risk", med: "Medium risk", high: "High risk" }[riskLevel];

  // ══════════════════════════════════════════════════════════════════════
  // TAB 2 — SAVINGS
  // ══════════════════════════════════════════════════════════════════════

  // Fuel Recovered — benchmark only until fleet has a real baseline
  const totalFuelSpend   = fuelLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  const disciplinedLogs  = fuelLogs.filter((f: any) => f.km_since_last_fill != null && Number(f.km_since_last_fill) > 0);
  const disciplinedSpend = disciplinedLogs.reduce((s: number, f: any) => s + Number(f.total_cost ?? 0), 0);
  const fuelRecovered    = disciplinedSpend > 0
    ? Math.round(disciplinedSpend * FUEL_WASTE_RATE)
    : Math.round(vehicleCount * 40_000 * FUEL_WASTE_RATE * monthsActive);
  const fuelSource: DataSource = disciplinedSpend > 0 ? "partial" : "benchmark";

  // Billing Recovered — placeholder until invoice-revision tracking exists.
  // No fabricated figure: zero until the platform can actually see a correction.
  const billingRecovered = 0;

  // Maintenance Shifted — real, from approved repairs
  const plannedRepairs   = repairs.filter((r: any) => !r.is_breakdown);
  const breakdownRepairs = repairs.filter((r: any) => r.is_breakdown);
  const avgBreakdownCost = breakdownRepairs.length > 0
    ? breakdownRepairs.reduce((s: number, r: any) => s + Number(r.cost ?? 0), 0) / breakdownRepairs.length
    : plannedRepairs.length > 0
      ? plannedRepairs.reduce((s: number, r: any) => s + Number(r.cost ?? 0), 0) / plannedRepairs.length * 1.6
      : 0;
  const maintenanceShifted = Math.round(plannedRepairs.length * avgBreakdownCost * 0.4);
  const maintenanceIsReal  = repairs.length > 0;

  // Fleet Utilisation — real, from the audit-log-backed RPC
  const fleetUtilPct   = utilizationSummary?.fleet_utilization_pct ?? null;
  const utilBestVehicle = (utilizationRows as any[]).find((r) => r.is_benchmark_vehicle);
  const utilWorstMeasured = (utilizationRows as any[])
    .filter((r) => r.recommended_days != null)
    .sort((a, b) => a.active_days - b.active_days)[0];

  const savingsCards: SavingsCard[] = [
    {
      icon: Fuel,
      label: "Fuel Recovered",
      sublabel: disciplinedSpend > 0
        ? `${disciplinedLogs.length} of ${fuelLogs.length} fuel logs have odometer readings — waste rate applied to that disciplined spend`
        : totalFuelSpend > 0
          ? `${NGN(totalFuelSpend)} logged, but no odometer readings yet — showing a fleet-size benchmark instead`
          : `${vehicleCount} vehicles — log fuel with odometer readings to start tracking real recovery`,
      value: NGN(fuelRecovered),
      color: "text-blue-500",
      border: "border-l-blue-500",
      bg: "bg-blue-500/10",
      source: fuelSource,
      derivation: disciplinedSpend > 0 ? [
        { label: "Total fuel spend logged", value: NGN(totalFuelSpend) },
        { label: "Logs with odometer readings", value: `${disciplinedLogs.length} of ${fuelLogs.length}` },
        { label: "Disciplined fuel spend", value: NGN(disciplinedSpend) },
        { label: "NARTO waste rate", value: "12%", note: "Applied to disciplined spend only — undisciplined logs can't prove the km were tracked" },
        { label: "Fuel recovered", value: NGN(fuelRecovered), highlight: true },
      ] : [
        { label: "No verified fuel baseline yet", note: "Benchmark: NARTO's 12% average fuel-waste rate applied to an assumed ₦40,000/vehicle/month" },
        { label: "Vehicles", value: String(vehicleCount) },
        { label: "Months active", value: String(monthsActive) },
        { label: "Benchmark estimate", value: NGN(fuelRecovered), highlight: true },
      ],
      actionPrompt: disciplinedSpend === 0
        ? "Log fuel fill-ups with an odometer reading each time to unlock a real, fleet-specific figure"
        : undefined,
    },
    {
      icon: FileCheck,
      label: "Billing Recovered",
      sublabel: "No under-billing corrections recorded yet",
      value: NGN(billingRecovered),
      color: "text-teal-500",
      border: "border-l-teal-500",
      bg: "bg-teal-500/10",
      source: "real" as DataSource,
      derivation: [
        { label: "Invoice corrections on record", value: "0" },
        { label: "Billing recovered", value: NGN(0), highlight: true },
      ],
      actionPrompt: "This starts recording once an invoice is corrected upward after being caught under-billed",
    },
    {
      icon: Wrench,
      label: "Maintenance Shifted",
      sublabel: maintenanceIsReal
        ? `${plannedRepairs.length} planned repair${plannedRepairs.length !== 1 ? "s" : ""} vs ${breakdownRepairs.length} breakdown${breakdownRepairs.length !== 1 ? "s" : ""} — each with real parts & labour cost on file`
        : "Log and approve repairs to start tracking breakdown cost avoided",
      value: NGN(maintenanceShifted),
      color: "text-orange-500",
      border: "border-l-orange-500",
      bg: "bg-orange-500/10",
      source: (maintenanceIsReal ? "real" : "benchmark") as DataSource,
      derivation: maintenanceIsReal ? [
        { label: "Approved repairs on record", value: String(repairs.length) },
        { label: "Planned (caught before breakdown)", value: String(plannedRepairs.length) },
        { label: "Breakdown", value: String(breakdownRepairs.length) },
        { label: "Avg cost per repair", value: NGN(Math.round(avgBreakdownCost)) },
        { label: "Estimated breakdown cost avoided (40% of planned repair value)", value: NGN(maintenanceShifted), highlight: true },
      ] : [
        { label: "No approved repairs on record yet", note: "Log repairs against owned vehicles, then have a super admin approve them" },
      ],
      actionPrompt: !maintenanceIsReal ? "Log a vehicle repair to start tracking this" : undefined,
    },
    {
      icon: Truck,
      label: "Fleet Utilisation",
      sublabel: fleetUtilPct != null
        ? `Owned fleet's active days over the last 30, against your own busiest truck of the same class`
        : "No owned vehicles with dispatch activity in the last 30 days",
      value: fleetUtilPct != null ? fleetUtilPct : "—",
      valueSuffix: fleetUtilPct != null ? "%" : undefined,
      color: "text-violet-500",
      border: "border-l-violet-500",
      bg: "bg-violet-500/10",
      source: "real" as DataSource,
      derivation: fleetUtilPct != null ? [
        { label: "Owned vehicles measured", value: String(utilizationSummary?.vehicles_measured ?? 0) },
        ...(utilBestVehicle ? [{ label: "Busiest truck (sets the target)", value: `${utilBestVehicle.registration_number} — ${utilBestVehicle.active_days} of 30 days` }] : []),
        ...(utilWorstMeasured ? [{ label: "Lowest measured", value: `${utilWorstMeasured.registration_number} — ${utilWorstMeasured.utilization_pct}%` }] : []),
        { label: "Fleet utilisation", value: `${fleetUtilPct}%`, highlight: true },
        { label: "Scope", note: "Owned/internal vehicles only — vendor trucks are excluded, that's the vendor's fleet to manage" },
      ] : [
        { label: "No active owned vehicles in the last 30 days", note: "This fills in as soon as a dispatch on an owned truck reaches picked up or in transit" },
      ],
    },
  ];

  const totalSavings = fuelRecovered + billingRecovered + maintenanceShifted;

  return (
    <TooltipProvider>
      <DashboardLayout
        title="Business Impact"
        subtitle={`${daysActive} days active · ${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""} · every figure below is labeled by how it was produced`}
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          <Tabs defaultValue="operation">
            <TabsList>
              <TabsTrigger value="operation">The Operation</TabsTrigger>
              <TabsTrigger value="savings">Savings</TabsTrigger>
            </TabsList>

            {/* ══════════════ TAB 1 — THE OPERATION ══════════════ */}
            <TabsContent value="operation" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className={profitIsReal ? "border-l-4 border-l-emerald-500" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-muted-foreground">Profit Generated</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{NGN(profitGenerated)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Gross profit from {completedFinancials.length} fully-costed dispatch{completedFinancials.length !== 1 ? "es" : ""}
                      {pendingFinancials.length > 0 && ` · ${pendingFinancials.length} awaiting finance entry`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Revenue Protected</span>
                    </div>
                    <p className="text-2xl font-black">{NGN(invoicedRevenue)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {sentCount + paidCount + overdueCount} invoiced — {paidCount} paid, {sentCount} within terms, {overdueCount} overdue
                    </p>
                  </CardContent>
                </Card>

                <Card className={revenueAtRisk > 0 ? "border-l-4 border-l-amber-500" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-muted-foreground">Revenue At Risk</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{NGN(revenueAtRisk)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {unbilledCount} delivered, not yet invoiced
                      {oldestUnbilled > 0 && ` · oldest is ${oldestUnbilled} day${oldestUnbilled !== 1 ? "s" : ""} old`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Cash Outstanding</span>
                    </div>
                    <p className="text-2xl font-black">{NGN(cashOutstanding)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {sentCount + overdueCount} invoiced, unpaid
                      {overdueAmount > 0 && ` · ${NGN(overdueAmount)} overdue`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow Risk */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">Cash Flow Risk</p>
                        <p className="text-[11px] text-muted-foreground">How exposed your cash position is, from delivery through to payment</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        riskLevel === "high" ? "border-red-500/40 text-red-600 bg-red-500/10" :
                        riskLevel === "med"  ? "border-amber-500/40 text-amber-600 bg-amber-500/10" :
                                                "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                      }
                    >
                      {riskLabel}
                    </Badge>
                  </div>

                  <div className="h-2 rounded-full bg-muted overflow-hidden flex mb-3">
                    <div className="h-full bg-red-500" style={{ width: `${notInvoicedPct}%` }} />
                    <div className="h-full bg-amber-500" style={{ width: `${overduePct}%` }} />
                    <div className="h-full bg-emerald-500" style={{ width: `${healthyPct}%` }} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-red-500 shrink-0" />Delivered, not invoiced</span>
                      <span className="font-semibold tabular-nums">{NGN(revenueAtRisk)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />Invoiced, past due date</span>
                      <span className="font-semibold tabular-nums">{NGN(overdueAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" />Invoiced, within terms or paid</span>
                      <span className="font-semibold tabular-nums">{NGN(healthyAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════ TAB 2 — SAVINGS ══════════════ */}
            <TabsContent value="savings" className="space-y-4 mt-4">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Value RouteAce has saved you
                  </p>
                  <p className="text-4xl font-black text-primary leading-none">{NGN(totalSavings)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fuel and Billing figures include a benchmark portion until your own data fully backs them — see each card for exactly which part is real.
                  </p>
                </div>
              </Card>

              <div className="space-y-3">
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
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xl font-black ${card.color}`}>
                              {card.value}{card.valueSuffix}
                            </p>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1 mt-0.5 px-2">
                                How? <ChevronDown className={`w-3 h-3 transition-transform ${openCard === card.label ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

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

              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Demurrage Avoided isn't shown — the platform doesn't yet track actual demurrage charges incurred or prevented. It'll appear here once that data exists, not before.
              </p>
            </TabsContent>
          </Tabs>

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
