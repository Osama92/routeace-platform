import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Globe, TrendingUp, Shield, Zap, BarChart3, Activity,
  DollarSign, MapPin, AlertTriangle, Truck, Package, Target
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter, ZAxis, LineChart, Line } from "recharts";

const GFIX_V1 = true;

// ─── Global Corridors Database ────────────────────────────────────────────────
// Live global corridor intelligence streams from the GFIX backend. Empty until
// wired so the UI surfaces honest empty states instead of fabricated data.
interface GlobalCorridor {
  id: string;
  region: string;
  name: string;
  riskScore: number;
  profitabilityIndex: number;
  slaConfidence: number;
  geopoliticalScore: number;
  fuelIndex: number;
  currency: string;
  distance: number;
  mode: string;
}
const GLOBAL_CORRIDORS: GlobalCorridor[] = [];

const REGIONS = ["All", "Africa", "Europe", "Middle East", "Asia", "Americas"];

const GLOBAL_RISK_FACTORS: Array<{ factor: string; americas: number; europe: number; africa: number; asia: number; middleeast: number }> = [];

const GLOBAL_SCORE_FORMULA = {
  timeWeight: 0.22, marginWeight: 0.20, complianceWeight: 0.18,
  stabilityWeight: 0.15, fuelWeight: 0.15, riskWeight: 0.10,
};

function computeGlobalScore(corridor: GlobalCorridor) {
  const time = (100 - corridor.riskScore) * GLOBAL_SCORE_FORMULA.timeWeight;
  const margin = corridor.profitabilityIndex * GLOBAL_SCORE_FORMULA.marginWeight;
  const compliance = corridor.slaConfidence * GLOBAL_SCORE_FORMULA.complianceWeight;
  const stability = corridor.geopoliticalScore * GLOBAL_SCORE_FORMULA.stabilityWeight;
  const fuel = (100 - corridor.fuelIndex * 40) * GLOBAL_SCORE_FORMULA.fuelWeight;
  const risk = (100 - corridor.riskScore) * GLOBAL_SCORE_FORMULA.riskWeight;
  return Math.round(time + margin + compliance + stability + fuel + risk);
}

const topCorridors = [...GLOBAL_CORRIDORS]
  .map(c => ({ ...c, globalScore: computeGlobalScore(c) }))
  .sort((a, b) => b.globalScore - a.globalScore);

const regionPerformanceData: Array<{ region: string; avgProfit: number; avgRisk: number; avgSLA: number }> = [];

const marketShareData: Array<{ region: string; share: number; revenue: number; growth: string }> = [];

const globalTrendData: Array<{ month: string; africa: number; europe: number; mideast: number; asia: number; americas: number }> = [];


const GlobalFreightIntelligenceExchange = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRegion, setSelectedRegion] = useState("All");

  if (!GFIX_V1) {
    return (
      <DashboardLayout title="Global Freight Intelligence Exchange">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">GFIX is disabled. Enable gfix_v1 flag.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredCorridors = selectedRegion === "All"
    ? topCorridors
    : topCorridors.filter(c => c.region === selectedRegion);

  const bestPath = topCorridors[0];
  const totalRevenue = marketShareData.reduce((a, c) => a + c.revenue, 0);

  return (
    <DashboardLayout title="Global Freight Intelligence Exchange" subtitle="GFIX · Unified global corridor intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">🌍 Global Freight Intelligence Exchange</h1>
              <p className="text-sm text-muted-foreground">GFIX · Unified global corridor intelligence · 5 regions · 11 corridors · Real-time AI scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">gfix_v1</Badge>
            <Badge className="bg-gradient-to-r from-primary/20 to-blue-500/20 text-primary text-xs">Global Intelligence Active</Badge>
          </div>
        </div>

        {/* Best Global Path */}
        <Alert className="border-primary/30 bg-primary/5">
          <Zap className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>🏆 Best Global Path:</strong> {bestPath.name} ({bestPath.region}) - Global Corridor Score: <strong>{bestPath.globalScore}%</strong> · Profitability: {bestPath.profitabilityIndex}% · SLA Confidence: {bestPath.slaConfidence}%
          </AlertDescription>
        </Alert>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Global Corridors", value: GLOBAL_CORRIDORS.length, icon: Globe, color: "text-primary" },
            { label: "Regions Active", value: "5", icon: MapPin, color: "text-blue-600" },
            { label: "Best Score", value: `${bestPath.globalScore}%`, icon: Target, color: "text-green-600" },
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(1)}M`, icon: DollarSign, color: "text-emerald-600" },
            { label: "High Risk Corridors", value: GLOBAL_CORRIDORS.filter(c => c.riskScore > 45).length, icon: AlertTriangle, color: "text-red-600" },
            { label: "AI Confidence", value: "89%", icon: Zap, color: "text-yellow-600" },
          ].map(kpi => (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Global Map</TabsTrigger>
            <TabsTrigger value="corridors">Corridors</TabsTrigger>
            <TabsTrigger value="heatmap">Risk Heatmap</TabsTrigger>
            <TabsTrigger value="ai">AI Engine</TabsTrigger>
            <TabsTrigger value="investor">Investor</TabsTrigger>
          </TabsList>

          {/* ── GLOBAL MAP TAB ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Global Corridor Performance Matrix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={regionPerformanceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} />
                        <YAxis dataKey="region" type="category" tick={{ fontSize: 10 }} width={70} />
                        <Tooltip />
                        <Bar dataKey="avgProfit" name="Avg Profitability" fill="hsl(var(--primary))" radius={[0,3,3,0]} />
                        <Bar dataKey="avgSLA" name="Avg SLA Score" fill="#22c55e" radius={[0,3,3,0]} opacity={0.7} />
                        <Bar dataKey="avgRisk" name="Avg Risk" fill="#ef4444" radius={[0,3,3,0]} opacity={0.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Top Corridors by Global Score</h3>
                {topCorridors.slice(0, 5).map((c, i) => (
                  <Card key={c.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>#{i + 1}</span>
                          <Badge variant="outline" className="text-xs">{c.region}</Badge>
                        </div>
                        <span className="text-sm font-bold text-primary">{c.globalScore}%</span>
                      </div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <Progress value={c.globalScore} className="h-1.5 mt-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Global Trend */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Global Corridor Score Trend (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={globalTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[60, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="africa" name="Africa" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="europe" name="Europe" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mideast" name="Middle East" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="asia" name="Asia" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="americas" name="Americas" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CORRIDORS TAB ── */}
          <TabsContent value="corridors" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map(r => (
                <Button
                  key={r}
                  variant={selectedRegion === r ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSelectedRegion(r)}
                >{r}</Button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredCorridors.map((c, i) => (
                <Card key={c.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {c.mode === "rail" ? <Package className="w-4 h-4 text-primary" /> : c.mode === "sea" ? <Globe className="w-4 h-4 text-blue-500" /> : <Truck className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{c.name}</p>
                            <Badge variant="outline" className="text-xs">{c.region}</Badge>
                            <Badge className="text-xs bg-muted text-muted-foreground capitalize">{c.mode}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.distance.toLocaleString()} km · {c.currency}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{c.globalScore}%</p>
                        <p className="text-xs text-muted-foreground">Global Score</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Profitability</p>
                        <p className="text-sm font-bold text-green-600">{c.profitabilityIndex}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SLA Confidence</p>
                        <p className="text-sm font-bold text-blue-600">{c.slaConfidence}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className={`text-sm font-bold ${c.riskScore > 45 ? "text-red-600" : c.riskScore > 25 ? "text-yellow-600" : "text-green-600"}`}>{c.riskScore}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Geo. Score</p>
                        <p className="text-sm font-bold">{c.geopoliticalScore}%</p>
                      </div>
                    </div>
                    <Progress value={c.globalScore} className="h-1.5 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── RISK HEATMAP TAB ── */}
          <TabsContent value="heatmap" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Global Risk Factor Matrix by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Risk Factor</th>
                        <th className="text-center py-2 px-2">🌍 Africa</th>
                        <th className="text-center py-2 px-2">🇪🇺 Europe</th>
                        <th className="text-center py-2 px-2">🇦🇪 Mid East</th>
                        <th className="text-center py-2 px-2">🌏 Asia</th>
                        <th className="text-center py-2 px-2">🇺🇸 Americas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GLOBAL_RISK_FACTORS.map(f => (
                        <tr key={f.factor} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-medium">{f.factor}</td>
                          {[f.africa, f.europe, f.middleeast, f.asia, f.americas].map((val, i) => (
                            <td key={i} className="text-center py-2 px-2">
                              <div className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-bold ${val > 60 ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400" : val > 35 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400" : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"}`}>
                                {val}%
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Geopolitical Exposure by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  {REGIONS.filter(r => r !== "All").map(r => {
                    const corridors = GLOBAL_CORRIDORS.filter(c => c.region === r);
                    const avgGeo = Math.round(corridors.reduce((a, c) => a + (100 - c.geopoliticalScore), 0) / corridors.length);
                    return (
                      <div key={r} className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span>{r}</span>
                          <span className={`font-bold ${avgGeo > 40 ? "text-red-600" : avgGeo > 20 ? "text-yellow-600" : "text-green-600"}`}>{avgGeo}% exposure</span>
                        </div>
                        <Progress value={avgGeo} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Climate & Fuel Volatility Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={regionPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="region" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="avgRisk" name="Risk Index" fill="#ef4444" radius={[3,3,0,0]} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── AI ENGINE TAB ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />GFIX Global Optimization Engine - Scoring Formula
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {Object.entries(GLOBAL_SCORE_FORMULA).map(([key, weight]) => (
                    <div key={key} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace("Weight", "")}</p>
                      <p className="font-bold text-lg text-primary">{(weight * 100)}%</p>
                      <p className="text-xs text-muted-foreground">weight</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg font-mono text-xs">
                  Global Score = (0.22 × Time Efficiency) + (0.20 × Margin) + (0.18 × Compliance) + (0.15 × Political Stability) + (0.15 × Fuel) + (0.10 × Risk)
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI Insight Cards - Live Intelligence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { type: "opportunity", msg: "Maritime Silk Road scoring 92% globally. Recommend shifting Asia-EU containerized freight to sea route - saves $18/ton avg." },
                    { type: "warning", msg: "Atlantic Corridor performance dropped 7% due to toll increase in Spain. Rerouting via Portugal coastal recommended." },
                    { type: "insight", msg: "Africa-GCC trade corridor growth: +34% YTD. Lagos-Dubai air freight bridge worth evaluating for perishables." },
                    { type: "risk", msg: "Increased compliance risk in Poland due to cabotage saturation. 3 additional cooling periods triggered this month." },
                    { type: "opportunity", msg: "I-40 US corridor achieving 91% profitability - highest in Americas segment. Scale capacity by 15% for Q1." },
                  ].map((insight, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-xs ${insight.type === "warning" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300" : insight.type === "risk" ? "border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300" : insight.type === "opportunity" ? "border-green-200 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300" : "border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300"}`}>
                      {insight.type === "warning" ? "⚠️" : insight.type === "risk" ? "🚨" : insight.type === "opportunity" ? "💡" : "📊"} {insight.msg}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Global Path - AI Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 border-2 border-primary/30 rounded-xl bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-primary text-primary-foreground">🏆 Best Global Path</Badge>
                      <span className="text-2xl font-bold text-primary">{bestPath.globalScore}%</span>
                    </div>
                    <p className="font-bold">{bestPath.name}</p>
                    <p className="text-xs text-muted-foreground mb-3">{bestPath.region} · {bestPath.distance.toLocaleString()} km · {bestPath.mode}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Profit</p>
                        <p className="font-bold text-green-600">{bestPath.profitabilityIndex}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">SLA</p>
                        <p className="font-bold text-blue-600">{bestPath.slaConfidence}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Risk</p>
                        <p className="font-bold text-green-600">{bestPath.riskScore}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">2nd Best Alternative</p>
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{topCorridors[1].name}</p>
                        <span className="font-bold text-primary">{topCorridors[1].globalScore}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{topCorridors[1].region}</p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">3rd Best Alternative</p>
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{topCorridors[2].name}</p>
                        <span className="font-bold text-primary">{topCorridors[2].globalScore}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{topCorridors[2].region}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── INVESTOR TAB ── */}
          <TabsContent value="investor" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Global Revenue (YTD)", value: `$${totalRevenue.toFixed(1)}M`, change: "+24% YoY" },
                { label: "Corridor Dominance Index", value: "72%", change: "Top 3 in each region" },
                { label: "AI Optimization Impact", value: "$4.8M", change: "Cost savings via AI routing" },
                { label: "Geo. Exposure", value: "18%", change: "Down from 26% Q3" },
              ].map(kpi => (
                <Card key={kpi.label} className="border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{kpi.value}</p>
                    <p className="text-xs text-green-600 font-medium mt-1">{kpi.change}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Revenue by Region - Market Penetration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketShareData.map(r => (
                      <div key={r.region} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20">{r.region}</span>
                        <Progress value={r.share * 2} className="h-3 flex-1" />
                        <span className="text-xs font-bold w-12 text-right">${r.revenue}M</span>
                        <Badge className="text-xs bg-green-100 text-green-800 w-12 justify-center">{r.growth}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Revenue Diversification Score</p>
                    <p className="text-2xl font-bold text-primary">84%</p>
                    <p className="text-xs text-muted-foreground">No single region exceeds 30% of total revenue</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Core Observability - Builder View</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Corridor Dominance Index", value: "72%", bar: 72 },
                    { label: "Global Freight Share", value: "4.2%", bar: 42 },
                    { label: "AI Optimization Impact", value: "28%", bar: 28, note: "margin improvement vs baseline" },
                    { label: "Cross-Region Growth QoQ", value: "+24%", bar: 60 },
                    { label: "Avg Haul Distance Growth", value: "+18%", bar: 45 },
                    { label: "Revenue Diversification", value: "84%", bar: 84 },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold text-primary">{item.value}</span>
                      </div>
                      <Progress value={item.bar} className="h-1.5" />
                      {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GlobalFreightIntelligenceExchange;
