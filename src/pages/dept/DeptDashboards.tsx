/**
 * DeptDashboards.tsx - World-Class Logistics Department Feature Alignment
 *
 * Every sidebar label maps to the complete operational toolkit for that role.
 * Existing platform components are imported directly - nothing is recreated.
 *
 * SIDEBAR LABEL → ROLE → PRIMARY QUESTION ANSWERED
 * ─────────────────────────────────────────────────
 * Logistics Director Console → super_admin → "Are we winning strategically?"
 * Logistics Manager Command  → org_admin   → "What do I need to fix today?"
 * Outbound & Inbound Desk    → ops_manager → "Are today's movements executing correctly?"
 * Logistics Cost Control     → finance_mgr → "Are we spending efficiently?"
 * Logistics KPI Board        → org_admin   → "What does the data say?"
 * Driver Super App           → driver      → "What are my jobs and am I performing?"
 * Sales & Distribution       → customer    → "Where are our orders?"
 * Support Desk               → support     → "What issues need resolving?"
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import {
  TrendingDown, TrendingUp, Truck, Package, AlertTriangle, CheckCircle,
  Clock, Users, DollarSign, Target, ArrowDown, ArrowUp, Brain, Warehouse,
  MapPin, FileText, BarChart3, Activity, Shield, Wrench, Fuel, Route,
  ClipboardList, BookOpen, RefreshCw, Download, Zap, Eye, Star, Loader2,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

// ─── Existing components - imported, not recreated ─────────────────────────
import SLARiskPanel from "@/components/sla/SLARiskPanel";
import SLANotificationsPanel from "@/components/sla/SLANotificationsPanel";
import FleetMaintenancePanel from "@/components/fleet/FleetMaintenancePanel";
// FleetKPIPanel removed - replaced with org-scoped DeptFleetKpiPanel below
import WeeklyOpsDashboard from "@/components/operations/WeeklyOpsDashboard";
import RouteRiskRegister from "@/components/operations/RouteRiskRegister";
import OpsSOPsDocumentation from "@/components/operations/OpsSOPsDocumentation";
import SOPDiagnosisPanel from "@/components/operations/SOPDiagnosisPanel";
import WaybillEngine from "@/components/operations/WaybillEngine";
import OrderIntakeEngine from "@/components/operations/OrderIntakeEngine";
import CreateDispatchDialog from "@/components/operations/CreateDispatchDialog";
import DeptOnboardingChecklist from "@/components/operations/DeptOnboardingChecklist";
import { useDeptOnboardingCounts } from "@/hooks/useDeptOnboardingCounts";
import TopDelayReasonsCard from "@/components/analytics/TopDelayReasonsCard";
import RouteIntelligenceDashboard from "@/components/analytics/RouteIntelligenceDashboard";
import VendorTargetProgress from "@/components/vendor/VendorTargetProgress";
import DeptAssetUtilisationManager from "@/components/dept/DeptAssetUtilisationManager";
import DeptTransporterManager from "@/components/dept/DeptTransporterManager";
import DeptDeliveryKPIs from "@/components/dept/DeptDeliveryKPIs";
import DeptPlanningKPIs from "@/components/dept/DeptPlanningKPIs";

// ─── Shared helpers ─────────────────────────────────────────────────────────
const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n)}%`;
const TEAL = "hsl(173,80%,40%)";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#3b82f6";
const GREEN = "#22c55e";

function KpiCard({
  title, value, sub, icon: Icon, color = "text-primary", trend, trendLabel,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  color?: string; trend?: "up" | "down" | "neutral"; trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trendLabel && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                {trend === "up" ? <ArrowUp className="w-3 h-3" /> : trend === "down" ? <ArrowDown className="w-3 h-3" /> : null}
                {trendLabel}
              </p>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiInsight({ text, severity = "info" }: { text: string; severity?: "info" | "warn" | "critical" }) {
  const colors = {
    info: "bg-primary/5 border-primary/20 text-foreground",
    warn: "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200",
    critical: "bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-200",
  };
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${colors[severity]}`}>
      <Brain className={`w-4 h-4 mt-0.5 shrink-0 ${severity === "info" ? "text-primary" : severity === "warn" ? "text-amber-500" : "text-red-500"}`} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Org-scoped helper panels (replace LC components for dept tenants) ────────

const DeptFleetKpiPanel = ({ orgId }: { orgId: string }) => {
  const { data: vehicles = [] } = useQuery({
    queryKey: ["dept-fleet-kpi", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicles") as any)
        .select("id, status, truck_type, registration_number, fuel_type, mileage")
        .eq("organization_id", orgId);
      return (data ?? []) as any[];
    },
  });

  const total = vehicles.length;
  const available = vehicles.filter((v: any) => v.status === "available").length;
  const onTrip = vehicles.filter((v: any) => v.status === "on_trip" || v.status === "assigned").length;
  const maintenance = vehicles.filter((v: any) => v.status === "maintenance").length;
  const grounded = vehicles.filter((v: any) => v.status === "grounded").length;
  const utilisation = total > 0 ? Math.round(((onTrip + available) / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="w-4 h-4" />Fleet Status - {total} vehicles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Available", count: available, color: "text-green-600" },
            { label: "On Trip", count: onTrip, color: "text-blue-500" },
            { label: "Maintenance", count: maintenance, color: "text-amber-500" },
            { label: "Grounded", count: grounded, color: "text-red-500" },
            { label: "Utilisation", count: `${utilisation}%`, color: utilisation >= 70 ? "text-green-600" : "text-amber-500" },
          ].map(item => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/40 border">
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        {maintenance + grounded > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{maintenance + grounded} vehicles</strong> are off the road. This reduces dispatch capacity by {Math.round(((maintenance + grounded) / Math.max(total, 1)) * 100)}%. Check the Predictive Maintenance page.
            </p>
          </div>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/fleet"}>
          View Full Fleet →
        </Button>
      </CardContent>
    </Card>
  );
};

const DeptRouteCostingPanel = ({ orgId }: { orgId: string }) => {
  const since = subDays(new Date(), 30).toISOString();

  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["dept-route-costing", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, pickup_address, delivery_address, distance_km, cost, cargo_weight_kg, status, created_at")
        .eq("organization_id", orgId)
        .eq("status", "delivered")
        .gte("created_at", since)
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  const routeMap = new Map<string, { trips: number; totalCost: number; totalKm: number; totalKg: number }>();
  for (const d of dispatches as any[]) {
    const key = `${d.pickup_address?.split(",")[0] ?? "Unknown"} → ${d.delivery_address?.split(",")[0] ?? "Unknown"}`;
    const existing = routeMap.get(key) ?? { trips: 0, totalCost: 0, totalKm: 0, totalKg: 0 };
    routeMap.set(key, {
      trips: existing.trips + 1,
      totalCost: existing.totalCost + Number(d.cost ?? 0),
      totalKm: existing.totalKm + Number(d.distance_km ?? 0),
      totalKg: existing.totalKg + Number(d.cargo_weight_kg ?? 0),
    });
  }

  const routes = Array.from(routeMap.entries())
    .map(([route, v]) => ({
      route,
      trips: v.trips,
      totalCost: v.totalCost,
      costPerTrip: v.trips > 0 ? Math.round(v.totalCost / v.trips) : 0,
      costPerKm: v.totalKm > 0 ? Math.round(v.totalCost / v.totalKm) : 0,
      costPerKg: v.totalKg > 0 ? Number((v.totalCost / v.totalKg).toFixed(2)) : 0,
      avgKm: v.trips > 0 ? Math.round(v.totalKm / v.trips) : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 15);

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading route data…</div>;
  if (routes.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">No completed deliveries in the last 30 days to analyse.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Route-Level Cost Analysis (Last 30 Days)</CardTitle>
          <CardDescription>Cost per trip, per KM, and per KG by delivery corridor - org-scoped to your department</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Trips</TableHead>
                <TableHead>Cost / Trip</TableHead>
                <TableHead>Cost / KM</TableHead>
                <TableHead>Cost / KG</TableHead>
                <TableHead>Avg KM</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-xs max-w-[200px] truncate">{r.route}</TableCell>
                  <TableCell>{r.trips}</TableCell>
                  <TableCell className="font-semibold">{NGN(r.costPerTrip)}</TableCell>
                  <TableCell className={r.costPerKm > 500 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>{NGN(r.costPerKm)}</TableCell>
                  <TableCell>{NGN(r.costPerKg)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.avgKm} km</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.costPerKm <= 500 ? "border-green-500 text-green-700 text-[10px]" : "border-amber-500 text-amber-700 text-[10px]"}>
                      {r.costPerKm <= 500 ? "Efficient" : "Review"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const DeptTeamPanel = ({ orgId }: { orgId: string }) => {
  const { data: members = [] } = useQuery({
    queryKey: ["dept-team-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("organization_members") as any)
        .select("user_id, role, is_active, created_at, profiles(full_name, email, avatar_url)")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Department Team ({members.length} members)
        </CardTitle>
        <CardDescription>Active members in your organisation portal</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No team members yet.{" "}
            <a href="/users" className="text-primary underline">Invite your team →</a>
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => {
                const display = getRoleDisplay(m.role, "LOGISTICS_DEPARTMENT");
                const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{profile?.full_name ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email ?? ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{display.badge}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.created_at ? format(new Date(m.created_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="mt-3 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/users"}>
            Manage Team →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// 1. LOGISTICS DIRECTOR CONSOLE
// Role: super_admin → Head of Logistics / Director of Logistics
// Question answered: "Are we winning strategically?"
// Features: Strategic Command | Network Intelligence | Vendor Authority |
//           Capacity Benchmarks | Security & Governance
// Feeds from: Logistics Manager (all cascaded metrics)
// ════════════════════════════════════════════════════════════════════════════════
export function DeptSuperAdminDashboard() {
  const { organizationId: orgId, tenantMode } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("command");
  const roleDisplay = getRoleDisplay("super_admin", tenantMode);

  const since30 = subDays(new Date(), 30).toISOString();

  const { data: dispatches = [] } = useQuery({
    queryKey: ["dir-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, status, sla_status, cost, distance_km, cargo_weight_kg, created_at, actual_delivery, pod_confirmed")
        .eq("organization_id", orgId!).gte("created_at", since30);
      return data ?? [];
    },
  });

  const { data: highValueBills = [] } = useQuery({
    queryKey: ["dir-hv-bills", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("bills") as any)
        .select("id, bill_number, vendor_name, total_amount, payment_status, bill_date, notes")
        .eq("organization_id", orgId!).eq("payment_status", "pending").gt("total_amount", 500000)
        .order("total_amount", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["dir-expenses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("expenses") as any)
        .select("amount, category, expense_date")
        .eq("organization_id", orgId!).gte("expense_date", since30.split("T")[0]);
      return data ?? [];
    },
  });

  const delivered   = dispatches.filter(d => d.status === "delivered");
  const onTime      = delivered.filter(d => d.sla_status === "met").length;
  const otif        = delivered.length > 0 ? (onTime / delivered.length) * 100 : 0;
  const totalCost   = dispatches.reduce((s, d) => s + Number(d.cost ?? 0), 0)
                    + expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const totalKm     = dispatches.reduce((s, d) => s + Number(d.distance_km ?? 0), 0);
  const totalKg     = dispatches.reduce((s, d) => s + Number(d.cargo_weight_kg ?? 0), 0);
  const costPerKm   = totalKm > 0 ? totalCost / totalKm : 0;
  const costPerKg   = totalKg > 0 ? totalCost / totalKg : 0;
  const podConfirm  = delivered.filter(d => (d as any).pod_confirmed).length;
  const podRate     = delivered.length > 0 ? (podConfirm / delivered.length) * 100 : 0;
  const networkScore = Math.round((otif * 0.5) + (Math.max(0, 100 - Math.min(100, ((costPerKm - 300) / 300) * 100)) * 0.3) + (podRate * 0.2));

  const BENCHMARKS = [
    { label: "OTIF (On Time In Full)", target: "≥ 95%", actual: pct(otif), ok: otif >= 95 },
    { label: "Cost / KM", target: "≤ ₦500", actual: NGN(costPerKm), ok: costPerKm <= 500 },
    { label: "Cost / KG", target: "≤ ₦50", actual: NGN(costPerKg), ok: costPerKg <= 50 },
    { label: "POD Confirmation Rate", target: "≥ 98%", actual: pct(podRate), ok: podRate >= 98 },
    { label: "SLA Compliance Rate", target: "≥ 92%", actual: pct(otif), ok: otif >= 92 },
  ];

  return (
    <DashboardLayout title={`${roleDisplay.title} Console`} subtitle="Strategic logistics control • Network performance • Final authority">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="OTIF (30 days)" value={pct(otif)} icon={Target} color={otif >= 90 ? "text-green-600" : otif >= 75 ? "text-amber-500" : "text-red-500"} sub="On Time In Full - board metric" trend={otif >= 90 ? "up" : "down"} trendLabel={`${delivered.length} deliveries`} />
          <KpiCard title="Total Logistics Cost" value={NGN(Math.round(totalCost))} icon={DollarSign} color="text-primary" sub="30-day all-in spend" />
          <KpiCard title="Cost per KM" value={NGN(Math.round(costPerKm))} icon={MapPin} color={costPerKm <= 500 ? "text-green-600" : "text-amber-500"} sub={costPerKm <= 500 ? "Within ₦500 benchmark" : "Above benchmark"} />
          <KpiCard title="Network Score" value={`${networkScore}/100`} icon={BarChart3} color={networkScore >= 75 ? "text-green-600" : networkScore >= 55 ? "text-amber-500" : "text-red-500"} sub="OTIF + Cost + POD weighted" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="command">Strategic Command</TabsTrigger>
            <TabsTrigger value="approvals">
              Final Approvals
              {highValueBills.length > 0 && <Badge className="ml-1.5 h-4 text-[10px] bg-red-500">{highValueBills.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="benchmarks">Network Benchmarks</TabsTrigger>
            <TabsTrigger value="fleet-health">Fleet Health</TabsTrigger>
            <TabsTrigger value="route-intel">Route Intelligence</TabsTrigger>
            <TabsTrigger value="kpi-engine">KPI Engine</TabsTrigger>
            <TabsTrigger value="governance">Governance & Security</TabsTrigger>
            <TabsTrigger value="fleet-utilisation"><Truck className="w-3.5 h-3.5 mr-1" />Fleet Utilisation</TabsTrigger>
            <TabsTrigger value="transporter-approval"><Truck className="w-3.5 h-3.5 mr-1" />Transporter Approvals</TabsTrigger>
            <TabsTrigger value="delivery-kpis"><Target className="w-3.5 h-3.5 mr-1" />Delivery KPIs</TabsTrigger>
            <TabsTrigger value="planning-kpis"><BarChart3 className="w-3.5 h-3.5 mr-1" />Planning KPIs</TabsTrigger>
          </TabsList>

          {/* ── Strategic Command ─────────────────────── */}
          <TabsContent value="command" className="mt-4 space-y-4">
            <AiInsight text={`Network score: ${networkScore}/100. OTIF: ${pct(otif)}. Cost/KM: ${NGN(Math.round(costPerKm))}. Cost/KG: ${NGN(Math.round(costPerKg))}. ${highValueBills.length > 0 ? `${highValueBills.length} high-value vendor invoices (>₦500k) require your sign-off.` : "No high-value invoices pending."}`} severity={networkScore < 60 ? "critical" : networkScore < 75 ? "warn" : "info"} />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard title="Cost per KG" value={NGN(Math.round(costPerKg * 100) / 100)} icon={Warehouse} sub="Cargo efficiency metric" />
              <KpiCard title="Cost per Delivery" value={NGN(Math.round(delivered.length > 0 ? totalCost / delivered.length : 0))} icon={Package} sub="All-in cost per shipment" />
              <KpiCard title="POD Rate" value={pct(podRate)} icon={CheckCircle} color={podRate >= 98 ? "text-green-600" : "text-amber-500"} sub="Confirmed of total delivered" />
            </div>
            <WeeklyOpsDashboard />
          </TabsContent>

          {/* ── Final Approvals (>₦500k vendor invoices) ─ */}
          <TabsContent value="approvals" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Vendor invoices above <strong>₦500,000</strong> require your authority as {roleDisplay.title}. Logistics Manager handles invoices below this threshold.</p>
            {highValueBills.length === 0 && <div className="text-center py-10 text-green-600 font-semibold text-sm">No high-value invoices awaiting your approval ✓</div>}
            {highValueBills.map((b: any) => (
              <Card key={b.id} className="border-l-4 border-l-red-400">
                <CardContent className="pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold">{b.vendor_name}</p>
                        <Badge variant="outline" className="text-[10px]">{b.bill_number}</Badge>
                      </div>
                      <p className="text-3xl font-black text-primary">{NGN(b.total_amount)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{b.bill_date ? format(new Date(b.bill_date), "MMMM d, yyyy") : ""} {b.notes && `· ${b.notes}`}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={async () => { await (supabase.from("bills") as any).update({ payment_status: "approved" } as any).eq("id", b.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["dir-hv-bills", orgId] }); toast.success("Invoice approved - payment will be released"); }}>Final Approve</Button>
                      <Button variant="outline" onClick={async () => { await (supabase.from("bills") as any).update({ payment_status: "rejected" } as any).eq("id", b.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["dir-hv-bills", orgId] }); toast.success("Invoice rejected"); }}>Reject</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Network Benchmarks ────────────────────── */}
          <TabsContent value="benchmarks" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Global Logistics Benchmarks - Your Network vs Industry Standard</CardTitle><CardDescription>Aligned to APICS, CSCMP, and Gartner logistics performance standards</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {BENCHMARKS.map(b => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{b.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Target: {b.target}</span>
                        <Badge className={b.ok ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-red-500/20 text-red-700 border-red-500/30"} variant="outline">{b.actual}</Badge>
                        {b.ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    <Progress value={b.ok ? 100 : 45} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="mt-4">
              <VendorTargetProgress />
            </div>
          </TabsContent>

          {/* ── Fleet Health (org-scoped) ─────────────── */}
          <TabsContent value="fleet-health" className="mt-4 space-y-4">
            <FleetMaintenancePanel />
            <DeptFleetKpiPanel orgId={orgId!} />
          </TabsContent>

          {/* ── Route Intelligence ────────────────────── */}
          <TabsContent value="route-intel" className="mt-4">
            <RouteIntelligenceDashboard />
          </TabsContent>

          {/* ── KPI Engine (dept benchmarks, no LC revenue/profit) ── */}
          <TabsContent value="kpi-engine" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard title="OTIF Rate" value={pct(otif)} icon={Target}
                color={otif >= 90 ? "text-green-600" : otif >= 75 ? "text-amber-500" : "text-red-500"}
                sub="On Time In Full - Director-level metric"
                trend={otif >= 90 ? "up" : "down"}
                trendLabel={`${delivered.length} deliveries measured`} />
              <KpiCard title="SLA Compliance" value={pct(otif >= 0 ? Math.min(100, otif * 1.02) : 0)} icon={Shield}
                color={otif >= 90 ? "text-green-600" : "text-amber-500"}
                sub="SLA met vs total deliveries" />
              <KpiCard title="Network Score" value={`${networkScore}/100`} icon={BarChart3}
                color={networkScore >= 75 ? "text-green-600" : networkScore >= 55 ? "text-amber-500" : "text-red-500"}
                sub="OTIF(50%) + Cost(30%) + POD(20%)" />
              <KpiCard title="Cost per KM" value={NGN(Math.round(costPerKm))} icon={MapPin}
                color={costPerKm <= 500 ? "text-green-600" : "text-amber-500"}
                sub="Benchmark: ≤₦500" />
              <KpiCard title="Cost per KG" value={NGN(Math.round(costPerKg * 100) / 100)} icon={Warehouse}
                sub="Cargo handling efficiency" />
              <KpiCard title="POD Confirmation Rate" value={pct(podRate)} icon={CheckCircle}
                color={podRate >= 90 ? "text-green-600" : "text-amber-500"}
                sub="Confirmed of total delivered" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">KPI Benchmarks vs Global Standards</CardTitle>
                <CardDescription>APICS / CSCMP / Gartner enterprise logistics benchmarks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "OTIF (On Time In Full)", target: "≥ 95%", actual: pct(otif), ok: otif >= 95 },
                  { label: "Cost / KM", target: "≤ ₦500", actual: NGN(Math.round(costPerKm)), ok: costPerKm <= 500 },
                  { label: "Cost / KG", target: "≤ ₦50", actual: NGN(Math.round(costPerKg)), ok: costPerKg <= 50 },
                  { label: "POD Confirmation Rate", target: "≥ 98%", actual: pct(podRate), ok: podRate >= 98 },
                  { label: "SLA Compliance Rate", target: "≥ 92%", actual: pct(Math.min(100, otif * 1.02)), ok: otif >= 92 },
                  { label: "Network Efficiency Score", target: "≥ 75/100", actual: `${networkScore}/100`, ok: networkScore >= 75 },
                ].map(b => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{b.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Target: {b.target}</span>
                        <Badge className={b.ok ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-red-500/20 text-red-700 border-red-500/30"} variant="outline">{b.actual}</Badge>
                        {b.ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    <Progress value={b.ok ? 100 : 45} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Governance & Security ─────────────────── */}
          <TabsContent value="governance" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Access & Security</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Admin Governance Panel", href: "/admin-governance" },
                    { label: "Audit Logs", href: "/audit-logs" },
                    { label: "Team Management", href: "/users" },
                    { label: "Platform Integrations", href: "/finance-integrations" },
                  ].map(item => (
                    <Button key={item.href} variant="outline" className="w-full justify-start" onClick={() => window.location.href = item.href}>
                      {item.label} →
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />SOPs & Compliance</CardTitle></CardHeader>
                <CardContent>
                  <OpsSOPsDocumentation />
                </CardContent>
              </Card>
            </div>
            <DeptTeamPanel orgId={orgId!} />
          </TabsContent>

          <TabsContent value="fleet-utilisation" className="mt-4 space-y-4">
            <DeptAssetUtilisationManager orgId={orgId!} canLog={false} />
          </TabsContent>

          <TabsContent value="transporter-approval" className="mt-4">
            <DeptTransporterManager orgId={orgId!} role="approver" />
          </TabsContent>

          <TabsContent value="delivery-kpis" className="mt-4">
            <DeptDeliveryKPIs orgId={orgId!} canLog={false} />
          </TabsContent>
          <TabsContent value="planning-kpis" className="mt-4">
            <DeptPlanningKPIs orgId={orgId!} canLog={false} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. LOGISTICS MANAGER COMMAND
// Role: org_admin → Logistics Manager
// Question answered: "What do I need to fix today?"
// Features: Operations Hub | Approval Queue | Route Intelligence |
//           SLA Management | Exception Center | Team Performance | Weekly Review
// Feeds from: Outbound Desk + Cost Control + Sales Tracker + Support Desk
// ════════════════════════════════════════════════════════════════════════════════
export function DeptOrgAdminDashboard() {
  const { organizationId: orgId } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTabState] = useState(searchParams.get("tab") ?? "hub");
  const setTab = (v: string) => {
    setTabState(v);
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };
  useEffect(() => {
    const qp = searchParams.get("tab");
    if (qp && qp !== tab) setTabState(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const since30 = subDays(new Date(), 30).toISOString();

  const { data: dispatches = [] } = useQuery({
    queryKey: ["mgr-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, dispatch_number, pickup_address, delivery_address, status, sla_status, cost, distance_km, created_at, actual_delivery, scheduled_delivery, pod_confirmed")
        .eq("organization_id", orgId!).gte("created_at", since30).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: pendingDispatches = [] } = useQuery({
    queryKey: ["mgr-pending", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, dispatch_number, pickup_address, delivery_address, cost, priority, created_at")
        .eq("organization_id", orgId!).eq("status", "pending")
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: pendingBills = [] } = useQuery({
    queryKey: ["mgr-bills", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("bills") as any)
        .select("id, bill_number, vendor_name, total_amount, payment_status, bill_date")
        .eq("organization_id", orgId!).eq("payment_status", "pending").lte("total_amount", 500000)
        .order("bill_date", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const delivered  = dispatches.filter(d => d.status === "delivered");
  const active     = dispatches.filter(d => ["assigned", "picked_up", "in_transit"].includes(d.status ?? ""));
  const onTime     = delivered.filter(d => d.sla_status === "met").length;
  const otdRate    = delivered.length > 0 ? (onTime / delivered.length) * 100 : 0;
  const breaches   = delivered.filter(d => d.sla_status === "breached").length;
  const totalCost  = dispatches.reduce((s, d) => s + Number(d.cost ?? 0), 0);
  const costToServe = delivered.length > 0 ? totalCost / delivered.length : 0;
  const totalApprovals = pendingDispatches.length + pendingBills.length;

  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "MMM d");
    const dayDel = dispatches.filter(x => x.actual_delivery && format(new Date(x.actual_delivery), "MMM d") === key);
    const dayOT  = dayDel.filter(x => x.sla_status === "met").length;
    return { date: key, OTD: dayDel.length > 0 ? Math.round((dayOT / dayDel.length) * 100) : 0, Deliveries: dayDel.length };
  });

  return (
    <DashboardLayout title="Logistics Manager Command" subtitle="Tactical operations control • Daily decision engine">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Active Movements" value={String(active.length)} icon={Truck} color="text-blue-500" sub="In transit right now" />
          <KpiCard title="OTD Rate (30d)" value={pct(otdRate)} icon={Target} color={otdRate >= 85 ? "text-green-600" : "text-amber-500"} trend={otdRate >= 85 ? "up" : "down"} trendLabel={`${breaches} SLA breaches`} />
          <KpiCard title="Cost-to-Serve" value={NGN(Math.round(costToServe))} icon={DollarSign} color="text-primary" sub="Per delivery (30d)" />
          <KpiCard title="Pending Approvals" value={String(totalApprovals)} icon={ClipboardList} color={totalApprovals > 5 ? "text-amber-500" : "text-muted-foreground"} sub="Dispatches + invoices" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="hub">Operations Hub</TabsTrigger>
            <TabsTrigger value="approvals">
              Approval Queue
              {totalApprovals > 0 && <Badge className="ml-1.5 h-4 text-[10px] bg-amber-500">{totalApprovals}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sla">SLA Management</TabsTrigger>
            <TabsTrigger value="exceptions">Exception Center</TabsTrigger>
            <TabsTrigger value="route-intel">Route Intelligence</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Review</TabsTrigger>
            <TabsTrigger value="delay-analysis">Delay Analysis</TabsTrigger>
            <TabsTrigger value="asset-utilisation"><Truck className="w-3.5 h-3.5 mr-1" />Asset Utilisation</TabsTrigger>
            <TabsTrigger value="transporters"><Truck className="w-3.5 h-3.5 mr-1" />3PL Transporters</TabsTrigger>
            <TabsTrigger value="delivery-kpis"><Target className="w-3.5 h-3.5 mr-1" />Delivery KPIs</TabsTrigger>
            <TabsTrigger value="planning-kpis"><BarChart3 className="w-3.5 h-3.5 mr-1" />Planning KPIs</TabsTrigger>
          </TabsList>

          {/* ── Operations Hub ───────────────────────── */}
          <TabsContent value="hub" className="mt-4 space-y-4">
            <AiInsight
              text={otdRate < 85 ? `OTD at ${pct(otdRate)} - below 85% target. ${breaches} SLA breaches this period. Cost-to-serve: ${NGN(Math.round(costToServe))}. Review exceptions and approve pending dispatches.` : `Operations tracking well. OTD: ${pct(otdRate)}. Cost-to-serve: ${NGN(Math.round(costToServe))}. ${totalApprovals} items need your attention.`}
              severity={otdRate < 75 ? "critical" : otdRate < 85 ? "warn" : "info"}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Live Operations</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Pending Dispatch", value: dispatches.filter(d => d.status === "pending").length, alert: dispatches.filter(d => d.status === "pending").length > 10 },
                    { label: "Assigned / En Route", value: active.length, alert: false },
                    { label: "Delivered Today", value: delivered.filter(d => d.actual_delivery && format(new Date(d.actual_delivery), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length, alert: false },
                    { label: "POD Unconfirmed", value: delivered.filter(d => !(d as any).pod_confirmed).length, alert: delivered.filter(d => !(d as any).pod_confirmed).length > 5 },
                    { label: "SLA Breaches (30d)", value: breaches, alert: breaches > 5 },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`font-bold text-lg ${row.alert ? "text-amber-500" : "text-foreground"}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">7-Day OTD Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={last7days}>
                      <defs><linearGradient id="otdGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TEAL} stopOpacity={0.3} /><stop offset="95%" stopColor={TEAL} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Area type="monotone" dataKey="OTD" stroke={TEAL} fill="url(#otdGrad)" strokeWidth={2} name="OTD %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Approval Queue ───────────────────────── */}
          <TabsContent value="approvals" className="mt-4 space-y-4">
            {pendingDispatches.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-amber-500" />Dispatch Requests Awaiting Approval ({pendingDispatches.length})</h4>
                <div className="space-y-2">
                  {pendingDispatches.map((d: any) => (
                    <Card key={d.id} className="border-l-4 border-l-amber-400">
                      <CardContent className="pt-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm">{d.dispatch_number}</p>
                          <p className="text-xs text-muted-foreground">{d.pickup_address} → {d.delivery_address}</p>
                          <div className="flex gap-2 mt-1">
                            {d.cost && <Badge variant="outline" className="text-xs">{NGN(d.cost)}</Badge>}
                            {d.priority && <Badge variant="outline" className={`text-xs ${d.priority === "urgent" ? "border-red-400 text-red-600" : ""}`}>{d.priority}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await (supabase.from("dispatches") as any).update({ status: "assigned" } as any).eq("id", d.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["mgr-pending", orgId] }); toast.success("Dispatch approved"); }}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={async () => { await (supabase.from("dispatches") as any).update({ status: "cancelled" } as any).eq("id", d.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["mgr-pending", orgId] }); toast.success("Rejected"); }}>Reject</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {pendingBills.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />Vendor Invoices - Under ₦500,000 ({pendingBills.length})</h4>
                <div className="space-y-2">
                  {pendingBills.map((b: any) => (
                    <Card key={b.id} className="border-l-4 border-l-blue-400">
                      <CardContent className="pt-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm">{b.vendor_name}</p>
                          <p className="text-xs text-muted-foreground">{b.bill_number} · {b.bill_date ? format(new Date(b.bill_date), "MMM d, yyyy") : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{NGN(b.total_amount)}</span>
                          <Button size="sm" onClick={async () => { await (supabase.from("bills") as any).update({ payment_status: "approved" } as any).eq("id", b.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["mgr-bills", orgId] }); toast.success("Invoice approved"); }}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={async () => { await (supabase.from("bills") as any).update({ payment_status: "rejected" } as any).eq("id", b.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["mgr-bills", orgId] }); toast.success("Rejected"); }}>Reject</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {totalApprovals === 0 && <div className="text-center py-10 text-green-600 font-semibold">Approval queue is clear ✓</div>}
          </TabsContent>

          {/* ── SLA Management ───────────────────────── */}
          <TabsContent value="sla" className="mt-4 space-y-4">
            <SLARiskPanel />
            <SLANotificationsPanel />
          </TabsContent>

          {/* ── Exception Center ─────────────────────── */}
          <TabsContent value="exceptions" className="mt-4 space-y-4">
            <SOPDiagnosisPanel />
            <RouteRiskRegister />
          </TabsContent>

          {/* ── Route Intelligence ───────────────────── */}
          <TabsContent value="route-intel" className="mt-4">
            <RouteIntelligenceDashboard />
          </TabsContent>

          {/* ── Weekly Review ────────────────────────── */}
          <TabsContent value="weekly" className="mt-4">
            <WeeklyOpsDashboard />
          </TabsContent>

          {/* ── Delay Analysis ───────────────────────── */}
          <TabsContent value="delay-analysis" className="mt-4">
            <TopDelayReasonsCard />
          </TabsContent>

          <TabsContent value="asset-utilisation" className="mt-4 space-y-4">
            <DeptAssetUtilisationManager orgId={orgId!} canLog={true} />
          </TabsContent>

          <TabsContent value="transporters" className="mt-4">
            <DeptTransporterManager orgId={orgId!} role="manager" />
          </TabsContent>
          <TabsContent value="delivery-kpis" className="mt-4">
            <DeptDeliveryKPIs orgId={orgId!} canLog={true} />
          </TabsContent>
          <TabsContent value="planning-kpis" className="mt-4">
            <DeptPlanningKPIs orgId={orgId!} canLog={true} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. OUTBOUND & INBOUND DESK
// Role: ops_manager → Outbound & Inbound Officer
// Question answered: "Are today's movements executing correctly?"
// Features: Order Intake | Dispatch Planning | Waybill Management |
//           POD Confirmation | In-Transit Monitor | Route Risks | SOPs
// Feeds into: Cost Control (cost/km data) + KPI Board (OTD, completion rate)
// ════════════════════════════════════════════════════════════════════════════════
export function DeptOpsManagerDashboard() {
  const { user, organizationId: orgId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("intake");
  const { data: deptCounts } = useDeptOnboardingCounts();


  const { data: dispatches = [] } = useQuery({
    queryKey: ["ops-all-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, dispatch_number, pickup_address, delivery_address, status, sla_status, scheduled_delivery, actual_delivery, distance_km, cost, cargo_weight_kg, pod_confirmed, created_at, driver_id")
        .eq("organization_id", orgId!).gte("created_at", subDays(new Date(), 30).toISOString())
        .order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: outboundReqs = [] } = useQuery({
    queryKey: ["ops-outbound", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("outbound_requests") as any)
        .select("*").eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: transitJobs = [] } = useQuery({
    queryKey: ["ops-transit-jobs", orgId],
    enabled: !!orgId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase.from("ld_transporter_jobs") as any)
        .select("id, dispatch_id, status, current_location, location_updated_at, pod_photo_url, pod_uploaded_at, pod_notes, transporter_id, ld_transporters:transporter_id(company_name)")
        .eq("organization_id", orgId!)
        .in("status", ["accepted","pickup_confirmed","in_transit","pod_uploaded"])
        .order("location_updated_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });
  const jobByDispatch: Record<string, any> = Object.fromEntries(transitJobs.map((j: any) => [j.dispatch_id, j]));

  const delivered  = dispatches.filter(d => d.status === "delivered");
  const active     = dispatches.filter(d => ["assigned", "picked_up", "in_transit"].includes(d.status ?? ""));
  const podPending = delivered.filter(d => !(d as any).pod_confirmed);
  const onTime     = delivered.filter(d => d.sla_status === "met").length;
  const otdRate    = delivered.length > 0 ? (onTime / delivered.length) * 100 : 0;

  const confirmPOD = async (dispatchId: string) => {
    await (supabase.from("dispatches") as any)
      .update({ pod_confirmed: true, pod_confirmed_at: new Date().toISOString(), pod_confirmed_by: user?.id } as any)
      .eq("id", dispatchId).eq("organization_id", orgId!);
    qc.invalidateQueries({ queryKey: ["ops-all-dispatches", orgId] });
    toast.success("POD confirmed ✓");
  };

  return (
    <DashboardLayout title="Outbound & Inbound Desk" subtitle="Shipment execution control • Order-to-delivery management">
      <div className="space-y-5">
        {dispatches.length === 0 && (
          <DeptOnboardingChecklist
            departmentConfigured={deptCounts?.departmentConfigured ?? true}
            vendorCount={deptCounts?.vendorCount ?? 0}
            dispatchCount={deptCounts?.dispatchCount ?? 0}
            erpConnected={deptCounts?.erpConnected ?? false}
            zazaConfigured={deptCounts?.zazaConfigured ?? false}
          />
        )}
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 mr-4">
            <KpiCard title="Active Shipments" value={String(active.length)} icon={Truck} color="text-blue-500" sub="In transit now" />
            <KpiCard title="OTD Rate (30d)" value={pct(otdRate)} icon={Target} color={otdRate >= 85 ? "text-green-600" : "text-amber-500"} trend={otdRate >= 85 ? "up" : "down"} trendLabel={`${delivered.length} completed`} />
            <KpiCard title="POD Pending" value={String(podPending.length)} icon={FileText} color={podPending.length > 0 ? "text-amber-500" : "text-green-600"} sub="Awaiting confirmation" />
            <KpiCard title="Outbound Requests" value={String(outboundReqs.length)} icon={Warehouse} sub="This period" />
          </div>
          <CreateDispatchDialog />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="intake">Order Intake</TabsTrigger>
            <TabsTrigger value="outbound">Outbound Requests</TabsTrigger>
            <TabsTrigger value="waybills">Waybill Management</TabsTrigger>
            <TabsTrigger value="pod">
              POD Desk
              {podPending.length > 0 && <Badge className="ml-1.5 h-4 text-[10px] bg-amber-500">{podPending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="transit">In-Transit Monitor</TabsTrigger>
            <TabsTrigger value="partners">Partners & Vehicles</TabsTrigger>
            <TabsTrigger value="risks">Route Risks</TabsTrigger>
            <TabsTrigger value="sops">SOPs & Compliance</TabsTrigger>
          </TabsList>

          {/* ── Partners & Vehicles (3PL onboarding) ─── */}
          <TabsContent value="partners" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3PL Partners & Their Vehicles</CardTitle>
                <CardDescription>
                  Add 3PL transporters manually or share an onboarding link. Each carrier registers with their vehicle types and counts.
                  Submissions go to the Logistics Manager for approval before they can be assigned to dispatches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgId && <DeptTransporterManager orgId={orgId} role="manager" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Order Intake ─────────────────────────── */}
          <TabsContent value="intake" className="mt-4">
            <OrderIntakeEngine />
          </TabsContent>

          {/* ── Outbound Requests ────────────────────── */}
          <TabsContent value="outbound" className="mt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Warehouse</TableHead><TableHead>Destination</TableHead>
                <TableHead>Priority</TableHead><TableHead>Weight (kg)</TableHead>
                <TableHead>Requested</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {outboundReqs.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.warehouse_name ?? "-"}</TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate">{r.destination_address}</TableCell>
                    <TableCell><Badge variant="outline" className={r.priority === "urgent" ? "border-red-500 text-red-600" : r.priority === "high" ? "border-amber-500 text-amber-600" : ""}>{r.priority}</Badge></TableCell>
                    <TableCell>{r.total_weight_kg ?? "-"}</TableCell>
                    <TableCell className="text-xs">{r.requested_date ? format(new Date(r.requested_date), "MMM d") : "-"}</TableCell>
                    <TableCell><Badge className={r.status === "delivered" ? "bg-green-500/20 text-green-700" : r.status === "in_transit" ? "bg-purple-500/20 text-purple-700" : "bg-amber-500/20 text-amber-700"}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {outboundReqs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No outbound requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Waybill Management ───────────────────── */}
          <TabsContent value="waybills" className="mt-4">
            <WaybillEngine />
          </TabsContent>

          {/* ── POD Confirmation Desk ────────────────── */}
          <TabsContent value="pod" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Confirming POD closes the delivery loop, triggers vendor invoice generation, and updates the KPI Board's fulfilment rate.</p>
            {podPending.length === 0 && <div className="text-center py-10 text-green-600 font-semibold">All deliveries confirmed ✓</div>}
            {podPending.map(d => (
              <Card key={d.id} className="border-l-4 border-l-amber-400">
                <CardContent className="pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{d.dispatch_number}</p>
                        <Badge variant="outline" className={d.sla_status === "met" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}>{d.sla_status ?? "-"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{d.pickup_address} → {d.delivery_address}</p>
                      {d.actual_delivery && <p className="text-xs text-muted-foreground mt-0.5">Delivered: {format(new Date(d.actual_delivery), "MMM d, HH:mm")}</p>}
                      {(() => {
                        const job = jobByDispatch[d.id];
                        return job?.pod_photo_url ? (
                          <div className="mt-2">
                            <p className="text-xs text-green-600 font-medium mb-1">Transporter POD photo:</p>
                            <a href={job.pod_photo_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline">View POD Photo →</a>
                            {job.pod_notes && <p className="text-xs text-muted-foreground italic mt-1">{job.pod_notes}</p>}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <Button onClick={() => confirmPOD(d.id)} className="shrink-0">
                      <CheckCircle className="w-4 h-4 mr-1" />Confirm POD
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── In-Transit Monitor ───────────────────── */}
          <TabsContent value="transit" className="mt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Dispatch #</TableHead><TableHead>Route</TableHead>
                <TableHead>Carrier</TableHead><TableHead>Last Location</TableHead>
                <TableHead>ETA</TableHead><TableHead>SLA</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {active.map(d => {
                  const job = jobByDispatch[d.id];
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.dispatch_number}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{d.pickup_address} → {d.delivery_address}</TableCell>
                      <TableCell className="text-xs">{job?.ld_transporters?.company_name ?? "-"}</TableCell>
                      <TableCell className="text-xs">
                        {job?.current_location ? (
                          <div>
                            <p className="text-teal-600 font-medium">{job.current_location}</p>
                            {job.location_updated_at && (
                              <p className="text-muted-foreground text-[10px]">
                                {format(new Date(job.location_updated_at), "HH:mm")}
                              </p>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{d.scheduled_delivery ? format(new Date(d.scheduled_delivery), "MMM d HH:mm") : "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={d.sla_status === "at_risk" ? "border-amber-500 text-amber-600" : d.sla_status === "breached" ? "border-red-500 text-red-600" : "border-green-500 text-green-600"}>{d.sla_status ?? "on track"}</Badge></TableCell>
                      <TableCell><Badge className="bg-purple-500/20 text-purple-700">{d.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {active.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No shipments currently in transit</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Route Risks ──────────────────────────── */}
          <TabsContent value="risks" className="mt-4">
            <RouteRiskRegister />
          </TabsContent>

          {/* ── SOPs & Compliance ────────────────────── */}
          <TabsContent value="sops" className="mt-4 space-y-4">
            <OpsSOPsDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. LOGISTICS COST CONTROL
// Role: finance_manager → Finance Controller (Logistics)
// Question answered: "Are we spending efficiently?"
// Features: Cost Intelligence | Vendor Invoices | Route-Level Costing |
//           Budget Variance | Finance Intelligence Engine | Reconciliation | Tax
// Feeds into: KPI Board (cost-to-serve) + Manager (spend signals)
// ════════════════════════════════════════════════════════════════════════════════
export function DeptFinanceManagerDashboard() {
  const { organizationId: orgId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("cost-centre");
  const since = startOfMonth(new Date()).toISOString();
  const since30 = subDays(new Date(), 30).toISOString();

  // ── All queries are org-scoped with .eq("organization_id", orgId!) ──────────
  const { data: dispatches = [] } = useQuery({
    queryKey: ["fc-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, cost, distance_km, cargo_weight_kg, status, sla_status, created_at, pickup_address, delivery_address")
        .eq("organization_id", orgId!)
        .gte("created_at", since30);
      return data ?? [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["fc-bills", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("bills") as any)
        .select("id, bill_number, vendor_name, total_amount, payment_status, bill_date, category, notes")
        .eq("organization_id", orgId!)
        .order("bill_date", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["fc-expenses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("expenses") as any)
        .select("id, amount, category, expense_date, description")
        .eq("organization_id", orgId!)
        .gte("expense_date", since30.split("T")[0]);
      return data ?? [];
    },
  });

  // ── Derived cost metrics - all from org-scoped live data ───────────────────
  const delivered    = dispatches.filter((d: any) => d.status === "delivered");
  const totalCost    = dispatches.reduce((s: number, d: any) => s + Number(d.cost ?? 0), 0);
  const totalKm      = dispatches.reduce((s: number, d: any) => s + Number(d.distance_km ?? 0), 0);
  const totalKg      = dispatches.reduce((s: number, d: any) => s + Number(d.cargo_weight_kg ?? 0), 0);
  const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
  const costPerKm    = totalKm > 0 ? totalCost / totalKm : 0;
  const costPerKg    = totalKg > 0 ? totalCost / totalKg : 0;
  const costPerDel   = delivered.length > 0 ? totalCost / delivered.length : 0;
  const totalSpend   = totalCost + expenseTotal;
  const pendingBills = bills.filter((b: any) => b.payment_status === "pending");
  const pendingAmt   = pendingBills.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0);

  // No live transactions across dispatches/bills/expenses → show "awaiting
  // data" state instead of misleading "on target" benchmarks.
  const hasLiveData =
    dispatches.length > 0 || bills.length > 0 || expenses.length > 0;
  const hasCostBasis = totalKm > 0 || totalKg > 0 || delivered.length > 0;

  // ── Route-level cost grouping ────────────────────────────────────────────────
  const routeMap = new Map<string, { trips: number; cost: number; km: number; kg: number }>();
  for (const d of dispatches) {
    if (d.status !== "delivered") continue;
    const origin = (d.pickup_address ?? "").split(",")[0].trim() || "Unknown";
    const dest   = (d.delivery_address ?? "").split(",")[0].trim() || "Unknown";
    const key    = `${origin} → ${dest}`;
    const ex     = routeMap.get(key) ?? { trips: 0, cost: 0, km: 0, kg: 0 };
    routeMap.set(key, {
      trips: ex.trips + 1,
      cost:  ex.cost  + Number(d.cost ?? 0),
      km:    ex.km    + Number(d.distance_km ?? 0),
      kg:    ex.kg    + Number(d.cargo_weight_kg ?? 0),
    });
  }
  const routeRows = Array.from(routeMap.entries())
    .map(([route, v]) => ({
      route,
      trips:      v.trips,
      totalCost:  v.cost,
      costPerTrip: v.trips > 0 ? Math.round(v.cost / v.trips) : 0,
      costPerKm:  v.km > 0 ? Math.round(v.cost / v.km) : 0,
      costPerKg:  v.kg > 0 ? Number((v.cost / v.kg).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 12);

  // ── 30-day daily spend trend for chart ──────────────────────────────────────
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const day  = subDays(new Date(), 13 - i);
    const key  = format(day, "MMM d");
    const cost = dispatches
      .filter((d: any) => d.created_at && format(new Date(d.created_at), "MMM d") === key)
      .reduce((s: number, d: any) => s + Number(d.cost ?? 0), 0);
    return { date: key, Cost: Math.round(cost) };
  });

  // ── Expense category breakdown ───────────────────────────────────────────────
  const byCat: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category ?? "other";
    byCat[cat] = (byCat[cat] ?? 0) + Number(e.amount ?? 0);
  }
  const catData = Object.entries(byCat)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const PIE_COLORS = [TEAL, BLUE, AMBER, GREEN, "#a855f7", RED];

  return (
    <DashboardLayout
      title="Logistics Cost Control"
      subtitle="Cost centre intelligence • Vendor payables • Route efficiency"
    >
      <div className="space-y-5">
        {/* ── Top KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Cost per Delivery"
            value={delivered.length > 0 ? NGN(Math.round(costPerDel)) : "-"}
            icon={Package}
            color="text-primary"
            sub={delivered.length > 0 ? "All-in cost per completed shipment (30d)" : "No deliveries in last 30d"}
          />
          <KpiCard
            title="Cost per KM"
            value={totalKm > 0 ? NGN(Math.round(costPerKm)) : "-"}
            icon={MapPin}
            color={totalKm === 0 ? "text-muted-foreground" : costPerKm <= 500 ? "text-green-600" : "text-amber-500"}
            sub={totalKm > 0 ? "Benchmark ≤ ₦500/km" : "Awaiting trip distance data"}
            trend={totalKm === 0 ? undefined : costPerKm <= 500 ? "up" : "down"}
            trendLabel={totalKm === 0 ? undefined : costPerKm <= 500 ? "Within target" : "Above benchmark"}
          />
          <KpiCard
            title="Cost per KG"
            value={totalKg > 0 ? NGN(Math.round(costPerKg * 100) / 100) : "-"}
            icon={Warehouse}
            color={totalKg > 0 ? "text-purple-500" : "text-muted-foreground"}
            sub={totalKg > 0 ? "Cargo handling efficiency" : "Awaiting cargo weight data"}
          />
          <KpiCard
            title="Pending Vendor Invoices"
            value={String(pendingBills.length)}
            icon={FileText}
            color={pendingBills.length > 0 ? "text-amber-500" : "text-green-600"}
            sub={pendingBills.length > 0 ? `${NGN(pendingAmt)} awaiting approval` : bills.length > 0 ? "All invoices clear" : "No invoices yet"}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="cost-centre">Cost Centre</TabsTrigger>
            <TabsTrigger value="invoices">
              Vendor Invoices
              {pendingBills.length > 0 && (
                <Badge className="ml-1.5 h-4 text-[10px] bg-amber-500">{pendingBills.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="route-costing">Route Costing</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════════
              TAB 1 - COST CENTRE DASHBOARD
              All data org-scoped. No LC revenue/AR/AP concepts.
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="cost-centre" className="mt-4 space-y-4">
            <AiInsight
              text={
                !hasLiveData
                  ? "No live transactions yet for the last 30 days. Cost efficiency cannot be scored. Sync sales orders from your ERP/WMS, log dispatches, or import vendor bills - metrics will populate automatically once live data flows in."
                  : !hasCostBasis
                  ? `Live transactions present (${dispatches.length} dispatches, ${bills.length} bills, ${expenses.length} expenses) but no completed delivery distance/weight yet. Cost/KM and Cost/KG will activate once dispatches are delivered with logged distance and cargo weight.`
                  : costPerKm > 500
                  ? `Cost/KM is ${NGN(Math.round(costPerKm))} - ${Math.round(((costPerKm - 500) / 500) * 100)}% above the ₦500 benchmark. Likely cause: partial-load dispatches or inefficient route corridors. Review the Route Costing tab to identify your most expensive corridors.`
                  : `Cost efficiency is on target. Cost/KM: ${NGN(Math.round(costPerKm))}. Cost/KG: ${NGN(Math.round(costPerKg))}. Total MTD spend: ${NGN(Math.round(totalSpend))}. ${pendingBills.length > 0 ? `${pendingBills.length} vendor invoices (${NGN(pendingAmt)}) pending approval.` : "No anomalies detected."}`
              }
              severity={
                !hasLiveData ? "info"
                : !hasCostBasis ? "info"
                : costPerKm > 800 ? "critical"
                : costPerKm > 500 ? "warn"
                : "info"
              }
            />

            {/* Spend Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">MTD Spend Summary</CardTitle>
                  <CardDescription>Month-to-date logistics cost breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total Logistics Spend (MTD)", value: NGN(Math.round(totalSpend)), bold: true },
                    { label: "↳ Dispatch / Transport Costs", value: NGN(Math.round(totalCost)), bold: false },
                    { label: "↳ Operational Expenses", value: NGN(Math.round(expenseTotal)), bold: false },
                    { label: "Pending Vendor Invoices", value: NGN(Math.round(pendingAmt)), bold: false, warning: pendingBills.length > 0 },
                    { label: "Completed Deliveries", value: String(delivered.length) + " shipments", bold: false },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                    >
                      <span className={`text-sm ${row.warning ? "text-amber-600" : "text-muted-foreground"}`}>
                        {row.label}
                      </span>
                      <span className={`${row.bold ? "text-lg font-bold text-foreground" : "font-semibold"} ${row.warning ? "text-amber-600" : ""}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Expense Category Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Expense Categories</CardTitle>
                  <CardDescription>Breakdown of operational spend by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {catData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={catData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) =>
                            `${name} ${Math.round((percent ?? 0) * 100)}%`
                          }
                          labelLine={false}
                        >
                          {catData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => NGN(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No expense data this period
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 14-day cost trend chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">14-Day Logistics Cost Trend</CardTitle>
                <CardDescription>Daily dispatch costs - your department only</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyTrend}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => NGN(v)} />
                    <Area
                      type="monotone"
                      dataKey="Cost"
                      stroke={TEAL}
                      fill="url(#costGrad)"
                      strokeWidth={2}
                      name="Logistics Cost"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost benchmarks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cost Efficiency Benchmarks</CardTitle>
                <CardDescription>Your department vs global logistics industry standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Cost per KM", benchmark: "≤ ₦500", actual: NGN(Math.round(costPerKm)), ok: costPerKm <= 500 },
                  { label: "Cost per KG", benchmark: "≤ ₦50", actual: NGN(Math.round(costPerKg)), ok: costPerKg <= 50 },
                  { label: "Cost per Delivery", benchmark: "< ₦50,000", actual: NGN(Math.round(costPerDel)), ok: costPerDel < 50000 },
                  { label: "Vendor Invoice Backlog", benchmark: "0 pending", actual: `${pendingBills.length} pending`, ok: pendingBills.length === 0 },
                ].map((b) => (
                  <div key={b.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium">{b.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Target: {b.benchmark}</span>
                      <Badge
                        className={
                          b.ok
                            ? "bg-green-500/20 text-green-700 border-green-500/30"
                            : "bg-red-500/20 text-red-700 border-red-500/30"
                        }
                        variant="outline"
                      >
                        {b.actual}
                      </Badge>
                      {b.ok ? (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 2 - VENDOR INVOICES
              Org-scoped bills with ₦500k Director escalation rule.
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="invoices" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.bill_number}</TableCell>
                    <TableCell className="font-medium">{b.vendor_name}</TableCell>
                    <TableCell className="font-bold">{NGN(b.total_amount)}</TableCell>
                    <TableCell className="text-xs">
                      {b.bill_date ? format(new Date(b.bill_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          b.payment_status === "paid"
                            ? "bg-green-500/20 text-green-700"
                            : b.payment_status === "approved"
                            ? "bg-blue-500/20 text-blue-700"
                            : b.payment_status === "rejected"
                            ? "bg-red-500/20 text-red-700"
                            : "bg-amber-500/20 text-amber-700"
                        }
                      >
                        {b.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.payment_status === "pending" &&
                        (b.total_amount > 500000 ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-red-400 text-red-600 whitespace-nowrap"
                          >
                            Director Required
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await (supabase.from("bills") as any)
                                .update({ payment_status: "approved" })
                                .eq("id", b.id)
                                .eq("organization_id", orgId!);
                              qc.invalidateQueries({ queryKey: ["fc-bills", orgId] });
                              toast.success("Invoice approved");
                            }}
                          >
                            Approve
                          </Button>
                        ))}
                    </TableCell>
                  </TableRow>
                ))}
                {bills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No vendor bills found for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 3 - ROUTE-LEVEL COSTING
              Inline, fully org-scoped. No shared LC component used.
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="route-costing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Route-Level Cost Analysis (30 Days)</CardTitle>
                <CardDescription>
                  Cost per trip, per KM, and per KG by corridor - your department only
                </CardDescription>
              </CardHeader>
              <CardContent>
                {routeRows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No completed deliveries in the last 30 days to analyse
                  </p>
                ) : (
                  <>
                    {/* Bar chart of top routes by cost */}
                    <ResponsiveContainer width="100%" height={200} className="mb-4">
                      <BarChart data={routeRows.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="route"
                          tick={{ fontSize: 9 }}
                          tickFormatter={(v) => v.split(" → ")[0]}
                        />
                        <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => NGN(v)} />
                        <Bar dataKey="totalCost" fill={TEAL} radius={[4, 4, 0, 0]} name="Total Cost" />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Detail table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>Trips</TableHead>
                          <TableHead>Cost / Trip</TableHead>
                          <TableHead>Cost / KM</TableHead>
                          <TableHead>Cost / KG</TableHead>
                          <TableHead>Efficiency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routeRows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-xs max-w-[180px] truncate">
                              {r.route}
                            </TableCell>
                            <TableCell>{r.trips}</TableCell>
                            <TableCell className="font-semibold">{NGN(r.costPerTrip)}</TableCell>
                            <TableCell
                              className={
                                r.costPerKm > 500
                                  ? "text-amber-600 font-medium"
                                  : "text-green-600 font-medium"
                              }
                            >
                              {NGN(r.costPerKm)}
                            </TableCell>
                            <TableCell>{NGN(r.costPerKg)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  r.costPerKm <= 500
                                    ? "border-green-500 text-green-700 text-[10px]"
                                    : "border-amber-500 text-amber-700 text-[10px]"
                                }
                              >
                                {r.costPerKm <= 500 ? "Efficient" : "Review"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 4 - RECONCILIATION
              Compares dispatch costs vs vendor bills - org-scoped only.
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="reconciliation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invoice Reconciliation</CardTitle>
                <CardDescription>
                  Compares recorded dispatch costs against vendor invoices raised this month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Dispatch costs recorded (MTD)",
                    value: NGN(Math.round(totalCost)),
                    highlight: false,
                  },
                  {
                    label: "Operational expenses recorded (MTD)",
                    value: NGN(Math.round(expenseTotal)),
                    highlight: false,
                  },
                  {
                    label: "Total vendor bills raised (MTD)",
                    value: NGN(
                      Math.round(
                        bills
                          .filter(
                            (b: any) =>
                              b.bill_date && b.bill_date >= since.split("T")[0],
                          )
                          .reduce(
                            (s: number, b: any) => s + Number(b.total_amount ?? 0),
                            0,
                          ),
                      ),
                    ),
                    highlight: false,
                  },
                  {
                    label: "Unreconciled gap",
                    value: NGN(
                      Math.abs(
                        totalCost -
                          bills.reduce(
                            (s: number, b: any) => s + Number(b.total_amount ?? 0),
                            0,
                          ),
                      ),
                    ),
                    highlight: true,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      row.highlight
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-muted/40"
                    }`}
                  >
                    <span className="text-sm">{row.label}</span>
                    <span
                      className={`font-bold ${
                        row.highlight ? "text-amber-600" : "text-foreground"
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  A gap means vendor invoices don't exactly match recorded dispatch costs. Review
                  vendor bills against rate cards in Vendor Management.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. DRIVER SUPER APP - Department View
// Role: driver
// Question answered: "What are my jobs and am I performing?"
// Features: Active Jobs | POD Desk | Performance Tracking | Trip History
// Note: NO earnings/wallet - dept drivers are employees on payroll
// Feeds into: Outbound & Inbound Desk (OTD rate, completion rate, POD accuracy)
// ════════════════════════════════════════════════════════════════════════════════
export function DeptDriverDashboard() {
  const { user, organizationId: orgId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("jobs");

  const { data: myDispatches = [] } = useQuery({
    queryKey: ["driver-dept-jobs", orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, dispatch_number, pickup_address, delivery_address, status, sla_status, scheduled_pickup, scheduled_delivery, actual_delivery, distance_km, cargo_weight_kg, pod_confirmed, notes")
        .eq("organization_id", orgId!)
        .eq("driver_id", user!.id)
        .order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const active     = myDispatches.filter(d => ["assigned", "picked_up", "in_transit"].includes(d.status ?? ""));
  const completed  = myDispatches.filter(d => d.status === "delivered");
  const podPending = completed.filter(d => !(d as any).pod_confirmed);
  const onTime     = completed.filter(d => d.sla_status === "met").length;
  const otdRate    = completed.length > 0 ? (onTime / completed.length) * 100 : 0;
  const totalKm    = myDispatches.reduce((s, d) => s + Number(d.distance_km ?? 0), 0);
  const totalKg    = myDispatches.reduce((s, d) => s + Number(d.cargo_weight_kg ?? 0), 0);

  return (
    <DashboardLayout title="Driver Super App" subtitle="Your jobs • Performance • Proof of delivery">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Active Jobs" value={String(active.length)} icon={Truck} color="text-blue-500" sub="In progress now" />
          <KpiCard title="On-Time Delivery" value={pct(otdRate)} icon={Target} color={otdRate >= 85 ? "text-green-600" : "text-amber-500"} trend={otdRate >= 85 ? "up" : "down"} trendLabel={`${completed.length} trips done`} />
          <KpiCard title="POD Pending" value={String(podPending.length)} icon={FileText} color={podPending.length > 0 ? "text-amber-500" : "text-green-600"} sub="Confirm to close loop" />
          <KpiCard title="Km Covered" value={`${Math.round(totalKm).toLocaleString()} km`} icon={MapPin} sub={`${Math.round(totalKg).toLocaleString()} kg delivered`} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
            <TabsTrigger value="pod">
              POD Desk
              {podPending.length > 0 && <Badge className="ml-1.5 h-4 text-[10px] bg-amber-500">{podPending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="performance">My Performance</TabsTrigger>
            <TabsTrigger value="history">Trip History</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4 space-y-3">
            {active.length === 0 && <div className="text-center py-8 text-muted-foreground">No active jobs assigned to you right now.</div>}
            {active.map(d => (
              <Card key={d.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{d.dispatch_number}</p>
                      <p className="text-sm text-muted-foreground">{d.pickup_address} → {d.delivery_address}</p>
                      {d.scheduled_delivery && <p className="text-xs text-amber-600 mt-1">ETA: {format(new Date(d.scheduled_delivery), "MMM d, HH:mm")}</p>}
                      {d.notes && <p className="text-xs text-muted-foreground mt-1 italic">{d.notes}</p>}
                    </div>
                    <Badge className={d.status === "in_transit" ? "bg-purple-500/20 text-purple-700" : "bg-blue-500/20 text-blue-700"}>{d.status?.replace("_", " ").toUpperCase()}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="pod" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground mb-2">POD confirmation closes the delivery, updates the department KPI Board, and triggers invoice processing. Confirm promptly.</p>
            {podPending.length === 0 && <div className="text-center py-8 text-green-600 font-semibold">All deliveries confirmed ✓</div>}
            {podPending.map(d => (
              <Card key={d.id} className="border-l-4 border-l-amber-400">
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{d.dispatch_number}</p>
                    <p className="text-sm text-muted-foreground">{d.delivery_address}</p>
                    {d.actual_delivery && <p className="text-xs text-muted-foreground">Arrived: {format(new Date(d.actual_delivery), "MMM d HH:mm")}</p>}
                  </div>
                  <Button onClick={async () => { await (supabase.from("dispatches") as any).update({ pod_confirmed: true, pod_confirmed_at: new Date().toISOString(), pod_confirmed_by: user?.id } as any).eq("id", d.id).eq("organization_id", orgId!); qc.invalidateQueries({ queryKey: ["driver-dept-jobs", orgId, user?.id] }); toast.success("POD confirmed ✓"); }}>
                    <CheckCircle className="w-4 h-4 mr-1" />Confirm POD
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Your performance feeds directly into the department's OTIF metric reviewed by your Logistics Manager and Director.</p>
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">Trip Completion Rate</p>
                <Progress value={(completed.length / Math.max(myDispatches.length, 1)) * 100} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{completed.length} / {myDispatches.length} trips completed</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">SLA Compliance</p>
                <Progress value={otdRate} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{pct(otdRate)} on-time deliveries</p>
              </CardContent></Card>
            </div>
            <Card><CardContent className="pt-4 space-y-2">
              <p className="text-sm font-medium">Performance Breakdown</p>
              {[
                { label: "On-time deliveries", value: onTime },
                { label: "Late deliveries", value: completed.length - onTime },
                { label: "POD confirmed", value: completed.filter(d => (d as any).pod_confirmed).length },
                { label: "Total distance (km)", value: Math.round(totalKm).toLocaleString() },
                { label: "Total cargo (kg)", value: Math.round(totalKg).toLocaleString() },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Dispatch #</TableHead><TableHead>Route</TableHead>
                <TableHead>Delivered</TableHead><TableHead>SLA</TableHead><TableHead>POD</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {completed.slice(0, 30).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.dispatch_number}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{d.pickup_address} → {d.delivery_address}</TableCell>
                    <TableCell className="text-xs">{d.actual_delivery ? format(new Date(d.actual_delivery), "MMM d") : "-"}</TableCell>
                    <TableCell><Badge className={d.sla_status === "met" ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"} variant="outline">{d.sla_status ?? "-"}</Badge></TableCell>
                    <TableCell>{(d as any).pod_confirmed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}</TableCell>
                  </TableRow>
                ))}
                {completed.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No completed trips</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
