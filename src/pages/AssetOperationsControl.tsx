/**
 * AssetOperationsControl.tsx - Fleet Operations Control System (LC only)
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval, subWeeks, addWeeks } from "date-fns";
import {
  Truck, AlertTriangle, CheckCircle, Clock, TrendingDown, Wrench,
  ChevronLeft, ChevronRight, Activity, DollarSign, XCircle,
} from "lucide-react";

interface Asset { id: string; registration_number: string; vehicle_type: string; status: string; expected_daily_revenue: number; organization_id: string; }
interface MaintenanceEvent { id: string; vehicle_id: string; start_date: string; end_date: string; maintenance_type: string; description: string | null; }
interface IdleLog { id: string; vehicle_id: string; idle_date: string; reason_code: string; notes: string | null; }
interface Dispatch { id: string; vehicle_id: string | null; scheduled_pickup: string | null; actual_delivery: string | null; actual_pickup: string | null; status: string; }
interface WeeklyStats {
  asset: Asset; transitDays: number; maintenanceDays: number; idleDays: number; tripsCompleted: number;
  utilisationPct: number; idleLoss: number; maintenanceLoss: number; totalLoss: number;
  flag: "green" | "yellow" | "red"; missingIdleReasons: string[];
}

const IDLE_REASON_CODES: Record<string, string> = {
  no_load_available: "No load available",
  client_delay: "Client delay",
  dispatch_failure: "Dispatch failure",
  payment_issue: "Payment issue",
  driver_issue: "Driver issue",
  other: "Other",
};

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const getFlag = (pct: number): "green" | "yellow" | "red" =>
  pct >= 75 ? "green" : pct >= 60 ? "yellow" : "red";

const FLAG_CONFIG = {
  green:  { class: "bg-green-500/20 text-green-700 border-green-500/30",  label: "On Track",  icon: CheckCircle },
  yellow: { class: "bg-amber-500/20 text-amber-700 border-amber-500/30",  label: "Monitor",   icon: AlertTriangle },
  red:    { class: "bg-red-500/20 text-red-700 border-red-500/30",        label: "Critical",  icon: XCircle },
};

function computeTransitDays(vehicleId: string, weekStart: Date, weekEnd: Date, dispatches: Dispatch[]) {
  const relevantDispatches = dispatches.filter((d) => d.vehicle_id === vehicleId && d.status !== "cancelled");
  const transitDates = new Set<string>();
  let trips = 0;
  for (const d of relevantDispatches) {
    const start = d.actual_pickup ? parseISO(d.actual_pickup) : d.scheduled_pickup ? parseISO(d.scheduled_pickup) : null;
    const end = d.actual_delivery ? parseISO(d.actual_delivery) : null;
    if (!start) continue;
    const dispatchEnd = end ?? new Date(start.getTime() + 86400000);
    const days = eachDayOfInterval({
      start: start > weekStart ? start : weekStart,
      end: dispatchEnd < weekEnd ? dispatchEnd : weekEnd,
    });
    if (days.length > 0) trips++;
    days.forEach((day) => transitDates.add(format(day, "yyyy-MM-dd")));
  }
  return { days: Math.min(7, transitDates.size), trips };
}

function computeMaintenanceDays(vehicleId: string, weekStart: Date, weekEnd: Date, events: MaintenanceEvent[]) {
  const maintDates = new Set<string>();
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  for (const ev of events.filter((e) => e.vehicle_id === vehicleId)) {
    const evStart = parseISO(ev.start_date);
    const evEnd = parseISO(ev.end_date);
    for (const day of weekDays) {
      if (isWithinInterval(day, { start: evStart, end: evEnd })) {
        maintDates.add(format(day, "yyyy-MM-dd"));
      }
    }
  }
  return Math.min(7, maintDates.size);
}

export default function AssetOperationsControl() {
  const { organizationId, userRole } = useAuth();
  const qc = useQueryClient();
  const canEdit = ["super_admin", "admin", "org_admin", "ops_manager", "dispatcher"].includes(userRole ?? "");

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [idleOpen, setIdleOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const weekStart = startOfWeek(
    weekOffset === 0 ? new Date() : weekOffset > 0
      ? addWeeks(new Date(), weekOffset)
      : subWeeks(new Date(), Math.abs(weekOffset)),
    { weekStartsOn: 1 }
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["assets-aoc", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicles") as any)
        .select("id, registration_number, vehicle_type, status, expected_daily_revenue, organization_id")
        .eq("organization_id", organizationId!)
        .neq("status", "retired")
        .order("registration_number");
      return (data ?? []) as Asset[];
    },
  });

  const { data: dispatches = [] } = useQuery<Dispatch[]>({
    queryKey: ["dispatches-aoc", organizationId, weekStart.toISOString()],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("dispatches")
        .select("id, vehicle_id, scheduled_pickup, actual_delivery, actual_pickup, status")
        .eq("organization_id", organizationId!)
        .gte("scheduled_pickup", format(subWeeks(weekStart, 1), "yyyy-MM-dd"))
        .lte("scheduled_pickup", format(addWeeks(weekEnd, 1), "yyyy-MM-dd"));
      return (data ?? []) as Dispatch[];
    },
  });

  const { data: maintenanceEvents = [] } = useQuery<MaintenanceEvent[]>({
    queryKey: ["asset-maintenance-aoc", organizationId, weekStart.toISOString()],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("asset_maintenance_events") as any)
        .select("id, vehicle_id, start_date, end_date, maintenance_type, description")
        .eq("organization_id", organizationId!)
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"))
        .gte("end_date", format(weekStart, "yyyy-MM-dd"));
      return (data ?? []) as MaintenanceEvent[];
    },
  });

  const { data: idleLogs = [] } = useQuery<IdleLog[]>({
    queryKey: ["asset-idle-aoc", organizationId, weekStart.toISOString()],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("asset_idle_logs") as any)
        .select("id, vehicle_id, idle_date, reason_code, notes")
        .eq("organization_id", organizationId!)
        .gte("idle_date", format(weekStart, "yyyy-MM-dd"))
        .lte("idle_date", format(weekEnd, "yyyy-MM-dd"));
      return (data ?? []) as IdleLog[];
    },
  });

  const weeklyStats = useMemo<WeeklyStats[]>(() => {
    return assets.map((asset) => {
      const { days: transitDays, trips } = computeTransitDays(asset.id, weekStart, weekEnd, dispatches);
      const maintenanceDays = computeMaintenanceDays(asset.id, weekStart, weekEnd, maintenanceEvents);
      const rawIdleDays = Math.max(0, 7 - transitDays - maintenanceDays);

      const loggedDates = new Set(idleLogs.filter((l) => l.vehicle_id === asset.id).map((l) => l.idle_date));
      const missingIdleReasons: string[] = [];
      if (rawIdleDays > 0) {
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const transitAndMaint = new Set<string>();
        const relevantDispatches = dispatches.filter((d) => d.vehicle_id === asset.id && d.status !== "cancelled");
        for (const d of relevantDispatches) {
          const dStart = d.actual_pickup ? parseISO(d.actual_pickup) : d.scheduled_pickup ? parseISO(d.scheduled_pickup) : null;
          const dEnd = d.actual_delivery ? parseISO(d.actual_delivery) : null;
          if (!dStart) continue;
          const fallbackEnd = dEnd ?? new Date(dStart.getTime() + 86400000);
          const daysInTransit = eachDayOfInterval({
            start: dStart > weekStart ? dStart : weekStart,
            end: fallbackEnd < weekEnd ? fallbackEnd : weekEnd,
          });
          daysInTransit.forEach((day) => transitAndMaint.add(format(day, "yyyy-MM-dd")));
        }
        for (const ev of maintenanceEvents.filter((e) => e.vehicle_id === asset.id)) {
          eachDayOfInterval({ start: parseISO(ev.start_date), end: parseISO(ev.end_date) })
            .filter((d) => isWithinInterval(d, { start: weekStart, end: weekEnd }))
            .forEach((d) => transitAndMaint.add(format(d, "yyyy-MM-dd")));
        }
        for (const day of weekDays) {
          const dateStr = format(day, "yyyy-MM-dd");
          if (!transitAndMaint.has(dateStr) && !loggedDates.has(dateStr)) missingIdleReasons.push(dateStr);
        }
      }

      const edr = asset.expected_daily_revenue || 0;
      const utilisationPct = Math.round((transitDays / 7) * 100);
      const idleLoss = rawIdleDays * edr;
      const maintenanceLoss = Math.max(0, maintenanceDays - 2) * edr;
      const totalLoss = idleLoss + maintenanceLoss;

      return {
        asset, transitDays, maintenanceDays, idleDays: rawIdleDays, tripsCompleted: trips,
        utilisationPct, idleLoss, maintenanceLoss, totalLoss,
        flag: getFlag(utilisationPct), missingIdleReasons,
      };
    }).sort((a, b) => b.totalLoss - a.totalLoss);
  }, [assets, dispatches, maintenanceEvents, idleLogs, weekStart, weekEnd]);

  const [maintForm, setMaintForm] = useState({ start_date: "", end_date: "", maintenance_type: "preventive", description: "" });
  const addMaintenance = useMutation({
    mutationFn: async () => {
      if (!selectedAsset || !organizationId) throw new Error("No asset selected");
      if (!maintForm.start_date || !maintForm.end_date) throw new Error("Start and end dates required");
      const { error } = await (supabase.from("asset_maintenance_events") as any).insert({
        organization_id: organizationId,
        vehicle_id: selectedAsset.id,
        start_date: maintForm.start_date,
        end_date: maintForm.end_date,
        maintenance_type: maintForm.maintenance_type,
        description: maintForm.description || null,
        logged_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maintenance event logged");
      setMaintOpen(false);
      setMaintForm({ start_date: "", end_date: "", maintenance_type: "preventive", description: "" });
      qc.invalidateQueries({ queryKey: ["asset-maintenance-aoc", organizationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [idleForm, setIdleForm] = useState({ idle_date: "", reason_code: "no_load_available", notes: "" });
  const [bulkIdleDates, setBulkIdleDates] = useState<string[]>([]);
  const logIdle = useMutation({
    mutationFn: async () => {
      if (!selectedAsset || !organizationId) throw new Error("No asset selected");
      const datesToLog = bulkIdleDates.length > 0 ? bulkIdleDates : [idleForm.idle_date];
      if (datesToLog.length === 0 || !datesToLog[0]) throw new Error("Date required");
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const rows = datesToLog.map((d) => ({
        organization_id: organizationId,
        vehicle_id: selectedAsset.id,
        idle_date: d,
        reason_code: idleForm.reason_code,
        notes: idleForm.notes || null,
        logged_by: userId,
      }));
      const { error } = await (supabase.from("asset_idle_logs") as any).upsert(rows, { onConflict: "vehicle_id,idle_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Idle day(s) logged");
      setIdleOpen(false);
      setBulkIdleDates([]);
      setIdleForm({ idle_date: "", reason_code: "no_load_available", notes: "" });
      qc.invalidateQueries({ queryKey: ["asset-idle-aoc", organizationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [revenueValue, setRevenueValue] = useState("");
  const updateRevenue = useMutation({
    mutationFn: async () => {
      if (!selectedAsset || !revenueValue) throw new Error("Value required");
      const { error } = await (supabase.from("vehicles") as any)
        .update({ expected_daily_revenue: parseFloat(revenueValue) })
        .eq("id", selectedAsset.id)
        .eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expected daily revenue updated");
      setRevenueOpen(false);
      qc.invalidateQueries({ queryKey: ["assets-aoc", organizationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totals = useMemo(() => ({
    assets: weeklyStats.length,
    transitDays: weeklyStats.reduce((s, w) => s + w.transitDays, 0),
    maintenanceDays: weeklyStats.reduce((s, w) => s + w.maintenanceDays, 0),
    idleDays: weeklyStats.reduce((s, w) => s + w.idleDays, 0),
    avgUtilisation: weeklyStats.length > 0
      ? Math.round(weeklyStats.reduce((s, w) => s + w.utilisationPct, 0) / weeklyStats.length) : 0,
    totalPotentialRevenue: weeklyStats.reduce((s, w) => s + (w.asset.expected_daily_revenue * 7), 0),
    totalWeeklyLoss: weeklyStats.reduce((s, w) => s + w.totalLoss, 0),
    criticalAssets: weeklyStats.filter((w) => w.flag === "red").length,
    missingReasonAssets: weeklyStats.filter((w) => w.missingIdleReasons.length > 0).length,
  }), [weeklyStats]);

  const top3Worst = weeklyStats.slice(0, 3);

  return (
    <DashboardLayout
      title="Asset Operations Control"
      subtitle="Weekly utilisation tracking · Loss calculation · Performance intelligence"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-sm">{weekLabel}</p>
              {weekOffset === 0 && <p className="text-xs text-primary">Current Week</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Back to Current</Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {totals.missingReasonAssets > 0 && (
              <Alert className="border-amber-500/30 bg-amber-500/10 py-1.5 px-3">
                <AlertDescription className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {totals.missingReasonAssets} asset{totals.missingReasonAssets > 1 ? "s" : ""} with unlogged idle days
                </AlertDescription>
              </Alert>
            )}
            {totals.criticalAssets > 0 && (
              <Alert className="border-red-500/30 bg-red-500/10 py-1.5 px-3">
                <AlertDescription className="text-xs text-red-700 font-medium flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {totals.criticalAssets} Critical asset{totals.criticalAssets > 1 ? "s" : ""} (&lt;60% utilisation)
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Assets", val: String(totals.assets), icon: Truck, color: "text-primary" },
            { label: "Avg Utilisation", val: `${totals.avgUtilisation}%`, icon: Activity, color: totals.avgUtilisation >= 75 ? "text-green-600" : totals.avgUtilisation >= 60 ? "text-amber-500" : "text-red-500" },
            { label: "Total Idle Days", val: String(totals.idleDays), icon: Clock, color: "text-amber-500" },
            { label: "Weekly Rev Potential", val: NGN(totals.totalPotentialRevenue), icon: DollarSign, color: "text-teal-600" },
            { label: "Weekly Loss", val: NGN(totals.totalWeeklyLoss), icon: TrendingDown, color: "text-red-500" },
          ].map((k) => (
            <Card key={k.label} className="border bg-card">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
                <p className={`text-xl font-black ${k.color}`}>{k.val}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Performance Dashboard</TabsTrigger>
            <TabsTrigger value="log-maintenance" disabled={!canEdit}>Log Maintenance</TabsTrigger>
            <TabsTrigger value="log-idle" disabled={!canEdit}>Log Idle Days</TabsTrigger>
            <TabsTrigger value="configure">Asset Config</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            {top3Worst.filter((w) => w.flag !== "green").length > 0 && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Top Underperforming Assets This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {top3Worst.filter((w) => w.flag !== "green").slice(0, 3).map((w) => {
                      const fc = FLAG_CONFIG[w.flag];
                      return (
                        <div key={w.asset.id} className="p-3 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{w.asset.registration_number}</p>
                              <p className="text-xs text-muted-foreground">{w.asset.vehicle_type}</p>
                            </div>
                            <Badge className={`${fc.class} text-[10px]`} variant="outline">
                              {w.utilisationPct}% utilised
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Idle: {w.idleDays}d · Maintenance: {w.maintenanceDays}d</p>
                            <p className="text-red-500 font-semibold">Weekly loss: {NGN(w.totalLoss)}</p>
                            {w.missingIdleReasons.length > 0 && (
                              <p className="text-amber-600">⚠ {w.missingIdleReasons.length} idle day(s) need reason codes</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">All Assets - Week of {weekLabel}</CardTitle>
                <CardDescription>Sorted by highest loss.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-center">Trips</TableHead>
                      <TableHead className="text-center">Transit</TableHead>
                      <TableHead className="text-center">Maintenance</TableHead>
                      <TableHead className="text-center">Idle</TableHead>
                      <TableHead className="text-center">Utilisation</TableHead>
                      <TableHead className="text-right">Weekly Loss</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyStats.map((w) => {
                      const fc = FLAG_CONFIG[w.flag];
                      const FIcon = fc.icon;
                      return (
                        <TableRow key={w.asset.id} className={w.missingIdleReasons.length > 0 ? "bg-amber-500/5" : ""}>
                          <TableCell>
                            <p className="font-semibold text-sm">{w.asset.registration_number}</p>
                            <p className="text-xs text-muted-foreground">{w.asset.vehicle_type}</p>
                            {w.asset.expected_daily_revenue === 0 && (
                              <p className="text-xs text-amber-600">Revenue not configured</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{w.tripsCompleted}</TableCell>
                          <TableCell className="text-center"><span className="font-medium text-teal-600">{w.transitDays}d</span></TableCell>
                          <TableCell className="text-center">
                            <span className={w.maintenanceDays > 2 ? "text-amber-600 font-medium" : ""}>{w.maintenanceDays}d</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              <span className={w.idleDays > 2 ? "text-red-500 font-medium" : ""}>{w.idleDays}d</span>
                              {w.missingIdleReasons.length > 0 && (
                                <p className="text-[10px] text-amber-600">⚠ {w.missingIdleReasons.length} uncoded</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              <div className="font-semibold text-sm">{w.utilisationPct}%</div>
                              <Progress value={w.utilisationPct} className="h-1.5 mt-1 w-16 mx-auto" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={w.totalLoss > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                              {w.totalLoss > 0 ? NGN(w.totalLoss) : "₦0"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${fc.class} text-[10px] flex items-center gap-1 w-fit mx-auto`} variant="outline">
                              <FIcon className="w-3 h-3" />{fc.label}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => { setSelectedAsset(w.asset); setBulkIdleDates(w.missingIdleReasons); setIdleOpen(true); }}
                                  disabled={w.idleDays === 0}>
                                  <Clock className="w-3 h-3 mr-1" />Idle
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => { setSelectedAsset(w.asset); setMaintOpen(true); }}>
                                  <Wrench className="w-3 h-3 mr-1" />Maint
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {weeklyStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground py-8">
                          No assets found. <a href="/fleet" className="text-primary underline">Add assets in Fleet Management →</a>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Loss Projection</p>
                  <p className="text-2xl font-black text-red-500">{NGN(totals.totalWeeklyLoss * 4.33)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on this week × 4.33 weeks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Idle Loss (Week)</p>
                  <p className="text-2xl font-black text-amber-500">{NGN(weeklyStats.reduce((s, w) => s + w.idleLoss, 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totals.idleDays} idle days across fleet</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Excess Maintenance Loss</p>
                  <p className="text-2xl font-black text-orange-500">{NGN(weeklyStats.reduce((s, w) => s + w.maintenanceLoss, 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">Days beyond 2-day allowance</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="log-maintenance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4" />Log Maintenance Event</CardTitle>
                <CardDescription>Maintenance days ≤2/week are free - beyond that, losses are calculated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label>Select Asset *</Label>
                  <Select onValueChange={(id) => setSelectedAsset(assets.find((a) => a.id === id) ?? null)}>
                    <SelectTrigger><SelectValue placeholder="Choose asset" /></SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.registration_number} - {a.vehicle_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input type="date" value={maintForm.start_date} onChange={(e) => setMaintForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date *</Label>
                    <Input type="date" value={maintForm.end_date} onChange={(e) => setMaintForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Maintenance Type *</Label>
                  <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm((f) => ({ ...f, maintenance_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive (Scheduled)</SelectItem>
                      <SelectItem value="breakdown">Breakdown (Emergency)</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="What is being done?" value={maintForm.description} onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <Button onClick={() => addMaintenance.mutate()} disabled={addMaintenance.isPending || !selectedAsset || !maintForm.start_date || !maintForm.end_date}>
                  {addMaintenance.isPending ? "Saving…" : "Log Maintenance Event"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log-idle" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Log Idle Day Reason Codes</CardTitle>
                <CardDescription>Every idle day must have a reason code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label>Select Asset *</Label>
                  <Select onValueChange={(id) => { setSelectedAsset(assets.find((a) => a.id === id) ?? null); setBulkIdleDates([]); }}>
                    <SelectTrigger><SelectValue placeholder="Choose asset" /></SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => {
                        const stat = weeklyStats.find((w) => w.asset.id === a.id);
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            {a.registration_number} - {a.vehicle_type}
                            {stat && stat.missingIdleReasons.length > 0 && ` ⚠ ${stat.missingIdleReasons.length} uncoded`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAsset && (() => {
                  const stat = weeklyStats.find((w) => w.asset.id === selectedAsset.id);
                  if (!stat || stat.missingIdleReasons.length === 0) return null;
                  return (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-semibold text-amber-700 mb-2">⚠ Uncoded idle days for this asset:</p>
                      <div className="flex flex-wrap gap-2">
                        {stat.missingIdleReasons.map((d) => (
                          <button key={d} onClick={() => setBulkIdleDates((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                          )}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${bulkIdleDates.includes(d) ? "bg-amber-500 text-white border-amber-500" : "border-amber-400 text-amber-700 hover:bg-amber-500/20"}`}>
                            {format(parseISO(d), "EEE MMM d")}
                          </button>
                        ))}
                        <button className="text-xs px-2 py-1 rounded border border-teal-400 text-teal-700 hover:bg-teal-500/10"
                          onClick={() => setBulkIdleDates(stat.missingIdleReasons)}>
                          Select All
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5">
                  <Label>Single Date (if not using quick-fill above)</Label>
                  <Input type="date" value={idleForm.idle_date} onChange={(e) => setIdleForm((f) => ({ ...f, idle_date: e.target.value }))} min={format(weekStart, "yyyy-MM-dd")} max={format(weekEnd, "yyyy-MM-dd")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason Code *</Label>
                  <Select value={idleForm.reason_code} onValueChange={(v) => setIdleForm((f) => ({ ...f, reason_code: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(IDLE_REASON_CODES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {idleForm.reason_code === "other" && (
                  <div className="space-y-1.5">
                    <Label>Notes (required for Other)</Label>
                    <Textarea placeholder="Explain the idle reason…" value={idleForm.notes} onChange={(e) => setIdleForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                  </div>
                )}
                <Button onClick={() => logIdle.mutate()} disabled={logIdle.isPending || !selectedAsset || (bulkIdleDates.length === 0 && !idleForm.idle_date)}>
                  {logIdle.isPending ? "Saving…" : `Log ${bulkIdleDates.length > 1 ? `${bulkIdleDates.length} Days` : "Idle Day"}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configure" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" />Configure Expected Daily Revenue Per Asset</CardTitle>
                <CardDescription>Drives the loss calculation engine.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expected Daily Revenue</TableHead>
                      <TableHead>Monthly Potential</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.registration_number}</TableCell>
                        <TableCell className="text-muted-foreground">{a.vehicle_type}</TableCell>
                        <TableCell>
                          {a.expected_daily_revenue > 0
                            ? <span className="text-teal-600 font-semibold">{NGN(a.expected_daily_revenue)}</span>
                            : <span className="text-amber-600 text-sm">Not set</span>}
                        </TableCell>
                        <TableCell>{a.expected_daily_revenue > 0 ? NGN(a.expected_daily_revenue * 30) : "-"}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedAsset(a);
                              setRevenueValue(String(a.expected_daily_revenue || ""));
                              setRevenueOpen(true);
                            }}>Edit</Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Maintenance - {selectedAsset?.registration_number}</DialogTitle>
            <DialogDescription>Record planned or breakdown maintenance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={maintForm.start_date} onChange={(e) => setMaintForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={maintForm.end_date} onChange={(e) => setMaintForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm((f) => ({ ...f, maintenance_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={maintForm.description} onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>Cancel</Button>
            <Button onClick={() => addMaintenance.mutate()} disabled={addMaintenance.isPending}>
              {addMaintenance.isPending ? "Saving…" : "Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revenueOpen} onOpenChange={setRevenueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Expected Daily Revenue</DialogTitle>
            <DialogDescription>{selectedAsset?.registration_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Expected Revenue Per Day (₦)</Label>
            <Input type="number" min="0" placeholder="e.g. 150000" value={revenueValue} onChange={(e) => setRevenueValue(e.target.value)} />
            <p className="text-xs text-muted-foreground">Monthly potential: {NGN(parseFloat(revenueValue || "0") * 30)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevenueOpen(false)}>Cancel</Button>
            <Button onClick={() => updateRevenue.mutate()} disabled={updateRevenue.isPending || !revenueValue}>
              {updateRevenue.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={idleOpen} onOpenChange={setIdleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Idle Day - {selectedAsset?.registration_number}</DialogTitle>
            <DialogDescription>{bulkIdleDates.length > 0 ? `${bulkIdleDates.length} dates pre-selected` : "Choose date and reason"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {bulkIdleDates.length === 0 && (
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={idleForm.idle_date} onChange={(e) => setIdleForm((f) => ({ ...f, idle_date: e.target.value }))} min={format(weekStart, "yyyy-MM-dd")} max={format(weekEnd, "yyyy-MM-dd")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Select value={idleForm.reason_code} onValueChange={(v) => setIdleForm((f) => ({ ...f, reason_code: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IDLE_REASON_CODES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {idleForm.reason_code === "other" && (
              <div className="space-y-1.5">
                <Label>Notes *</Label>
                <Textarea value={idleForm.notes} onChange={(e) => setIdleForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIdleOpen(false)}>Cancel</Button>
            <Button onClick={() => logIdle.mutate()} disabled={logIdle.isPending || (bulkIdleDates.length === 0 && !idleForm.idle_date)}>
              {logIdle.isPending ? "Saving…" : "Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
