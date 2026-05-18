import { useState } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Truck, AlertTriangle, CheckCircle2, Clock, Fuel, Route,
  Users, Target, Gauge, Zap, Navigation, ArrowUpRight, ArrowDownRight, Phone,
} from "lucide-react";
import { useLogisticsCommand } from "@/hooks/useLogisticsCommand";

const statusColor = (s: string) => {
  switch (s) {
    case "en_route": return "bg-blue-500 animate-pulse";
    case "completed": return "bg-emerald-500";
    case "loading": return "bg-orange-500";
    case "idle": return "bg-muted-foreground";
    case "maintenance": return "bg-destructive";
    default: return "bg-muted";
  }
};

const FMCGLogisticsCommand = () => {
  const [activeTab, setActiveTab] = useState("fleet");
  const {
    fleet, deliveryTracking, routePlans, loading,
    updateVehicleStatus, resolveDeliveryIssue, kpis, delayedDeliveries,
  } = useLogisticsCommand();

  const fleetKPIs = [
    { label: "Total Fleet", value: String(kpis.totalFleet), icon: Truck, color: "text-primary" },
    { label: "Active Now", value: String(kpis.activeCount), icon: Navigation, color: "text-emerald-600" },
    { label: "In Maintenance", value: String(kpis.maintenanceCount), icon: Gauge, color: "text-orange-600" },
    { label: "Avg Fuel", value: `${kpis.avgFuelLevel}%`, icon: Fuel, color: "text-blue-600" },
  ];

  return (
    <FMCGLayout title="Logistics Command Center" subtitle="Fleet oversight, delivery performance & exception control">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fleetKPIs.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-6 flex items-center gap-3">
              <k.icon className={`w-7 h-7 ${k.color}`} />
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="fleet">Fleet Overview</TabsTrigger>
          <TabsTrigger value="delivery">Deliveries ({kpis.totalDeliveries})</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions {kpis.delayedCount > 0 && <Badge variant="destructive" className="ml-1 text-xs">{kpis.delayedCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="routes">Routes ({routePlans.length})</TabsTrigger>
        </TabsList>

        {/* FLEET */}
        <TabsContent value="fleet">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Live Fleet Tracker</CardTitle></CardHeader>
            <CardContent>
              {fleet.length > 0 ? fleet.map(v => (
                <div key={v.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className={`w-3 h-3 rounded-full ${statusColor(v.current_status || "idle")}`} />
                  <div className="w-28">
                    <p className="font-mono text-sm font-medium">{v.vehicle_plate}</p>
                    <p className="text-xs text-muted-foreground">{v.vehicle_type || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{v.driver_name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{v.assigned_route || "No route"}</p>
                  </div>
                  <div className="w-20 text-center">
                    <p className="text-sm font-medium">{v.total_deliveries_today || 0}</p>
                    <p className="text-xs text-muted-foreground">drops</p>
                  </div>
                  <div className="w-24">
                    <div className="flex justify-between text-xs mb-1"><Fuel className="w-3 h-3" /><span>{v.fuel_level_pct || 0}%</span></div>
                    <Progress value={v.fuel_level_pct || 0} className="h-1.5" />
                  </div>
                  <Badge variant={v.current_status === "en_route" ? "secondary" : v.current_status === "completed" ? "default" : v.current_status === "maintenance" ? "destructive" : "outline"}>
                    {(v.current_status || "idle").replace("_", " ")}
                  </Badge>
                  <div className="flex gap-1">
                    {v.current_status === "idle" && <Button size="sm" variant="outline" onClick={() => updateVehicleStatus(v.id, "en_route")}>Dispatch</Button>}
                    {v.current_status === "en_route" && <Button size="sm" variant="outline" onClick={() => updateVehicleStatus(v.id, "completed")}>Complete</Button>}
                  </div>
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No fleet vehicles registered</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DELIVERIES */}
        <TabsContent value="delivery">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Tracked", value: String(kpis.totalDeliveries), icon: Target },
              { label: "Delivered", value: String(kpis.completedDeliveries), icon: CheckCircle2 },
              { label: "Delayed", value: String(kpis.delayedCount), icon: Clock },
              { label: "In Transit", value: String(deliveryTracking.filter(d => d.stage === "in_transit").length), icon: Truck },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-6 flex items-center gap-3">
                  <m.icon className="w-6 h-6 text-primary" />
                  <div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-xl font-bold">{m.value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Delivery Pipeline</CardTitle></CardHeader>
            <CardContent>
              {deliveryTracking.length > 0 ? deliveryTracking.slice(0, 15).map(d => (
                <div key={d.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{d.outlet_name || d.order_reference}</p>
                    <p className="text-xs text-muted-foreground">{d.driver_name || "-"} · {d.vehicle_plate || "-"}</p>
                  </div>
                  <Badge variant={d.stage === "delivered" ? "default" : d.stage === "in_transit" ? "secondary" : "outline"}>{d.stage}</Badge>
                  {d.stage !== "delivered" && (
                    <Button size="sm" variant="outline" onClick={() => resolveDeliveryIssue(d.id, "delivered")}>Mark Delivered</Button>
                  )}
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No delivery tracking data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXCEPTIONS */}
        <TabsContent value="exceptions">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Active Exceptions</CardTitle></CardHeader>
            <CardContent>
              {delayedDeliveries.length > 0 ? delayedDeliveries.map(e => (
                <div key={e.id} className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/10 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Delayed</Badge>
                      <span className="font-medium text-sm">{e.outlet_name || e.order_reference}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleString() : "-"}</span>
                  </div>
                  <p className="text-sm">Risk score: {e.delay_risk_score} · Driver: {e.driver_name || "-"} · Stage: {e.stage}</p>
                  {e.delay_reason && <p className="text-xs text-muted-foreground mt-1">Reason: {e.delay_reason}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Contact Driver</Button>
                    <Button size="sm" onClick={() => resolveDeliveryIssue(e.id, "delivered")}>Resolve</Button>
                  </div>
                </div>
              )) : (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-medium">No active exceptions - all deliveries on track</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROUTES */}
        <TabsContent value="routes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Route className="w-5 h-5" /> Route Plans</CardTitle></CardHeader>
              <CardContent>
                {routePlans.length > 0 ? routePlans.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{r.route_name}</p>
                      <p className="text-xs text-muted-foreground">{r.route_date || "-"} · {(r.planned_outlets || []).length} outlets · {r.planned_distance_km || "-"} km</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.optimization_score && <Badge variant={r.optimization_score > 80 ? "default" : "secondary"}>Score: {r.optimization_score}</Badge>}
                      <Badge variant={r.status === "active" ? "default" : r.status === "completed" ? "secondary" : "outline"}>{r.status || "planned"}</Badge>
                    </div>
                  </div>
                )) : <p className="text-center text-muted-foreground py-8">No route plans created yet</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> AI Route Optimizer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm">Route optimization analyzes {kpis.totalFleet} vehicles and {kpis.totalDeliveries} deliveries to suggest fuel and time savings.</p>
                  <Button size="sm" className="mt-3" disabled={fleet.length === 0}>Run Optimization</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Daily Fuel Cost", value: `₦${Math.round(fleet.reduce((s, f) => s + (f.total_km_today || 0) * 150, 0)).toLocaleString()}` },
                    { label: "Avg per Vehicle", value: fleet.length ? `₦${Math.round(fleet.reduce((s, f) => s + (f.total_km_today || 0) * 150, 0) / fleet.length).toLocaleString()}` : "-" },
                    { label: "Total KM Today", value: `${fleet.reduce((s, f) => s + (f.total_km_today || 0), 0)} km` },
                    { label: "Avg Fuel Level", value: `${kpis.avgFuelLevel}%` },
                  ].map(f => (
                    <div key={f.label} className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{f.value}</p>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGLogisticsCommand;
