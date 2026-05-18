import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, TrendingUp, AlertTriangle, DollarSign, Zap, CheckCircle,
  XCircle, Clock, Package, Truck, Users, Globe, BarChart3,
  FileText, Lock, Activity, Star, Award, Eye, Target
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useRegion } from "@/contexts/RegionContext";

const FEATURE_FLAG = { insurance_marketplace_v1: true };

// Risk scoring data
const corridorRiskProfiles = [
  { corridor: "Lagos–Kano", delayProb: 0.42, theftIdx: 55, claimsRatio: 12.4, politicalRisk: 40, driverReliability: 82, riskScore: 68 },
  { corridor: "Lagos–PH", delayProb: 0.28, theftIdx: 35, claimsRatio: 8.2, politicalRisk: 25, driverReliability: 88, riskScore: 48 },
  { corridor: "Rotterdam–Warsaw", delayProb: 0.15, theftIdx: 18, claimsRatio: 4.1, politicalRisk: 12, driverReliability: 94, riskScore: 28 },
  { corridor: "Dubai–Muscat", delayProb: 0.10, theftIdx: 8, claimsRatio: 2.8, politicalRisk: 8, driverReliability: 96, riskScore: 18 },
  { corridor: "LA–Chicago", delayProb: 0.22, theftIdx: 25, claimsRatio: 6.5, politicalRisk: 5, driverReliability: 91, riskScore: 35 },
  { corridor: "Shanghai–Almaty", delayProb: 0.35, theftIdx: 42, claimsRatio: 11.2, politicalRisk: 52, driverReliability: 78, riskScore: 62 },
];

// Premium pricing model
const premiumTiers = [
  { cargo: "FMCG", baseRate: 0.8, riskMult: 1.0, cargoMod: 1.0, premium: 0.80, maxCoverage: "$500K" },
  { cargo: "Petroleum", baseRate: 0.8, riskMult: 2.3, cargoMod: 1.5, premium: 2.76, maxCoverage: "$2M" },
  { cargo: "Electronics", baseRate: 0.8, riskMult: 1.8, cargoMod: 1.8, premium: 2.59, maxCoverage: "$1.5M" },
  { cargo: "Agriculture", baseRate: 0.8, riskMult: 0.7, cargoMod: 0.8, premium: 0.45, maxCoverage: "$300K" },
  { cargo: "Pharmaceuticals", baseRate: 0.8, riskMult: 1.5, cargoMod: 2.0, premium: 2.40, maxCoverage: "$3M" },
  { cargo: "Hazardous Materials", baseRate: 0.8, riskMult: 3.0, cargoMod: 2.5, premium: 6.00, maxCoverage: "$5M" },
  { cargo: "Construction", baseRate: 0.8, riskMult: 1.2, cargoMod: 0.9, premium: 0.86, maxCoverage: "$800K" },
];

// Insurer bidding simulation
const insurerBids = [
  { insurer: "Leadway Assurance", premium: 2.1, coverage: "$1M", rating: 4.8, speed: "Instant", country: "NG" },
  { insurer: "AXA Mansard", premium: 2.4, coverage: "$1.5M", rating: 4.6, speed: "2h", country: "NG" },
  { insurer: "Lloyd's Syndicate", premium: 1.8, coverage: "$5M", rating: 4.9, speed: "4h", country: "GB" },
  { insurer: "Allianz Trade", premium: 2.0, coverage: "$3M", rating: 4.7, speed: "Instant", country: "DE" },
  { insurer: "Zurich Cargo", premium: 2.3, coverage: "$2M", rating: 4.5, speed: "1h", country: "CH" },
];

// Claims data
const claimsData = [
  { month: "Aug", filed: 18, validated: 14, paid: 12, fraudDetected: 2 },
  { month: "Sep", filed: 22, validated: 18, paid: 15, fraudDetected: 3 },
  { month: "Oct", filed: 15, validated: 13, paid: 11, fraudDetected: 1 },
  { month: "Nov", filed: 28, validated: 22, paid: 19, fraudDetected: 4 },
  { month: "Dec", filed: 32, validated: 26, paid: 22, fraudDetected: 5 },
  { month: "Jan", filed: 20, validated: 17, paid: 14, fraudDetected: 2 },
];

const lossRatioData = [
  { corridor: "Lagos–Kano", lossRatio: 68, premiumIncome: 4200, claimsPaid: 2856 },
  { corridor: "Lagos–PH", lossRatio: 42, premiumIncome: 3100, claimsPaid: 1302 },
  { corridor: "Rotterdam–Warsaw", lossRatio: 28, premiumIncome: 5800, claimsPaid: 1624 },
  { corridor: "Dubai–Muscat", lossRatio: 15, premiumIncome: 2200, claimsPaid: 330 },
  { corridor: "LA–Chicago", lossRatio: 35, premiumIncome: 4800, claimsPaid: 1680 },
];

const radarRisk = [
  { subject: "Delay Probability", A: 42, fullMark: 100 },
  { subject: "Theft Index", A: 55, fullMark: 100 },
  { subject: "Claims Ratio", A: 62, fullMark: 100 },
  { subject: "Political Risk", A: 40, fullMark: 100 },
  { subject: "Weather Risk", A: 35, fullMark: 100 },
  { subject: "Compliance Gap", A: 28, fullMark: 100 },
];

const getRiskColor = (score: number) => {
  if (score >= 60) return "text-destructive";
  if (score >= 40) return "text-amber-500";
  return "text-emerald-500";
};

const getRiskBadge = (score: number): "destructive" | "secondary" | "outline" => {
  if (score >= 60) return "destructive";
  if (score >= 40) return "secondary";
  return "outline";
};

export default function InsuranceMarketplace() {
  const [activeTab, setActiveTab] = useState("scoring");
  const [calcCargoValue, setCalcCargoValue] = useState("500000");
  const [calcCargo, setCalcCargo] = useState("FMCG");
  const [calcCorridor, setCalcCorridor] = useState("Lagos–Kano");
  const { isNGMode } = useRegion();

  if (!FEATURE_FLAG.insurance_marketplace_v1) {
    return (
      <DashboardLayout title="Insurance Marketplace" subtitle="System Module">
        <div className="flex items-center justify-center h-64">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const selectedCorridor = corridorRiskProfiles.find(c => c.corridor === calcCorridor) || corridorRiskProfiles[0];
  const selectedCargo = premiumTiers.find(c => c.cargo === calcCargo) || premiumTiers[0];
  const cargoVal = parseFloat(calcCargoValue) || 0;
  const calculatedPremium = cargoVal * (selectedCargo.premium / 100);
  const riskAdjustedPremium = calculatedPremium * (1 + selectedCorridor.riskScore / 200);

  return (
    <DashboardLayout title="Embedded Insurance Marketplace" subtitle="Freight Underwriting Intelligence Engine - /system/insurance-marketplace">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Active Policies", value: "1,247", icon: Shield, trend: "+18%", color: "text-primary" },
          { label: "Premium Income", value: isNGMode ? "₦142M" : "$3.8M", icon: DollarSign, trend: "+22%", color: "text-emerald-500" },
          { label: "Loss Ratio", value: "38%", icon: AlertTriangle, trend: "-4pp", color: "text-amber-500" },
          { label: "Claims Auto-Rate", value: "78%", icon: Zap, trend: "+12%", color: "text-blue-500" },
          { label: "Fraud Detected", value: "17", icon: Eye, trend: "this month", color: "text-destructive" },
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
          <TabsTrigger value="scoring">Risk Scoring</TabsTrigger>
          <TabsTrigger value="pricing">Premium Pricing</TabsTrigger>
          <TabsTrigger value="bidding">Insurer Bidding</TabsTrigger>
          <TabsTrigger value="claims">Claims Intelligence</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="loss">Loss Probability</TabsTrigger>
        </TabsList>

        {/* Dynamic Risk Scoring */}
        <TabsContent value="scoring">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-primary" />
                  Corridor Risk Profile Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Corridor</th>
                        <th className="text-center py-2 font-medium">Delay %</th>
                        <th className="text-center py-2 font-medium">Theft Idx</th>
                        <th className="text-center py-2 font-medium">Claims %</th>
                        <th className="text-center py-2 font-medium">Political</th>
                        <th className="text-center py-2 font-medium">Driver Score</th>
                        <th className="text-center py-2 font-medium">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corridorRiskProfiles.map((c) => (
                        <tr key={c.corridor} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{c.corridor}</td>
                          <td className="py-3 text-center text-muted-foreground">{(c.delayProb * 100).toFixed(0)}%</td>
                          <td className="py-3 text-center">
                            <Badge variant={getRiskBadge(c.theftIdx)} className="text-xs">{c.theftIdx}</Badge>
                          </td>
                          <td className="py-3 text-center text-muted-foreground">{c.claimsRatio}%</td>
                          <td className="py-3 text-center">
                            <Badge variant={getRiskBadge(c.politicalRisk)} className="text-xs">{c.politicalRisk}</Badge>
                          </td>
                          <td className="py-3 text-center text-emerald-500 font-bold">{c.driverReliability}</td>
                          <td className="py-3 text-center">
                            <span className={`text-lg font-bold ${getRiskColor(c.riskScore)}`}>{c.riskScore}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Radar - {selectedCorridor.corridor}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarRisk}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Risk" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Composite Risk Score</div>
                  <div className={`text-4xl font-bold ${getRiskColor(selectedCorridor.riskScore)}`}>{selectedCorridor.riskScore}</div>
                  <Badge variant={getRiskBadge(selectedCorridor.riskScore)} className="mt-1">
                    {selectedCorridor.riskScore >= 60 ? "High Risk" : selectedCorridor.riskScore >= 40 ? "Medium Risk" : "Low Risk"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">AI Risk Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Risk Score Formula</div>
                    <div className="text-sm text-muted-foreground mt-1 font-mono">
                      Risk = (Corridor Delay Probability × Cargo Value Weight) + (Theft Index × Historical Claims Ratio) + (Driver Reliability Adjustment) + (Political Risk Multiplier)
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Real-time recalculation every 15 minutes using live corridor telemetry, driver app submissions, and third-party risk feeds.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Premium Pricing AI */}
        <TabsContent value="pricing">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Premium Pricing Matrix - Base Rate × Risk Multiplier × Cargo Modifier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Cargo Type</th>
                        <th className="text-center py-2 font-medium">Base Rate</th>
                        <th className="text-center py-2 font-medium">Risk ×</th>
                        <th className="text-center py-2 font-medium">Cargo ×</th>
                        <th className="text-center py-2 font-medium">Final %</th>
                        <th className="text-center py-2 font-medium">Max Coverage</th>
                        <th className="text-center py-2 font-medium">Underwriting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {premiumTiers.map((t) => (
                        <tr key={t.cargo} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 font-medium text-foreground">{t.cargo}</td>
                          <td className="py-3 text-center text-muted-foreground">{t.baseRate}%</td>
                          <td className="py-3 text-center">
                            <Badge variant={t.riskMult >= 2.0 ? "destructive" : "secondary"} className="text-xs">{t.riskMult}×</Badge>
                          </td>
                          <td className="py-3 text-center text-muted-foreground">{t.cargoMod}×</td>
                          <td className="py-3 text-center font-bold text-foreground">{t.premium.toFixed(2)}%</td>
                          <td className="py-3 text-center text-muted-foreground">{t.maxCoverage}</td>
                          <td className="py-3 text-center">
                            {t.premium < 2.0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-emerald-600">Auto</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-amber-600">Review</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Premium Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Premium Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cargo Type</label>
                  <Select value={calcCargo} onValueChange={setCalcCargo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {premiumTiers.map(t => <SelectItem key={t.cargo} value={t.cargo}>{t.cargo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Corridor</label>
                  <Select value={calcCorridor} onValueChange={setCalcCorridor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {corridorRiskProfiles.map(c => <SelectItem key={c.corridor} value={c.corridor}>{c.corridor}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cargo Value ({isNGMode ? "₦" : "$"})</label>
                  <Input type="number" value={calcCargoValue} onChange={e => setCalcCargoValue(e.target.value)} />
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Premium</span>
                    <span className="font-bold text-foreground">{isNGMode ? "₦" : "$"}{calculatedPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Adjustment</span>
                    <span className="text-amber-500 font-medium">+{((selectedCorridor.riskScore / 200) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                    <span className="text-foreground">Final Premium</span>
                    <span className="text-primary">{isNGMode ? "₦" : "$"}{riskAdjustedPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                <Button className="w-full">Generate Quote</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Multi-Insurer Bidding */}
        <TabsContent value="bidding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-primary" />
                  Multi-Insurer Bidding - Real-Time API Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insurerBids.map((bid, idx) => (
                    <div key={bid.insurer} className={`p-4 border rounded-xl flex items-center justify-between ${idx === 0 ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{bid.insurer}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Globe className="w-3 h-3" /> {bid.country}
                            <span>•</span>
                            <Star className="w-3 h-3 text-amber-500" /> {bid.rating}
                            <span>•</span>
                            <Clock className="w-3 h-3" /> {bid.speed}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground">{bid.premium}%</div>
                          <div className="text-xs text-muted-foreground">Up to {bid.coverage}</div>
                        </div>
                        {idx === 0 ? (
                          <Badge className="bg-primary text-primary-foreground">Best Offer</Badge>
                        ) : (
                          <Button variant="outline" size="sm">Select</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Marketplace Flow</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: 1, label: "Fleet initiates shipment", status: "complete" },
                  { step: 2, label: "System calculates real-time risk score", status: "complete" },
                  { step: 3, label: "AI generates recommended premium range", status: "complete" },
                  { step: 4, label: "Insurers bid via API", status: "active" },
                  { step: 5, label: "Fleet selects insurer", status: "pending" },
                  { step: 6, label: "Policy auto-bound", status: "pending" },
                  { step: 7, label: "Claims auto-validated via telemetry", status: "pending" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.status === "complete" ? "bg-emerald-500 text-white" :
                      s.status === "active" ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>{s.step}</div>
                    <span className={`text-sm ${s.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{s.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Revenue Model</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { stream: "Commission per Policy", value: isNGMode ? "₦8.4M" : "$220K", pct: 42 },
                  { stream: "Risk Analytics Sub", value: isNGMode ? "₦5.2M" : "$140K", pct: 26 },
                  { stream: "Claims Intelligence", value: isNGMode ? "₦3.8M" : "$100K", pct: 19 },
                  { stream: "Premium Margin Share", value: isNGMode ? "₦2.6M" : "$70K", pct: 13 },
                ].map((r) => (
                  <div key={r.stream}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{r.stream}</span>
                      <span className="font-bold text-foreground">{r.value}</span>
                    </div>
                    <Progress value={r.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Claims Intelligence */}
        <TabsContent value="claims">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />
                  Claims Pipeline (6-Month Trend)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={claimsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="filed" fill="hsl(var(--muted-foreground))" name="Filed" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="validated" fill="hsl(var(--primary))" name="Validated" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="paid" fill="#10b981" name="Paid" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="fraudDetected" fill="#ef4444" name="Fraud" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Auto-Validation Engine</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { check: "GPS route matches dispatch", pass: true },
                  { check: "Delivery timestamp verified", pass: true },
                  { check: "Driver POD photo validated", pass: true },
                  { check: "Cargo weight within tolerance", pass: false },
                  { check: "No prior duplicate claim", pass: true },
                  { check: "Policy was active at incident time", pass: true },
                ].map((c) => (
                  <div key={c.check} className="flex items-center gap-2">
                    {c.pass ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    <span className="text-sm text-foreground">{c.check}</span>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="text-sm font-semibold text-emerald-600">5/6 checks passed - Auto-Approved</div>
                  <div className="text-xs text-muted-foreground mt-1">Cargo weight variance flagged for manual review</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Claims KPIs</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Avg Resolution", value: "3.2 days", color: "text-primary" },
                    { label: "Auto-Validate Rate", value: "78%", color: "text-emerald-500" },
                    { label: "Fraud Detection Rate", value: "94%", color: "text-amber-500" },
                    { label: "Claims Paid MTD", value: isNGMode ? "₦18.4M" : "$48K", color: "text-foreground" },
                  ].map(k => (
                    <div key={k.label} className="p-3 border border-border rounded-lg text-center">
                      <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fraud Detection */}
        <TabsContent value="fraud">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4 text-destructive" />
                  Fraud Detection AI - Anomaly Triggers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { id: "FRD-001", type: "Duplicate Claim", risk: 92, detail: "Same dispatch ID claimed by two entities", status: "Blocked" },
                    { id: "FRD-002", type: "GPS Mismatch", risk: 85, detail: "Claim location 180km from dispatch route", status: "Under Review" },
                    { id: "FRD-003", type: "Timestamp Anomaly", risk: 78, detail: "Claim filed before dispatch completion", status: "Blocked" },
                    { id: "FRD-004", type: "Value Inflation", risk: 71, detail: "Claimed value 3x higher than declared cargo", status: "Flagged" },
                    { id: "FRD-005", type: "Serial Claimant", risk: 65, detail: "Driver associated with 8 claims in 30 days", status: "Monitoring" },
                  ].map((f) => (
                    <div key={f.id} className="p-4 border border-border rounded-xl flex items-center justify-between hover:bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.risk >= 80 ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"}`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{f.id} - {f.type}</div>
                          <div className="text-xs text-muted-foreground">{f.detail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-lg font-bold ${getRiskColor(f.risk)}`}>{f.risk}</div>
                        <Badge variant={f.status === "Blocked" ? "destructive" : f.status === "Under Review" ? "secondary" : "outline"} className="text-xs">
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loss Probability */}
        <TabsContent value="loss">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Corridor Loss Ratio Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={lossRatioData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="corridor" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="premiumIncome" fill="hsl(var(--primary))" name="Premium Income ($K)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="claimsPaid" fill="#ef4444" name="Claims Paid ($K)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {lossRatioData.map((l) => (
              <Card key={l.corridor}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-semibold text-foreground text-sm">{l.corridor}</div>
                    <Badge variant={l.lossRatio >= 60 ? "destructive" : l.lossRatio >= 40 ? "secondary" : "outline"}>
                      {l.lossRatio}% loss
                    </Badge>
                  </div>
                  <Progress value={l.lossRatio} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Premium: ${l.premiumIncome.toLocaleString()}</span>
                    <span>Claims: ${l.claimsPaid.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
