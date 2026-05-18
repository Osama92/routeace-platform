import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, DollarSign, Shield, Globe, BarChart3, Zap, Lock,
  Activity, Layers, Award, Target, Landmark, LineChart as LineChartIcon,
  Fuel, AlertTriangle, CheckCircle, Clock, FileText
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { useRegion } from "@/contexts/RegionContext";

const FEATURE_FLAG = { freight_financialization_v1: true };

// Live freight-financialization datasets stream from the FBN backend. Empty
// until wired so charts and tables surface honest empty states.
const corridorYieldData: Array<{ corridor: string; margin: number; volumeStability: number; riskHedge: number; insurance: number; fuelVol: number; yield: number; rating: string }> = [];
const yieldTrendData: Array<{ month: string; lagosKano: number; lagosph: number; rotterdam: number; dubai: number }> = [];
const noteOfferings: Array<{ id: string; name: string; aum: string; yield: string; tenor: string; rating: string; status: string; investors: number }> = [];
const hedgingScenarios: Array<{ scenario: string; marginImpact: number; hedgeCost: number; netExposure: number }> = [];
const radarStability: Array<{ subject: string; A: number; fullMark: number }> = [];


const getRatingColor = (rating: string) => {
  if (rating.startsWith("AAA")) return "text-emerald-500";
  if (rating.startsWith("AA")) return "text-blue-500";
  if (rating.startsWith("A")) return "text-primary";
  if (rating.startsWith("BB")) return "text-amber-500";
  return "text-destructive";
};

export default function FreightFinancialization() {
  const [activeTab, setActiveTab] = useState("yield");
  const { isNGMode } = useRegion();

  if (!FEATURE_FLAG.freight_financialization_v1) {
    return (
      <DashboardLayout title="Freight Financialization" subtitle="System Module">
        <div className="flex items-center justify-center h-64">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Freight Financialization Layer" subtitle="Turning Freight Flows Into Yield Instruments - /system/freight-financialization">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total AUM", value: "$67.3M", icon: DollarSign, trend: "+34%", color: "text-primary" },
          { label: "Avg Corridor Yield", value: "12.4%", icon: TrendingUp, trend: "+1.2pp", color: "text-emerald-500" },
          { label: "Active Notes", value: "4", icon: FileText, trend: "+2 new", color: "text-blue-500" },
          { label: "Hedge Coverage", value: "72%", icon: Shield, trend: "+8%", color: "text-amber-500" },
          { label: "Investor Count", value: "39", icon: Landmark, trend: "+11", color: "text-primary" },
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
          <TabsTrigger value="yield">Corridor Yield Index</TabsTrigger>
          <TabsTrigger value="stability">Stability Rating</TabsTrigger>
          <TabsTrigger value="notes">Freight-Backed Notes</TabsTrigger>
          <TabsTrigger value="hedging">Treasury Hedging</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        {/* Corridor Yield Index */}
        <TabsContent value="yield">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChartIcon className="w-4 h-4 text-primary" />
                  Corridor Yield Trend (6-Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={yieldTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="lagosKano" stroke="#6366f1" strokeWidth={2} name="Lagos–Kano" dot={false} />
                    <Line type="monotone" dataKey="lagosph" stroke="#10b981" strokeWidth={2} name="Lagos–PH" dot={false} />
                    <Line type="monotone" dataKey="rotterdam" stroke="#3b82f6" strokeWidth={2} name="Rotterdam–Warsaw" dot={false} />
                    <Line type="monotone" dataKey="dubai" stroke="#f59e0b" strokeWidth={2} name="Dubai–Muscat" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Corridor Yield Matrix - Expected Yield = (Margin × Volume Stability) – (Risk + Insurance + Fuel)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Corridor</th>
                        <th className="text-center py-2 font-medium">Margin %</th>
                        <th className="text-center py-2 font-medium">Vol Stability</th>
                        <th className="text-center py-2 font-medium">Risk Cost</th>
                        <th className="text-center py-2 font-medium">Insurance</th>
                        <th className="text-center py-2 font-medium">Fuel Vol</th>
                        <th className="text-center py-2 font-medium">Net Yield</th>
                        <th className="text-center py-2 font-medium">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corridorYieldData.map((c) => (
                        <tr key={c.corridor} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{c.corridor}</td>
                          <td className="py-3 text-center text-foreground">{c.margin}%</td>
                          <td className="py-3 text-center text-emerald-500 font-bold">{c.volumeStability}</td>
                          <td className="py-3 text-center text-destructive">{c.riskHedge}%</td>
                          <td className="py-3 text-center text-muted-foreground">{c.insurance}%</td>
                          <td className="py-3 text-center text-amber-500">{c.fuelVol}%</td>
                          <td className="py-3 text-center">
                            <span className={`font-bold text-lg ${c.yield > 0 ? "text-emerald-500" : "text-destructive"}`}>{c.yield > 0 ? "+" : ""}{c.yield}%</span>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={`font-bold ${getRatingColor(c.rating)}`}>{c.rating}</Badge>
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

        {/* Stability Rating */}
        <TabsContent value="stability">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Corridor Stability Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarStability}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Rating Methodology</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { rating: "AAA", desc: "Institutional-grade. Stable volume, low risk, regulated market.", color: "text-emerald-500" },
                  { rating: "AA+/AA", desc: "High quality. Strong stability with moderate risk factors.", color: "text-blue-500" },
                  { rating: "A+/A", desc: "Investment-grade. Good fundamentals with manageable volatility.", color: "text-primary" },
                  { rating: "BBB", desc: "Moderate. Viable but with notable risk concentration.", color: "text-amber-500" },
                  { rating: "BB/B", desc: "Speculative. High volatility, political risk, or regulatory gaps.", color: "text-destructive" },
                ].map((r) => (
                  <div key={r.rating} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                    <Badge variant="outline" className={`font-bold text-sm ${r.color}`}>{r.rating}</Badge>
                    <span className="text-sm text-muted-foreground">{r.desc}</span>
                  </div>
                ))}
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                  Ratings derived from: Delay volatility, theft probability, political exposure, regulatory stability, insurance loss ratio.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Freight-Backed Notes */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="w-4 h-4 text-primary" />
                  Freight-Backed Notes - Active Offerings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {noteOfferings.map((note) => (
                    <div key={note.id} className="p-4 border border-border rounded-xl flex items-center justify-between hover:bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{note.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{note.id}</span>
                            <span>•</span>
                            <span>{note.tenor} tenor</span>
                            <span>•</span>
                            <span>{note.investors} investors</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xl font-bold text-foreground">{note.aum}</div>
                          <div className="text-xs text-muted-foreground">AUM</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-500">{note.yield}</div>
                          <div className="text-xs text-muted-foreground">Yield</div>
                        </div>
                        <Badge variant="outline" className={`font-bold ${getRatingColor(note.rating)}`}>{note.rating}</Badge>
                        <Badge variant={note.status === "Open" ? "outline" : "secondary"}>{note.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Investor Segments</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "Institutional Investors", count: 14, aum: "$32.4M", pct: 48 },
                  { type: "Trade Finance Funds", count: 11, aum: "$18.6M", pct: 28 },
                  { type: "Sovereign Wealth", count: 3, aum: "$12.1M", pct: 18 },
                  { type: "Impact / ESG Funds", count: 11, aum: "$4.2M", pct: 6 },
                ].map((s) => (
                  <div key={s.type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{s.type} ({s.count})</span>
                      <span className="font-bold text-foreground">{s.aum}</span>
                    </div>
                    <Progress value={s.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Underlying Asset Composition</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { asset: "Freight Contracts", pct: 42 },
                  { asset: "Dispatch Revenue Streams", pct: 28 },
                  { asset: "Insurance Premium Pools", pct: 18 },
                  { asset: "Margin Stability Reserves", pct: 12 },
                ].map((a) => (
                  <div key={a.asset}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{a.asset}</span>
                      <span className="font-bold text-foreground">{a.pct}%</span>
                    </div>
                    <Progress value={a.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Treasury Hedging */}
        <TabsContent value="hedging">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-4 h-4 text-primary" />
                  Hedging Scenario Simulation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Stress Scenario</th>
                        <th className="text-center py-2 font-medium">Margin Impact</th>
                        <th className="text-center py-2 font-medium">Hedge Cost</th>
                        <th className="text-center py-2 font-medium">Net Exposure</th>
                        <th className="text-center py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hedgingScenarios.map((h) => (
                        <tr key={h.scenario} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{h.scenario}</td>
                          <td className="py-3 text-center text-destructive font-bold">{h.marginImpact}%</td>
                          <td className="py-3 text-center text-amber-500">{h.hedgeCost}%</td>
                          <td className="py-3 text-center text-destructive font-bold">{h.netExposure}%</td>
                          <td className="py-3 text-center">
                            {Math.abs(h.netExposure) < 5 ? (
                              <Badge variant="outline" className="text-emerald-600">Hedged</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-amber-600">Partial</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Fuel Hedging Simulation</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={[
                    { month: "Feb", spot: 950, hedge: 920 },
                    { month: "Mar", spot: 1020, hedge: 925 },
                    { month: "Apr", spot: 980, hedge: 930 },
                    { month: "May", spot: 1100, hedge: 935 },
                    { month: "Jun", spot: 1050, hedge: 940 },
                    { month: "Jul", spot: 1150, hedge: 945 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="spot" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Spot Price" strokeWidth={2} />
                    <Area type="monotone" dataKey="hedge" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Hedged Price" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm">
                  <div className="font-semibold text-emerald-600">Hedge saves {isNGMode ? "₦18.4M" : "$48K"}/month at current fuel volatility</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Working Capital Score</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-6xl font-bold text-primary">B+</div>
                  <div className="text-muted-foreground mt-2">Working Capital Financing Score</div>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {[
                      { label: "Cash Runway", value: "8.2 mo" },
                      { label: "Receivables Aging", value: "28 days" },
                      { label: "Debt/Equity", value: "0.42" },
                      { label: "DSCR", value: "2.8x" },
                    ].map(m => (
                      <div key={m.label} className="p-3 bg-muted/30 rounded-lg text-center">
                        <div className="font-bold text-foreground">{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Governance */}
        <TabsContent value="governance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Compliance Framework</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { framework: "IFRS 9 - Financial Instruments", status: "Compliant", icon: CheckCircle },
                  { framework: "IFRS 15 - Revenue Recognition", status: "Compliant", icon: CheckCircle },
                  { framework: "Basel III - Capital Adequacy", status: "In Progress", icon: Clock },
                  { framework: "AML/KYC - Anti-Money Laundering", status: "Compliant", icon: CheckCircle },
                  { framework: "SOX - Sarbanes-Oxley Act", status: "Audit Ready", icon: CheckCircle },
                  { framework: "SEC - Securities Filing", status: "Pending", icon: AlertTriangle },
                ].map((f) => (
                  <div key={f.framework} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.status === "Compliant" || f.status === "Audit Ready" ? "text-emerald-500" : f.status === "In Progress" ? "text-amber-500" : "text-destructive"}`} />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">{f.framework}</div>
                    </div>
                    <Badge variant={f.status === "Compliant" || f.status === "Audit Ready" ? "outline" : "secondary"} className="text-xs">
                      {f.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">SPV Structuring</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="font-semibold text-foreground mb-2">Special Purpose Vehicle (SPV)</div>
                  <div className="text-sm text-muted-foreground">
                    Each Freight-Backed Note is issued through an isolated SPV structure, ensuring bankruptcy remoteness and asset ring-fencing. Investor capital flows directly into pooled freight receivables managed by an independent trustee.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Active SPVs", value: "4" },
                    { label: "Total Issuance", value: "$67.3M" },
                    { label: "Default Rate", value: "0.0%" },
                    { label: "Avg Maturity", value: "12 mo" },
                  ].map(m => (
                    <div key={m.label} className="p-3 border border-border rounded-lg text-center">
                      <div className="font-bold text-foreground">{m.value}</div>
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
