import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Thermometer, Gauge, Fuel, AlertTriangle, Activity, Truck, Battery } from "lucide-react";

const sensorIcons: Record<string, any> = {
  engine_temp: Thermometer, brake_wear: Activity, tire_pressure: Gauge,
  fuel_level: Fuel, battery_health: Battery, speed: Gauge, gps: Radio,
  load_weight: Truck, odometer: Activity, coolant_temp: Thermometer,
};

const severityColors: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function IoTTelemetry() {
  const { data: readings = [] } = useQuery({
    queryKey: ["sensor-readings"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicle_sensor_readings").select("*").order("recorded_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["sensor-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("sensor_alerts").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: thresholds = [] } = useQuery({
    queryKey: ["sensor-thresholds"],
    queryFn: async () => {
      const { data } = await supabase.from("sensor_thresholds").select("*").order("sensor_type");
      return data || [];
    },
  });

  const anomalyCount = readings.filter((r: any) => r.is_anomaly).length;
  const activeAlerts = alerts.filter((a: any) => !a.resolved_at).length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical" && !a.resolved_at).length;

  return (
    <DashboardLayout title="IoT & Sensor Telemetry">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radio className="h-6 w-6 text-primary" /> IoT & Sensor Telemetry</h1>
          <p className="text-muted-foreground">Real-time vehicle sensor monitoring, anomaly detection, and predictive alerts</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Activity className="h-5 w-5 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold">{readings.length}</p>
            <p className="text-xs text-muted-foreground">Recent Readings</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold">{anomalyCount}</p>
            <p className="text-xs text-muted-foreground">Anomalies</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Gauge className="h-5 w-5 mx-auto text-orange-400 mb-1" />
            <p className="text-2xl font-bold">{activeAlerts}</p>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{criticalAlerts}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="readings">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="readings">Readings</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          </TabsList>

          <TabsContent value="readings" className="space-y-2 mt-4">
            {readings.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No sensor readings yet. Connect IoT devices to start streaming data.</CardContent></Card>
            ) : readings.map((r: any) => {
              const Icon = sensorIcons[r.sensor_type] || Activity;
              return (
                <Card key={r.id}>
                  <CardContent className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{r.sensor_type?.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">Vehicle: {r.vehicle_id?.slice(0, 8)} • {new Date(r.recorded_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{r.value} {r.unit}</span>
                      {r.is_anomaly && <Badge variant="destructive">Anomaly</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-2 mt-4">
            {alerts.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No sensor alerts yet.</CardContent></Card>
            ) : alerts.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{a.alert_type?.replace(/_/g, " ")}</p>
                        <Badge className={severityColors[a.severity] || ""}>{a.severity}</Badge>
                      </div>
                      <p className="text-sm mt-1">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.sensor_type} • Value: {a.value_recorded} (threshold: {a.threshold_value})
                      </p>
                    </div>
                    {a.resolved_at ? <Badge variant="outline">Resolved</Badge> : <Badge variant="destructive">Active</Badge>}
                  </div>
                  {a.auto_action_taken && <p className="text-xs text-primary mt-1">Auto-action: {a.auto_action_taken}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-2 mt-4">
            {thresholds.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No thresholds configured. Set up alert thresholds for automated monitoring.</CardContent></Card>
            ) : thresholds.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.sensor_type?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Safe: {t.min_safe_value}–{t.max_safe_value} {t.unit} | Critical: {t.critical_min}–{t.critical_max}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.auto_action}</Badge>
                    {t.is_active ? <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
