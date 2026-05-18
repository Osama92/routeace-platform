import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, DollarSign, Globe, Shield, BarChart3, Zap, Lock,
  Activity, Target, Layers, Database, Star, Award
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const FEATURE_FLAG = { investor_mode_v1: true };

// Live investor-mode datasets stream from the system analytics backend.
// Empty until wired so charts surface honest empty states.
const arrData: Array<{ month: string; arr: number; mrr: number; growth: number }> = [];
const corridorRevData: Array<{ corridor: string; revenue: number; margin: number; volume: number }> = [];
const marketPenetrationData: Array<{ name: string; penetration: number; color: string }> = [];

const RADIAN = Math.PI / 180;

const volumeGrowthData: Array<{ month: string; trips: number; yoy: number }> = [];
const unitEconomicsData: Array<{ metric: string; value: string; trend: string; positive: boolean }> = [];


export default function SystemInvestorMode() {
  if (!FEATURE_FLAG.investor_mode_v1) {
    return (
      <DashboardLayout title="Investor Intelligence Mode" subtitle="Restricted">
        <div className="flex items-center justify-center h-64">
          <Lock className="w-12 h-12 text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Investor Intelligence Mode"
      subtitle="Infrastructure Metrics - /system/investor-mode | Board-Grade Only"
    >
      {/* Headline Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "ARR", value: "₦26.9M", trend: "+8.5% MoM", icon: DollarSign, color: "text-primary" },
          { label: "Insurance Attach Rate", value: "31%", trend: "+3pp", icon: Shield, color: "text-emerald-500" },
          { label: "Corridor Coverage", value: "73%", trend: "+6%", icon: Globe, color: "text-blue-500" },
          { label: "AI Optimization Impact", value: "₦4.2M", trend: "saved/mo", icon: Zap, color: "text-amber-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <Badge variant="outline" className="text-xs text-emerald-600">{kpi.trend}</Badge>
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="growth">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="growth">ARR Growth</TabsTrigger>
          <TabsTrigger value="corridor">Corridor Revenue</TabsTrigger>
          <TabsTrigger value="market">Market Penetration</TabsTrigger>
          <TabsTrigger value="unit">Unit Economics</TabsTrigger>
          <TabsTrigger value="data">Data Depth</TabsTrigger>
        </TabsList>

        {/* ARR Growth */}
        <TabsContent value="growth">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  ARR Growth Trajectory (₦M)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={arrData}>
                    <defs>
                      <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="arr" stroke="hsl(var(--primary))" fill="url(#arrGrad)" strokeWidth={2.5} name="ARR (₦M)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Freight Volume Growth</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={volumeGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Growth Rate Milestones</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "$25M ARR Target", current: 26.9, target: 25, unit: "₦M - ✓ Achieved" },
                  { label: "30% Insurance Attach Rate", current: 31, target: 30, unit: "% - ✓ Achieved" },
                  { label: "40% Corridor Coverage", current: 73, target: 40, unit: "% - ✓ Exceeded" },
                  { label: "Gov Observatory Pilots (2–3)", current: 1, target: 3, unit: " pilot - In Progress" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{m.label}</span>
                      <span className="text-muted-foreground text-xs">{m.current}{m.unit}</span>
                    </div>
                    <Progress value={Math.min((m.current / m.target) * 100, 100)} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Corridor Revenue */}
        <TabsContent value="corridor">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Revenue per Corridor (₦M/month)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={corridorRevData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="corridor" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue (₦M)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {corridorRevData.map((c) => (
              <Card key={c.corridor}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-foreground text-sm">{c.corridor}</div>
                      <div className="text-xs text-muted-foreground">{c.volume.toLocaleString()} trips/mo</div>
                    </div>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">{c.margin}% margin</Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">₦{c.revenue}M</div>
                  <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                  <Progress value={(c.revenue / 8.4) * 100} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Market Penetration */}
        <TabsContent value="market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Market Penetration by State</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={marketPenetrationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="penetration"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}%`}
                      labelLine={false}
                    >
                      {marketPenetrationData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Cross-Region Expansion Index</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { region: "Nigeria (Core)", index: 73, status: "Active" },
                  { region: "EU Corridors", index: 42, status: "Expanding" },
                  { region: "GCC Markets", index: 28, status: "Early Stage" },
                  { region: "US Interstate", index: 18, status: "Pilot" },
                  { region: "Belt & Road", index: 12, status: "Research" },
                ].map((r) => (
                  <div key={r.region}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground">{r.region}</span>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="text-xs">{r.status}</Badge>
                        <span className="text-sm font-bold text-foreground">{r.index}%</span>
                      </div>
                    </div>
                    <Progress value={r.index} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">EU Expansion Index</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                  {[
                    { corridor: "Rhine–Alpine", coverage: 78 },
                    { corridor: "Scandinavian–Med", coverage: 62 },
                    { corridor: "North Sea–Baltic", coverage: 55 },
                    { corridor: "Atlantic", coverage: 48 },
                    { corridor: "Baltic–Adriatic", coverage: 41 },
                    { corridor: "Orient/East-Med", coverage: 35 },
                  ].map((c) => (
                    <div key={c.corridor} className="p-3 border border-border rounded-xl">
                      <div className="text-xl font-bold text-primary">{c.coverage}%</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.corridor}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Unit Economics */}
        <TabsContent value="unit">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-4 h-4 text-amber-500" />
                  Unit Economics Dashboard - Investor Grade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {unitEconomicsData.map((u) => (
                    <div key={u.metric} className="text-center p-5 border border-border rounded-xl">
                      <div className="text-3xl font-bold text-foreground">{u.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{u.metric}</div>
                      <Badge variant="outline" className={`mt-2 text-xs ${u.positive ? "text-emerald-600 border-emerald-300" : "text-destructive border-destructive/30"}`}>
                        {u.trend}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Margin per Vehicle</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { type: "20T Rigid HGV", margin: 42000 },
                    { type: "15T Medium", margin: 31000 },
                    { type: "Container", margin: 58000 },
                    { type: "Van (< 5T)", margin: 18000 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="type" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`₦${(v / 1000).toFixed(0)}K`, "Margin"]} />
                    <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Revenue Diversification Score</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { stream: "Dispatch SaaS", pct: 52, amount: "₦14.0M ARR" },
                  { stream: "Insurance Premiums", pct: 22, amount: "₦5.9M ARR" },
                  { stream: "Gov API Revenue", pct: 10, amount: "₦2.7M ARR" },
                  { stream: "White-Label Licenses", pct: 9, amount: "₦2.4M ARR" },
                  { stream: "ERP Integrations", pct: 7, amount: "₦1.9M ARR" },
                ].map((s) => (
                  <div key={s.stream}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{s.stream}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground">{s.amount}</span>
                        <span className="font-bold text-foreground">{s.pct}%</span>
                      </div>
                    </div>
                    <Progress value={s.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Depth Index */}
        <TabsContent value="data">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4 text-primary" />
                  Data Depth Index - Competitive Moat Measurement
                  <Badge variant="secondary" className="ml-2 text-xs">Internal Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center mb-6">
                  {[
                    { label: "Risk Model Accuracy", value: "88%", icon: Target },
                    { label: "AI Optimization Impact", value: "₦4.2M", icon: Zap },
                    { label: "Data Points Collected", value: "1.2M+", icon: Database },
                    { label: "Avg Haul Distance Growth", value: "+18%", icon: TrendingUp },
                    { label: "Corridor Dominance Score", value: "78/100", icon: Star },
                    { label: "Geopolitical Exposure", value: "22%", icon: Globe },
                  ].map((d) => (
                    <div key={d.label} className="p-4 border border-border rounded-xl">
                      <d.icon className="w-4 h-4 mx-auto mb-2 text-primary" />
                      <div className="text-xl font-bold text-foreground">{d.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{d.label}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    AI Board Narrative
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    RouteAce has crossed the infrastructure threshold. With 1.2M+ data points, 88% risk model accuracy, and proprietary corridor intelligence across 6 global regions, the platform now operates as a <strong className="text-foreground">freight intelligence utility</strong> - not a dispatch tool. The data moat compounds monthly. Every route dispatched improves prediction accuracy. Every SLA breach detected improves the insurance model. This self-reinforcing data flywheel is the primary competitive defence at Series A and beyond.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
