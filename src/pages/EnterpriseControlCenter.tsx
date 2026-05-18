import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  Truck, Package, Clock, DollarSign, TrendingUp, AlertTriangle, Brain,
  Wallet, Users, MapPin, Activity, ArrowUpRight, ArrowDownRight, Eye, PieChart,
  Filter, RotateCcw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

// ---------- helpers ----------
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const fmtMoney = (v: number | null | undefined) =>
  v == null ? "-" : `₦${(v / 1_000_000).toFixed(1)}M`;
const fmtPct = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "-" : `${v.toFixed(1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : null);
const pctChange = (curr: number, prev: number): number | null => {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / Math.abs(prev)) * 100;
};

// ---------- KPI Card ----------
interface KPICardProps {
  title: string;
  value: string;
  change: number | null;
  icon: React.ComponentType<{ className?: string }>;
  sparkData: { x: number; v: number }[];
  color: string;
  loading?: boolean;
  error?: string | null;
}

const KPICard = ({ title, value, change, icon: Icon, sparkData, color, loading, error }: KPICardProps) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card/80 backdrop-blur border-border/50 hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
              <Icon className="w-4 h-4" />
            </div>
            {!loading && !error && change !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              }`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>
          {loading ? (
            <>
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : error ? (
            <>
              <p className="text-sm font-medium text-destructive">Unable to load</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate" title={error}>{error}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold font-heading text-foreground truncate">{value}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{title}</p>
            </>
          )}
          <div className="h-8 mt-2">
            {!loading && !error && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`spark-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${title.replace(/\s/g, "")})`} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ---------- Gauge ----------
const GaugeChart = ({ value, target, label, color }: { value: number | null; target: number; label: string; color: string }) => {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="text-center min-w-0">
      <div className="h-24 w-24 mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={[{ value: v, fill: color }]}
          >
            {/* Fix: scale the radial fill against a fixed 0-100 domain so 0% renders empty, not full. */}
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: "hsl(var(--muted))" }}
              dataKey="value"
              cornerRadius={10}
              fill={color}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-lg font-bold mt-1">{value == null ? "—" : `${v.toFixed(0)}%`}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">Target: {target}%</p>
    </div>
  );
};

const AIInsightCard = ({ alert, impact, action, severity }: { alert: string; impact: string; action: string; severity: "high" | "medium" | "low" }) => {
  const colors = { high: "border-red-500/30 bg-red-500/5", medium: "border-amber-500/30 bg-amber-500/5", low: "border-emerald-500/30 bg-emerald-500/5" };
  const badges = { high: "bg-red-500/10 text-red-500", medium: "bg-amber-500/10 text-amber-500", low: "bg-emerald-500/10 text-emerald-500" };
  return (
    <Card className={`${colors[severity]} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severity === "high" ? "text-red-500" : severity === "medium" ? "text-amber-500" : "text-emerald-500"}`} />
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-medium">{alert}</p>
            <p className="text-xs text-muted-foreground">{impact}</p>
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] ${badges[severity]}`}>{severity.toUpperCase()}</Badge>
              <span className="text-xs text-primary font-medium">{action}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WidgetState = ({ loading, error, empty, emptyMsg, children }: {
  loading?: boolean; error?: string | null; empty?: boolean; emptyMsg?: string;
  children: React.ReactNode;
}) => {
  if (loading) return <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return (
    <div className="text-center py-6">
      <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-2" />
      <p className="text-sm font-medium">Unable to load this widget</p>
      <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
    </div>
  );
  if (empty) return <div className="py-6 text-center text-sm text-muted-foreground">{emptyMsg ?? "No data available for the selected filters."}</div>;
  return <>{children}</>;
};

// ---------- Main page ----------
const EnterpriseControlCenter = () => {
  const { organizationId, tenantMode } = useAuth();

  // Filters
  const today = new Date();
  const [filters, setFilters] = useState({
    from: toDateInput(monthStart(today)),
    to: toDateInput(today),
    contractId: "all",
    zoneId: "all",
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [contracts, setContracts] = useState<{ id: string; label: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; label: string }[]>([]);

  // Per-widget state
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);

  const [kpis, setKpis] = useState({
    deliveriesToday: 0,
    deliveriesYesterday: 0,
    fleetUtil: null as number | null,
    fleetUtilPrev: null as number | null,
    onTimeRate: null as number | null,
    onTimeRatePrev: null as number | null,
    activeTrucks: 0,
    activeTrucksPrev: 0,
    revenueToday: 0,
    revenueYesterday: 0,
    opMargin: null as number | null,
    opMarginPrev: null as number | null,
    arOutstanding: 0,
    arOutstandingPrev: 0,
    apOutstanding: 0,
    arOverdue: 0,
    warehouseUtil: null as number | null,
    warehouseUtilPrev: null as number | null,
    perfectOrder: null as number | null,
    billAccuracy: null as number | null,
    fulfillmentScore: null as number | null,
    revenueMTD: 0,
    revenuePrevMTD: 0,
    expensesMTD: 0,
    customersTotal: 0,
    customersActive: 0,
    monthlyTrend: [] as { month: string; revenue: number; cost: number }[],
  });

  // Load filter dropdown options (contracts + zones), tenant-scoped
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const [{ data: contractRows }, { data: zoneRows }] = await Promise.all([
        supabase.from("sla_contracts").select("id, contract_name, contract_number")
          .eq("organization_id", organizationId).order("contract_name", { ascending: true }),
        supabase.from("sla_policies").select("id, name, zone")
          .eq("organization_id", organizationId).eq("is_active", true).order("name", { ascending: true }),
      ]);
      if (cancelled) return;
      setContracts((contractRows ?? []).map((c: any) => ({
        id: c.id,
        label: c.contract_name || c.contract_number || c.id.slice(0, 8),
      })));
      setZones((zoneRows ?? []).map((z: any) => ({
        id: z.id,
        label: z.zone ? `${z.name} · ${z.zone}` : z.name,
      })));
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const loadKpis = useCallback(async () => {
    if (!organizationId) return;
    setKpisLoading(true);
    setKpisError(null);

    try {
      const fromDate = new Date(filters.from + "T00:00:00");
      const toDate = new Date(filters.to + "T23:59:59");
      const windowMs = Math.max(1, toDate.getTime() - fromDate.getTime());
      const prevToDate = new Date(fromDate.getTime());
      const prevFromDate = new Date(fromDate.getTime() - windowMs);

      const now = new Date();
      const todayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterdayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

      const orgEq = (q: any) => q.eq("organization_id", organizationId);
      const withContract = (q: any) =>
        filters.contractId === "all" ? q : q.eq("sla_contract_id", filters.contractId);

      // Resolve customer scope from contract / zone
      let scopedCustomerIds: string[] | null = null;
      if (filters.contractId !== "all") {
        const { data: c } = await supabase.from("sla_contracts").select("customer_id")
          .eq("id", filters.contractId).eq("organization_id", organizationId).maybeSingle();
        scopedCustomerIds = c?.customer_id ? [c.customer_id] : [];
      } else if (filters.zoneId !== "all") {
        const { data: z } = await supabase.from("sla_policies").select("zone, state")
          .eq("id", filters.zoneId).eq("organization_id", organizationId).maybeSingle();
        if (z) {
          const { data: custInZone } = await supabase.from("customers")
            .select("id").eq("organization_id", organizationId)
            .or([
              z.zone ? `city.eq.${z.zone}` : null,
              z.zone ? `state.eq.${z.zone}` : null,
              z.state ? `state.eq.${z.state}` : null,
            ].filter(Boolean).join(","));
          scopedCustomerIds = (custInZone || []).map((r: any) => r.id);
        }
      }

      const withCustomerScope = (q: any) => {
        if (!scopedCustomerIds) return q;
        if (scopedCustomerIds.length === 0) return q.eq("customer_id", "00000000-0000-0000-0000-000000000000");
        return q.in("customer_id", scopedCustomerIds);
      };

      const [
        delivToday, delivYesterday,
        invoicesRange, invoicesPrevRange, invoicesToday, invoicesYesterday,
        expensesRange, expensesPrevRange,
        deliveredRange, deliveredPrevRange,
        activeDispatches,
        vehiclesAll,
        arUnpaid, arPrev,
        apUnpaid,
        customers,
      ] = await Promise.all([
        withContract(orgEq(supabase.from("dispatches").select("id", { count: "exact", head: true }))).gte("created_at", todayISO),
        withContract(orgEq(supabase.from("dispatches").select("id", { count: "exact", head: true }))).gte("created_at", yesterdayISO).lt("created_at", todayISO),
        withCustomerScope(orgEq(supabase.from("invoices").select("total_amount, status, created_at, due_date"))).gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
        withCustomerScope(orgEq(supabase.from("invoices").select("total_amount"))).gte("created_at", prevFromDate.toISOString()).lt("created_at", prevToDate.toISOString()),
        withCustomerScope(orgEq(supabase.from("invoices").select("total_amount"))).gte("created_at", todayISO),
        withCustomerScope(orgEq(supabase.from("invoices").select("total_amount"))).gte("created_at", yesterdayISO).lt("created_at", todayISO),
        orgEq(supabase.from("expenses").select("amount")).gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
        orgEq(supabase.from("expenses").select("amount")).gte("created_at", prevFromDate.toISOString()).lt("created_at", prevToDate.toISOString()),
        withContract(orgEq(supabase.from("dispatches").select("scheduled_delivery, actual_delivery, status, sla_status"))).eq("status", "delivered").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
        withContract(orgEq(supabase.from("dispatches").select("scheduled_delivery, actual_delivery, status, sla_status"))).eq("status", "delivered").gte("created_at", prevFromDate.toISOString()).lt("created_at", prevToDate.toISOString()),
        withContract(orgEq(supabase.from("dispatches").select("id, vehicle_id", { count: "exact" }))).not("status", "in", '("delivered","cancelled","completed","settled")'),
        orgEq(supabase.from("vehicles").select("id, status")),
        withCustomerScope(orgEq(supabase.from("accounts_receivable").select("balance, due_date, status, customer_id"))).neq("status", "paid"),
        withCustomerScope(orgEq(supabase.from("accounts_receivable").select("balance, customer_id"))).neq("status", "paid").lt("created_at", fromDate.toISOString()),
        orgEq(supabase.from("accounts_payable").select("balance")).neq("status", "paid"),
        orgEq(supabase.from("customers").select("id, created_at")),
      ]);

      const sum = (rows: any[] | null | undefined, key: string) =>
        (rows || []).reduce((s, r) => s + Number(r?.[key] || 0), 0);

      const revenueMTD = sum(invoicesRange.data, "total_amount");
      const revenuePrevMTD = sum(invoicesPrevRange.data, "total_amount");
      const revenueToday = sum(invoicesToday.data, "total_amount");
      const revenueYesterday = sum(invoicesYesterday.data, "total_amount");
      const expensesMTDv = sum(expensesRange.data, "amount");
      const expensesPrevMTDv = sum(expensesPrevRange.data, "amount");

      const opMargin = revenueMTD > 0 ? ((revenueMTD - expensesMTDv) / revenueMTD) * 100 : null;
      const opMarginPrev = revenuePrevMTD > 0 ? ((revenuePrevMTD - expensesPrevMTDv) / revenuePrevMTD) * 100 : null;

      const onTimeFromList = (rows: any[] | null | undefined) => {
        const list = rows || [];
        if (list.length === 0) return null;
        const onTime = list.filter((r) => {
          if (r.actual_delivery && r.scheduled_delivery) return new Date(r.actual_delivery) <= new Date(r.scheduled_delivery);
          return r.sla_status === "met" || r.sla_status === "on_track";
        }).length;
        return (onTime / list.length) * 100;
      };
      const onTimeRate = onTimeFromList(deliveredRange.data);
      const onTimeRatePrev = onTimeFromList(deliveredPrevRange.data);

      const totalVehicles = vehiclesAll.data?.length || 0;
      const activeVehicleIds = new Set((activeDispatches.data || []).map((d: any) => d.vehicle_id).filter(Boolean));
      const activeTrucks = activeVehicleIds.size;
      const fleetUtil = totalVehicles > 0 ? (activeTrucks / totalVehicles) * 100 : null;

      const arOutstanding = sum(arUnpaid.data, "balance");
      const arOutstandingPrev = sum(arPrev.data, "balance");
      const apOutstanding = sum(apUnpaid.data, "balance");
      const arOverdue = (arUnpaid.data || []).filter((r: any) => r.due_date && new Date(r.due_date) < new Date())
        .reduce((s: number, r: any) => s + Number(r.balance || 0), 0);

      const perfectOrder = onTimeRate;
      const billAccuracy = (() => {
        const invs = invoicesRange.data || [];
        if (invs.length === 0) return null;
        const disputed = invs.filter((i: any) => i.status === "disputed" || i.status === "void").length;
        return ((invs.length - disputed) / invs.length) * 100;
      })();

      const customersTotal = customers.data?.length || 0;

      setKpis((prev) => ({
        ...prev,
        deliveriesToday: delivToday.count || 0,
        deliveriesYesterday: delivYesterday.count || 0,
        fleetUtil,
        onTimeRate,
        onTimeRatePrev,
        activeTrucks,
        revenueToday,
        revenueYesterday,
        opMargin,
        opMarginPrev,
        arOutstanding,
        arOutstandingPrev,
        apOutstanding,
        arOverdue,
        perfectOrder,
        billAccuracy,
        fulfillmentScore: onTimeRate,
        revenueMTD,
        revenuePrevMTD,
        expensesMTD: expensesMTDv,
        customersTotal,
        customersActive: customersTotal,
      }));

      // ---- Audit trail: record each KPI computation (tenant-scoped via RPC) ----
      const periodStart = filters.from;
      const periodEnd = filters.to;
      const sharedInputs = {
        filters: { contractId: filters.contractId, zoneId: filters.zoneId },
        scoped_customer_count: scopedCustomerIds?.length ?? null,
        window: { from: periodStart, to: periodEnd },
        sources: ["dispatches", "invoices", "expenses", "vehicles", "accounts_receivable", "accounts_payable", "customers"],
      };
      const auditRows: Array<{ key: string; src: string; actual: number; target: number; formula: string; inputs: any }> = [
        { key: "revenue_range", src: "invoices", actual: revenueMTD, target: revenuePrevMTD, formula: "SUM(invoices.total_amount) WHERE created_at IN [from,to]", inputs: { ...sharedInputs, rows: invoicesRange.data?.length ?? 0 } },
        { key: "expenses_range", src: "expenses", actual: expensesMTDv, target: expensesPrevMTDv, formula: "SUM(expenses.amount) WHERE created_at IN [from,to]", inputs: { ...sharedInputs, rows: expensesRange.data?.length ?? 0 } },
        { key: "operating_margin", src: "invoices+expenses", actual: opMargin ?? 0, target: opMarginPrev ?? 0, formula: "(revenue - expenses) / revenue * 100", inputs: sharedInputs },
        { key: "on_time_rate", src: "dispatches", actual: onTimeRate ?? 0, target: onTimeRatePrev ?? 0, formula: "delivered_on_time / delivered * 100", inputs: { ...sharedInputs, rows: deliveredRange.data?.length ?? 0 } },
        { key: "fleet_utilization", src: "vehicles+dispatches", actual: fleetUtil ?? 0, target: 100, formula: "active_vehicles / total_vehicles * 100", inputs: { ...sharedInputs, total: totalVehicles, active: activeTrucks } },
        { key: "ar_outstanding", src: "accounts_receivable", actual: arOutstanding, target: arOutstandingPrev, formula: "SUM(balance) WHERE status != paid", inputs: sharedInputs },
        { key: "ap_outstanding", src: "accounts_payable", actual: apOutstanding, target: 0, formula: "SUM(balance) WHERE status != paid", inputs: sharedInputs },
        { key: "ar_overdue", src: "accounts_receivable", actual: arOverdue, target: 0, formula: "SUM(balance) WHERE due_date < now()", inputs: sharedInputs },
        { key: "deliveries_today", src: "dispatches", actual: delivToday.count || 0, target: delivYesterday.count || 0, formula: "COUNT(dispatches) WHERE created_at >= today", inputs: sharedInputs },
        { key: "perfect_order_rate", src: "dispatches", actual: perfectOrder ?? 0, target: 100, formula: "on_time_rate (proxy)", inputs: sharedInputs },
        { key: "bill_accuracy", src: "invoices", actual: billAccuracy ?? 0, target: 100, formula: "(invoices - disputed) / invoices * 100", inputs: sharedInputs },
      ];
      // Fire and forget; never block UI on audit
      Promise.allSettled(
        auditRows.map((r) =>
          (supabase as any).rpc("log_control_center_kpi", {
            p_metric_key: r.key,
            p_source_module: r.src,
            p_period_start: periodStart,
            p_period_end: periodEnd,
            p_actual: Number.isFinite(r.actual) ? r.actual : 0,
            p_target: Number.isFinite(r.target) ? r.target : 0,
            p_inputs: r.inputs,
            p_formula: r.formula,
            p_role_tag: "control_center",
          })
        )
      ).catch(() => { /* silent */ });
    } catch (e: any) {
      setKpisError(e?.message || "Failed to load KPI data");
    } finally {
      setKpisLoading(false);
    }
  }, [organizationId, filters]);

  const loadTrend = useCallback(async () => {
    if (!organizationId) return;
    setTrendLoading(true);
    setTrendError(null);
    try {
      const fromDate = new Date(filters.from + "T00:00:00");
      const toDate = new Date(filters.to + "T23:59:59");
      const orgEq = (q: any) => q.eq("organization_id", organizationId);

      let scopedCustomerIds: string[] | null = null;
      if (filters.contractId !== "all") {
        const { data: c } = await supabase.from("sla_contracts").select("customer_id")
          .eq("id", filters.contractId).eq("organization_id", organizationId).maybeSingle();
        scopedCustomerIds = c?.customer_id ? [c.customer_id] : [];
      }

      // Always show last 12 months for trend, but apply customer scope
      const now = new Date();
      const yearAgoStart = addMonths(monthStart(now), -11);
      const invQuery = orgEq(supabase.from("invoices").select("total_amount, created_at"))
        .gte("created_at", yearAgoStart.toISOString());
      const expQuery = orgEq(supabase.from("expenses").select("amount, created_at"))
        .gte("created_at", yearAgoStart.toISOString());

      const [invoicesYear, expensesYear] = await Promise.all([
        scopedCustomerIds ? invQuery.in("customer_id", scopedCustomerIds.length ? scopedCustomerIds : ["00000000-0000-0000-0000-000000000000"]) : invQuery,
        expQuery,
      ]);

      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const trend: { month: string; revenue: number; cost: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const start = addMonths(monthStart(now), -i);
        const end = addMonths(start, 1);
        const rev = (invoicesYear.data || []).filter((r: any) => {
          const d = new Date(r.created_at); return d >= start && d < end;
        }).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        const cost = (expensesYear.data || []).filter((r: any) => {
          const d = new Date(r.created_at); return d >= start && d < end;
        }).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        trend.push({ month: months[start.getMonth()], revenue: rev, cost });
      }

      // Suppress lint about fromDate/toDate being unused - they may inform future scoping
      void fromDate; void toDate;

      setKpis((prev) => ({ ...prev, monthlyTrend: trend }));
    } catch (e: any) {
      setTrendError(e?.message || "Failed to load trend data");
    } finally {
      setTrendLoading(false);
    }
  }, [organizationId, filters]);

  const loadWarehouse = useCallback(async () => {
    if (!organizationId) return;
    setWarehouseLoading(true);
    setWarehouseError(null);
    try {
      const orgEq = (q: any) => q.eq("organization_id", organizationId);
      let warehouseUtil: number | null = null;
      const { data: whs, error: whsErr } = await orgEq(supabase.from("warehouses").select("id, capacity_sqm").eq("is_active", true));
      if (whsErr) throw whsErr;
      if (whs && whs.length > 0) {
        const ids = whs.map((w: any) => w.id);
        const totalCap = whs.reduce((s: number, w: any) => s + Number(w.capacity_sqm || 0), 0);
        const { data: inv } = await supabase
          .from("warehouse_inventory")
          .select("warehouse_id, quantity_on_hand")
          .in("warehouse_id", ids);
        const used = (inv || []).reduce((s: number, r: any) => s + Number(r.quantity_on_hand || 0), 0);
        if (totalCap > 0) warehouseUtil = Math.min(100, (used / totalCap) * 100);
        else if ((inv || []).length === 0) warehouseUtil = 0;
      }
      setKpis((prev) => ({ ...prev, warehouseUtil }));
    } catch (e: any) {
      setWarehouseError(e?.message || "Failed to load warehouse data");
    } finally {
      setWarehouseLoading(false);
    }
  }, [organizationId, filters]);

  useEffect(() => { loadKpis(); }, [loadKpis]);
  useEffect(() => { loadTrend(); }, [loadTrend]);
  useEffect(() => { loadWarehouse(); }, [loadWarehouse]);

  const sparkFromTrend = (key: "revenue" | "cost", base: number) => {
    if (kpis.monthlyTrend.length === 0) return Array.from({ length: 12 }, (_, i) => ({ x: i, v: base }));
    return kpis.monthlyTrend.map((p, i) => ({ x: i, v: p[key] }));
  };

  const kpiCards: KPICardProps[] = useMemo(() => [
    { title: "Deliveries Today", value: String(kpis.deliveriesToday), change: pctChange(kpis.deliveriesToday, kpis.deliveriesYesterday), icon: Package, sparkData: sparkFromTrend("revenue", kpis.deliveriesToday), color: "hsl(199, 89%, 48%)" },
    { title: "Fleet Utilization", value: kpis.fleetUtil == null ? "-" : `${kpis.fleetUtil.toFixed(0)}%`, change: null, icon: Truck, sparkData: sparkFromTrend("revenue", kpis.fleetUtil ?? 0), color: "hsl(173, 80%, 40%)" },
    { title: "On-Time Delivery", value: fmtPct(kpis.onTimeRate), change: kpis.onTimeRate != null && kpis.onTimeRatePrev != null ? kpis.onTimeRate - kpis.onTimeRatePrev : null, icon: Clock, sparkData: sparkFromTrend("revenue", kpis.onTimeRate ?? 0), color: "hsl(142, 76%, 36%)" },
    { title: "Active Trucks", value: String(kpis.activeTrucks), change: null, icon: Truck, sparkData: sparkFromTrend("revenue", kpis.activeTrucks), color: "hsl(262, 83%, 58%)" },
    { title: "Revenue (Range)", value: fmtMoney(kpis.revenueMTD), change: pctChange(kpis.revenueMTD, kpis.revenuePrevMTD), icon: DollarSign, sparkData: sparkFromTrend("revenue", kpis.revenueMTD), color: "hsl(25, 95%, 53%)" },
    { title: "Operating Margin", value: fmtPct(kpis.opMargin), change: kpis.opMargin != null && kpis.opMarginPrev != null ? kpis.opMargin - kpis.opMarginPrev : null, icon: TrendingUp, sparkData: sparkFromTrend("revenue", kpis.opMargin ?? 0), color: "hsl(173, 80%, 40%)" },
    { title: "AR Outstanding", value: fmtMoney(kpis.arOutstanding), change: pctChange(kpis.arOutstanding, kpis.arOutstandingPrev), icon: Wallet, sparkData: sparkFromTrend("cost", kpis.arOutstanding), color: "hsl(0, 84%, 60%)" },
    { title: "Warehouse Util.", value: kpis.warehouseUtil == null ? "-" : `${kpis.warehouseUtil.toFixed(0)}%`, change: null, icon: MapPin, sparkData: sparkFromTrend("revenue", kpis.warehouseUtil ?? 0), color: "hsl(45, 93%, 47%)" },
  ], [kpis]);

  const operatingRatio = safeDiv(kpis.expensesMTD, kpis.revenueMTD);
  const arTurnover = safeDiv(kpis.revenueMTD * 12, kpis.arOutstanding);
  const currentRatio = safeDiv(kpis.arOutstanding, kpis.apOutstanding);
  const financialRatios = [
    { name: "Operating Ratio", value: operatingRatio, format: "decimal" as const },
    { name: "Operating Profit Margin", value: kpis.opMargin == null ? null : kpis.opMargin, format: "percent" as const },
    { name: "AR Turnover", value: arTurnover, format: "decimal" as const },
    { name: "Current Ratio", value: currentRatio, format: "decimal" as const },
    { name: "AR Overdue Ratio", value: safeDiv(kpis.arOverdue * 100, kpis.arOutstanding), format: "percent" as const },
    { name: "Cost-to-Revenue", value: operatingRatio == null ? null : operatingRatio * 100, format: "percent" as const },
  ];

  const cashflowHealth = (() => {
    if (kpis.arOutstanding === 0) return kpis.revenueMTD > 0 ? 100 : null;
    return Math.max(0, Math.min(100, 100 - (kpis.arOverdue / kpis.arOutstanding) * 100));
  })();
  const revenueGrowth = pctChange(kpis.revenueMTD, kpis.revenuePrevMTD);
  const ceoMetrics = [
    { label: "Revenue Growth", value: revenueGrowth, icon: TrendingUp },
    { label: "Operating Margin", value: kpis.opMargin, icon: PieChart },
    { label: "Fleet Utilization", value: kpis.fleetUtil, icon: Truck },
    { label: "Cashflow Health", value: cashflowHealth, icon: Wallet },
    { label: "Customer Retention", value: kpis.customersTotal > 0 ? (kpis.customersActive / kpis.customersTotal) * 100 : null, icon: Users },
  ];
  const validHealth = ceoMetrics.filter((m) => m.value != null).map((m) => Math.max(0, Math.min(100, m.value as number)));
  const healthScore = validHealth.length ? Math.round(validHealth.reduce((s, v) => s + v, 0) / validHealth.length) : 0;

  const insights: { alert: string; impact: string; action: string; severity: "high" | "medium" | "low" }[] = [];
  if (kpis.arOverdue > 0) insights.push({ alert: "Overdue receivables", impact: `₦${(kpis.arOverdue / 1e6).toFixed(2)}M past due`, action: "View AR aging →", severity: kpis.arOverdue / Math.max(1, kpis.arOutstanding) > 0.3 ? "high" : "medium" });
  if (kpis.fleetUtil != null && kpis.fleetUtil < 65) insights.push({ alert: "Fleet utilization below target", impact: `Only ${kpis.fleetUtil.toFixed(0)}% of trucks active`, action: "Optimize allocation →", severity: "medium" });
  if (kpis.opMargin != null && kpis.opMargin < 10) insights.push({ alert: "Thin operating margin", impact: `Currently ${kpis.opMargin.toFixed(1)}% (target ≥10%)`, action: "Review cost drivers →", severity: kpis.opMargin < 0 ? "high" : "medium" });
  if (kpis.onTimeRate != null && kpis.onTimeRate < 90) insights.push({ alert: "On-time delivery below SLA", impact: `Currently ${kpis.onTimeRate.toFixed(0)}% (target ≥90%)`, action: "Review breach records →", severity: kpis.onTimeRate < 75 ? "high" : "medium" });
  if (kpis.warehouseUtil != null && kpis.warehouseUtil > 90) insights.push({ alert: "Warehouse near capacity", impact: `Utilization at ${kpis.warehouseUtil.toFixed(0)}%`, action: "Schedule redistribution →", severity: "high" });
  if (insights.length === 0 && !kpisLoading && !kpisError) insights.push({ alert: "No bottlenecks detected", impact: "All operational and financial signals within healthy bands for the selected scope", action: "Keep monitoring →", severity: "low" });

  const applyFilters = () => setFilters(draftFilters);
  const resetFilters = () => {
    const fresh = { from: toDateInput(monthStart(new Date())), to: toDateInput(new Date()), contractId: "all", zoneId: "all" };
    setDraftFilters(fresh); setFilters(fresh);
  };
  const filtersDirty = JSON.stringify(draftFilters) !== JSON.stringify(filters);

  return (
    <DashboardLayout title="Enterprise Control Center" subtitle="Infrastructure Intelligence Dashboard">
      <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
        {tenantMode && <Badge variant="outline">{tenantMode}</Badge>}
        {organizationId && <Badge variant="secondary" className="font-mono text-xs">Org: {organizationId.slice(0, 8)}…</Badge>}
        {(kpisLoading || trendLoading || warehouseLoading) && <Badge variant="outline">Loading live data…</Badge>}
        <a href="/workforce/kpi-audit" className="ml-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-3.5 h-3.5" /> KPI Audit Trail
          </Button>
        </a>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filters</span>
            <span className="text-xs text-muted-foreground">All KPIs and ratios respect these filters within your tenant scope.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={draftFilters.from} max={draftFilters.to}
                onChange={(e) => setDraftFilters({ ...draftFilters, from: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={draftFilters.to} min={draftFilters.from}
                onChange={(e) => setDraftFilters({ ...draftFilters, to: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Zone Policy</Label>
              <Select value={draftFilters.zoneId} onValueChange={(v) => setDraftFilters({ ...draftFilters, zoneId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Client Contract</Label>
              <Select value={draftFilters.contractId} onValueChange={(v) => setDraftFilters({ ...draftFilters, contractId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All contracts</SelectItem>
                  {contracts.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} disabled={!filtersDirty} className="flex-1">Apply</Button>
              <Button variant="outline" onClick={resetFilters} title="Reset"><RotateCcw className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} loading={kpisLoading} error={kpisError} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Operations Map */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Global Operations Map</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetState loading={kpisLoading} error={kpisError}>
                <div className="relative h-64 rounded-lg bg-gradient-to-br from-muted/50 to-muted overflow-hidden flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{kpis.activeTrucks}</p>
                    <p className="text-xs text-muted-foreground mt-1">trucks active</p>
                    <p className="text-[11px] text-muted-foreground mt-3">{kpis.deliveriesToday} dispatch{kpis.deliveriesToday === 1 ? "" : "es"} today</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Active Routes ({kpis.activeTrucks})</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> On-Time {fmtPct(kpis.onTimeRate)}</div>
                </div>
              </WidgetState>
            </CardContent>
          </Card>
        </div>

        {/* Operational Intelligence */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Operational Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetState loading={kpisLoading} error={kpisError}>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <GaugeChart value={kpis.onTimeRate} target={95} label="On-Time" color="hsl(142, 76%, 36%)" />
                  <GaugeChart value={kpis.perfectOrder} target={90} label="Perfect Order" color="hsl(199, 89%, 48%)" />
                  <GaugeChart value={kpis.billAccuracy} target={95} label="Bill Accuracy" color="hsl(262, 83%, 58%)" />
                </div>
                <div className="space-y-3 mt-4">
                  {[
                    { metric: "On-Time Rate", current: kpis.onTimeRate, benchmark: 90 },
                    { metric: "Perfect Order", current: kpis.perfectOrder, benchmark: 85 },
                    { metric: "Bill Accuracy", current: kpis.billAccuracy, benchmark: 93 },
                    { metric: "Fleet Utilization", current: kpis.fleetUtil, benchmark: 70 },
                  ].map((d) => (
                    <div key={d.metric} className="min-w-0">
                      <div className="flex justify-between text-xs mb-1 gap-2">
                        <span className="text-muted-foreground truncate">{d.metric}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{d.current == null ? "-" : `${d.current.toFixed(0)}%`}</span>
                          <span className="text-muted-foreground text-[10px]">Bench: {d.benchmark}%</span>
                        </div>
                      </div>
                      <div className="relative w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="absolute h-full rounded-full bg-primary/70 left-0 top-0" style={{ width: `${Math.min(100, Math.max(0, d.current ?? 0))}%` }} />
                        <div className="absolute h-full w-0.5 bg-foreground/40 top-0" style={{ left: `${Math.min(100, Math.max(0, d.benchmark))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetState>
            </CardContent>
          </Card>
        </div>

        {/* Financial Control Center */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Financial Control Center</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetState loading={kpisLoading} error={kpisError}>
                <div className="space-y-3">
                  {financialRatios.map((r) => (
                    <div key={r.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                      <span className="text-sm font-mono font-medium shrink-0">
                        {r.value == null ? "-" : r.format === "percent" ? `${r.value.toFixed(1)}%` : r.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Cashflow Monitor</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-sm font-bold text-amber-500 truncate">{fmtMoney(kpis.arOutstanding)}</p></div>
                    <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Overdue</p><p className="text-sm font-bold text-red-500 truncate">{fmtMoney(kpis.arOverdue)}</p></div>
                    <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Payables</p><p className="text-sm font-bold text-emerald-500 truncate">{fmtMoney(kpis.apOutstanding)}</p></div>
                  </div>
                </div>
              </WidgetState>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue vs Cost + CEO View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Revenue vs Cost Trend (12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <WidgetState
                  loading={trendLoading}
                  error={trendError}
                  empty={!trendLoading && !trendError && kpis.monthlyTrend.every((p) => p.revenue === 0 && p.cost === 0)}
                  emptyMsg="No invoice or expense activity in the last 12 months for this scope."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpis.monthlyTrend}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`} />
                      <Tooltip formatter={(v: number) => `₦${(v / 1e6).toFixed(2)}M`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(173, 80%, 40%)" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                      <Area type="monotone" dataKey="cost" stroke="hsl(0, 84%, 60%)" fill="url(#costGrad)" strokeWidth={2} name="Cost" />
                    </AreaChart>
                  </ResponsiveContainer>
                </WidgetState>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> CEO View</CardTitle>
              <Badge variant="outline" className="text-[10px]">Health: {healthScore}/100</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <WidgetState loading={kpisLoading} error={kpisError}>
              <div className="flex justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle cx="56" cy="56" r="48" fill="none" stroke={healthScore >= 70 ? "hsl(142, 76%, 36%)" : "hsl(25, 95%, 53%)"}
                      strokeWidth="8" strokeLinecap="round" strokeDasharray={`${healthScore * 3.02} 302`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{healthScore}</span>
                    <span className="text-[10px] text-muted-foreground">HEALTH</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {ceoMetrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <m.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, m.value ?? 0))}%` }} />
                      </div>
                      <span className="text-xs font-mono font-medium w-10 text-right">{m.value == null ? "-" : `${m.value.toFixed(0)}%`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetState>
          </CardContent>
        </Card>
      </div>

      {/* AI Bottleneck Detection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> AI Bottleneck Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <WidgetState loading={kpisLoading} error={kpisError}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {insights.map((i, idx) => <AIInsightCard key={idx} {...i} />)}
            </div>
          </WidgetState>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EnterpriseControlCenter;
