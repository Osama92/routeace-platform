import { useMemo, useState } from "react";
import LiveTrackingPanel from "@/components/tracking/LiveTrackingPanel";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  Truck, MapPin, Fuel, Activity, AlertTriangle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Navigation, BarChart3, RefreshCw, Radio,
  Brain, ChevronUp, ChevronDown, Loader2,
} from "lucide-react";

const statusColors: Record<string, string> = {
  in_transit: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  active: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  idle: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  maintenance: "bg-destructive/20 text-destructive",
  available: "bg-green-500/20 text-green-700 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
};

const fmtCurrency = (n: number) => {
  if (!n || !isFinite(n)) return "₦0";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${Math.round(n)}`;
};

export default function FleetCommandCenter() {
  const [activeTab, setActiveTab] = useState("live");

  // ── Live tenant-scoped data (RLS auto-filters by org for LC + LD users) ──
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ["fleet-cmd-vehicles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, registration_number, vehicle_type, truck_type, status, current_fuel_level, health_score")
        .order("registration_number", { ascending: true })
        .limit(100);
      return data || [];
    },
  });

  const { data: dispatches = [], isLoading: dispatchesLoading, refetch: refetchDispatches } = useQuery({
    queryKey: ["fleet-cmd-dispatches"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("dispatches")
        .select("id, vehicle_id, driver_id, status, cost, on_time_flag, total_distance_km, fuel_variance, pickup_address, delivery_address, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["fleet-cmd-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, full_name").limit(200);
      return data || [];
    },
  });

  const driverMap = useMemo(() => {
    const m: Record<string, string> = {};
    drivers.forEach((d: any) => (m[d.id] = d.full_name));
    return m;
  }, [drivers]);

  const refetch = () => {
    refetchVehicles();
    refetchDispatches();
  };

  // ── Computed KPIs from live data ──
  const kpis = useMemo(() => {
    const total = dispatches.length;
    const completed = dispatches.filter((d: any) => d.status === "completed" || d.status === "delivered");
    const onTime = dispatches.filter((d: any) => d.on_time_flag === true).length;
    const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;
    const completionPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const totalCost = dispatches.reduce((s: number, d: any) => s + (Number(d.cost) || 0), 0);
    const totalKm = dispatches.reduce((s: number, d: any) => s + (Number(d.total_distance_km) || 0), 0);
    const costPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;

    const fleetCount = vehicles.length || 1;
    const revenuePerVehicle = totalCost / fleetCount;

    const driverIds = new Set(dispatches.map((d: any) => d.driver_id).filter(Boolean));
    const revenuePerDriver = driverIds.size > 0 ? totalCost / driverIds.size : 0;

    const idleVehicles = vehicles.filter((v: any) => v.status === "idle" || v.status === "inactive").length;
    const idlePct = vehicles.length > 0 ? Math.round((idleVehicles / vehicles.length) * 100) : 0;

    return [
      { label: "On-Time Rate", value: `${onTimePct}%`, icon: CheckCircle, raw: onTimePct },
      { label: "Cost per KM", value: costPerKm > 0 ? `₦${costPerKm}` : "-", icon: Fuel, raw: costPerKm },
      { label: "Revenue / Vehicle", value: fmtCurrency(revenuePerVehicle), icon: TrendingUp, raw: revenuePerVehicle },
      { label: "Revenue / Driver", value: fmtCurrency(revenuePerDriver), icon: Navigation, raw: revenuePerDriver },
      { label: "Idle Time Ratio", value: `${idlePct}%`, icon: Clock, raw: idlePct },
      { label: "Trip Completion", value: `${completionPct}%`, icon: Activity, raw: completionPct },
    ];
  }, [dispatches, vehicles]);

  // ── Per-vehicle rollup ──
  const vehicleStats = useMemo(() => {
    return vehicles.map((v: any) => {
      const vDispatches = dispatches.filter((d: any) => d.vehicle_id === v.id);
      const vCompleted = vDispatches.filter((d: any) => d.status === "completed" || d.status === "delivered");
      const vOnTime = vDispatches.filter((d: any) => d.on_time_flag === true).length;
      const lastDriverId = vDispatches.find((d: any) => d.driver_id)?.driver_id;
      const driverName = lastDriverId ? (driverMap[lastDriverId] || "-") : "-";
      const revenue = vDispatches.reduce((s: number, d: any) => s + (Number(d.cost) || 0), 0);
      const km = vDispatches.reduce((s: number, d: any) => s + (Number(d.total_distance_km) || 0), 0);
      const fuelVarianceAvg = vDispatches.length > 0
        ? vDispatches.reduce((s: number, d: any) => s + (Number(d.fuel_variance) || 0), 0) / vDispatches.length
        : 0;
      const lastTrip = vDispatches[0];
      const route = lastTrip
        ? `${(lastTrip.pickup_address || "").split(",")[0]} → ${(lastTrip.delivery_address || "").split(",")[0]}`
        : "-";
      return {
        ...v,
        driverName,
        tripsMtd: vDispatches.length,
        revenueMtd: revenue,
        onTimePct: vDispatches.length > 0 ? Math.round((vOnTime / vDispatches.length) * 100) : 0,
        completionPct: vDispatches.length > 0 ? Math.round((vCompleted.length / vDispatches.length) * 100) : 0,
        km,
        fuelVariance: Math.round(fuelVarianceAvg),
        route,
      };
    });
  }, [vehicles, dispatches, driverMap]);

  // ── Live alerts derived from real data ──
  const alerts = useMemo(() => {
    const out: any[] = [];
    vehicleStats.forEach((v) => {
      if ((v.current_fuel_level ?? 100) < 25) {
        out.push({ id: `fuel-${v.id}`, severity: "high", vehicle: v.registration_number, msg: `Fuel level at ${v.current_fuel_level}% - refill required.`, time: "now" });
      }
      if ((v.health_score ?? 100) < 50) {
        out.push({ id: `health-${v.id}`, severity: "critical", vehicle: v.registration_number, msg: `Fleet health score ${v.health_score}/100 - service overdue.`, time: "now" });
      }
      if (v.fuelVariance > 25) {
        out.push({ id: `var-${v.id}`, severity: "critical", vehicle: v.registration_number, msg: `Fuel consumption ${v.fuelVariance}% above benchmark - investigate.`, time: "now" });
      }
      if (v.status === "idle" && v.tripsMtd === 0) {
        out.push({ id: `idle-${v.id}`, severity: "medium", vehicle: v.registration_number, msg: `Idle with no dispatches in last 30 days.`, time: "now" });
      }
    });
    return out;
  }, [vehicleStats]);

  const alertColors: Record<string, string> = {
    critical: "border-destructive bg-destructive/10",
    high: "border-orange-500 bg-orange-500/10",
    medium: "border-yellow-500 bg-yellow-500/10",
  };

  const loading = vehiclesLoading || dispatchesLoading;
  const isEmpty = !loading && vehicles.length === 0;

  return (
    <DashboardLayout title="Fleet Command Center" subtitle="Real-time fleet operations intelligence">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <k.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{loading ? "…" : k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Alerts Banner */}
      {alerts.filter((a) => a.severity === "critical").length > 0 && (
        <Alert className="mb-4 border-destructive bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            {alerts.filter((a) => a.severity === "critical").length} critical fleet alert(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {isEmpty && (
        <Alert className="mb-4">
          <AlertDescription>
            No vehicles registered yet. Add vehicles in <strong>Fleet & Drivers</strong> to populate this command center with live data.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="live">Live Tracking</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Fraud</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Analytics</TabsTrigger>
          <TabsTrigger value="predictive">Predictive AI</TabsTrigger>
          <TabsTrigger value="kpi">KPI Dashboard</TabsTrigger>
        </TabsList>

        {/* ─── LIVE TRACKING ─── */}
        <TabsContent value="live">
          <LiveTrackingPanel />
        </TabsContent>

        {/* ─── ALERTS & FRAUD ─── */}
        <TabsContent value="alerts">
          {alerts.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active alerts. Your fleet is operating within healthy thresholds.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border ${alertColors[alert.severity]}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "high" ? "text-orange-500" : "text-yellow-500"}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{alert.vehicle}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{alert.time}</span>
                            <Badge variant="outline" className="text-xs capitalize">{alert.severity}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.msg}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── FUEL ANALYTICS ─── */}
        <TabsContent value="fuel">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Fuel className="w-4 h-4" /> Fuel Status by Vehicle</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {vehicleStats.length === 0 && <p className="text-xs text-muted-foreground">No vehicles.</p>}
                {vehicleStats.map((v) => (
                  <div key={v.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono">{v.registration_number}</span>
                      <span className={(v.current_fuel_level ?? 0) < 25 ? "text-destructive font-medium" : ""}>{v.current_fuel_level ?? 0}%</span>
                    </div>
                    <Progress value={v.current_fuel_level ?? 0} className={`h-2 ${(v.current_fuel_level ?? 0) < 25 ? "[&>div]:bg-destructive" : ""}`} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Fuel Consumption vs Benchmark</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {vehicleStats.filter((v) => v.tripsMtd > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground">No trip data yet to compute variance.</p>
                )}
                {vehicleStats.filter((v) => v.tripsMtd > 0).slice(0, 8).map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-mono font-medium text-sm">{v.registration_number}</p>
                      <p className="text-xs text-muted-foreground">{v.truck_type || v.vehicle_type}</p>
                    </div>
                    <span className={`flex items-center gap-1 font-medium text-sm ${v.fuelVariance > 10 ? "text-destructive" : v.fuelVariance < 0 ? "text-green-500" : "text-yellow-500"}`}>
                      {v.fuelVariance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {v.fuelVariance > 0 ? "+" : ""}{v.fuelVariance}%
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">* Average fuel variance from expected per-route consumption.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── PREDICTIVE AI (live insights from current data) ─── */}
        <TabsContent value="predictive">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Delay Risk", icon: Clock,
                insights: vehicleStats
                  .filter((v) => v.tripsMtd > 0 && v.onTimePct < 80)
                  .slice(0, 4)
                  .map((v) => `${v.registration_number}: ${100 - v.onTimePct}% delay rate (${v.tripsMtd} trips)`),
              },
              {
                title: "Maintenance Risk", icon: AlertTriangle,
                insights: vehicleStats
                  .filter((v) => (v.health_score ?? 100) < 70)
                  .slice(0, 4)
                  .map((v) => `${v.registration_number}: health ${v.health_score}/100 - service review recommended`),
              },
              {
                title: "Fuel Efficiency", icon: Fuel,
                insights: vehicleStats
                  .filter((v) => v.fuelVariance > 10)
                  .slice(0, 4)
                  .map((v) => `${v.registration_number}: +${v.fuelVariance}% above benchmark`),
              },
              {
                title: "Revenue Performers", icon: Brain,
                insights: [...vehicleStats]
                  .sort((a, b) => b.revenueMtd - a.revenueMtd)
                  .slice(0, 4)
                  .filter((v) => v.revenueMtd > 0)
                  .map((v) => `${v.registration_number}: ${fmtCurrency(v.revenueMtd)} (30d)`),
              },
            ].map((section) => (
              <Card key={section.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <section.icon className="w-4 h-4 text-primary" />{section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.insights.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet.</p>
                  ) : (
                    section.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {insight}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── KPI DASHBOARD ─── */}
        <TabsContent value="kpi">
          {vehicleStats.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No vehicles to report on yet.</CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trips 30d</TableHead>
                  <TableHead>Revenue 30d</TableHead>
                  <TableHead>On-Time %</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Fuel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleStats.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.registration_number}</TableCell>
                    <TableCell className="text-sm">{v.driverName}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[v.status || "inactive"] || statusColors.inactive}`}>{(v.status || "unknown").replace("_", " ")}</span></TableCell>
                    <TableCell>{v.tripsMtd}</TableCell>
                    <TableCell>{fmtCurrency(v.revenueMtd)}</TableCell>
                    <TableCell>
                      {v.tripsMtd === 0 ? <span className="text-muted-foreground">-</span> : (
                        <span className={v.onTimePct < 80 ? "text-destructive" : "text-green-500"}>{v.onTimePct}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={v.health_score ?? 0} className="h-1.5 w-16" />
                        <span className="text-xs">{v.health_score ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={(v.current_fuel_level ?? 0) < 25 ? "text-destructive" : ""}>{v.current_fuel_level ?? 0}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
