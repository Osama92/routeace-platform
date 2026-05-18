import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, Shield, TrendingUp, Fuel, Clock, MapPin,
  Package, DollarSign, Zap, RefreshCw, Lock, CheckCircle,
  XCircle, AlertOctagon
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PolarRadiusAxis, Cell
} from "recharts";

const FEATURE_FLAG = { risk_hedge_engine_v1: true };

const riskIndexData = [
  { month: "Aug", delayRisk: 42, fuelRisk: 55, slaRisk: 38, theftRisk: 22, political: 15 },
  { month: "Sep", delayRisk: 48, fuelRisk: 61, slaRisk: 41, theftRisk: 25, political: 18 },
  { month: "Oct", delayRisk: 55, fuelRisk: 72, slaRisk: 52, theftRisk: 28, political: 20 },
  { month: "Nov", delayRisk: 62, fuelRisk: 68, slaRisk: 58, theftRisk: 31, political: 22 },
  { month: "Dec", delayRisk: 58, fuelRisk: 65, slaRisk: 49, theftRisk: 27, political: 19 },
  { month: "Jan", delayRisk: 51, fuelRisk: 74, slaRisk: 44, theftRisk: 24, political: 16 },
];

const corridorRiskData = [
  { corridor: "Lagos–Kano", riskIndex: 68, delay: 72, fuel: 65, theft: 55, sla: 70, political: 40 },
  { corridor: "Lagos–PH", riskIndex: 54, delay: 58, fuel: 70, theft: 35, sla: 52, political: 25 },
  { corridor: "Abuja–Kaduna", riskIndex: 45, delay: 42, fuel: 50, theft: 48, sla: 38, political: 35 },
  { corridor: "Lagos–Ibadan", riskIndex: 72, delay: 85, fuel: 60, theft: 30, sla: 78, political: 12 },
  { corridor: "Kano–Maiduguri", riskIndex: 81, delay: 65, fuel: 58, theft: 72, sla: 62, political: 75 },
];

const insurancePricingData = [
  { cargo: "FMCG", premium: 1.2, riskScore: 45, coverage: "₦50M" },
  { cargo: "Petroleum", premium: 2.8, riskScore: 72, coverage: "₦150M" },
  { cargo: "Electronics", premium: 3.5, riskScore: 80, coverage: "₦200M" },
  { cargo: "Agriculture", premium: 0.9, riskScore: 32, coverage: "₦30M" },
  { cargo: "Pharmaceuticals", premium: 2.1, riskScore: 61, coverage: "₦80M" },
  { cargo: "Construction", premium: 1.6, riskScore: 52, coverage: "₦60M" },
];

const radarData = [
  { subject: "Delay Risk", A: 62, B: 45, fullMark: 100 },
  { subject: "Fuel Volatility", A: 74, B: 50, fullMark: 100 },
  { subject: "SLA Breach", A: 58, B: 40, fullMark: 100 },
  { subject: "Political Risk", A: 35, B: 20, fullMark: 100 },
  { subject: "Cargo Theft", A: 48, B: 30, fullMark: 100 },
  { subject: "Weather Risk", A: 41, B: 25, fullMark: 100 },
];

const getRiskColor = (score: number) => {
  if (score >= 70) return "text-destructive";
  if (score >= 50) return "text-amber-500";
  return "text-emerald-500";
};

const getRiskLabel = (score: number) => {
  if (score >= 70) return "High";
  if (score >= 50) return "Medium-High";
  if (score >= 35) return "Medium";
  return "Low";
};

const getRiskBadgeVariant = (score: number): "destructive" | "secondary" | "outline" => {
  if (score >= 70) return "destructive";
  if (score >= 50) return "secondary";
  return "outline";
};

export default function RiskHedgeEngine() {
  const [selectedCorridor, setSelectedCorridor] = useState(corridorRiskData[0]);

  if (!FEATURE_FLAG.risk_hedge_engine_v1) {
    return (
      <DashboardLayout title="Risk Hedge Engine" subtitle="System Module">
        <div className="flex items-center justify-center h-64">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Risk Hedge Engine" subtitle="Route Risk Index - /system/risk-hedge-engine">
      {/* Overall Risk KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Delay Risk", value: 62, icon: Clock },
          { label: "Fuel Volatility", value: 74, icon: Fuel },
          { label: "SLA Breach Prob.", value: 58, icon: AlertTriangle },
          { label: "Cargo Theft Risk", value: 48, icon: Package },
          { label: "Political Risk", value: 35, icon: MapPin },
        ].map((risk) => (
          <Card key={risk.label} className="border-border">
            <CardContent className="p-4 text-center">
              <risk.icon className={`w-5 h-5 mx-auto mb-2 ${getRiskColor(risk.value)}`} />
              <div className={`text-3xl font-bold ${getRiskColor(risk.value)}`}>{risk.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{risk.label}</div>
              <Badge variant={getRiskBadgeVariant(risk.value)} className="text-xs mt-2">{getRiskLabel(risk.value)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Risk Alert */}
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl mb-6 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-foreground">Route Risk: Medium-High (68) - Active Alert</div>
          <div className="text-sm text-muted-foreground mt-1">Fuel volatility spike on Lagos–Kano corridor + North corridor disruption detected. Insurance premium predictor advises 2.1% uplift. Consider rerouting 30% of loads via Abuja axis.</div>
        </div>
        <Button variant="outline" size="sm" className="ml-auto flex-shrink-0">
          <RefreshCw className="w-3 h-3 mr-1" /> Recalculate
        </Button>
      </div>

      <Tabs defaultValue="index">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="index">Risk Index Trends</TabsTrigger>
          <TabsTrigger value="corridor">Corridor Risk Map</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Pricing</TabsTrigger>
          <TabsTrigger value="radar">Risk Radar</TabsTrigger>
          <TabsTrigger value="claims">Claim Automation</TabsTrigger>
        </TabsList>

        {/* Risk Index Trends */}
        <TabsContent value="index">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Multi-Dimensional Risk Index (6-Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={riskIndexData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="delayRisk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Delay Risk" strokeWidth={2} />
                    <Area type="monotone" dataKey="fuelRisk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} name="Fuel Risk" strokeWidth={2} />
                    <Area type="monotone" dataKey="slaRisk" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="SLA Risk" strokeWidth={2} />
                    <Area type="monotone" dataKey="theftRisk" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} name="Theft Risk" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Risk Factor Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Fuel Volatility", score: 74, weight: "25%" },
                  { label: "Delay Risk", score: 62, weight: "20%" },
                  { label: "SLA Breach Probability", score: 58, weight: "20%" },
                  { label: "Cargo Theft", score: 48, weight: "15%" },
                  { label: "Political Instability", score: 35, weight: "10%" },
                  { label: "Weather Risk", score: 41, weight: "10%" },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{r.label}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground">{r.weight}</span>
                        <span className={`font-bold text-sm ${getRiskColor(r.score)}`}>{r.score}</span>
                      </div>
                    </div>
                    <Progress value={r.score} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Composite Route Risk Index</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-7xl font-bold text-amber-500">68</div>
                  <div className="text-muted-foreground mt-2">Route Risk Index (0–100)</div>
                  <Badge className="mt-3 bg-amber-500/20 text-amber-700 border-amber-500/30 text-sm px-3 py-1">
                    Medium-High Risk
                  </Badge>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="font-bold text-foreground">₦4.2M</div>
                      <div className="text-xs text-muted-foreground">Projected exposure</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="font-bold text-foreground">2.1%</div>
                      <div className="text-xs text-muted-foreground">Recommended premium</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Corridor Risk Map */}
        <TabsContent value="corridor">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Select Corridor</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {corridorRiskData.map((c) => (
                  <button
                    key={c.corridor}
                    onClick={() => setSelectedCorridor(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedCorridor.corridor === c.corridor
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{c.corridor}</span>
                      <span className={`text-sm font-bold ${getRiskColor(c.riskIndex)}`}>{c.riskIndex}</span>
                    </div>
                    <Progress value={c.riskIndex} className="h-1 mt-2" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {selectedCorridor.corridor}
                  <Badge variant={getRiskBadgeVariant(selectedCorridor.riskIndex)}>
                    Risk: {selectedCorridor.riskIndex}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Delay Risk", value: selectedCorridor.delay, icon: Clock },
                    { label: "Fuel Risk", value: selectedCorridor.fuel, icon: Fuel },
                    { label: "Theft Risk", value: selectedCorridor.theft, icon: Package },
                    { label: "SLA Risk", value: selectedCorridor.sla, icon: AlertTriangle },
                    { label: "Political Risk", value: selectedCorridor.political, icon: MapPin },
                    { label: "Composite Score", value: selectedCorridor.riskIndex, icon: Shield },
                  ].map((m) => (
                    <div key={m.label} className="p-3 border border-border rounded-lg text-center">
                      <m.icon className={`w-4 h-4 mx-auto mb-1 ${getRiskColor(m.value)}`} />
                      <div className={`text-2xl font-bold ${getRiskColor(m.value)}`}>{m.value}</div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="font-semibold text-sm text-foreground mb-2">AI Hedge Recommendation</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCorridor.riskIndex >= 70
                      ? `HIGH ALERT: Consider insurance premium uplift of 2.8%. Activate real-time driver tracking and fuel pre-purchase protocol for ${selectedCorridor.corridor}.`
                      : `MONITOR: ${selectedCorridor.corridor} is within acceptable range. Set automated trigger at risk index > 70 for escalation.`
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insurance Pricing */}
        <TabsContent value="insurance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-4 h-4 text-primary" />
                  Embedded Insurance Pricing Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Cargo Type</th>
                        <th className="text-center py-2 font-medium">Risk Score</th>
                        <th className="text-center py-2 font-medium">Premium Rate</th>
                        <th className="text-center py-2 font-medium">Max Coverage</th>
                        <th className="text-center py-2 font-medium">Underwriting</th>
                        <th className="text-center py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurancePricingData.map((r) => (
                        <tr key={r.cargo} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{r.cargo}</td>
                          <td className="py-3 text-center">
                            <Badge variant={getRiskBadgeVariant(r.riskScore)} className="text-xs">{r.riskScore}</Badge>
                          </td>
                          <td className="py-3 text-center font-bold text-foreground">{r.premium}%</td>
                          <td className="py-3 text-center text-muted-foreground">{r.coverage}</td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {r.riskScore < 70 ? (
                                <><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-600">Auto-Approved</span></>
                              ) : (
                                <><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-xs text-amber-600">Manual Review</span></>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <Button variant="outline" size="sm" className="text-xs h-7">Issue Policy</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Dynamic Underwriting Rules</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { rule: "Risk Score < 40", action: "Auto-approve, standard rate", status: "active" },
                  { rule: "Risk Score 40–69", action: "Auto-approve with uplift", status: "active" },
                  { rule: "Risk Score 70–84", action: "Manual review required", status: "warning" },
                  { rule: "Risk Score ≥ 85", action: "Decline or special terms", status: "error" },
                  { rule: "Theft Zone Active", action: "+0.5% premium surcharge", status: "active" },
                  { rule: "SLA Breach > 15%", action: "Coverage limit reduced 20%", status: "warning" },
                ].map((r) => (
                  <div key={r.rule} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      r.status === "active" ? "bg-emerald-500" : r.status === "warning" ? "bg-amber-500" : "bg-destructive"
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-xs text-foreground">{r.rule}</div>
                      <div className="text-xs text-muted-foreground">{r.action}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Insurance Revenue Projection</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">₦28.4M</div>
                      <div className="text-xs text-muted-foreground">Annual Premium Revenue</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
                      <div className="text-2xl font-bold text-emerald-600">31%</div>
                      <div className="text-xs text-muted-foreground">Attach Rate</div>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-1">30% Insurance Attach Rate Goal</div>
                    <Progress value={31} className="h-3" />
                    <div className="text-xs text-emerald-600 mt-1">✓ Target achieved - 31% attach rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Radar */}
        <TabsContent value="radar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Risk Comparison Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Current Risk" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Hedged Scenario" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center mt-2">
                  <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-destructive" /> Current Risk</div>
                  <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Hedged Scenario</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Autonomous Dispatch Override Logic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="font-medium text-sm text-foreground mb-1">AI Auto-Assign Engine</div>
                  <div className="text-xs text-muted-foreground mb-3">Dispatch assigned automatically based on weighted scoring:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Nearest Vehicle", weight: "25%" },
                      { label: "Profit Margin", weight: "20%" },
                      { label: "SLA Urgency", weight: "20%" },
                      { label: "Driver Rating", weight: "15%" },
                      { label: "Fuel Optimization", weight: "10%" },
                      { label: "Risk Index", weight: "10%" },
                    ].map((f) => (
                      <div key={f.label} className="flex justify-between p-1.5 bg-background rounded border border-border">
                        <span className="text-foreground">{f.label}</span>
                        <span className="font-bold text-primary">{f.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full" size="sm">
                  <Zap className="w-4 h-4 mr-2" /> Trigger Autonomous Dispatch
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  Manual Override
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Claim Automation */}
        <TabsContent value="claims">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Automated Claim Processing Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Claims Filed", value: "47", color: "text-foreground" },
                    { label: "Auto-Resolved", value: "31", color: "text-emerald-500" },
                    { label: "Under Review", value: "12", color: "text-amber-500" },
                    { label: "Declined", value: "4", color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-4 border border-border rounded-xl">
                      <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {[
                    { id: "CLM-0042", cargo: "Electronics - Kano route", amount: "₦4.2M", status: "auto-approved", days: 1 },
                    { id: "CLM-0041", cargo: "FMCG - Lagos–PH", amount: "₦890K", status: "auto-approved", days: 2 },
                    { id: "CLM-0040", cargo: "Petroleum - North corridor", amount: "₦12.1M", status: "manual-review", days: 5 },
                    { id: "CLM-0039", cargo: "Agriculture - Kano", amount: "₦320K", status: "declined", days: 3 },
                  ].map((c) => (
                    <div key={c.id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                      <div className="font-mono text-xs text-muted-foreground w-20">{c.id}</div>
                      <div className="flex-1 text-sm text-foreground">{c.cargo}</div>
                      <div className="font-bold text-foreground">{c.amount}</div>
                      <Badge variant={c.status === "auto-approved" ? "outline" : c.status === "manual-review" ? "secondary" : "destructive"} className="text-xs">
                        {c.status === "auto-approved" ? "✓ Auto" : c.status === "manual-review" ? "⏳ Review" : "✗ Declined"}
                      </Badge>
                      <div className="text-xs text-muted-foreground">{c.days}d</div>
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
