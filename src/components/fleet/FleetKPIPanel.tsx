import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useFleetKPIs } from "@/hooks/useFleetKPIs";
import {
  Truck, Wrench, Clock, TrendingUp, AlertTriangle, CheckCircle,
  Gauge, Fuel, Shield, DollarSign, Activity, Timer, BarChart3, Users
} from "lucide-react";

const ratingBadge = (rating: string) => {
  switch (rating) {
    case "world_class": return <Badge className="bg-emerald-500/15 text-emerald-600">World-Class (&lt;2h)</Badge>;
    case "average": return <Badge className="bg-yellow-500/15 text-yellow-600">Average (2-8h)</Badge>;
    default: return <Badge variant="destructive">Needs Improvement (&gt;8h)</Badge>;
  }
};

const healthBadge = (health: string) => {
  switch (health) {
    case "good": return <Badge className="bg-emerald-500/15 text-emerald-600">Good (≥24 days)</Badge>;
    case "warning": return <Badge className="bg-yellow-500/15 text-yellow-600">Warning (20-23 days)</Badge>;
    default: return <Badge variant="destructive">Critical (&lt;20 days)</Badge>;
  }
};

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  badge?: React.ReactNode;
}

const KPICard = ({ title, value, subtitle, icon: Icon, color = "text-primary", badge }: KPICardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>}
          {badge && <div className="pt-1">{badge}</div>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function FleetKPIPanel({ view = "full" }: { view?: "full" | "compact" }) {
  const { kpis, loading } = useFleetKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasActivity = !!kpis && (
    (kpis.availabilityLogs?.length ?? 0) > 0 ||
    (kpis.maintenanceOrders?.length ?? 0) > 0 ||
    (kpis.dispatches?.length ?? 0) > 0 ||
    (kpis.driverScores?.length ?? 0) > 0
  );

  if (!kpis || kpis.totalFleet === 0 || !hasActivity) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <Truck className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="font-medium">
            {!kpis || kpis.totalFleet === 0 ? "No fleet data yet" : "Awaiting first operational signal"}
          </p>
          <p className="text-sm text-muted-foreground">
            {!kpis || kpis.totalFleet === 0
              ? "Add vehicles, log downtime and complete maintenance work orders to populate live KPIs."
              : `${kpis.totalFleet} vehicle${kpis.totalFleet === 1 ? "" : "s"} registered, but no daily availability snapshots, dispatches, maintenance orders or driver scores have been recorded yet this month.`}
            {" "}Uptime, MTTR, utilisation and PM compliance will appear once real activity exists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top-Level Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Fleet" value={kpis.totalFleet} icon={Truck} color="text-primary" />
        <KPICard title="Uptime" value={`${kpis.uptimePct}%`} icon={Activity} color="text-emerald-500" badge={healthBadge(kpis.downtimeHealth)} />
        <KPICard title="MTTR" value={`${kpis.mttrHours}h`} icon={Timer} color="text-blue-500" badge={ratingBadge(kpis.mttrRating)} />
        <KPICard title="Utilization" value={`${kpis.utilizationRate}%`} subtitle={kpis.utilizationRate >= 70 ? "On target" : "Below 70% target"} icon={Gauge} color={kpis.utilizationRate >= 70 ? "text-emerald-500" : "text-yellow-500"} />
        <KPICard title="PM Compliance" value={`${kpis.pmCompliancePct}%`} icon={Wrench} color="text-orange-500" />
        <KPICard title="On-Time Delivery" value={`${kpis.onTimeDeliveryPct}%`} icon={CheckCircle} color="text-emerald-500" />
      </div>

      <Tabs defaultValue="downtime" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="downtime">Downtime & Availability</TabsTrigger>
          <TabsTrigger value="ttr">TTR / MTTR</TabsTrigger>
          <TabsTrigger value="cost">Cost Management</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="safety">Drivers & Safety</TabsTrigger>
        </TabsList>

        {/* Downtime & Availability */}
        <TabsContent value="downtime" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Days Available / Month" value={`${kpis.daysAvailableThisMonth} / ${kpis.daysInMonth}`} icon={Clock} color="text-primary" badge={healthBadge(kpis.downtimeHealth)} />
            <KPICard title="Vehicles Down Now" value={kpis.vehiclesDown} icon={AlertTriangle} color="text-destructive" />
            <KPICard title="Fleet Uptime %" value={`${kpis.uptimePct}%`} icon={Activity} color="text-emerald-500" />
            <KPICard title="Idle Time %" value={`${kpis.idleTimePct}%`} icon={Clock} color="text-yellow-500" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Downtime Health Assessment</CardTitle>
              <CardDescription>Monthly availability must be ≥24 days for healthy fleet status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Days Available</span>
                  <span className="text-sm font-bold">{kpis.daysAvailableThisMonth} / {kpis.daysInMonth}</span>
                </div>
                <Progress value={(kpis.daysAvailableThisMonth / kpis.daysInMonth) * 100} className="h-3" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥24 days: Good</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 20-23 days: Warning</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> &lt;20 days: Critical</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TTR / MTTR */}
        <TabsContent value="ttr" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Mean Time to Repair" value={`${kpis.mttrHours}h`} icon={Timer} color="text-blue-500" badge={ratingBadge(kpis.mttrRating)} />
            <KPICard title="Repairs Completed" value={kpis.totalRepairsCompleted} icon={Wrench} color="text-primary" />
            <KPICard title="Total Downtime Hours" value={`${kpis.totalDowntimeHours}h`} icon={Clock} color="text-orange-500" />
            <KPICard title="Repairs Within 48h" value={`${kpis.repairsWithin48hPct}%`} subtitle="Target: 90%" icon={CheckCircle} color={kpis.repairsWithin48hPct >= 90 ? "text-emerald-500" : "text-yellow-500"} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MTTR Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "World-Class", range: "< 2 hours", color: "bg-emerald-500", active: kpis.mttrRating === "world_class" },
                  { label: "Average", range: "2-8 hours", color: "bg-yellow-500", active: kpis.mttrRating === "average" },
                  { label: "Needs Improvement", range: "> 8 hours", color: "bg-destructive", active: kpis.mttrRating === "needs_improvement" },
                ].map(b => (
                  <div key={b.label} className={`p-4 rounded-lg border-2 text-center ${b.active ? "border-primary bg-primary/5" : "border-transparent bg-muted/50"}`}>
                    <div className={`w-3 h-3 rounded-full ${b.color} mx-auto mb-2`} />
                    <p className="font-semibold text-sm">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.range}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Repeat Repair Rate: {kpis.repeatRepairPct}%</p>
                <p className="text-xs text-muted-foreground">Target: &lt;3%. {kpis.repeatRepairPct > 3 ? "⚠️ Above target - review repair quality" : "✅ Within acceptable range"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Management */}
        <TabsContent value="cost" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Maintenance Cost" value={`₦${kpis.totalMaintenanceCost.toLocaleString()}`} icon={DollarSign} color="text-primary" />
            <KPICard title="Avg Cost / Vehicle" value={`₦${kpis.avgCostPerVehicle.toLocaleString()}`} icon={Truck} color="text-blue-500" />
            <KPICard title="Cost / Km" value={`₦${kpis.avgCostPerKm}`} icon={TrendingUp} color="text-orange-500" />
            <KPICard title="Cost / Delivery" value={`₦${kpis.avgCostPerDelivery.toLocaleString()}`} icon={BarChart3} color="text-emerald-500" />
          </div>
        </TabsContent>

        {/* Operational */}
        <TabsContent value="operational" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Vehicle Utilization" value={`${kpis.utilizationRate}%`} subtitle="Target: 70-80%" icon={Gauge} color={kpis.utilizationRate >= 70 ? "text-emerald-500" : "text-yellow-500"} />
            <KPICard title="Idle Time %" value={`${kpis.idleTimePct}%`} icon={Clock} color="text-yellow-500" />
            <KPICard title="Avg Fuel Level" value={`${kpis.avgFuelLevel}%`} icon={Fuel} color="text-blue-500" />
            <KPICard title="First Attempt Delivery" value={`${kpis.firstAttemptPct}%`} icon={CheckCircle} color="text-emerald-500" />
          </div>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="PM Compliance" value={`${kpis.pmCompliancePct}%`} icon={Shield} color="text-primary" />
            <KPICard title="Scheduled:Unscheduled Ratio" value={`${kpis.scheduledVsUnscheduledRatio}:1`} icon={Wrench} color="text-blue-500" />
            <KPICard title="MTBF (Hours)" value={kpis.mtbfHours.toLocaleString()} subtitle="Mean Time Between Failures" icon={Activity} color="text-emerald-500" />
            <KPICard title="Repeat Repairs" value={`${kpis.repeatRepairPct}%`} subtitle="Target: <3%" icon={AlertTriangle} color={kpis.repeatRepairPct <= 3 ? "text-emerald-500" : "text-destructive"} />
          </div>
        </TabsContent>

        {/* Drivers & Safety */}
        <TabsContent value="safety" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Avg Driver Score" value={kpis.avgDriverScore} icon={Users} color="text-primary" />
            <KPICard title="DVIR Compliance" value={`${kpis.dvirCompliancePct}%`} icon={Shield} color="text-blue-500" />
            <KPICard title="On-Time Delivery" value={`${kpis.onTimeDeliveryPct}%`} icon={CheckCircle} color="text-emerald-500" />
            <KPICard title="First Attempt Success" value={`${kpis.firstAttemptPct}%`} icon={TrendingUp} color="text-emerald-500" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
