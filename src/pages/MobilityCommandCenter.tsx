import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Activity, TrendingUp, AlertTriangle, Truck, MapPin,
  Fuel, Shield, BarChart3, Package, Clock, Globe, Zap, Eye,
  Lock, Navigation, Layers, Radio, Thermometer, Wind,
  Leaf, Target, Users, DollarSign
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useRegion } from "@/contexts/RegionContext";

const FEATURE_FLAG = { mobility_command_v1: true };

// Corridor heatmap
const corridorHeatmap = [
  { corridor: "Lagos–Kano", congestion: 78, compliance: 62, volume: 4200, risk: 68, emission: 2.4 },
  { corridor: "Lagos–PH", congestion: 54, compliance: 78, volume: 3800, risk: 48, emission: 1.8 },
  { corridor: "Rotterdam–Warsaw", congestion: 42, compliance: 94, volume: 6200, risk: 22, emission: 3.1 },
  { corridor: "Dubai–Muscat", congestion: 28, compliance: 88, volume: 2800, risk: 18, emission: 0.9 },
  { corridor: "LA–Chicago", congestion: 65, compliance: 91, volume: 8400, risk: 35, emission: 4.2 },
  { corridor: "Shanghai–Almaty", congestion: 72, compliance: 56, volume: 3200, risk: 62, emission: 5.1 },
  { corridor: "Kano–Maiduguri", congestion: 38, compliance: 45, volume: 980, risk: 81, emission: 0.6 },
  { corridor: "Berlin–Milan", congestion: 48, compliance: 96, volume: 5400, risk: 19, emission: 2.8 },
];

// Freight volatility
const volatilityData = [
  { month: "Aug", global: 42, africa: 58, eu: 28, gcc: 22, us: 35 },
  { month: "Sep", global: 45, africa: 62, eu: 30, gcc: 24, us: 38 },
  { month: "Oct", global: 52, africa: 71, eu: 35, gcc: 28, us: 42 },
  { month: "Nov", global: 48, africa: 65, eu: 32, gcc: 25, us: 40 },
  { month: "Dec", global: 55, africa: 74, eu: 38, gcc: 30, us: 45 },
  { month: "Jan", global: 50, africa: 68, eu: 34, gcc: 26, us: 41 },
];

// Risk concentration
const riskConcentration = [
  { risk: "Fuel Volatility", score: 74, exposure: "$2.4M", trend: "+8%" },
  { risk: "Political Instability", score: 45, exposure: "$1.8M", trend: "-3%" },
  { risk: "Cargo Theft", score: 52, exposure: "$980K", trend: "+12%" },
  { risk: "SLA Breach", score: 58, exposure: "$1.2M", trend: "+5%" },
  { risk: "Regulatory Non-Compliance", score: 32, exposure: "$650K", trend: "-8%" },
  { risk: "Weather/Climate", score: 41, exposure: "$420K", trend: "+15%" },
];

// Carbon emission by corridor
const carbonData = [
  { corridor: "LA–Chicago", co2: 4200, trips: 8400, perTrip: 0.50 },
  { corridor: "Rotterdam–Warsaw", co2: 3100, trips: 6200, perTrip: 0.50 },
  { corridor: "Shanghai–Almaty", co2: 5100, trips: 3200, perTrip: 1.59 },
  { corridor: "Lagos–Kano", co2: 2400, trips: 4200, perTrip: 0.57 },
  { corridor: "Berlin–Milan", co2: 2800, trips: 5400, perTrip: 0.52 },
  { corridor: "Dubai–Muscat", co2: 900, trips: 2800, perTrip: 0.32 },
];

// Insurance loss ratios
const insuranceLoss = [
  { region: "West Africa", premiums: 14.2, claims: 5.8, lossRatio: 41 },
  { region: "EU Core", premiums: 28.6, claims: 8.2, lossRatio: 29 },
  { region: "GCC", premiums: 8.4, claims: 1.8, lossRatio: 21 },
  { region: "North America", premiums: 22.1, claims: 7.4, lossRatio: 33 },
  { region: "Asia Corridors", premiums: 6.8, claims: 3.2, lossRatio: 47 },
];

// National freight density
const freightDensity = [
  { country: "Nigeria", density: 4200, flag: "🇳🇬", pct: 28 },
  { country: "Germany", density: 6800, flag: "🇩🇪", pct: 18 },
  { country: "United States", density: 12400, flag: "🇺🇸", pct: 22 },
  { country: "UAE", density: 2800, flag: "🇦🇪", pct: 12 },
  { country: "Poland", density: 4100, flag: "🇵🇱", pct: 11 },
  { country: "China", density: 3200, flag: "🇨🇳", pct: 9 },
];

const getRiskColor = (s: number) => s >= 60 ? "text-destructive" : s >= 40 ? "text-amber-500" : "text-emerald-500";

export default function MobilityCommandCenter() {
  const [activeTab, setActiveTab] = useState("heatmap");
  const { isNGMode } = useRegion();

  if (!FEATURE_FLAG.mobility_command_v1) {
    return (
      <DashboardLayout title="Mobility Command Center" subtitle="System Module">
        <div className="flex items-center justify-center h-64">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Global Mobility Command Center" subtitle="Sovereign-Grade Freight Intelligence Control Tower - /system/mobility-command">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Active Corridors", value: "847", icon: Navigation, color: "text-primary" },
          { label: "Live Vehicles", value: "12,482", icon: Truck, color: "text-emerald-500" },
          { label: "Freight Vol. Index", value: "52.4", icon: Activity, color: "text-amber-500" },
          { label: "Global Risk Score", value: "44", icon: Shield, color: "text-blue-500" },
          { label: "Carbon (tCO₂/mo)", value: "18.5K", icon: Leaf, color: "text-emerald-600" },
          { label: "Loss Ratio", value: "34%", icon: AlertTriangle, color: "text-destructive" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-3">
              <kpi.icon className={`w-4 h-4 ${kpi.color} mb-1`} />
              <div className="text-xl font-bold text-foreground">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="heatmap">Corridor Heatmap</TabsTrigger>
          <TabsTrigger value="volatility">Freight Volatility</TabsTrigger>
          <TabsTrigger value="risk">Risk Concentration</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Loss</TabsTrigger>
          <TabsTrigger value="density">Freight Density</TabsTrigger>
          <TabsTrigger value="carbon">Carbon Tracking</TabsTrigger>
        </TabsList>

        {/* Corridor Heatmap */}
        <TabsContent value="heatmap">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4 text-primary" />
                  Global Corridor Intelligence Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Corridor</th>
                        <th className="text-center py-2 font-medium">Volume</th>
                        <th className="text-center py-2 font-medium">Congestion</th>
                        <th className="text-center py-2 font-medium">Compliance</th>
                        <th className="text-center py-2 font-medium">Risk</th>
                        <th className="text-center py-2 font-medium">CO₂ (tK/mo)</th>
                        <th className="text-center py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corridorHeatmap.map((c) => (
                        <tr key={c.corridor} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{c.corridor}</td>
                          <td className="py-3 text-center text-muted-foreground">{c.volume.toLocaleString()}</td>
                          <td className="py-3 text-center">
                            <Badge variant={c.congestion >= 60 ? "destructive" : c.congestion >= 40 ? "secondary" : "outline"} className="text-xs">{c.congestion}%</Badge>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`font-bold ${c.compliance >= 80 ? "text-emerald-500" : c.compliance >= 60 ? "text-amber-500" : "text-destructive"}`}>{c.compliance}%</span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`font-bold ${getRiskColor(c.risk)}`}>{c.risk}</span>
                          </td>
                          <td className="py-3 text-center text-muted-foreground">{c.emission}</td>
                          <td className="py-3 text-center">
                            <div className={`w-3 h-3 rounded-full mx-auto ${c.risk >= 60 ? "bg-destructive" : c.risk >= 40 ? "bg-amber-400" : "bg-emerald-500"}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Congestion bars */}
            <Card>
              <CardHeader><CardTitle className="text-base">Congestion Density Visualization</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={corridorHeatmap} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="corridor" type="category" width={130} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="congestion" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Congestion %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Freight Volatility */}
        <TabsContent value="volatility">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-primary" />
                  Freight Volatility Index by Region (6-Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="global" stroke="#6366f1" strokeWidth={3} name="Global" dot={false} />
                    <Line type="monotone" dataKey="africa" stroke="#ef4444" strokeWidth={2} name="Africa" dot={false} />
                    <Line type="monotone" dataKey="eu" stroke="#3b82f6" strokeWidth={2} name="EU" dot={false} />
                    <Line type="monotone" dataKey="gcc" stroke="#f59e0b" strokeWidth={2} name="GCC" dot={false} />
                    <Line type="monotone" dataKey="us" stroke="#10b981" strokeWidth={2} name="US" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Volatility Alert</CardTitle></CardHeader>
              <CardContent>
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">Africa Region - Elevated Volatility (68)</div>
                      <div className="text-sm text-muted-foreground mt-1">Fuel scarcity + political disruption driving 18% above global average. Recommend 2.5% margin buffer on all West African corridors.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Volatility Composition</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { factor: "Fuel Price Swings", weight: 30, value: 74 },
                  { factor: "Demand Fluctuation", weight: 25, value: 48 },
                  { factor: "Currency FX", weight: 20, value: 62 },
                  { factor: "Regulatory Changes", weight: 15, value: 35 },
                  { factor: "Weather Events", weight: 10, value: 41 },
                ].map((f) => (
                  <div key={f.factor}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{f.factor} ({f.weight}%)</span>
                      <span className={`font-bold ${getRiskColor(f.value)}`}>{f.value}</span>
                    </div>
                    <Progress value={f.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Concentration */}
        <TabsContent value="risk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-4 h-4 text-primary" />
                  Risk Concentration Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {riskConcentration.map((r) => (
                    <div key={r.risk} className="p-4 border border-border rounded-xl">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-semibold text-foreground text-sm">{r.risk}</div>
                        <Badge variant="outline" className={`text-xs ${r.trend.startsWith("+") ? "text-destructive" : "text-emerald-600"}`}>{r.trend}</Badge>
                      </div>
                      <div className={`text-3xl font-bold ${getRiskColor(r.score)}`}>{r.score}</div>
                      <div className="text-xs text-muted-foreground mt-1">Exposure: {r.exposure}</div>
                      <Progress value={r.score} className="h-2 mt-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insurance Loss */}
        <TabsContent value="insurance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Regional Insurance Loss Ratios ($M)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={insuranceLoss}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="region" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="premiums" fill="hsl(var(--primary))" name="Premiums ($M)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="claims" fill="#ef4444" name="Claims ($M)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {insuranceLoss.map((i) => (
              <Card key={i.region}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-foreground text-sm">{i.region}</div>
                    <Badge variant={i.lossRatio >= 40 ? "destructive" : i.lossRatio >= 30 ? "secondary" : "outline"}>{i.lossRatio}%</Badge>
                  </div>
                  <Progress value={i.lossRatio} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Premiums: ${i.premiums}M</span>
                    <span>Claims: ${i.claims}M</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Freight Density */}
        <TabsContent value="density">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-primary" />
                  National Freight Density per Corridor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={freightDensity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="country" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="density" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Trips/month" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {freightDensity.map((f) => (
              <Card key={f.country}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-3xl">{f.flag}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{f.country}</div>
                    <div className="text-xs text-muted-foreground">{f.density.toLocaleString()} trips/mo</div>
                    <Progress value={f.pct} className="h-1.5 mt-2" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{f.pct}%</div>
                    <div className="text-xs text-muted-foreground">market share</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Carbon Tracking */}
        <TabsContent value="carbon">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Carbon Emission Tracking by Corridor (tonnes CO₂/month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={carbonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="corridor" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="co2" fill="#10b981" name="tCO₂/month" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Emission Intensity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {carbonData.sort((a, b) => b.perTrip - a.perTrip).map((c) => (
                  <div key={c.corridor}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{c.corridor}</span>
                      <span className={`font-bold ${c.perTrip >= 1.0 ? "text-destructive" : c.perTrip >= 0.5 ? "text-amber-500" : "text-emerald-500"}`}>
                        {c.perTrip} tCO₂/trip
                      </span>
                    </div>
                    <Progress value={Math.min(c.perTrip * 60, 100)} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Carbon Credit Opportunity</CardTitle></CardHeader>
              <CardContent>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">Carbon Credit Monetization Potential</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Based on EU ETS pricing at €68/tCO₂, platform-wide route optimization has reduced emissions by 2,400 tCO₂/month - generating potential carbon credit revenue of <span className="font-bold text-emerald-600">€163K/month</span>.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: "Emissions Avoided", value: "2,400 tCO₂" },
                    { label: "Credit Value", value: "€163K/mo" },
                    { label: "Reduction Rate", value: "13%" },
                    { label: "Target (2027)", value: "25% reduction" },
                  ].map(m => (
                    <div key={m.label} className="p-3 border border-border rounded-lg text-center">
                      <div className="font-bold text-foreground text-sm">{m.value}</div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
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
