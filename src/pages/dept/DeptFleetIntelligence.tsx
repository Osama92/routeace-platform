import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Clock,
  Fuel,
  Gauge,
  Shield,
  Target,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type VehicleRow = {
  id: string;
  registration_number: string;
  vehicle_type: string;
  truck_type: string | null;
  status: string | null;
  current_fuel_level: number | null;
  health_score: number | null;
  monthly_km: number | null;
};

type DispatchRow = {
  id: string;
  created_at: string;
  cost: number | null;
  distance_km: number | null;
  total_distance_km: number | null;
  total_drops: number | null;
  eta_met: boolean | null;
  sla_status: string | null;
  status: string | null;
};

type FuelLogRow = {
  id: string;
  total_cost: number | null;
  litres_dispensed: number;
  km_per_litre: number | null;
  is_flagged: boolean;
};

type ExceptionRow = {
  id: string;
  exception_type: string;
  severity: string;
  status: string;
  description: string;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fmtNumber = (n: number, suffix = "") =>
  `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0)}${suffix}`;

const statusLabel = (value: string | null | undefined) =>
  (value || "unknown").replace(/_/g, " ");

export default function DeptFleetIntelligence() {
  const { organizationId } = useAuth();
  const monthStart = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dept-fleet-intelligence", organizationId, monthStart],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) throw new Error("Missing organization scope");

      const [vehicles, dispatches, fuelLogs, exceptions] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id,registration_number,vehicle_type,truck_type,status,current_fuel_level,health_score,monthly_km")
          .eq("organization_id", organizationId)
          .limit(300),
        supabase
          .from("dispatches")
          .select("id,created_at,cost,distance_km,total_distance_km,total_drops,eta_met,sla_status,status")
          .eq("organization_id", organizationId)
          .gte("created_at", monthStart)
          .limit(1000),
        supabase
          .from("fuel_logs")
          .select("id,total_cost,litres_dispensed,km_per_litre,is_flagged")
          .eq("organization_id", organizationId)
          .gte("created_at", monthStart)
          .limit(1000),
        supabase
          .from("delivery_exceptions")
          .select("id,exception_type,severity,status,description")
          .eq("organization_id", organizationId)
          .neq("status", "resolved")
          .limit(200),
      ]);

      const firstError = vehicles.error || dispatches.error || fuelLogs.error || exceptions.error;
      if (firstError) throw firstError;

      return {
        vehicles: (vehicles.data || []) as VehicleRow[],
        dispatches: (dispatches.data || []) as DispatchRow[],
        fuelLogs: (fuelLogs.data || []) as FuelLogRow[],
        exceptions: (exceptions.data || []) as ExceptionRow[],
      };
    },
  });

  const metrics = useMemo(() => {
    const vehicles = data?.vehicles || [];
    const dispatches = data?.dispatches || [];
    const fuelLogs = data?.fuelLogs || [];
    const exceptions = data?.exceptions || [];

    const activeVehicles = vehicles.filter((v) => !["inactive", "maintenance", "retired"].includes((v.status || "").toLowerCase())).length;
    const totalDistance = dispatches.reduce((sum, d) => sum + Number(d.total_distance_km || d.distance_km || 0), 0);
    const deliveryCount = dispatches.reduce((sum, d) => sum + Math.max(1, Number(d.total_drops || 1)), 0);
    const totalCost = dispatches.reduce((sum, d) => sum + Number(d.cost || 0), 0);
    const onTimeCount = dispatches.filter((d) => d.eta_met === true || d.sla_status === "met" || d.status === "delivered").length;
    const healthScores = vehicles.map((v) => Number(v.health_score || 0)).filter(Boolean);
    const fuelLevels = vehicles.map((v) => Number(v.current_fuel_level || 0)).filter(Boolean);
    const fuelSpend = fuelLogs.reduce((sum, f) => sum + Number(f.total_cost || 0), 0);
    const flaggedFuel = fuelLogs.filter((f) => f.is_flagged).length;

    const byStatus = vehicles.reduce<Record<string, number>>((acc, v) => {
      const key = statusLabel(v.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalVehicles: vehicles.length,
      activeVehicles,
      dispatches: dispatches.length,
      deliveryCount,
      totalDistance,
      totalCost,
      costPerDelivery: deliveryCount ? totalCost / deliveryCount : 0,
      costPerKm: totalDistance ? totalCost / totalDistance : 0,
      onTimeRate: dispatches.length ? (onTimeCount / dispatches.length) * 100 : 0,
      avgHealth: healthScores.length ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length : 0,
      avgFuel: fuelLevels.length ? fuelLevels.reduce((a, b) => a + b, 0) / fuelLevels.length : 0,
      fuelSpend,
      flaggedFuel,
      openExceptions: exceptions.length,
      statusChart: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  const directives = [
    metrics.openExceptions > 0
      ? `${metrics.openExceptions} open delivery exception(s) require closure before the next SLA review.`
      : "No open delivery exceptions detected for this department.",
    metrics.costPerKm > 0
      ? `Current cost/km is ${fmtMoney(metrics.costPerKm)}. Use route consolidation where corridors exceed this baseline.`
      : "Add dispatch cost and distance records to activate cost/km recommendations.",
    metrics.avgFuel > 0 && metrics.avgFuel < 35
      ? "Average fuel level is below operating comfort. Prioritize refuel checks before dispatch release."
      : "Fuel posture is within operating range for currently active vehicles.",
  ];

  return (
    <DashboardLayout title="Fleet Cost Intelligence" subtitle="Department-scoped fleet health, SLA, fuel, and cost intelligence">
      {!organizationId && (
        <Alert className="mb-4 border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>No department scope found</AlertTitle>
          <AlertDescription>Ask an admin to attach your account to an organization before viewing fleet intelligence.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Fleet intelligence unavailable</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Unable to load department fleet intelligence."}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Fleet Size", value: metrics.totalVehicles, icon: Truck },
          { label: "Active Vehicles", value: metrics.activeVehicles, icon: Shield },
          { label: "Dispatches MTD", value: metrics.dispatches, icon: Target },
          { label: "Cost / Delivery", value: fmtMoney(metrics.costPerDelivery), icon: Gauge },
          { label: "Cost / KM", value: fmtMoney(metrics.costPerKm), icon: BarChart3 },
          { label: "Fuel Spend MTD", value: fmtMoney(metrics.fuelSpend), icon: Fuel },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <kpi.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{isLoading ? "-" : kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Department Directives</CardTitle>
              <CardDescription>Cost-center actions based only on your organization-scoped fleet records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {directives.map((directive) => (
                <div key={directive} className="p-4 rounded-lg border border-border/50 bg-muted/20 flex gap-3">
                  <Gauge className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-foreground">{directive}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fleet Status Mix</CardTitle>
              <CardDescription>Vehicle availability by current operating state</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metrics.statusChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vehicle Health Register</CardTitle>
              <CardDescription>Department vehicles only; no revenue, capital-allocation, or LC growth controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                    <TableHead className="text-right">Fuel</TableHead>
                    <TableHead className="text-right">Monthly KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.vehicles || []).slice(0, 12).map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono text-xs">{vehicle.registration_number}</TableCell>
                      <TableCell>{vehicle.truck_type || vehicle.vehicle_type}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{statusLabel(vehicle.status)}</Badge></TableCell>
                      <TableCell className="text-right">{fmtNumber(Number(vehicle.health_score || 0), "%")}</TableCell>
                      <TableCell className="text-right">{fmtNumber(Number(vehicle.current_fuel_level || 0), "%")}</TableCell>
                      <TableCell className="text-right">{fmtNumber(Number(vehicle.monthly_km || 0), " km")}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (data?.vehicles || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No department vehicles found for this organization.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> SLA Posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
                <p className="text-3xl font-bold text-primary">{fmtNumber(metrics.onTimeRate, "%")}</p>
                <p className="text-xs text-muted-foreground">On-time dispatch rate MTD</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div className="rounded-lg bg-muted/30 p-3"><p className="font-bold">{fmtNumber(metrics.totalDistance, " km")}</p><p className="text-xs text-muted-foreground">Distance</p></div>
                <div className="rounded-lg bg-muted/30 p-3"><p className="font-bold">{metrics.deliveryCount}</p><p className="text-xs text-muted-foreground">Drops</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Fuel className="w-4 h-4 text-primary" /> Fuel Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Average fuel level</span><span className="font-semibold">{fmtNumber(metrics.avgFuel, "%")}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, metrics.avgFuel))}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Flagged fuel logs</span><Badge variant={metrics.flaggedFuel ? "destructive" : "secondary"}>{metrics.flaggedFuel}</Badge></div>
            </CardContent>
          </Card>

          <Card className={metrics.openExceptions ? "border-warning/40" : undefined}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Exceptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.exceptions || []).slice(0, 5).map((exception) => (
                <div key={exception.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize">{statusLabel(exception.exception_type)}</p>
                    <Badge variant={exception.severity === "high" || exception.severity === "critical" ? "destructive" : "secondary"}>{exception.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exception.description}</p>
                </div>
              ))}
              {!isLoading && (data?.exceptions || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No open exceptions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}