import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { isInternalTeamRole } from "@/lib/workspace/workspaceRegistry";
import {
  Truck, Globe, Activity, DollarSign, BarChart3, TrendingUp,
  AlertTriangle, CheckCircle, Database, Warehouse, Network,
  Map, Zap, Shield, Bell, Clock
} from "lucide-react";

const LIVE_METRICS = [
  { label: "Active Fleets", value: "340", icon: Truck, status: "live" },
  { label: "Vehicles on Delivery", value: "1,247", icon: Truck, status: "live" },
  { label: "Active Routes", value: "3,412", icon: Map, status: "live" },
  { label: "Distribution Orders Today", value: "892", icon: Network, status: "live" },
  { label: "Trade Finance Requests", value: "47", icon: DollarSign, status: "live" },
  { label: "Warehouse Utilization", value: "72%", icon: Warehouse, status: "live" },
];

const SYSTEM_HEALTH = [
  { service: "Logistics OS API", status: "operational", latency: "45ms", uptime: 99.98 },
  { service: "Route Optimization AI", status: "operational", latency: "120ms", uptime: 99.95 },
  { service: "Distribution Exchange", status: "operational", latency: "62ms", uptime: 99.97 },
  { service: "Trade Finance Engine", status: "operational", latency: "88ms", uptime: 99.94 },
  { service: "Commerce Identity", status: "operational", latency: "35ms", uptime: 99.99 },
  { service: "Embedded Commerce API", status: "degraded", latency: "340ms", uptime: 99.87 },
];

const ALERTS = [
  { type: "warning", msg: "Fleet capacity shortage detected in Lagos region", time: "2 min ago" },
  { type: "info", msg: "Route optimization batch completed - 450 routes optimized", time: "8 min ago" },
  { type: "critical", msg: "Embedded Commerce API latency above threshold (340ms)", time: "12 min ago" },
  { type: "info", msg: "Trade finance: 3 new credit applications pending review", time: "25 min ago" },
];

const TRADE_FLOWS = [
  { industry: "FMCG", volume: "₦4.2B", deliveries: 12500, growth: "+18%" },
  { industry: "Agriculture", volume: "₦1.8B", deliveries: 4200, growth: "+24%" },
  { industry: "Pharmaceuticals", volume: "₦980M", deliveries: 2100, growth: "+11%" },
  { industry: "Building Materials", volume: "₦760M", deliveries: 1800, growth: "+7%" },
];

export default function InfrastructureControlTower() {
  const { userRole } = useAuth();
  // Internal-core only - tenant super_admin must NOT access platform infrastructure
  if (!isInternalTeamRole(userRole)) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Infrastructure Control Tower" subtitle="Real-time command center monitoring the RouteAce ecosystem">
      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {LIVE_METRICS.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <m.icon className="w-4 h-4 text-primary" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-lg font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="map">Continental Map</TabsTrigger>
          <TabsTrigger value="health">Platform Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="trade">Trade Flows</TabsTrigger>
          <TabsTrigger value="financial">Financial Flows</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        {/* Continental Map */}
        <TabsContent value="map">
          <Card>
            <CardHeader><CardTitle className="text-base">Continental Logistics Map</CardTitle></CardHeader>
            <CardContent>
              <div className="h-96 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center border-2 border-dashed">
                <div className="text-center space-y-3">
                  <Globe className="w-16 h-16 mx-auto text-primary/30" />
                  <p className="text-muted-foreground">Real-time fleet movements, distribution hubs, and trade corridors</p>
                  <p className="text-xs text-muted-foreground">Connect Google Maps API for live visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Health */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Health Monitor</CardTitle>
              <CardDescription>Real-time status of all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SYSTEM_HEALTH.map(s => (
                  <div key={s.service} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.status === "operational" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                      <span className="font-medium text-sm">{s.service}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <Badge variant={s.status === "operational" ? "secondary" : "destructive"}>
                        {s.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.latency}</span>
                      <div className="flex items-center gap-2 w-32">
                        <Progress value={s.uptime} className="h-2" />
                        <span className="text-xs font-medium">{s.uptime}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle className="text-base">Network Alert System</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ALERTS.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                    a.type === "critical" ? "bg-destructive/10 border border-destructive/20" :
                    a.type === "warning" ? "bg-yellow-500/10 border border-yellow-500/20" :
                    "bg-muted/30"
                  }`}>
                    {a.type === "critical" ? <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" /> :
                     a.type === "warning" ? <Bell className="w-4 h-4 text-yellow-500 mt-0.5" /> :
                     <CheckCircle className="w-4 h-4 text-primary mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm">{a.msg}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade Flows */}
        <TabsContent value="trade">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trade Flow Monitor</CardTitle>
              <CardDescription>Goods movement across the RouteAce network by industry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TRADE_FLOWS.map(t => (
                  <div key={t.industry} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium text-sm">{t.industry}</span>
                    <div className="flex items-center gap-6 text-sm">
                      <span>Volume: {t.volume}</span>
                      <span className="text-muted-foreground">{t.deliveries.toLocaleString()} deliveries</span>
                      <Badge className="bg-emerald-500/15 text-emerald-600">{t.growth}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Flows */}
        <TabsContent value="financial">
          <Card>
            <CardHeader><CardTitle className="text-base">Financial Flow Monitor</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Trade Finance Volume", value: "₦2.4B" },
                  { label: "Fleet Receivables", value: "₦890M" },
                  { label: "Marketplace Revenue", value: "₦156M" },
                  { label: "Transaction Fees", value: "₦42M" },
                ].map(f => (
                  <div key={f.label} className="p-4 rounded-lg bg-muted/50 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-lg font-bold">{f.value}</p>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Predictive Insights</CardTitle>
              <CardDescription>Intelligence from the Continental Logistics Intelligence Graph</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { insight: "Lagos delivery demand expected to spike 22% next week due to seasonal patterns", confidence: 89, type: "demand" },
                  { insight: "Route Lagos→PH showing 15% increase in congestion - consider alternative corridors", confidence: 84, type: "bottleneck" },
                  { insight: "3 fleets in Abuja region below 60% utilization - capacity sharing recommended", confidence: 91, type: "capacity" },
                  { insight: "FMCG distribution volumes trending 18% above forecast - plan additional fleet capacity", confidence: 87, type: "forecast" },
                ].map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm">{ins.insight}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{ins.type}</Badge>
                        <span className="text-xs text-muted-foreground">{ins.confidence}% confidence</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
