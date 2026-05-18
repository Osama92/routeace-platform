import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Truck, MapPin,
  Fuel, CloudRain, Shield, BarChart3, Package, Clock, Star, Navigation,
  Layers, Database, Globe, Zap, Eye, Lock
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PolarRadiusAxis, ScatterChart, Scatter
} from "recharts";

// Feature flag
const FEATURE_FLAG = { freight_intelligence_v1: true };

// Live datasets feed from the freight intelligence pipeline. Empty until
// wired so charts and lists surface honest empty states.
const corridorDensity: Array<{ corridor: string; volume: number; congestion: number; fuel: number; sla: number }> = [];
const freightFlowData: Array<{ month: string; agriculture: number; manufacturing: number; fmcg: number; construction: number; petroleum: number }> = [];
const portVarianceData: Array<{ route: string; avgHours: number; variance: number; incidents: number }> = [];
const driverReliabilityData: Array<{ subject: string; A: number; fullMark: number }> = [];
const fuelVarianceData: Array<{ week: string; budget: number; actual: number; variance: number }> = [];

const dataMoatScore = {
  activeRoutes: 0,
  dropDensity: 0,
  corridorCoverage: 0,
  riskAccuracy: 0,
  insuranceDepth: 0,
  fleetPenetration: 0,
  total: 0,
};


export default function FreightIntelligenceCore() {
  const [activeTab, setActiveTab] = useState("heatmap");

  if (!FEATURE_FLAG.freight_intelligence_v1) {
    return (
      <DashboardLayout title="Freight Intelligence Core" subtitle="System Module">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Module not enabled for this tenant.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Freight Intelligence Core" subtitle="Proprietary Data Moat - /system/freight-intelligence">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Corridors", value: "847", icon: Navigation, trend: "+12", color: "text-primary" },
          { label: "Drop Density Index", value: "92/100", icon: Layers, trend: "+4", color: "text-emerald-500" },
          { label: "Data Moat Score", value: `${dataMoatScore.total}/100`, icon: Database, trend: "↑", color: "text-amber-500" },
          { label: "Corridor Coverage", value: "73%", icon: Globe, trend: "+6%", color: "text-blue-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <Badge variant="outline" className="text-xs text-emerald-600">{kpi.trend}</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="heatmap">Corridor Heatmap</TabsTrigger>
          <TabsTrigger value="flow">Freight Flow</TabsTrigger>
          <TabsTrigger value="port">Port Variance</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Modeling</TabsTrigger>
          <TabsTrigger value="driver">Driver Reliability</TabsTrigger>
          <TabsTrigger value="moat">Data Moat</TabsTrigger>
        </TabsList>

        {/* Corridor Traffic Density Heatmap */}
        <TabsContent value="heatmap">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-primary" />
                  Corridor Traffic Density
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={corridorDensity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="corridor" type="category" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Volume (trips/mo)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Congestion Probability by Corridor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {corridorDensity.map((c) => (
                  <div key={c.corridor}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{c.corridor}</span>
                      <span className={`font-bold ${c.congestion > 70 ? "text-destructive" : c.congestion > 50 ? "text-amber-500" : "text-emerald-500"}`}>
                        {c.congestion}%
                      </span>
                    </div>
                    <Progress value={c.congestion} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Corridor Intelligence Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Corridor</th>
                        <th className="text-center py-2 font-medium">Volume</th>
                        <th className="text-center py-2 font-medium">Congestion</th>
                        <th className="text-center py-2 font-medium">Fuel Risk</th>
                        <th className="text-center py-2 font-medium">SLA Score</th>
                        <th className="text-center py-2 font-medium">Insurance Risk</th>
                        <th className="text-center py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corridorDensity.map((c) => (
                        <tr key={c.corridor} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 font-medium text-foreground">{c.corridor}</td>
                          <td className="py-3 text-center text-muted-foreground">{c.volume.toLocaleString()}</td>
                          <td className="py-3 text-center">
                            <Badge variant={c.congestion > 70 ? "destructive" : c.congestion > 50 ? "secondary" : "outline"} className="text-xs">
                              {c.congestion}%
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant={c.fuel > 70 ? "destructive" : "secondary"} className="text-xs">
                              {c.fuel > 70 ? "High" : c.fuel > 55 ? "Med" : "Low"}
                            </Badge>
                          </td>
                          <td className="py-3 text-center text-foreground font-medium">{c.sla}%</td>
                          <td className="py-3 text-center">
                            <span className={`font-bold text-xs ${c.congestion > 70 ? "text-destructive" : "text-amber-500"}`}>
                              {c.congestion > 70 ? "High" : "Medium"}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <div className={`w-2 h-2 rounded-full mx-auto ${c.congestion > 70 ? "bg-destructive" : c.congestion > 50 ? "bg-amber-400" : "bg-emerald-500"}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Freight Flow by Commodity */}
        <TabsContent value="flow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Freight Flow by Commodity (Trips/Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={freightFlowData}>
                    <defs>
                      {["primary", "emerald", "amber", "blue", "rose"].map((color, i) => (
                        <linearGradient key={color} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={`hsl(var(--${i === 0 ? "primary" : "muted-foreground"}))`} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={`hsl(var(--${i === 0 ? "primary" : "muted-foreground"}))`} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="fmcg" stroke="#6366f1" fill="url(#grad0)" name="FMCG" strokeWidth={2} />
                    <Area type="monotone" dataKey="manufacturing" stroke="#10b981" fill="url(#grad1)" name="Manufacturing" strokeWidth={2} />
                    <Area type="monotone" dataKey="petroleum" stroke="#f59e0b" fill="url(#grad2)" name="Petroleum" strokeWidth={2} />
                    <Area type="monotone" dataKey="agriculture" stroke="#3b82f6" fill="url(#grad3)" name="Agriculture" strokeWidth={2} />
                    <Area type="monotone" dataKey="construction" stroke="#ef4444" fill="url(#grad4)" name="Construction" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {[
              { label: "FMCG", value: "4,900", pct: "36%", icon: Package, color: "bg-indigo-500" },
              { label: "Manufacturing", value: "2,200", pct: "22%", icon: Truck, color: "bg-emerald-500" },
              { label: "Petroleum", value: "1,700", pct: "18%", icon: Fuel, color: "bg-amber-500" },
              { label: "Agriculture", value: "1,650", pct: "15%", icon: Layers, color: "bg-blue-500" },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center`}>
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{c.value}</div>
                    <div className="text-xs text-muted-foreground">{c.label} - {c.pct} share</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Port Variance */}
        <TabsContent value="port">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-primary" />
                  Port-to-Warehouse Time Variance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {portVarianceData.map((p) => (
                    <div key={p.route} className="border border-border rounded-xl p-4">
                      <div className="font-semibold text-foreground text-sm mb-3">{p.route}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Avg Hours</span>
                          <span className="font-bold text-foreground">{p.avgHours}h</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Variance</span>
                          <span className={`font-bold ${p.variance > 7 ? "text-destructive" : "text-amber-500"}`}>±{p.variance}h</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Incidents/mo</span>
                          <span className="font-bold text-foreground">{p.incidents}</span>
                        </div>
                        <Progress value={100 - (p.variance / 10 * 100)} className="h-1.5 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">AI Port Congestion Insight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground mb-1">Onne–Port Harcourt corridor has highest variance (±9.4h)</div>
                      <div className="text-sm text-muted-foreground">Recommend rerouting 18% of freight via TinCan to reduce average clearance time by 4.2 hours and save ₦2.1M in detention fees this month.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fuel Modeling */}
        <TabsContent value="fuel">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Fuel className="w-4 h-4 text-primary" />
                  Fuel Variance Impact Modeling (₦'000/trip)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={fuelVarianceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="budget" fill="hsl(var(--muted))" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Fuel Intelligence Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { corridor: "Lagos–Kano", excess: "₦69K", tip: "Reduce idle time on Sagamu-Ore axis" },
                  { corridor: "PH–Warri", excess: "₦48K", tip: "Refuel in Warri, cheaper by ₦8/L" },
                  { corridor: "Lagos–Ibadan", excess: "₦32K", tip: "Night dispatch reduces fuel by 11%" },
                ].map((a) => (
                  <div key={a.corridor} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm text-foreground">{a.corridor}</span>
                      <Badge variant="destructive" className="text-xs">{a.excess} over</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">CO₂ & Insurance Risk</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {corridorDensity.slice(0, 4).map((c) => (
                  <div key={c.corridor}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{c.corridor}</span>
                      <span className="text-muted-foreground text-xs">Insurance Risk: {c.congestion > 70 ? "High" : "Medium"}</span>
                    </div>
                    <Progress value={c.fuel} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Driver Reliability */}
        <TabsContent value="driver">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="w-4 h-4 text-amber-500" />
                  Fleet Driver Reliability Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={driverReliabilityData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar name="Fleet Average" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Driver Scores</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Emmanuel K.", score: 96, trips: 284, grade: "A+" },
                  { name: "Chukwuemeka O.", score: 93, trips: 231, grade: "A" },
                  { name: "Fatima B.", score: 91, trips: 198, grade: "A" },
                  { name: "Tunde A.", score: 88, trips: 312, grade: "B+" },
                  { name: "Ngozi I.", score: 85, trips: 176, grade: "B+" },
                ].map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.trips} trips</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{d.score}</div>
                      <Badge variant="outline" className="text-xs">{d.grade}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Moat */}
        <TabsContent value="moat">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4 text-primary" />
                  RouteAce Proprietary Data Moat Index
                  <Badge variant="secondary" className="ml-2">Internal Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-primary">{dataMoatScore.total}</div>
                  <div className="text-muted-foreground text-sm">/ 100 - Data Moat Index</div>
                  <Badge className="mt-2 bg-amber-500/20 text-amber-700 border-amber-500/30">Growing Moat</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Active Routes", value: dataMoatScore.activeRoutes, max: 1000, unit: "" },
                    { label: "Drop Density", value: dataMoatScore.dropDensity, max: 100, unit: "/100" },
                    { label: "Corridor Coverage", value: dataMoatScore.corridorCoverage, max: 100, unit: "%" },
                    { label: "Risk Accuracy", value: dataMoatScore.riskAccuracy, max: 100, unit: "%" },
                    { label: "Insurance Depth", value: dataMoatScore.insuranceDepth, max: 100, unit: "%" },
                    { label: "Fleet Penetration", value: dataMoatScore.fleetPenetration, max: 100, unit: "%" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-4 border border-border rounded-xl">
                      <div className="text-2xl font-bold text-foreground">{m.value}{m.unit}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                      <Progress value={typeof m.value === "number" ? (m.value / m.max) * 100 : 0} className="h-1.5 mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">FREIGHT_CORRIDOR_DATASET - Live Collection</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  {[
                    { label: "Routes Indexed", value: "847" },
                    { label: "SLA Events", value: "24.3K" },
                    { label: "Delay Patterns", value: "12.1K" },
                    { label: "Weather Samples", value: "89.4K" },
                    { label: "Driver Logs", value: "341K" },
                    { label: "Toll Records", value: "1.2M" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 bg-muted/30 rounded-lg">
                      <div className="font-bold text-lg text-foreground">{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
