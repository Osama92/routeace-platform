import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle, Globe, Train, Truck, Shield, TrendingUp,
  MapPin, Package, Zap, BarChart3, Activity, DollarSign
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";

const BRI_AI_V1 = true;

const BRI_CORRIDORS = [
  {
    id: "ccre", name: "China–Central Asia–Europe Rail",
    from: "Chengdu, China", to: "Duisburg, Germany",
    distance: 11000, railDays: 18, roadDays: 28, mode: "rail",
    geopoliticalRisk: 42, confidenceScore: 87, costPerTon: 2800,
    countries: ["CN", "KZ", "RU", "BY", "PL", "DE"],
    hubs: ["Khorgos (KZ)", "Brest (BY)", "Warsaw (PL)"],
    status: "active", notes: "Trans-Siberian preferred in winter for speed",
  },
  {
    id: "maritime", name: "Maritime Silk Road",
    from: "Shanghai, China", to: "Rotterdam, Netherlands",
    distance: 20000, railDays: 0, roadDays: 35, mode: "sea",
    geopoliticalRisk: 28, confidenceScore: 92, costPerTon: 1200,
    countries: ["CN", "SG", "LK", "IN", "AE", "EG", "IT", "NL"],
    hubs: ["Singapore", "Colombo", "Piraeus"],
    status: "active", notes: "Most cost-effective for bulk/containerized cargo",
  },
  {
    id: "pak-corridor", name: "China–Pakistan Economic Corridor",
    from: "Kashgar, China", to: "Gwadar, Pakistan",
    distance: 3000, railDays: 5, roadDays: 8, mode: "hybrid",
    geopoliticalRisk: 68, confidenceScore: 61, costPerTon: 3400,
    countries: ["CN", "PK"],
    hubs: ["Gwadar Port"],
    status: "moderate_risk", notes: "Security corridors required. Permit-based access.",
  },
  {
    id: "cac", name: "Central Asia Corridor",
    from: "Urumqi, China", to: "Istanbul, Turkey",
    distance: 7500, railDays: 14, roadDays: 22, mode: "hybrid",
    geopoliticalRisk: 55, confidenceScore: 74, costPerTon: 2200,
    countries: ["CN", "KZ", "UZ", "TM", "AZ", "GE", "TR"],
    hubs: ["Tashkent", "Baku", "Tbilisi"],
    status: "active", notes: "Middle Corridor. Growing capacity post-sanctions.",
  },
];

const GEOPOLITICAL_RISKS = [
  { country: "Russia", risk: 82, sanction: true, borderVolatility: "High", note: "Western sanctions impact rail capacity" },
  { country: "Belarus", risk: 71, sanction: true, borderVolatility: "High", note: "EU sanctions - rerouting via Baltic states" },
  { country: "Kazakhstan", risk: 24, sanction: false, borderVolatility: "Low", note: "Key transit hub, stable conditions" },
  { country: "Uzbekistan", risk: 31, sanction: false, borderVolatility: "Low", note: "Emerging freight corridor - growing rail" },
  { country: "Turkey", risk: 38, sanction: false, borderVolatility: "Medium", note: "Geopolitical broker - generally stable" },
  { country: "Pakistan", risk: 68, sanction: false, borderVolatility: "High", note: "CPEC security concerns remain active" },
];

const CONSOLIDATION_HUBS = [
  { name: "Khorgos Gateway", country: "Kazakhstan", capacity: "Mega Hub", role: "China-Europe Rail Transfer", efficiency: 88, monthlyVolume: "42,000 TEU" },
  { name: "Istanbul Logistics Hub", country: "Turkey", capacity: "Major Hub", role: "Europe-Asia Gateway", efficiency: 84, monthlyVolume: "28,000 TEU" },
  { name: "Warsaw Intermodal", country: "Poland", capacity: "Gateway", role: "EU Distribution Center", efficiency: 91, monthlyVolume: "35,000 TEU" },
  { name: "Tashkent Freight Hub", country: "Uzbekistan", capacity: "Regional Hub", role: "Central Asia Distribution", efficiency: 76, monthlyVolume: "18,000 TEU" },
];

const CURRENCIES = [
  { code: "CNY", name: "Chinese Yuan", rate: 7.24, volatility: "Low", risk: "Low" },
  { code: "USD", name: "US Dollar", rate: 1.00, volatility: "Low", risk: "Low" },
  { code: "EUR", name: "Euro", rate: 0.93, volatility: "Low", risk: "Low" },
  { code: "KZT", name: "Kazakhstani Tenge", rate: 452, volatility: "Medium", risk: "Medium" },
  { code: "TRY", name: "Turkish Lira", rate: 32.1, volatility: "High", risk: "Medium" },
  { code: "PKR", name: "Pakistani Rupee", rate: 278, volatility: "High", risk: "High" },
];

const corridorTrendData = [
  { month: "Jul", ccre: 87, maritime: 91, cac: 71, pak: 58 },
  { month: "Aug", ccre: 85, maritime: 93, cac: 73, pak: 61 },
  { month: "Sep", ccre: 89, maritime: 90, cac: 72, pak: 59 },
  { month: "Oct", ccre: 88, maritime: 92, cac: 74, pak: 62 },
  { month: "Nov", ccre: 86, maritime: 94, cac: 76, pak: 60 },
  { month: "Dec", ccre: 87, maritime: 92, cac: 74, pak: 61 },
];

const BeltRoadAsiaEngine = () => {
  const [activeTab, setActiveTab] = useState("corridors");
  const [selectedCorridor, setSelectedCorridor] = useState(BRI_CORRIDORS[0]);

  if (!BRI_AI_V1) {
    return (
      <DashboardLayout title="Belt & Road Asia Engine">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">BRI Engine is disabled. Enable bri_ai_v1 flag.</p>
        </div>
      </DashboardLayout>
    );
  }

  const sanctionedCountries = GEOPOLITICAL_RISKS.filter(r => r.sanction);

  return (
    <DashboardLayout title="Belt & Road Asia Engine" subtitle="Intermodal routing · Geopolitical risk intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">🌏 Belt & Road Asia Engine</h1>
              <p className="text-sm text-muted-foreground">Intermodal rail+road+sea routing · Geopolitical risk intelligence · BRI corridors</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">bri_ai_v1</Badge>
            <Badge className="bg-red-100 text-red-800 text-xs">Geopolitical Monitor</Badge>
          </div>
        </div>

        {/* Sanction Alert */}
        {sanctionedCountries.length > 0 && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <strong>Geopolitical Alert:</strong> {sanctionedCountries.map(c => c.country).join(", ")} under active Western sanctions. BRI routing automatically avoiding sanctioned transit paths where possible.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "BRI Corridors", value: BRI_CORRIDORS.length, icon: Globe, color: "text-red-600" },
            { label: "AI Confidence", value: "88%", icon: Zap, color: "text-primary" },
            { label: "Sanctioned Routes", value: sanctionedCountries.length, icon: Shield, color: "text-red-600" },
            { label: "Intermodal Hubs", value: CONSOLIDATION_HUBS.length, icon: Package, color: "text-green-600" },
            { label: "Currencies Tracked", value: CURRENCIES.length, icon: DollarSign, color: "text-blue-600" },
            { label: "Maritime Score", value: "92%", icon: TrendingUp, color: "text-emerald-600" },
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
            <TabsTrigger value="corridors">Corridors</TabsTrigger>
            <TabsTrigger value="geopolitical">Geopolitical</TabsTrigger>
            <TabsTrigger value="hubs">Hubs</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="intelligence">AI Intel</TabsTrigger>
          </TabsList>

          {/* ── CORRIDORS TAB ── */}
          <TabsContent value="corridors" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                {BRI_CORRIDORS.map(c => (
                  <Card
                    key={c.id}
                    className={`border-border cursor-pointer transition-all ${selectedCorridor.id === c.id ? "ring-2 ring-primary" : "hover:border-primary/50"}`}
                    onClick={() => setSelectedCorridor(c)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          {c.mode === "rail" ? <Train className="w-3 h-3 text-blue-600" /> : c.mode === "sea" ? <Globe className="w-3 h-3 text-blue-400" /> : <Truck className="w-3 h-3 text-orange-500" />}
                          <span className="font-semibold text-xs">{c.mode.toUpperCase()}</span>
                        </div>
                        <Badge className={`text-xs ${c.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {c.status === "active" ? "Active" : "Moderate Risk"}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.from} → {c.to}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-primary font-medium">Confidence: {c.confidenceScore}%</span>
                        <span className={`text-xs font-medium ${c.geopoliticalRisk > 60 ? "text-red-600" : c.geopoliticalRisk > 40 ? "text-yellow-600" : "text-green-600"}`}>
                          Risk: {c.geopoliticalRisk}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{selectedCorridor.name}</CardTitle>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">Belt & Road Confidence: {selectedCorridor.confidenceScore}%</p>
                        <p className="text-xs text-muted-foreground">{selectedCorridor.mode} mode · {selectedCorridor.distance.toLocaleString()} km</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Distance", value: `${selectedCorridor.distance.toLocaleString()} km` },
                        { label: "Rail Days", value: selectedCorridor.railDays > 0 ? `${selectedCorridor.railDays}d` : "N/A" },
                        { label: "Road Days", value: `${selectedCorridor.roadDays}d` },
                        { label: "Cost/Ton", value: `$${selectedCorridor.costPerTon.toLocaleString()}` },
                      ].map(m => (
                        <div key={m.label} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className="font-bold text-sm">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>AI Confidence Score</span>
                        <span className="font-bold text-primary">{selectedCorridor.confidenceScore}%</span>
                      </div>
                      <Progress value={selectedCorridor.confidenceScore} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>Geopolitical Risk</span>
                        <span className={`font-bold ${selectedCorridor.geopoliticalRisk > 60 ? "text-red-600" : "text-yellow-600"}`}>{selectedCorridor.geopoliticalRisk}%</span>
                      </div>
                      <Progress value={selectedCorridor.geopoliticalRisk} className="h-2" />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium">Transit Countries</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCorridor.countries.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium">Strategic Hubs</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCorridor.hubs.map(h => <Badge key={h} className="text-xs bg-primary/10 text-primary">{h}</Badge>)}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-400">📌 {selectedCorridor.notes}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Corridor Confidence Trend (6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={corridorTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[50, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="ccre" name="CCRE Rail" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="maritime" name="Maritime" stroke="#22c55e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cac" name="Central Asia" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="pak" name="CPEC" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── GEOPOLITICAL TAB ── */}
          <TabsContent value="geopolitical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />Country Risk Register
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {GEOPOLITICAL_RISKS.map(r => (
                    <div key={r.country} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.country}</span>
                          {r.sanction && <Badge className="text-xs bg-red-100 text-red-800">SANCTIONED</Badge>}
                        </div>
                        <Badge className={`text-xs ${r.borderVolatility === "High" ? "bg-red-100 text-red-800" : r.borderVolatility === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                          {r.borderVolatility} Volatility
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={r.risk} className="h-1.5 flex-1" />
                        <span className={`text-xs font-bold w-8 ${r.risk > 60 ? "text-red-600" : r.risk > 40 ? "text-yellow-600" : "text-green-600"}`}>{r.risk}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Trade Risk Confidence Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-primary">72%</p>
                      <p className="text-sm text-muted-foreground mt-1">Overall BRI Trade Risk Confidence</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Sanction Exposure", value: 28, color: "text-red-600" },
                        { label: "Border Volatility", value: 41, color: "text-yellow-600" },
                        { label: "Political Stability", value: 63, color: "text-blue-600" },
                        { label: "Infrastructure Quality", value: 74, color: "text-green-600" },
                      ].map(item => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{item.label}</span>
                            <span className={`font-bold ${item.color}`}>{item.value}%</span>
                          </div>
                          <Progress value={item.value} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-yellow-50 dark:bg-yellow-950/10">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm mb-2">⚠️ Active Geopolitical Advisories</h4>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                      <li>• Russia/Belarus routes suspended for EU-destined cargo</li>
                      <li>• Middle Corridor (Kazakhstan–Azerbaijan–Georgia) now preferred</li>
                      <li>• CPEC security alert: Balochistan segment - convoy required</li>
                      <li>• Xinjiang-KZ border: extended clearance expected (+6h)</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── HUBS TAB ── */}
          <TabsContent value="hubs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONSOLIDATION_HUBS.map(hub => (
                <Card key={hub.name} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />{hub.name}
                      </CardTitle>
                      <Badge className="text-xs bg-primary/10 text-primary">{hub.capacity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{hub.country} · {hub.role}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold text-foreground">{hub.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold text-foreground">{hub.monthlyVolume}</p>
                        <p className="text-xs text-muted-foreground">Monthly Vol</p>
                      </div>
                    </div>
                    <Progress value={hub.efficiency} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2">🔄 AI Consolidation Suggestion</h4>
                <p className="text-sm text-muted-foreground">
                  Consolidate 3 shipments from Urumqi via <strong>Khorgos Gateway</strong>, merge with 2 loads at <strong>Warsaw Intermodal</strong> before final EU distribution. Estimated margin improvement: <strong className="text-green-600">+8.4%</strong>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CURRENCY TAB ── */}
          <TabsContent value="currency" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Multi-Currency Trade Risk Matrix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CURRENCIES.map(c => (
                    <div key={c.code} className="flex items-center justify-between p-2 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-mono w-10 justify-center">{c.code}</Badge>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Rate: {c.rate}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`text-xs ${c.volatility === "High" ? "bg-red-100 text-red-800" : c.volatility === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                          {c.volatility} Vol
                        </Badge>
                        <Badge className={`text-xs ${c.risk === "High" ? "bg-red-100 text-red-800" : c.risk === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                          {c.risk} Risk
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">FX Exposure Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Revenue (USD equivalent)", value: "$4.2M" },
                    { label: "CNY Exposure", value: "$1.8M (42%)" },
                    { label: "TRY Exposure", value: "$0.4M (9%)" },
                    { label: "FX Variance Risk", value: "±$124K" },
                    { label: "Hedged Positions", value: "$2.1M" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="font-bold text-sm">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── AI INTEL TAB ── */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "AI Learning Confidence", value: "91%", desc: "Based on 4,820 historical BRI routes analyzed", color: "text-primary" },
                { label: "Prediction Accuracy", value: "88.4%", desc: "Transit time predictions within ±6h margin", color: "text-green-600" },
                { label: "Reroute Suggestions", value: "34", desc: "Sanction-avoidance alternatives identified", color: "text-blue-600" },
              ].map(kpi => (
                <Card key={kpi.label} className="border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />BRI AI Insight Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "warning", msg: "CCRE Rail capacity reduced by 18% due to Brest border processing delays. Rerouting via Middle Corridor advised." },
                  { type: "insight", msg: "Maritime Silk Road confidence at 92% - highest of Q4. Recommend shifting 30% of non-urgent cargo to sea route for cost saving of $840K." },
                  { type: "opportunity", msg: "Uzbekistan rail link capacity expanded +25% in Q4. Tashkent hub now viable for Central Asian distribution." },
                  { type: "risk", msg: "CPEC corridor: 3 security incidents reported in Balochistan in last 30 days. Convoy escort mandatory for all 15T+ vehicles." },
                ].map((insight, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${insight.type === "warning" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" : insight.type === "risk" ? "border-red-200 bg-red-50 dark:bg-red-950/20" : insight.type === "opportunity" ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-blue-200 bg-blue-50 dark:bg-blue-950/20"}`}>
                    <p className={`text-xs ${insight.type === "warning" ? "text-yellow-800 dark:text-yellow-300" : insight.type === "risk" ? "text-red-800 dark:text-red-300" : insight.type === "opportunity" ? "text-green-800 dark:text-green-300" : "text-blue-800 dark:text-blue-300"}`}>
                      {insight.type === "warning" ? "⚠️" : insight.type === "risk" ? "🚨" : insight.type === "opportunity" ? "💡" : "📊"} {insight.msg}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BeltRoadAsiaEngine;
