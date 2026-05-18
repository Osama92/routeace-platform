import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Route, Package, Clock, Fuel, AlertTriangle, Wrench,
  Activity, DollarSign, Shield, Leaf, Users, Gauge, Timer,
  CheckCircle2, XCircle, TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";
import { useFleetKPIs } from "@/hooks/useFleetKPIs";
import { useLogisticsCommand } from "@/hooks/useLogisticsCommand";
import { Skeleton } from "@/components/ui/skeleton";

const mttrColor = (rating: string) => {
  if (rating === "world_class") return "text-emerald-600";
  if (rating === "average") return "text-yellow-600";
  return "text-destructive";
};

const mttrLabel = (rating: string) => {
  if (rating === "world_class") return "World-Class (<2h)";
  if (rating === "average") return "Average (2-8h)";
  return "Needs Improvement (>8h)";
};

const downtimeColor = (health: string) => {
  if (health === "good") return "text-emerald-600";
  if (health === "warning") return "text-yellow-600";
  return "text-destructive";
};

const KPICard = ({ label, value, sub, icon: Icon, color = "text-primary" }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string;
}) => (
  <Card>
    <CardContent className="pt-5 pb-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <BarChart3 className="w-12 h-12 text-muted-foreground/40 mb-3" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground mt-1">Data will appear here once fleet operations begin.</p>
  </div>
);

const LogisticsCoordinatorDashboard = () => {
  const { kpis, loading: kpiLoading } = useFleetKPIs();
  const {
    fleet, deliveryTracking, routePlans, loading: logLoading,
    kpis: logKpis, activeVehicles, delayedDeliveries,
  } = useLogisticsCommand();

  const loading = kpiLoading || logLoading;
  const hasFleet = (kpis?.totalFleet ?? 0) > 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasFleet) {
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard label="Total Fleet" value="0" icon={Truck} />
          <KPICard label="MTTR" value="-" sub="No data" icon={Timer} />
          <KPICard label="Availability" value="-" sub="No vehicles" icon={Activity} />
          <KPICard label="On-Time Rate" value="-" sub="No deliveries" icon={Clock} />
        </div>
        <EmptyState message="No fleet vehicles configured yet. Add vehicles to start tracking KPIs." />
        <FMCGAIInsightPanel role="logistics" />
      </>
    );
  }

  const k = kpis!;

  return (
    <>
      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Fleet Availability"
          value={`${k.daysAvailableThisMonth}/${k.daysInMonth}d`}
          sub={k.downtimeHealth === "good" ? "✅ Healthy (≥24 days)" : k.downtimeHealth === "warning" ? "⚠️ Below target" : "🔴 Critical downtime"}
          icon={Activity}
          color={downtimeColor(k.downtimeHealth)}
        />
        <KPICard
          label="MTTR"
          value={k.mttrHours > 0 ? `${k.mttrHours}h` : "-"}
          sub={k.mttrHours > 0 ? mttrLabel(k.mttrRating) : "No repairs yet"}
          icon={Timer}
          color={mttrColor(k.mttrRating)}
        />
        <KPICard
          label="Utilization Rate"
          value={`${k.utilizationRate}%`}
          sub={k.utilizationRate >= 70 ? "On target (≥70%)" : "Below target"}
          icon={Gauge}
          color={k.utilizationRate >= 70 ? "text-emerald-600" : "text-yellow-600"}
        />
        <KPICard
          label="On-Time Delivery"
          value={k.onTimeDeliveryPct > 0 ? `${k.onTimeDeliveryPct}%` : "-"}
          sub={k.onTimeDeliveryPct > 0 ? `${k.firstAttemptPct}% first attempt` : "No data yet"}
          icon={CheckCircle2}
          color={k.onTimeDeliveryPct >= 90 ? "text-emerald-600" : "text-yellow-600"}
        />
      </div>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & TTR</TabsTrigger>
          <TabsTrigger value="costs">Cost Management</TabsTrigger>
          <TabsTrigger value="drivers">Drivers & Safety</TabsTrigger>
          <TabsTrigger value="sustainability">Compliance</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total Fleet" value={k.totalFleet} icon={Truck} />
            <KPICard label="Active Now" value={logKpis.activeCount} sub={`${logKpis.idleCount} idle`} icon={Route} color="text-emerald-600" />
            <KPICard label="In Maintenance" value={k.vehiclesDown} icon={Wrench} color={k.vehiclesDown > 0 ? "text-destructive" : "text-emerald-600"} />
            <KPICard label="Avg Fuel" value={`${k.avgFuelLevel}%`} icon={Fuel} color={k.avgFuelLevel < 30 ? "text-destructive" : "text-emerald-600"} />
          </div>

          {/* Fleet Alerts */}
          {(delayedDeliveries.length > 0 || k.vehiclesDown > 0) && (
            <Card className="mb-6 border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Fleet Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {k.vehiclesDown > 0 && (
                    <div className="flex items-start gap-3 py-2 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full mt-2 bg-destructive" />
                      <p className="text-sm">{k.vehiclesDown} vehicle(s) currently in maintenance</p>
                    </div>
                  )}
                  {delayedDeliveries.slice(0, 3).map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full mt-2 bg-yellow-500" />
                      <p className="text-sm">Delivery {d.tracking_number || d.id?.slice(0, 8)} - delay risk score: {d.delay_risk_score}%</p>
                    </div>
                  ))}
                  {k.avgFuelLevel < 30 && (
                    <div className="flex items-start gap-3 py-2 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full mt-2 bg-yellow-500" />
                      <p className="text-sm">Average fleet fuel level low - {k.avgFuelLevel}%</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <FMCGAIInsightPanel role="logistics" />

          {/* Active Routes from real data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Route className="w-5 h-5" /> Active Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              {fleet.length === 0 ? (
                <EmptyState message="No fleet vehicles found." />
              ) : (
                <div className="space-y-3">
                  {fleet.slice(0, 8).map((v: any) => (
                    <div key={v.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-sm">{v.vehicle_plate}</span>
                          <p className="text-xs text-muted-foreground">{v.driver_name || "Unassigned"} · {v.assigned_route || "No route"}</p>
                        </div>
                        <Badge variant={v.current_status === "en_route" ? "default" : v.current_status === "maintenance" ? "destructive" : "outline"}>
                          {v.current_status || "unknown"}
                        </Badge>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Deliveries today: {v.total_deliveries_today || 0}</p>
                          <Progress value={Math.min((v.total_deliveries_today || 0) * 10, 100)} className="h-1.5" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Fuel className="w-3 h-3" /> {v.fuel_level_pct || 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === MAINTENANCE & TTR TAB === */}
        <TabsContent value="maintenance">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="MTTR (Mean Time to Repair)"
              value={k.mttrHours > 0 ? `${k.mttrHours}h` : "-"}
              sub={k.mttrHours > 0 ? mttrLabel(k.mttrRating) : "No completed repairs"}
              icon={Timer}
              color={mttrColor(k.mttrRating)}
            />
            <KPICard
              label="MTBF (Mean Time Between Failures)"
              value={k.mtbfHours > 0 ? `${k.mtbfHours}h` : "-"}
              sub="Avg hours between breakdowns"
              icon={TrendingUp}
              color="text-primary"
            />
            <KPICard
              label="Repairs Within 48h"
              value={k.repairsWithin48hPct > 0 ? `${k.repairsWithin48hPct}%` : "-"}
              sub={`Target: ≥90% | Completed: ${k.totalRepairsCompleted}`}
              icon={CheckCircle2}
              color={k.repairsWithin48hPct >= 90 ? "text-emerald-600" : "text-yellow-600"}
            />
            <KPICard
              label="Repeat Repair Rate"
              value={`${k.repeatRepairPct}%`}
              sub={`Target: <3% | ${k.repeatRepairPct <= 3 ? "✅ On target" : "⚠️ Above target"}`}
              icon={k.repeatRepairPct <= 3 ? CheckCircle2 : XCircle}
              color={k.repeatRepairPct <= 3 ? "text-emerald-600" : "text-destructive"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <KPICard
              label="PM Compliance"
              value={k.pmCompliancePct > 0 ? `${k.pmCompliancePct}%` : "-"}
              sub="Preventive maintenance completed on schedule"
              icon={Wrench}
              color={k.pmCompliancePct >= 80 ? "text-emerald-600" : "text-yellow-600"}
            />
            <KPICard
              label="Scheduled vs Unscheduled Ratio"
              value={k.scheduledVsUnscheduledRatio > 0 ? `${k.scheduledVsUnscheduledRatio}:1` : "-"}
              sub="Higher is better (more planned maintenance)"
              icon={BarChart3}
              color="text-primary"
            />
          </div>

          {/* Downtime health */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" /> Fleet Downtime KPI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Avg Days Available This Month</span>
                    <span className={`text-sm font-bold ${downtimeColor(k.downtimeHealth)}`}>
                      {k.daysAvailableThisMonth} / {k.daysInMonth} days
                    </span>
                  </div>
                  <Progress
                    value={(k.daysAvailableThisMonth / k.daysInMonth) * 100}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {k.downtimeHealth === "good"
                      ? "✅ Fleet availability is healthy (≥24 days/month target met)"
                      : k.downtimeHealth === "warning"
                        ? "⚠️ Below 24-day threshold - review maintenance schedules"
                        : "🔴 Critical: Fleet availability severely impacted. Immediate action required."}
                  </p>
                </div>
              </div>

              {k.totalDowntimeHours > 0 && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{k.totalDowntimeHours}h</p>
                    <p className="text-xs text-muted-foreground">Total Downtime</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{k.uptimePct}%</p>
                    <p className="text-xs text-muted-foreground">Uptime Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{k.vehiclesDown}</p>
                    <p className="text-xs text-muted-foreground">Currently Down</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Maintenance Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Maintenance Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {k.maintenanceOrders.length === 0 ? (
                <EmptyState message="No maintenance orders yet." />
              ) : (
                <div className="space-y-2">
                  {k.maintenanceOrders.slice(0, 6).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{m.vehicle_plate}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.order_type} · {m.assigned_technician || "Unassigned"}
                          {m.repair_hours != null && ` · ${m.repair_hours.toFixed(1)}h repair`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.total_cost > 0 && (
                          <span className="text-xs text-muted-foreground">₦{m.total_cost.toLocaleString()}</span>
                        )}
                        <Badge variant={
                          m.status === "completed" ? "default" :
                            m.status === "in_progress" ? "secondary" :
                              m.status === "waiting_parts" ? "outline" : "destructive"
                        }>
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === COST MANAGEMENT TAB === */}
        <TabsContent value="costs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="Total Maintenance Cost"
              value={k.totalMaintenanceCost > 0 ? `₦${k.totalMaintenanceCost.toLocaleString()}` : "₦0"}
              sub="This period"
              icon={DollarSign}
              color="text-primary"
            />
            <KPICard
              label="Cost per Vehicle"
              value={k.avgCostPerVehicle > 0 ? `₦${k.avgCostPerVehicle.toLocaleString()}` : "₦0"}
              sub="Average maintenance cost"
              icon={Truck}
            />
            <KPICard
              label="Cost per KM"
              value={k.avgCostPerKm > 0 ? `₦${k.avgCostPerKm}` : "-"}
              sub="Maintenance cost / distance"
              icon={Route}
            />
            <KPICard
              label="Cost per Delivery"
              value={k.avgCostPerDelivery > 0 ? `₦${k.avgCostPerDelivery.toLocaleString()}` : "-"}
              sub="Transport cost / deliveries"
              icon={Package}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <KPICard
              label="Idle Time"
              value={`${k.idleTimePct}%`}
              sub={k.idleTimePct > 20 ? "⚠️ High idle - wasted fuel & wear" : "Acceptable"}
              icon={Clock}
              color={k.idleTimePct > 20 ? "text-yellow-600" : "text-emerald-600"}
            />
            <KPICard
              label="Vehicle Utilization"
              value={`${k.utilizationRate}%`}
              sub={`Target: 70-80% | ${k.utilizationRate >= 70 ? "✅ On target" : "⚠️ Below target"}`}
              icon={Gauge}
              color={k.utilizationRate >= 70 ? "text-emerald-600" : "text-yellow-600"}
            />
          </div>
        </TabsContent>

        {/* === DRIVERS & SAFETY TAB === */}
        <TabsContent value="drivers">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="Avg Driver Score"
              value={k.avgDriverScore > 0 ? `${k.avgDriverScore}/100` : "-"}
              sub="Based on behavior metrics"
              icon={Users}
              color={k.avgDriverScore >= 80 ? "text-emerald-600" : k.avgDriverScore >= 60 ? "text-yellow-600" : "text-destructive"}
            />
            <KPICard
              label="DVIR Compliance"
              value={k.dvirCompliancePct > 0 ? `${k.dvirCompliancePct}%` : "-"}
              sub="Daily vehicle inspection reports"
              icon={Shield}
              color={k.dvirCompliancePct >= 90 ? "text-emerald-600" : "text-yellow-600"}
            />
            <KPICard
              label="On-Time Delivery"
              value={k.onTimeDeliveryPct > 0 ? `${k.onTimeDeliveryPct}%` : "-"}
              sub="Deliveries on schedule"
              icon={CheckCircle2}
              color={k.onTimeDeliveryPct >= 90 ? "text-emerald-600" : "text-yellow-600"}
            />
            <KPICard
              label="First Attempt Success"
              value={k.firstAttemptPct > 0 ? `${k.firstAttemptPct}%` : "-"}
              sub="Delivered on first try"
              icon={TrendingUp}
              color={k.firstAttemptPct >= 90 ? "text-emerald-600" : "text-yellow-600"}
            />
          </div>

          {/* Driver scorecards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" /> Driver Performance Scorecards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {k.driverScores.length === 0 ? (
                <EmptyState message="No driver scores recorded yet." />
              ) : (
                <div className="space-y-2">
                  {k.driverScores.slice(0, 8).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{d.driver_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.deliveries_completed} deliveries · {d.deliveries_on_time} on-time
                          {d.harsh_braking_count > 0 && ` · ${d.harsh_braking_count} harsh brakes`}
                          {d.speeding_count > 0 && ` · ${d.speeding_count} speeding`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          d.overall_score >= 80 ? "text-emerald-600" :
                            d.overall_score >= 60 ? "text-yellow-600" : "text-destructive"
                        }`}>
                          {d.overall_score}/100
                        </span>
                        {d.dvir_completed && (
                          <Badge variant="outline" className="text-xs">DVIR ✓</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === COMPLIANCE & SUSTAINABILITY TAB === */}
        <TabsContent value="sustainability">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KPICard
              label="HOS Compliance"
              value={k.driverScores.length > 0
                ? `${Math.round((k.driverScores.filter((d: any) => d.hos_compliant).length / k.driverScores.length) * 100)}%`
                : "-"}
              sub="Hours of Service adherence"
              icon={Shield}
              color="text-primary"
            />
            <KPICard
              label="Fleet Uptime"
              value={`${k.uptimePct}%`}
              sub={`${k.vehiclesDown} vehicle(s) currently down`}
              icon={Activity}
              color={k.uptimePct >= 90 ? "text-emerald-600" : "text-yellow-600"}
            />
            <KPICard
              label="PM Compliance"
              value={k.pmCompliancePct > 0 ? `${k.pmCompliancePct}%` : "-"}
              sub="Preventive maintenance on schedule"
              icon={Leaf}
              color={k.pmCompliancePct >= 80 ? "text-emerald-600" : "text-yellow-600"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fleet Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {k.mttrHours > 8 && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">⚠️ MTTR exceeds 8 hours</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Stock critical parts, implement CMMS for faster dispatch, and train technicians on common failure types.
                    </p>
                  </div>
                )}
                {k.repeatRepairPct > 3 && (
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-sm font-medium text-yellow-700">⚠️ Repeat repair rate above 3%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Analyze root causes for recurring repairs. Enhance quality checks before releasing vehicles.
                    </p>
                  </div>
                )}
                {k.utilizationRate < 70 && (
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-sm font-medium text-yellow-700">📊 Vehicle utilization below 70%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review fleet sizing. Consider reducing idle vehicles or consolidating routes.
                    </p>
                  </div>
                )}
                {k.downtimeHealth !== "good" && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">🔴 Fleet availability below 24 days/month</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Critical downtime detected. Accelerate repairs, ensure parts availability, and review maintenance scheduling.
                    </p>
                  </div>
                )}
                {k.mttrHours <= 8 && k.repeatRepairPct <= 3 && k.utilizationRate >= 70 && k.downtimeHealth === "good" && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-sm font-medium text-emerald-700">✅ All fleet KPIs within target</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fleet operations are performing well. Continue monitoring and maintain preventive maintenance schedules.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default LogisticsCoordinatorDashboard;
