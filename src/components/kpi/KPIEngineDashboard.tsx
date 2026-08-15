import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Package,
  Shield,
  BarChart3,
  Activity,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

// KPI Definitions by Role
const KPI_DEFINITIONS = {
  super_admin: {
    leading: [
      { name: "Platform Uptime", icon: Activity, unit: "%" },
      { name: "API Health", icon: Zap, unit: "%" },
      { name: "Active Organizations", icon: Users, unit: "count" },
    ],
    lagging: [
      { name: "Monthly Revenue", icon: DollarSign, unit: "currency" },
      { name: "Growth Rate", icon: TrendingUp, unit: "%" },
      { name: "Churn Rate", icon: TrendingDown, unit: "%" },
    ],
  },
  org_admin: {
    leading: [
      { name: "Fleet Utilization", icon: Truck, unit: "%" },
      { name: "Order Pipeline", icon: Package, unit: "count" },
    ],
    lagging: [
      { name: "Profit Margin", icon: DollarSign, unit: "%" },
      { name: "Revenue Per Vehicle", icon: BarChart3, unit: "currency" },
    ],
  },
  ops_manager: {
    leading: [
      { name: "Dispatch Speed", icon: Clock, unit: "minutes" },
      { name: "Fleet Readiness", icon: Truck, unit: "%" },
    ],
    lagging: [
      { name: "On-Time Delivery", icon: CheckCircle, unit: "%" },
      { name: "Downtime Hours", icon: AlertTriangle, unit: "hours" },
    ],
  },
  finance_manager: {
    leading: [
      { name: "Invoice Processing Time", icon: Clock, unit: "hours" },
      { name: "Reconciliation Rate", icon: CheckCircle, unit: "%" },
    ],
    lagging: [
      { name: "Cash Flow", icon: DollarSign, unit: "currency" },
      { name: "Collection Rate", icon: TrendingUp, unit: "%" },
    ],
  },
  dispatcher: {
    leading: [
      { name: "Orders Assigned/Day", icon: Package, unit: "count" },
      { name: "Response Time", icon: Clock, unit: "minutes" },
    ],
    lagging: [
      { name: "SLA Compliance", icon: Shield, unit: "%" },
    ],
  },
  driver: {
    leading: [
      { name: "Job Acceptance Rate", icon: CheckCircle, unit: "%" },
      { name: "Route Adherence", icon: Target, unit: "%" },
    ],
    lagging: [
      { name: "Delivery Completion", icon: Package, unit: "%" },
      { name: "Incident Count", icon: AlertTriangle, unit: "count" },
    ],
  },
  customer: {
    leading: [
      { name: "Order Frequency", icon: Package, unit: "orders/month" },
    ],
    lagging: [
      { name: "Payment Timeliness", icon: Clock, unit: "days" },
      { name: "Repeat Usage", icon: TrendingUp, unit: "%" },
    ],
  },
};

interface KPIMetric {
  role: string;
  metricName: string;
  metricType: "leading" | "lagging";
  /**
   * null means the metric cannot be computed from captured data — rendered
   * as "Not tracked". Previously an undeterminable metric fell through to 0,
   * which reads as "measured and failing" and was the cause of every role
   * showing 0%.
   */
  value: number | null;
  target: number | null;
  unit: string;
  trend: "up" | "down" | "stable";
  periodLabel: string;
}

type PeriodKey = "this_month" | "last_month" | "last_3_months" | "all_time";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_3_months", label: "Last 3 months" },
  { key: "all_time", label: "All time" },
];

/**
 * Resolves a period key into the reporting window and the window immediately
 * before it, which is what every month-on-month trend is measured against.
 *
 * Dispatches are filtered on created_at — the cohort RAISED in the period,
 * not delivered in it. That keeps On-Time Delivery consistent with the Total
 * Dispatches count shown beside it; scoring deliveries that arrived in the
 * window would mix in trips raised in an earlier one and the two cards would
 * stop agreeing.
 *
 * "All time" has no meaningful prior window, so comparison is disabled rather
 * than invented.
 */
const resolvePeriod = (key: PeriodKey, now: Date) => {
  switch (key) {
    case "last_month": {
      const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      return {
        start,
        end: endOfMonth(start),
        prevStart: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        prevEnd: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        label: format(start, "MMM yyyy"),
        prevLabel: format(new Date(now.getFullYear(), now.getMonth() - 2, 1), "MMM yyyy"),
        isPartial: false,
      };
    }
    case "last_3_months": {
      const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      return {
        start,
        end: endOfMonth(now),
        prevStart: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
        prevEnd: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
        label: `${format(start, "MMM")}–${format(now, "MMM yyyy")}`,
        prevLabel: "prior 3 months",
        isPartial: true,
      };
    }
    case "all_time": {
      return {
        start: new Date(2000, 0, 1),
        end: endOfMonth(now),
        prevStart: null,
        prevEnd: null,
        label: "All time",
        prevLabel: null,
        isPartial: false,
      };
    }
    case "this_month":
    default: {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        prevStart: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        prevEnd: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        label: format(now, "MMM yyyy"),
        prevLabel: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "MMM yyyy"),
        // The current month is still running, so it is being compared against
        // a complete one. Surfaced in the UI rather than left for the reader
        // to spot.
        isPartial: true,
      };
    }
  }
};

const KPIEngineDashboard = () => {
  const { organizationId } = useAuth();
  const [selectedRole, setSelectedRole] = useState("overview");
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");

  // Calculate KPIs from actual data
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ["kpi-engine-data", organizationId, periodKey],
    enabled: !!organizationId,
    queryFn: async () => {
      const now = new Date();
      const win = resolvePeriod(periodKey, now);
      const monthStart = win.start;
      const monthEnd = win.end;
      // Fall back to the reporting window itself when there is no prior period
      // (All time). The comparison is suppressed downstream via hasPrevPeriod,
      // so these values are never actually used as a baseline.
      const prevMonthStart = win.prevStart ?? win.start;
      const prevMonthEnd = win.prevEnd ?? win.start;
      const hasPrevPeriod = win.prevStart !== null;

      // Fetch all required data in parallel — RLS scopes results to the current tenant
      const [
        dispatchesResult,
        prevDispatchesResult,
        vehiclesResult,
        invoicesResult,
        prevInvoicesResult,
        driversResult,
        customersResult,
        prevCustomersResult,
        partnersResult,
        incidentsResult,
        maintEventsResult,
      ] = await Promise.all([
        supabase
          .from("dispatches")
          // routes(estimated_duration_hours) is joined because the delivery
          // promise lives on the route, not the dispatch — see the OTD block
          // below. sla_deadline is the explicit per-dispatch override.
          .select("id, status, created_at, actual_pickup, actual_delivery, scheduled_pickup, scheduled_delivery, sla_deadline, route_id, driver_id, customer_id, vehicle_id, routes(estimated_duration_hours)")
          .eq("organization_id", organizationId)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString()),
        // Same columns as the current-period query. This previously fetched
        // only id/status/customer_id, which is why 19 of 22 metrics had no
        // prior value to compare against and fell back to a hardcoded 0.
        supabase
          .from("dispatches")
          .select("id, status, created_at, actual_pickup, actual_delivery, scheduled_pickup, scheduled_delivery, sla_deadline, route_id, driver_id, customer_id, vehicle_id, routes(estimated_duration_hours)")
          .eq("organization_id", organizationId)
          .gte("created_at", prevMonthStart.toISOString())
          .lte("created_at", prevMonthEnd.toISOString()),
        supabase
          .from("vehicles")
          .select("id, status, health_score")
          .eq("organization_id", organizationId),
        supabase
          .from("invoices")
          .select("id, subtotal, total_amount, status, created_at, paid_date")
          .eq("organization_id", organizationId)
          .not("status", "in", '("cancelled","draft")')
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("invoices")
          .select("id, subtotal, total_amount, status")
          .eq("organization_id", organizationId)
          .not("status", "in", '("cancelled","draft")')
          .gte("created_at", prevMonthStart.toISOString())
          .lte("created_at", prevMonthEnd.toISOString()),
        supabase
          .from("drivers")
          .select("id, status, total_trips, rating")
          .eq("organization_id", organizationId),
        supabase
          .from("customers")
          .select("id, created_at")
          .eq("organization_id", organizationId),
        supabase
          .from("customers")
          .select("id, created_at")
          .eq("organization_id", organizationId)
          .lte("created_at", prevMonthEnd.toISOString()),
        supabase
          .from("partners")
          .select("id, approval_status")
          .eq("organization_id", organizationId),
        supabase
          .from("vehicle_incidents")
          .select("id, incident_date, closed_at, status")
          .eq("organization_id", organizationId)
          .gte("incident_date", monthStart.toISOString().slice(0, 10)),
        // Downtime also comes from maintenance events — this is where the
        // maintenance form actually writes. vehicle_incidents is empty in
        // production, so downtime read 0 despite real maintenance records
        // existing. Not month-filtered: with only a handful of events a month
        // window would hide most of them.
        supabase
          .from("asset_maintenance_events")
          .select("id, vehicle_id, start_date, end_date, maintenance_type")
          .eq("organization_id", organizationId)
          .limit(500),
      ]);

      const dispatches = dispatchesResult.data || [];
      const prevDispatches = prevDispatchesResult.data || [];
      const vehicles = vehiclesResult.data || [];
      const invoices = invoicesResult.data || [];
      const prevInvoices = prevInvoicesResult.data || [];
      const drivers = driversResult.data || [];
      const customers = customersResult.data || [];
      const prevCustomers = prevCustomersResult.data || [];
      const partners = partnersResult.data || [];
      const incidents = incidentsResult.data || [];
      const maintEvents = maintEventsResult.data || [];

      // Cost of sale for this month's dispatches, used for profit margin.
      const monthDispatchIds = dispatches.map((d: any) => d.id).filter(Boolean);
      const { data: periodFinancials } = monthDispatchIds.length
        ? await supabase
            .from("dispatch_financials")
            .select("dispatch_id, vendor_cost")
            .eq("organization_id", organizationId)
            .in("dispatch_id", monthDispatchIds)
        : { data: [] as any[] };

      // Returns null — not 0 — when the denominator is empty. There is a real
      // difference between "0% of 40 deliveries were on time" and "no
      // deliveries had a promised time to compare against".
      const safePct = (n: number, d: number): number | null =>
        d > 0 ? Math.round((n / d) * 100) : null;
      const round1 = (n: number) => Math.round(n * 10) / 10;
      /**
       * Direction of travel against the prior period.
       *
       * Callers used to pass a hardcoded 0 as `prev` on 19 of 22 metrics, so
       * the arrow only ever said "this number is above zero" while looking
       * exactly like a month-on-month comparison. `prev` is now nullable and
       * returns "stable" (rendered without an arrow) when there is nothing
       * genuine to compare against — an unmeasurable period, or "All time",
       * which has no period before it.
       */
      const trendOf = (
        curr: number | null,
        prev: number | null,
        lowerBetter = false,
      ): "up" | "down" | "stable" => {
        if (!hasPrevPeriod) return "stable";
        if (curr === null || prev === null) return "stable";
        if (curr === prev) return "stable";
        const up = curr > prev;
        return up === !lowerBetter ? "up" : "down";
      };

      // Dispatch metrics
      const totalDispatches = dispatches.length;
      const deliveredDispatches = dispatches.filter(d => d.status === "delivered").length;
      // ── On-Time Delivery ────────────────────────────────────────────────
      // This required both actual_delivery AND scheduled_delivery. Deliveries
      // are recorded (78 of 86 carry actual_delivery) but scheduled_delivery is
      // NULL on every row in production and nothing in the codebase ever writes
      // it — so the numerator was structurally always 0 and OTD always read 0%.
      //
      // The promised time does exist, just not on that column. It is resolved
      // here in order of directness:
      //
      //   1. scheduled_delivery  — an explicit promised delivery timestamp.
      //   2. sla_deadline        — the contractual deadline (5 of 78 carry it).
      //   3. scheduled_pickup + the route's estimated_duration_hours —
      //      77 of 78 delivered dispatches link to a route carrying a duration,
      //      so this is what makes the metric computable at all today.
      //
      // Dispatches with no resolvable promise are excluded from BOTH sides of
      // the ratio rather than counted as late. Counting an unmeasurable trip as
      // a failure would invent a number; excluding it reports OTD over the
      // trips that can actually be judged, and coverage is surfaced separately.
      const promisedDeliveryAt = (d: any): Date | null => {
        if (d.scheduled_delivery) return new Date(d.scheduled_delivery);
        if (d.sla_deadline) return new Date(d.sla_deadline);
        const hours = Number(d.routes?.estimated_duration_hours) || 0;
        if (d.scheduled_pickup && hours > 0) {
          return new Date(new Date(d.scheduled_pickup).getTime() + hours * 3600000);
        }
        return null;
      };

      // Applied identically to the current and prior windows so the trend
      // compares like with like.
      const scoreOtd = (rows: any[]) => {
        const scoreable = rows.filter((d) => d.actual_delivery && promisedDeliveryAt(d) !== null);
        const onTime = scoreable.filter(
          (d) => new Date(d.actual_delivery) <= (promisedDeliveryAt(d) as Date),
        ).length;
        return { scoreable, onTime };
      };

      const { scoreable: otdScoreable, onTime: onTimeDeliveries } = scoreOtd(dispatches);
      const { scoreable: prevOtdScoreable, onTime: prevOnTime } = scoreOtd(prevDispatches);
      const dispatchSpeedMins = (() => {
        const samples = dispatches
          .filter(d => d.actual_pickup && d.created_at)
          .map(d => (new Date(d.actual_pickup as string).getTime() - new Date(d.created_at as string).getTime()) / 60000);
        if (samples.length === 0) return 0;
        return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      })();

      // Vehicle metrics
      const totalVehicles = vehicles.length;
      const availableVehicles = vehicles.filter(v => v.status === "available").length;
      const inUseVehicles = vehicles.filter(v => v.status === "in_use" || v.status === "dispatched").length;
      // Utilisation measures vehicles that actually ran a trip this period, not
      // the `status` flag. Nothing in the dispatch flow ever sets a vehicle to
      // "in_use" — all 30 of Relma's vehicles sit at "available" — so the old
      // status-based count was structurally always 0%.
      const vehiclesWithDispatches = new Set(
        dispatches.map((d: any) => d.vehicle_id).filter(Boolean),
      ).size;
      const fleetUtilization = safePct(vehiclesWithDispatches, totalVehicles);
      const fleetReadiness = totalVehicles > 0 ? safePct(availableVehicles + inUseVehicles, totalVehicles) : 0;
      const avgHealthScore = vehicles.length > 0
        ? Math.round(vehicles.reduce((acc, v) => acc + (v.health_score || 0), 0) / vehicles.length)
        : 0;

      // Invoice metrics
      // Revenue ex-VAT and excluding drafts, consistent with Profit & Loss,
      // Financial Statements and every other finance surface. This previously
      // summed VAT-inclusive totals including drafts, reporting NGN9.26m
      // against a true NGN3.67m for the month.
      const totalRevenue = invoices.reduce((acc, i: any) => acc + (Number(i.subtotal ?? i.total_amount) || 0), 0);
      // Same basis as totalRevenue — comparing ex-VAT against VAT-inclusive
      // would make the month-on-month trend meaningless.
      const prevRevenue = prevInvoices.reduce((acc, i: any) => acc + (Number(i.subtotal ?? i.total_amount) || 0), 0);
      const paidInvoices = invoices.filter(i => i.status === "paid").length;
      const collectionRate = safePct(paidInvoices, invoices.length);
      const invoiceProcessingHours = (() => {
        const samples = invoices
          .filter(i => i.paid_date && i.created_at)
          .map(i => (new Date(i.paid_date as string).getTime() - new Date(i.created_at as string).getTime()) / 3600000);
        if (samples.length === 0) return 0;
        return round1(samples.reduce((a, b) => a + b, 0) / samples.length);
      })();
      const paymentTimelinessDays = invoiceProcessingHours > 0 ? round1(invoiceProcessingHours / 24) : 0;

      // Measured over dispatches that were actually delivered AND have a
      // promise to judge them against — not over totalDispatches, which
      // included in-flight trips that cannot be late yet and would drag the
      // rate down purely because the month is still running.
      const onTimeDeliveryRate = safePct(onTimeDeliveries, otdScoreable.length);
      const prevOnTimeDeliveryRate = safePct(prevOnTime, prevOtdScoreable.length);

      // Prior-period equivalents, computed on exactly the same basis as the
      // current period so each trend arrow reflects real movement. Metrics
      // whose inputs are not period-scoped (vehicles, drivers, incidents are
      // fetched for the current window only) keep a null prior value, which
      // trendOf renders as no arrow rather than a false one.
      const prevDeliveredDispatches = prevDispatches.filter((d: any) => d.status === "delivered").length;
      const prevDeliveryCompletionRate = safePct(prevDeliveredDispatches, prevDispatches.length);
      const prevRouteAdherence = safePct(prevOnTime, prevOtdScoreable.length);
      const prevDispatchSpeedMins = (() => {
        const samples = prevDispatches
          .filter((d: any) => d.actual_pickup && d.created_at)
          .map((d: any) => (new Date(d.actual_pickup).getTime() - new Date(d.created_at).getTime()) / 60000);
        if (samples.length === 0) return null;
        return Math.round(samples.reduce((a: number, b: number) => a + b, 0) / samples.length);
      })();
      const prevFleetUtilization = (() => {
        if (totalVehicles === 0) return null;
        const used = new Set(prevDispatches.map((d: any) => d.vehicle_id).filter(Boolean)).size;
        return safePct(used, totalVehicles);
      })();
      const prevCollectionRate = safePct(
        prevInvoices.filter((i: any) => i.status === "paid").length,
        prevInvoices.length,
      );
      const deliveryCompletionRate = safePct(deliveredDispatches, totalDispatches);

      const activeOrganizations = partners.filter(p => p.approval_status === "approved").length;
      const activeDrivers = drivers.filter(d => d.status === "active").length;

      // Growth / churn from real tenant data
      const currCustomerCount = customers.length;
      const prevCustomerCount = prevCustomers.length;
      const newCustomersThisMonth = customers.filter(c => c.created_at && new Date(c.created_at) >= monthStart).length;
      const growthRate = prevCustomerCount > 0
        ? round1(((currCustomerCount - prevCustomerCount) / prevCustomerCount) * 100)
        : (currCustomerCount > 0 ? 100 : 0);
      // Churn proxy: customers active last month with no dispatches this month
      const currCustomerIds = new Set(dispatches.map(d => d.customer_id).filter(Boolean));
      const prevCustomerIds = new Set(prevDispatches.map(d => d.customer_id).filter(Boolean));
      const churned = Array.from(prevCustomerIds).filter(id => !currCustomerIds.has(id)).length;
      const churnRate = prevCustomerIds.size > 0 ? round1((churned / prevCustomerIds.size) * 100) : 0;

      // Repeat usage: customers with >1 dispatch this month
      const dispatchCountByCustomer = new Map<string, number>();
      dispatches.forEach(d => {
        if (!d.customer_id) return;
        dispatchCountByCustomer.set(d.customer_id, (dispatchCountByCustomer.get(d.customer_id) || 0) + 1);
      });
      const repeatCustomers = Array.from(dispatchCountByCustomer.values()).filter(c => c > 1).length;
      const repeatUsagePct = safePct(repeatCustomers, dispatchCountByCustomer.size);

      // Incidents and downtime
      const incidentCount = incidents.length;
      // Downtime from incidents PLUS maintenance events. vehicle_incidents is
      // empty in production while asset_maintenance_events holds real records,
      // so reading incidents alone reported 0 hours of downtime.
      const incidentDowntime = incidents.reduce((acc, i) => {
        if (!i.closed_at || !i.incident_date) return acc;
        const hrs = (new Date(i.closed_at as string).getTime() - new Date(i.incident_date as string).getTime()) / 3600000;
        return acc + Math.max(0, hrs);
      }, 0);
      const maintenanceDowntime = maintEvents.reduce((acc: number, m: any) => {
        if (!m.end_date || !m.start_date) return acc;
        const hrs = (new Date(m.end_date).getTime() - new Date(m.start_date).getTime()) / 3600000;
        return acc + Math.max(0, hrs);
      }, 0);
      const downtimeHours = Math.round(incidentDowntime + maintenanceDowntime);

      // Profit margin proxy: (revenue - actual repair cost) / revenue
      // Cost of sale for the period. Previously hardcoded to 0, which forced
      // profit margin to a flat 100% — the figure shown on the Org Admin tab.
      // vendor_cost is the trip's actual cost and is populated on real data.
      const repairCost = (periodFinancials || []).reduce(
        (acc: number, f: any) => acc + (Number(f.vendor_cost) || 0), 0);
      const profitMargin = totalRevenue > 0 ? round1(((totalRevenue - repairCost) / totalRevenue) * 100) : 0;

      // Driver job acceptance: dispatches with assigned driver / total
      const assignedDispatches = dispatches.filter(d => d.driver_id).length;
      const jobAcceptanceRate = safePct(assignedDispatches, totalDispatches);
      // Route adherence proxy: on-time deliveries among delivered
      // Same scoreable base as OTD. Dividing the on-time count by every
      // delivered dispatch would understate adherence by treating trips with no
      // promised time as though they had missed one.
      const routeAdherence = safePct(onTimeDeliveries, otdScoreable.length);

      // Platform uptime / API health derived from operational success rates (live, no mock)
      const platformUptime = totalDispatches > 0
        ? round1(100 - safePct(dispatches.filter(d => d.status === "cancelled" || d.status === "failed").length, totalDispatches))
        : 100;
      const apiHealth = totalDispatches > 0 ? round1(100 - (incidentCount / Math.max(totalDispatches, 1)) * 100) : 100;

      // Reconciliation rate: paid / (paid + overdue or pending)
      const reconciledInvoices = invoices.filter(i => i.status === "paid" || i.status === "reconciled").length;
      const reconciliationRate = safePct(reconciledInvoices, invoices.length);

      // Response time: avg minutes from created → first assignment (proxy actual_pickup)
      const responseTime = dispatchSpeedMins;

      // Reflects the selected window rather than always saying "this month".
      const period = win.label;

      const metrics: KPIMetric[] = [
        // Super Admin
        { role: "super_admin", metricName: "Platform Uptime", metricType: "leading", value: platformUptime, target: 99.5, unit: "%", trend: "stable", periodLabel: period },
        { role: "super_admin", metricName: "API Health", metricType: "leading", value: apiHealth, target: 95, unit: "%", trend: "stable", periodLabel: period },
        { role: "super_admin", metricName: "Active Organizations", metricType: "leading", value: activeOrganizations, target: null, unit: "count", trend: trendOf(activeOrganizations, null), periodLabel: period },
        { role: "super_admin", metricName: "Monthly Revenue", metricType: "lagging", value: totalRevenue, target: null, unit: "currency", trend: trendOf(totalRevenue, prevRevenue), periodLabel: period },
        { role: "super_admin", metricName: "Growth Rate", metricType: "lagging", value: growthRate, target: 10, unit: "%", trend: trendOf(growthRate, null), periodLabel: period },
        { role: "super_admin", metricName: "Churn Rate", metricType: "lagging", value: churnRate, target: 5, unit: "%", trend: trendOf(churnRate, null, true), periodLabel: period },

        // Org Admin
        { role: "org_admin", metricName: "Fleet Utilization", metricType: "leading", value: fleetUtilization, target: 75, unit: "%", trend: trendOf(fleetUtilization, prevFleetUtilization), periodLabel: period },
        { role: "org_admin", metricName: "Order Pipeline", metricType: "leading", value: dispatches.filter(d => d.status === "pending").length, target: null, unit: "count", trend: "stable", periodLabel: period },
        { role: "org_admin", metricName: "Profit Margin", metricType: "lagging", value: profitMargin, target: 20, unit: "%", trend: "stable", periodLabel: period },
        { role: "org_admin", metricName: "Revenue Per Vehicle", metricType: "lagging", value: totalVehicles > 0 ? Math.round(totalRevenue / totalVehicles) : 0, target: null, unit: "currency", trend: trendOf(totalRevenue, prevRevenue), periodLabel: period },

        // Ops Manager
        { role: "ops_manager", metricName: "Dispatch Speed", metricType: "leading", value: dispatchSpeedMins, target: 20, unit: "minutes", trend: trendOf(dispatchSpeedMins, prevDispatchSpeedMins, true), periodLabel: period },
        { role: "ops_manager", metricName: "Fleet Readiness", metricType: "leading", value: fleetReadiness, target: 80, unit: "%", trend: trendOf(fleetReadiness, null), periodLabel: period },
        { role: "ops_manager", metricName: "On-Time Delivery", metricType: "lagging", value: onTimeDeliveryRate, target: 95, unit: "%", trend: trendOf(onTimeDeliveryRate, prevOnTimeDeliveryRate), periodLabel: period },
        { role: "ops_manager", metricName: "Downtime Hours", metricType: "lagging", value: Math.round(downtimeHours), target: 20, unit: "hours", trend: trendOf(downtimeHours, null, true), periodLabel: period },

        // Finance Manager
        { role: "finance_manager", metricName: "Invoice Processing Time", metricType: "leading", value: invoiceProcessingHours, target: 4, unit: "hours", trend: trendOf(invoiceProcessingHours, null, true), periodLabel: period },
        { role: "finance_manager", metricName: "Reconciliation Rate", metricType: "leading", value: reconciliationRate, target: 90, unit: "%", trend: trendOf(reconciliationRate, null), periodLabel: period },
        { role: "finance_manager", metricName: "Cash Flow", metricType: "lagging", value: invoices.filter(i => i.status === "paid").reduce((a, i) => a + (Number(i.total_amount) || 0), 0), target: null, unit: "currency", trend: trendOf(totalRevenue, prevRevenue), periodLabel: period },
        { role: "finance_manager", metricName: "Collection Rate", metricType: "lagging", value: collectionRate, target: 85, unit: "%", trend: trendOf(collectionRate, prevCollectionRate), periodLabel: period },

        // Dispatcher
        { role: "dispatcher", metricName: "Orders Assigned/Day", metricType: "leading", value: Math.round(totalDispatches / Math.max(1, now.getDate())), target: null, unit: "count", trend: "stable", periodLabel: period },
        { role: "dispatcher", metricName: "Response Time", metricType: "leading", value: responseTime, target: 10, unit: "minutes", trend: trendOf(responseTime, null, true), periodLabel: period },
        { role: "dispatcher", metricName: "SLA Compliance", metricType: "lagging", value: onTimeDeliveryRate, target: 95, unit: "%", trend: trendOf(onTimeDeliveryRate, prevOnTimeDeliveryRate), periodLabel: period },

        // Driver
        { role: "driver", metricName: "Job Acceptance Rate", metricType: "leading", value: jobAcceptanceRate, target: 90, unit: "%", trend: trendOf(jobAcceptanceRate, null), periodLabel: period },
        { role: "driver", metricName: "Route Adherence", metricType: "leading", value: routeAdherence, target: 85, unit: "%", trend: trendOf(routeAdherence, prevRouteAdherence), periodLabel: period },
        { role: "driver", metricName: "Delivery Completion", metricType: "lagging", value: deliveryCompletionRate, target: 98, unit: "%", trend: trendOf(deliveryCompletionRate, prevDeliveryCompletionRate), periodLabel: period },
        { role: "driver", metricName: "Incident Count", metricType: "lagging", value: incidentCount, target: 0, unit: "count", trend: trendOf(incidentCount, null, true), periodLabel: period },

        // Customer
        { role: "customer", metricName: "Order Frequency", metricType: "leading", value: customers.length > 0 ? round1(totalDispatches / customers.length) : 0, target: null, unit: "orders/month", trend: "stable", periodLabel: period },
        { role: "customer", metricName: "Payment Timeliness", metricType: "lagging", value: paymentTimelinessDays, target: 7, unit: "days", trend: trendOf(paymentTimelinessDays, null, true), periodLabel: period },
        { role: "customer", metricName: "Repeat Usage", metricType: "lagging", value: repeatUsagePct, target: 70, unit: "%", trend: trendOf(repeatUsagePct, null), periodLabel: period },
      ];

      return {
        metrics,
        summary: {
          totalDispatches,
          totalRevenue,
          fleetUtilization,
          onTimeDeliveryRate,
          // How many trips the OTD figure is actually based on, so the card can
          // distinguish "0% — everything was late" from "no trip could be
          // judged". These read identically otherwise.
          otdScoreableCount: otdScoreable.length,
          deliveredCount: deliveredDispatches,
          prevOnTimeDeliveryRate,
          periodLabel: win.label,
          prevPeriodLabel: win.prevLabel,
          // True when the window is still running, so the reader knows the
          // figure is being compared against a complete period.
          isPartial: win.isPartial,
        },
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatValue = (value: number | null, unit: string) => {
    // A null metric has no measurable basis — say so rather than printing 0.
    if (value === null || value === undefined) return "Not tracked";
    if (unit === "currency") {
      return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(value);
    }
    if (unit === "%") return `${value}%`;
    if (unit === "hours" || unit === "minutes" || unit === "days") return `${value} ${unit}`;
    return value.toLocaleString();
  };

  const getProgressColor = (value: number, target: number | null, isLowerBetter = false) => {
    if (!target) return "bg-primary";
    const ratio = isLowerBetter ? (target / value) : (value / target);
    if (ratio >= 1) return "bg-success";
    if (ratio >= 0.8) return "bg-warning";
    return "bg-destructive";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-success" />;
      case "down": return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    org_admin: "Org Admin",
    ops_manager: "Ops Manager",
    finance_manager: "Finance Manager",
    dispatcher: "Dispatcher",
    driver: "Driver",
    customer: "Customer",
  };

  const roles = Object.keys(KPI_DEFINITIONS);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filteredMetrics = selectedRole === "overview" 
    ? kpiData?.metrics 
    : kpiData?.metrics?.filter(m => m.role === selectedRole);

  return (
    <div className="space-y-6">
      {/* Period selector — every figure below is scoped to this window */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{kpiData?.summary.periodLabel}</p>
          <p className="text-xs text-muted-foreground">
            Dispatches raised in this period
            {kpiData?.summary.isPartial ? " — period still in progress" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriodKey(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodKey === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dispatches</p>
                <p className="text-2xl font-bold">{kpiData?.summary.totalDispatches || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatValue(kpiData?.summary.totalRevenue || 0, "currency")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fleet Utilization</p>
                <p className="text-2xl font-bold">{kpiData?.summary.fleetUtilization || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <CheckCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                {kpiData?.summary.onTimeDeliveryRate === null ||
                kpiData?.summary.onTimeDeliveryRate === undefined ? (
                  <>
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground">No promised times set</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{kpiData.summary.onTimeDeliveryRate}%</p>
                    <p className="text-xs text-muted-foreground">
                      of {kpiData.summary.otdScoreableCount} measurable{" "}
                      {kpiData.summary.otdScoreableCount === 1 ? "trip" : "trips"}
                      {kpiData.summary.prevOnTimeDeliveryRate !== null &&
                      kpiData.summary.prevPeriodLabel ? (
                        <>
                          {" · "}
                          {kpiData.summary.prevOnTimeDeliveryRate}% in{" "}
                          {kpiData.summary.prevPeriodLabel}
                        </>
                      ) : null}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-based KPI Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            KPI Engine - Role Performance
          </CardTitle>
          <CardDescription>
            Leading and lagging indicators tracked by role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="flex-wrap h-auto gap-1 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {roles.map(role => (
                <TabsTrigger key={role} value={role}>{roleLabels[role]}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedRole}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leading Indicators */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Leading Indicators
                    </CardTitle>
                    <CardDescription className="text-xs">Predictive metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredMetrics?.filter(m => m.metricType === "leading").map((metric, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {selectedRole !== "overview" && (
                                <Badge variant="outline" className="text-xs">{roleLabels[metric.role]}</Badge>
                              )}
                              <span className="text-sm font-medium">{metric.metricName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{formatValue(metric.value, metric.unit)}</span>
                              {getTrendIcon(metric.trend)}
                            </div>
                          </div>
                          {metric.target && (
                            <div className="space-y-1">
                              <Progress 
                                value={metric.value === null ? 0 : Math.min((metric.value / metric.target) * 100, 100)} 
                                className="h-2"
                              />
                              <p className="text-xs text-muted-foreground text-right">
                                Target: {formatValue(metric.target, metric.unit)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredMetrics?.filter(m => m.metricType === "leading").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No leading indicators</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lagging Indicators */}
                <Card className="border-success/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-success" />
                      Lagging Indicators
                    </CardTitle>
                    <CardDescription className="text-xs">Outcome metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredMetrics?.filter(m => m.metricType === "lagging").map((metric, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {selectedRole !== "overview" && (
                                <Badge variant="outline" className="text-xs">{roleLabels[metric.role]}</Badge>
                              )}
                              <span className="text-sm font-medium">{metric.metricName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{formatValue(metric.value, metric.unit)}</span>
                              {getTrendIcon(metric.trend)}
                            </div>
                          </div>
                          {metric.target && (
                            <div className="space-y-1">
                              <Progress 
                                value={metric.value === null ? 0 : Math.min((metric.value / metric.target) * 100, 100)} 
                                className="h-2"
                              />
                              <p className="text-xs text-muted-foreground text-right">
                                Target: {formatValue(metric.target, metric.unit)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredMetrics?.filter(m => m.metricType === "lagging").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No lagging indicators</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIEngineDashboard;
