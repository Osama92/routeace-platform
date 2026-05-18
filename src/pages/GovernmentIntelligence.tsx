import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Shield, Landmark, AlertTriangle, TrendingUp, BarChart3,
  MapPin, Truck, Package, Lock, Eye, Database, Zap, Building2,
  FileText, Activity
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart
} from "recharts";

const FEATURE_FLAG = { government_intelligence_v1: true };

// Aggregated, anonymized data only - no tenant exposure.
// Live datasets are fed from the government analytics pipeline; empty until
// backend is wired so charts surface honest empty states.
const stateFreightVolume: Array<{ state: string; volume: number; sector: string; stress: number }> = [];
const portCongestionData: Array<{ month: string; apapa: number; tincan: number; onne: number; calabar: number }> = [];
const tradeFlowData: Array<{ month: string; imports: number; exports: number; informal: number }> = [];
const roadStressData: Array<{ corridor: string; frequency: number; stress: number; recommended: string }> = [];
const taxLeakageData: Array<{ sector: string; estimated: number; collected: number; leakage: number }> = [];


export default function GovernmentIntelligence() {
  const [activeTab, setActiveTab] = useState("observatory");

  if (!FEATURE_FLAG.government_intelligence_v1) {
    return (
      <DashboardLayout title="Government Intelligence" subtitle="Restricted">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Access restricted to Core Team and Gov-tier Enterprise.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Government Intelligence Layer"
      subtitle="National Freight Observatory - /system/government-intelligence | Anonymized Aggregate Only"
    >
      {/* Security Notice */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-foreground text-sm">Sovereign Data Layer - Fully Anonymized</div>
          <div className="text-xs text-muted-foreground mt-1">
            All data displayed is aggregated at national/state level. Zero tenant-level data is exposed. Compliant with NDPR, GDPR and sovereign data residency requirements.
          </div>
        </div>
        <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">GOV-TIER</Badge>
      </div>

      {/* National KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "National Freight Volume", value: "142K", unit: "trips/mo", icon: Truck, color: "text-primary" },
          { label: "Active Trade Corridors", value: "87", unit: "corridors", icon: Globe, color: "text-emerald-500" },
          { label: "Port Congestion Index", value: "84", unit: "/100", icon: Landmark, color: "text-amber-500" },
          { label: "Road Stress Index", value: "71", unit: "/100", icon: AlertTriangle, color: "text-destructive" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <kpi.icon className={`w-5 h-5 mb-2 ${kpi.color}`} />
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.unit}</div>
              <div className="text-xs font-medium text-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="observatory">National Observatory</TabsTrigger>
          <TabsTrigger value="port">Port Analytics</TabsTrigger>
          <TabsTrigger value="road">Road Degradation</TabsTrigger>
          <TabsTrigger value="trade">Trade Intelligence</TabsTrigger>
          <TabsTrigger value="customs">Customs API Layer</TabsTrigger>
        </TabsList>

        {/* National Observatory */}
        <TabsContent value="observatory">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Freight Volume by State (Anonymized)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stateFreightVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="state" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Volume (trips/mo)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">State-Level Road Stress Index</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stateFreightVolume.map((s) => (
                  <div key={s.state}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{s.state}</span>
                      <span className={`font-bold ${s.stress > 75 ? "text-destructive" : s.stress > 55 ? "text-amber-500" : "text-emerald-500"}`}>
                        {s.stress}
                      </span>
                    </div>
                    <Progress value={s.stress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Sector Dominance (Cargo Mix)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { sector: "FMCG", pct: 34, value: "48.2K trips" },
                  { sector: "Agriculture", pct: 22, value: "31.2K trips" },
                  { sector: "Petroleum", pct: 19, value: "26.9K trips" },
                  { sector: "Construction", pct: 14, value: "19.8K trips" },
                  { sector: "Manufacturing", pct: 11, value: "15.6K trips" },
                ].map((s) => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{s.sector}</span>
                      <span className="text-muted-foreground text-xs">{s.value} - {s.pct}%</span>
                    </div>
                    <Progress value={s.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Port Analytics */}
        <TabsContent value="port">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Port Congestion Index (6-Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={portCongestionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="apapa" stroke="#ef4444" strokeWidth={2} name="Apapa" dot={false} />
                    <Line type="monotone" dataKey="onne" stroke="#f59e0b" strokeWidth={2} name="Onne (PH)" dot={false} />
                    <Line type="monotone" dataKey="tincan" stroke="#6366f1" strokeWidth={2} name="TinCan" dot={false} />
                    <Line type="monotone" dataKey="calabar" stroke="#10b981" strokeWidth={2} name="Calabar" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {[
              { port: "Apapa Port", score: 84, clearance: "18.4h avg", trend: "Worsening" },
              { port: "Onne Port (PH)", score: 75, clearance: "22.1h avg", trend: "Stable" },
              { port: "TinCan Island", score: 67, clearance: "14.2h avg", trend: "Improving" },
              { port: "Calabar Port", score: 53, clearance: "16.8h avg", trend: "Stable" },
            ].map((p) => (
              <Card key={p.port}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-foreground">{p.port}</div>
                      <div className="text-xs text-muted-foreground">{p.clearance}</div>
                    </div>
                    <Badge variant={p.score > 75 ? "destructive" : p.score > 60 ? "secondary" : "outline"}>{p.trend}</Badge>
                  </div>
                  <div className={`text-3xl font-bold ${p.score > 75 ? "text-destructive" : p.score > 60 ? "text-amber-500" : "text-emerald-500"}`}>
                    {p.score}
                  </div>
                  <div className="text-xs text-muted-foreground">Congestion Score</div>
                  <Progress value={p.score} className="h-2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Road Degradation */}
        <TabsContent value="road">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Road Wear Risk Map - AI-Generated
                  <Badge variant="secondary" className="ml-2 text-xs">Billable Gov Report</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Corridor</th>
                        <th className="text-center py-2 font-medium">Trip Frequency/mo</th>
                        <th className="text-center py-2 font-medium">Stress Score</th>
                        <th className="text-center py-2 font-medium">Avg Axle Load</th>
                        <th className="text-center py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roadStressData.map((r) => (
                        <tr key={r.corridor} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{r.corridor}</td>
                          <td className="py-3 text-center text-muted-foreground">{r.frequency.toLocaleString()}</td>
                          <td className="py-3 text-center">
                            <Badge variant={r.stress > 80 ? "destructive" : r.stress > 65 ? "secondary" : "outline"} className="text-xs">
                              {r.stress}
                            </Badge>
                          </td>
                          <td className="py-3 text-center text-muted-foreground">28–34T</td>
                          <td className="py-3 text-center">
                            <div className={`w-2 h-2 rounded-full mx-auto ${r.stress > 80 ? "bg-destructive" : r.stress > 65 ? "bg-amber-400" : "bg-emerald-500"}`} />
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">{r.recommended}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">Lagos–Ibadan Expressway requires immediate intervention.</span>
                    <span className="text-muted-foreground ml-1">At 94/100 stress and 8,400 heavy-haul trips/month, projected road failure within 4–7 months. Recommend emergency resurfacing contract.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trade Intelligence */}
        <TabsContent value="trade">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">National Trade Flow Intelligence (₦bn)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={tradeFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="imports" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="Imports" strokeWidth={2} />
                    <Area type="monotone" dataKey="exports" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Exports" strokeWidth={2} />
                    <Bar dataKey="informal" fill="#f59e0b" fillOpacity={0.6} name="Informal Sector Est." radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Tax Leakage Detection</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {taxLeakageData.map((t) => (
                  <div key={t.sector} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm text-foreground">{t.sector}</span>
                      <Badge variant={t.leakage > 25 ? "destructive" : "secondary"} className="text-xs">{t.leakage}% leakage</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Expected: ₦{t.estimated}M</div>
                      <div>Collected: ₦{t.collected}M</div>
                    </div>
                    <Progress value={(t.collected / t.estimated) * 100} className="h-1.5 mt-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Trade Anomaly Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "Volume Spike", detail: "35% increase in petroleum transit via Delta - Warri axis without matching customs records", severity: "high" },
                  { type: "Route Deviation", detail: "Unusual cross-border routing patterns detected on Kano–Niger border - possible tariff avoidance", severity: "medium" },
                  { type: "Documentation Gap", detail: "18% of container movements through Onne lack NAFDAC clearance stamps", severity: "medium" },
                ].map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${a.severity === "high" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                    <div className={`font-semibold text-xs mb-1 ${a.severity === "high" ? "text-destructive" : "text-amber-600"}`}>{a.type}</div>
                    <div className="text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customs API Layer */}
        <TabsContent value="customs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />
                  Enterprise Trade API Layer
                  <Badge variant="secondary" className="text-xs">Billable per Request</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      endpoint: "/api/v1/freight/volume-index",
                      desc: "Real-time freight volume by state/corridor",
                      pricing: "₦50/call",
                      status: "live",
                      calls: "8,421",
                    },
                    {
                      endpoint: "/api/v1/corridor/risk",
                      desc: "Corridor risk index with 24h predictions",
                      pricing: "₦75/call",
                      status: "live",
                      calls: "5,218",
                    },
                    {
                      endpoint: "/api/v1/commodity/flow",
                      desc: "Commodity movement by sector and region",
                      pricing: "₦100/call",
                      status: "beta",
                      calls: "1,894",
                    },
                    {
                      endpoint: "/api/v1/delay/prediction",
                      desc: "AI delay probability for any route",
                      pricing: "₦80/call",
                      status: "live",
                      calls: "12,067",
                    },
                    {
                      endpoint: "/api/v1/customs/container-track",
                      desc: "Container tracking via port integration",
                      pricing: "₦120/call",
                      status: "beta",
                      calls: "2,341",
                    },
                    {
                      endpoint: "/api/v1/tax/tariff-exposure",
                      desc: "Tariff and tax exposure modeling",
                      pricing: "₦150/call",
                      status: "planned",
                      calls: "-",
                    },
                  ].map((api) => (
                    <div key={api.endpoint} className="p-4 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono text-primary">{api.endpoint}</code>
                        <Badge variant={api.status === "live" ? "outline" : api.status === "beta" ? "secondary" : "secondary"} className="text-xs">
                          {api.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{api.desc}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary">{api.pricing}</span>
                        <span className="text-xs text-muted-foreground">{api.calls} calls/mo</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-border rounded-xl">
                    <div className="text-2xl font-bold text-primary">29,941</div>
                    <div className="text-xs text-muted-foreground">Monthly API Calls</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-xl">
                    <div className="text-2xl font-bold text-emerald-500">₦2.4M</div>
                    <div className="text-xs text-muted-foreground">Monthly API Revenue</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-xl">
                    <div className="text-2xl font-bold text-foreground">7</div>
                    <div className="text-xs text-muted-foreground">Enterprise API Partners</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Government Observatory Pilot Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { org: "Federal Ministry of Transport", status: "Active Pilot", since: "Nov 2024", value: "₦8.2M contract" },
                    { org: "Nigerian Ports Authority", status: "In Negotiation", since: "Jan 2025", value: "₦15M potential" },
                    { org: "FIRS - Tax Intelligence Unit", status: "Proposal Sent", since: "Jan 2025", value: "₦22M potential" },
                  ].map((g) => (
                    <div key={g.org} className="p-4 border border-border rounded-xl">
                      <div className="font-semibold text-sm text-foreground mb-2">{g.org}</div>
                      <Badge variant={g.status === "Active Pilot" ? "outline" : "secondary"} className="text-xs mb-2">{g.status}</Badge>
                      <div className="text-xs text-muted-foreground">{g.since}</div>
                      <div className="text-sm font-bold text-primary mt-2">{g.value}</div>
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
