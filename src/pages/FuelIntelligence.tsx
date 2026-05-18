import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import DashboardExportButton from "@/components/shared/DashboardExportButton";
import {
  Fuel, AlertTriangle, TrendingDown, TrendingUp, Shield, Users, Truck,
  Eye, CheckCircle, XCircle, Clock, Gauge, Brain,
} from "lucide-react";
import FuelInvestigateDialog from "@/components/fuel/FuelInvestigateDialog";

function riskColor(level: string) {
  if (level === "high_risk" || level === "critical") return "text-red-500";
  if (level === "suspicious" || level === "inefficient" || level === "high" || level === "medium") return "text-yellow-500";
  return "text-green-500";
}

function riskBadge(level: string) {
  if (level === "high_risk" || level === "critical") return <Badge variant="destructive" className="text-xs">{level.replace("_", " ").toUpperCase()}</Badge>;
  if (level === "suspicious" || level === "inefficient" || level === "high" || level === "medium") return <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">{level.replace("_", " ").toUpperCase()}</Badge>;
  return <Badge className="bg-green-500/20 text-green-700 text-xs">{level.toUpperCase()}</Badge>;
}

import { resolveKmpl, DEFAULT_KMPL } from "@/lib/fuel/vehicleKmpl";

export default function FuelIntelligence() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("command");
  const [investigateOpen, setInvestigateOpen] = useState(false);
  const [investigateTarget, setInvestigateTarget] = useState<{ driverId?: string; vehicleId?: string }>({});

  const { data: orgId } = useQuery({
    queryKey: ["fi-org", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("organization_members")
        .select("organization_id").eq("user_id", user!.id).eq("is_active", true).limit(1).maybeSingle();
      return (data as any)?.organization_id ?? null;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["fi-fuel-logs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase.from("fuel_logs")
        .select("id, vehicle_id, driver_id, litres_dispensed, total_cost, km_since_last_fill, km_per_litre, is_flagged, flag_reason, log_date, fuel_station")
        .eq("organization_id", orgId).gte("log_date", since.toISOString().slice(0, 10))
        .order("log_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["fi-vehicles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, registration_number, vehicle_type").eq("organization_id", orgId);
      return data ?? [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["fi-drivers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, full_name").eq("organization_id", orgId);
      return data ?? [];
    },
  });

  const vMap = useMemo(() => Object.fromEntries(vehicles.map((v: any) => [v.id, v.registration_number])), [vehicles]);
  const vKmplMap = useMemo(() => Object.fromEntries(
    (vehicles as any[]).map(v => [v.id, resolveKmpl(v.vehicle_type)])
  ), [vehicles]);
  const dMap = useMemo(() => Object.fromEntries(drivers.map((d: any) => [d.id, d.full_name])), [drivers]);

  const summary = useMemo(() => {
    const total_litres = logs.reduce((s: number, l: any) => s + Number(l.litres_dispensed || 0), 0);
    const total_fuel_spend = logs.reduce((s: number, l: any) => s + Number(l.total_cost || 0), 0);
    const total_km = logs.reduce((s: number, l: any) => s + Number(l.km_since_last_fill || 0), 0);
    const expected_litres = (logs as any[]).reduce((sum: number, l: any) => {
      const km = Number(l.km_since_last_fill || 0);
      if (km <= 0) return sum;
      const kmpl = vKmplMap[l.vehicle_id] ?? DEFAULT_KMPL;
      return sum + (km / kmpl);
    }, 0);
    const estimated_loss_litres = Math.max(0, total_litres - expected_litres);
    const avg_cost_per_litre = total_litres > 0 ? total_fuel_spend / total_litres : 0;
    const estimated_loss_cost = estimated_loss_litres * avg_cost_per_litre;
    const flagged = logs.filter((l: any) => l.is_flagged);
    const efficiency_score = total_litres > 0 && expected_litres > 0
      ? Math.max(0, Math.min(100, Math.round((expected_litres / total_litres) * 100)))
      : 0;
    return {
      total_fuel_spend, total_litres: Math.round(total_litres),
      estimated_loss_litres: Math.round(estimated_loss_litres),
      estimated_loss_cost: Math.round(estimated_loss_cost),
      efficiency_score,
      active_fraud_flags: flagged.length,
      high_risk_trips: (logs as any[]).filter(l => {
        const kmpl = vKmplMap[l.vehicle_id] ?? DEFAULT_KMPL;
        return Number(l.km_per_litre || kmpl) < kmpl * 0.7;
      }).length,
      total_trips_analyzed: logs.length,
    };
  }, [logs, vKmplMap]);

  const vehicleRows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; litres: number; km: number }>();
    for (const l of logs as any[]) {
      if (!l.vehicle_id) continue;
      const cur = map.get(l.vehicle_id) ?? { id: l.vehicle_id, name: vMap[l.vehicle_id] ?? "-", litres: 0, km: 0 };
      cur.litres += Number(l.litres_dispensed || 0);
      cur.km += Number(l.km_since_last_fill || 0);
      map.set(l.vehicle_id, cur);
    }
    return Array.from(map.values()).map(v => {
      const kmpl = vKmplMap[v.id] ?? DEFAULT_KMPL;
      const expected = v.km > 0 ? v.km / kmpl : 0;
      const variance = expected > 0 ? ((v.litres - expected) / expected) * 100 : 0;
      const score = Math.max(0, Math.min(100, Math.round(100 - variance)));
      const status = variance > 25 ? "high_risk" : variance > 10 ? "inefficient" : "normal";
      return { id: v.id, name: v.name, expected: Math.round(expected), actual: Math.round(v.litres), variance, score, status };
    }).sort((a, b) => b.variance - a.variance);
  }, [logs, vMap]);

  const driverRows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; litres: number; km: number; trips: number; flags: number }>();
    for (const l of logs as any[]) {
      if (!l.driver_id) continue;
      const cur = map.get(l.driver_id) ?? { id: l.driver_id, name: dMap[l.driver_id] ?? "-", litres: 0, km: 0, trips: 0, flags: 0 };
      cur.litres += Number(l.litres_dispensed || 0);
      cur.km += Number(l.km_since_last_fill || 0);
      cur.trips += 1;
      if (l.is_flagged) cur.flags += 1;
      map.set(l.driver_id, cur);
    }
    return Array.from(map.values()).map(d => {
      const driverLogs = (logs as any[]).filter(l => l.driver_id === d.id);
      const avgKmpl = driverLogs.length > 0
        ? driverLogs.reduce((sum: number, l: any) => sum + (vKmplMap[l.vehicle_id] ?? DEFAULT_KMPL), 0) / driverLogs.length
        : DEFAULT_KMPL;
      const expected = d.km > 0 ? d.km / avgKmpl : 0;
      const variance = expected > 0 ? Math.round(((d.litres - expected) / expected) * 100) : 0;
      const score = Math.max(0, Math.min(100, variance + d.flags * 10));
      const risk = score >= 50 ? "high_risk" : score >= 25 ? "suspicious" : "normal";
      return { id: d.id, name: d.name, score, risk, variance, trips: d.trips, flags: d.flags };
    }).sort((a, b) => b.score - a.score);
  }, [logs, dMap, vKmplMap]);

  const fraudRows = useMemo(() =>
    (logs as any[]).filter(l => l.is_flagged).map(l => ({
      id: l.id,
      type: l.flag_reason || "anomaly",
      driver: dMap[l.driver_id] ?? "-",
      vehicle: vMap[l.vehicle_id] ?? "-",
      severity: (() => { const k = vKmplMap[l.vehicle_id] ?? DEFAULT_KMPL; return Number(l.km_per_litre || k) < k * 0.5 ? "critical" : "high"; })(),
      date: l.log_date,
      location: l.fuel_station || "-",
      driverId: l.driver_id, vehicleId: l.vehicle_id,
    })), [logs, dMap, vMap]);

  const aiInsights = useMemo(() => {
    const out: { severity: string; message: string; module: string }[] = [];
    if (summary.estimated_loss_litres > 0) {
      out.push({ severity: summary.estimated_loss_litres > 200 ? "critical" : "high",
        message: `Estimated ${summary.estimated_loss_litres}L (~₦${(summary.estimated_loss_cost / 1000).toFixed(0)}K) consumption above vehicle-type efficiency baseline over last 30 days`, module: "Fleet" });
    }
    const worstDriver = driverRows[0];
    if (worstDriver && worstDriver.score >= 50) {
      out.push({ severity: "high", message: `Driver ${worstDriver.name} flagged - ${worstDriver.flags} fraud flag(s), ${worstDriver.variance}% variance`, module: "Driver" });
    }
    const worstVehicle = vehicleRows[0];
    if (worstVehicle && worstVehicle.variance > 20) {
      out.push({ severity: "medium", message: `Vehicle ${worstVehicle.name} showing +${worstVehicle.variance.toFixed(1)}% variance vs expected`, module: "Fleet" });
    }
    if (out.length === 0) out.push({ severity: "info", message: "No fuel anomalies detected in the last 30 days.", module: "Trend" });
    return out;
  }, [summary, driverRows, vehicleRows]);

  const getExportData = () => ({
    title: "Fuel Intelligence Report",
    subtitle: "RouteAce Fuel Command Center",
    filename: "fuel-intelligence-report",
    columns: [{ key: "metric", label: "Metric" }, { key: "value", label: "Value" }],
    data: [
      { metric: "Total Fuel Spend", value: `₦${summary.total_fuel_spend.toLocaleString()}` },
      { metric: "Total Litres", value: summary.total_litres.toLocaleString() },
      { metric: "Estimated Loss", value: `₦${summary.estimated_loss_cost.toLocaleString()}` },
      { metric: "Efficiency Score", value: `${summary.efficiency_score}%` },
      { metric: "Active Fraud Flags", value: summary.active_fraud_flags },
      { metric: "High Risk Trips", value: summary.high_risk_trips },
    ],
  });

  return (
    <DashboardLayout title="Fuel Intelligence Command Center">
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-7 w-7 text-orange-500" />
            Fuel Intelligence Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time fuel loss detection, driver accountability & cost recovery - last 30 days</p>
        </div>
        <DashboardExportButton getExportData={getExportData} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">TOTAL FUEL SPEND</p>
              <p className="text-2xl font-bold">₦{(summary.total_fuel_spend / 1_000_000).toFixed(2)}M</p>
              <p className="text-xs text-muted-foreground">{summary.total_litres.toLocaleString()} litres</p>
            </div>
            <Fuel className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">FUEL LOSS ESTIMATE</p>
              <p className="text-2xl font-bold text-red-500">₦{(summary.estimated_loss_cost / 1000).toFixed(0)}K</p>
              <p className="text-xs text-red-400">{summary.estimated_loss_litres}L over baseline</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">ACTIVE ALERTS</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.active_fraud_flags}</p>
              <p className="text-xs text-muted-foreground">{summary.high_risk_trips} high-risk fills</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">EFFICIENCY SCORE</p>
              <p className="text-2xl font-bold">{summary.efficiency_score}/100</p>
              <Progress value={summary.efficiency_score} className="mt-2 h-2" />
            </div>
            <Gauge className="h-8 w-8 text-green-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />AI Insight Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {aiInsights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`mt-0.5 ${riskColor(insight.severity)}`}>
                {insight.severity === "critical" ? <XCircle className="h-4 w-4" /> :
                 insight.severity === "high" ? <AlertTriangle className="h-4 w-4" /> :
                 insight.severity === "medium" ? <Clock className="h-4 w-4" /> :
                 <TrendingUp className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm">{insight.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{insight.module} Module</p>
              </div>
              {riskBadge(insight.severity)}
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="command">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="cost">Cost Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="command">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-5 w-5" />Vehicle Efficiency Monitor</CardTitle>
              <CardDescription>Expected vs actual fuel per vehicle - baseline per vehicle type (trailer 2.22 km/L, truck 2.78 km/L, van 6.67 km/L, bike 50 km/L)</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleRows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No fuel logs yet.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Expected (L)</TableHead>
                    <TableHead className="text-right">Actual (L)</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleRows.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-right">{v.expected}</TableCell>
                      <TableCell className="text-right">{v.actual}</TableCell>
                      <TableCell className={`text-right font-semibold ${v.variance > 20 ? "text-red-500" : v.variance > 10 ? "text-yellow-500" : "text-green-500"}`}>
                        {v.variance >= 0 ? "+" : ""}{v.variance.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">{v.score}</TableCell>
                      <TableCell>{riskBadge(v.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" />Driver Fuel Behavior Leaderboard</CardTitle>
              <CardDescription>Higher score = more risk</CardDescription>
            </CardHeader>
            <CardContent>
              {driverRows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No driver fuel data yet.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Flags</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverRows.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">#{i + 1}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell className={`text-right font-bold ${riskColor(d.risk)}`}>{d.score}</TableCell>
                      <TableCell className="text-right">{d.variance >= 0 ? "+" : ""}{d.variance}%</TableCell>
                      <TableCell className="text-right">{d.trips}</TableCell>
                      <TableCell className="text-right">{d.flags > 0 ? <span className="text-red-500 font-semibold">{d.flags}</span> : "0"}</TableCell>
                      <TableCell>{riskBadge(d.risk)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-red-500" />Fuel Fraud Detection</CardTitle>
              <CardDescription>Flagged fuel logs requiring investigation</CardDescription>
            </CardHeader>
            <CardContent>
              {fraudRows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No flagged fuel logs.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudRows.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium capitalize">{f.type}</TableCell>
                      <TableCell>{f.driver}</TableCell>
                      <TableCell>{f.vehicle}</TableCell>
                      <TableCell>{f.location}</TableCell>
                      <TableCell className="text-muted-foreground">{f.date}</TableCell>
                      <TableCell>{riskBadge(f.severity)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setInvestigateTarget({ driverId: f.driverId, vehicleId: f.vehicleId }); setInvestigateOpen(true); }}>
                          <Eye className="h-3 w-3 mr-1" /> Investigate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const maxAmount = Math.max(
                    summary.total_fuel_spend,
                    summary.estimated_loss_cost,
                    Math.round(summary.estimated_loss_cost * 0.7),
                    1
                  );
                  return [
                    { label: "Fuel Purchases", amount: summary.total_fuel_spend, pct: Math.round((summary.total_fuel_spend / maxAmount) * 100) },
                    { label: "Estimated Waste", amount: summary.estimated_loss_cost, pct: Math.round((summary.estimated_loss_cost / maxAmount) * 100) },
                    { label: "Recoverable Savings", amount: Math.round(summary.estimated_loss_cost * 0.7), pct: Math.round((summary.estimated_loss_cost * 0.7 / maxAmount) * 100) },
                  ];
                })().map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-semibold">₦{(item.amount / 1000).toFixed(0)}K</span>
                    </div>
                    <Progress value={item.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader><CardTitle className="text-base text-green-700">💰 Recoverable Cost Opportunity</CardTitle></CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">₦{(Math.round(summary.estimated_loss_cost * 0.7) / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground mt-2">Estimated 30-day savings from fuel optimization, fraud prevention and driver coaching.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    <FuelInvestigateDialog
      open={investigateOpen}
      onOpenChange={setInvestigateOpen}
      driverId={investigateTarget.driverId}
      vehicleId={investigateTarget.vehicleId}
    />
    </DashboardLayout>
  );
}
