import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle, Sun, Shield, Truck, TrendingUp, Package,
  Anchor, Clock, DollarSign, Globe, FileText, Thermometer, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area } from "recharts";

const GCC_CORRIDOR_AI_V1 = true;

const GCC_COUNTRIES = [
  { code: "UAE", name: "United Arab Emirates", vatRate: 5, currency: "AED", capital: "Abu Dhabi", majorPort: "Jebel Ali" },
  { code: "SAU", name: "Saudi Arabia", vatRate: 15, currency: "SAR", capital: "Riyadh", majorPort: "Dammam (King Abdulaziz)" },
  { code: "QAT", name: "Qatar", vatRate: 0, currency: "QAR", capital: "Doha", majorPort: "Hamad Port" },
  { code: "OMN", name: "Oman", vatRate: 5, currency: "OMR", capital: "Muscat", majorPort: "Port Sultan Qaboos" },
  { code: "BHR", name: "Bahrain", vatRate: 10, currency: "BHD", capital: "Manama", majorPort: "Khalifa Bin Salman" },
  { code: "KWT", name: "Kuwait", vatRate: 0, currency: "KWD", capital: "Kuwait City", majorPort: "Shuaiba Industrial" },
];

const GCC_CORRIDORS = [
  {
    id: "jebel-dammam", name: "Jebel Ali → Dammam", from: "Dubai, UAE", to: "Dammam, KSA",
    distance: 1420, transitHours: 18, borderDelay: 3.2, desertRisk: 62,
    tollCost: 180, fuelStations: 8, restStops: 4, profitIndex: 82,
    cargoTypes: ["General", "Containerized", "Machinery"], customsClearance: "6-12h",
  },
  {
    id: "dubai-doha", name: "Dubai → Doha", from: "Dubai, UAE", to: "Doha, Qatar",
    distance: 680, transitHours: 8, borderDelay: 2.8, desertRisk: 74,
    tollCost: 90, fuelStations: 5, restStops: 2, profitIndex: 88,
    cargoTypes: ["General", "Perishable", "Electronics"], customsClearance: "4-8h",
  },
  {
    id: "riyadh-muscat", name: "Riyadh → Muscat", from: "Riyadh, KSA", to: "Muscat, Oman",
    distance: 1240, transitHours: 16, borderDelay: 4.1, desertRisk: 81,
    tollCost: 145, fuelStations: 6, restStops: 3, profitIndex: 76,
    cargoTypes: ["Construction", "General", "Mining"], customsClearance: "8-16h",
  },
  {
    id: "dammam-kuwait", name: "Dammam → Kuwait City", from: "Dammam, KSA", to: "Kuwait City, Kuwait",
    distance: 520, transitHours: 6, borderDelay: 2.1, desertRisk: 55,
    tollCost: 65, fuelStations: 4, restStops: 2, profitIndex: 91,
    cargoTypes: ["General", "FMCG", "Containerized"], customsClearance: "3-6h",
  },
];

const PORT_DATA = [
  {
    name: "Jebel Ali Port", country: "UAE", congestion: 38, avgClearance: 8.2,
    monthlyTEU: 1420000, yardTurnaround: 2.4, efficiency: 94, status: "optimal",
  },
  {
    name: "Dammam Port", country: "KSA", congestion: 52, avgClearance: 12.5,
    monthlyTEU: 860000, yardTurnaround: 3.8, efficiency: 81, status: "moderate",
  },
  {
    name: "Hamad Port", country: "Qatar", congestion: 29, avgClearance: 6.8,
    monthlyTEU: 720000, yardTurnaround: 2.1, efficiency: 96, status: "optimal",
  },
  {
    name: "Sultan Qaboos Port", country: "Oman", congestion: 41, avgClearance: 9.4,
    monthlyTEU: 480000, yardTurnaround: 3.2, efficiency: 87, status: "good",
  },
];

const desertRiskData = GCC_CORRIDORS.map(c => ({
  corridor: c.id.split("-").map(w => w[0].toUpperCase() + w.slice(1,3)).join("-"),
  desertRisk: c.desertRisk,
  profitIndex: c.profitIndex,
  borderDelay: c.borderDelay * 10,
}));

const vatComparisonData = GCC_COUNTRIES.map(c => ({ country: c.code, vatRate: c.vatRate }));

const portPerformanceData = PORT_DATA.map(p => ({
  port: p.name.split(" ")[0],
  efficiency: p.efficiency,
  congestion: p.congestion,
  clearance: p.avgClearance * 5,
}));

const GCCTradeCorridorAI = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCorridor, setSelectedCorridor] = useState(GCC_CORRIDORS[0]);
  const [islamicFinanceMode, setIslamicFinanceMode] = useState(false);

  if (!GCC_CORRIDOR_AI_V1) {
    return (
      <DashboardLayout title="GCC Trade Corridor AI">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">GCC Corridor AI is disabled. Enable gcc_corridor_ai_v1 flag.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="GCC Trade Corridor AI" subtitle="Desert-aware cross-border routing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">🇴🇲 GCC Trade Corridor AI</h1>
              <p className="text-sm text-muted-foreground">Desert-aware cross-border routing · UAE/KSA/QAT/OMN/BHR/KWT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">gcc_corridor_ai_v1</Badge>
            <Badge className="bg-amber-100 text-amber-800 text-xs">GCC Customs Active</Badge>
          </div>
        </div>

        {/* Desert Risk Warning */}
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Sun className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <strong>Desert Risk Alert:</strong> Extreme heat expected in Riyadh → Muscat corridor (48°C+). Tire burst probability elevated. Mandatory rest stops enforced every 3 hours.
          </AlertDescription>
        </Alert>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "GCC Countries", value: "6", icon: Globe, color: "text-blue-600" },
            { label: "Active Corridors", value: GCC_CORRIDORS.length, icon: Truck, color: "text-primary" },
            { label: "Avg Desert Risk", value: "68%", icon: Thermometer, color: "text-amber-600" },
            { label: "Port Efficiency", value: "90%", icon: Anchor, color: "text-green-600" },
            { label: "Border Avg Delay", value: "3.1h", icon: Clock, color: "text-yellow-600" },
            { label: "GCC Profit Index", value: "84%", icon: TrendingUp, color: "text-emerald-600" },
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
            <TabsTrigger value="overview">Corridors</TabsTrigger>
            <TabsTrigger value="desert">Desert AI</TabsTrigger>
            <TabsTrigger value="ports">Ports</TabsTrigger>
            <TabsTrigger value="customs">Customs & VAT</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          {/* ── CORRIDORS TAB ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">GCC Corridors</h3>
                {GCC_CORRIDORS.map(c => (
                  <Card
                    key={c.id}
                    className={`border-border cursor-pointer transition-all ${selectedCorridor.id === c.id ? "ring-2 ring-primary" : "hover:border-primary/50"}`}
                    onClick={() => setSelectedCorridor(c)}
                  >
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{c.distance} km</span>
                        <span className="text-xs text-amber-600 font-medium">Desert Risk: {c.desertRisk}%</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-600 font-medium">Profit: {c.profitIndex}%</span>
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
                      <Badge className={`text-xs ${selectedCorridor.desertRisk > 70 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                        Desert Risk: {selectedCorridor.desertRisk}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Distance", value: `${selectedCorridor.distance} km` },
                        { label: "Transit", value: `${selectedCorridor.transitHours}h` },
                        { label: "Border Delay", value: `${selectedCorridor.borderDelay}h` },
                        { label: "Customs", value: selectedCorridor.customsClearance },
                      ].map(m => (
                        <div key={m.label} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className="font-bold text-sm text-foreground">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Desert Risk Score</span>
                        <span className={`font-bold ${selectedCorridor.desertRisk > 70 ? "text-red-600" : "text-yellow-600"}`}>{selectedCorridor.desertRisk}%</span>
                      </div>
                      <Progress value={selectedCorridor.desertRisk} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>Profitability Index</span>
                        <span className="font-bold text-green-600">{selectedCorridor.profitIndex}%</span>
                      </div>
                      <Progress value={selectedCorridor.profitIndex} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-center">
                        <Zap className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">{selectedCorridor.fuelStations}</p>
                        <p className="text-xs text-muted-foreground">Fuel Stations</p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-center">
                        <Clock className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">{selectedCorridor.restStops}</p>
                        <p className="text-xs text-muted-foreground">Rest Stops</p>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-center">
                        <DollarSign className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">${selectedCorridor.tollCost}</p>
                        <p className="text-xs text-muted-foreground">Toll Cost</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCorridor.cargoTypes.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Corridor Intelligence Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={desertRiskData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="corridor" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="profitIndex" name="Profit Index" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                        <Bar dataKey="desertRisk" name="Desert Risk" fill="#f59e0b" radius={[3,3,0,0]} opacity={0.7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── DESERT AI TAB ── */}
          <TabsContent value="desert" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-600" />Desert Risk Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { factor: "Extreme Heat (48°C+)", risk: 82, action: "Tire pressure checks every 2h" },
                    { factor: "Sandstorm Probability", risk: 34, action: "Monitor real-time weather feeds" },
                    { factor: "Fuel Station Density", risk: 58, action: "Pre-plan fueling stops" },
                    { factor: "Tire Burst Probability", risk: 71, action: "Carry spare + nitrogen inflation" },
                    { factor: "Driver Fatigue Risk", risk: 65, action: "Mandatory rest every 3h" },
                    { factor: "Medical Emergency Access", risk: 44, action: "Satellite comm device required" },
                  ].map(f => (
                    <div key={f.factor} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{f.factor}</span>
                        <span className={`font-bold ${f.risk > 70 ? "text-red-600" : f.risk > 50 ? "text-yellow-600" : "text-green-600"}`}>{f.risk}%</span>
                      </div>
                      <Progress value={f.risk} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">→ {f.action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Desert Rest Planning - AI Generated</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { stop: "Al Ain Service Area", km: 160, duration: "45 min", type: "Fuel + Rest" },
                      { stop: "Ghayathi Checkpoint", km: 340, duration: "30 min", type: "Inspection + Water" },
                      { stop: "Madinat Zayed", km: 520, duration: "60 min", type: "Meal + Rest" },
                      { stop: "Buraimi Border", km: 680, duration: "2-4h", type: "Customs Clearance" },
                    ].map(s => (
                      <div key={s.stop} className="flex items-center justify-between p-2 border border-border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{s.stop}</p>
                          <p className="text-xs text-muted-foreground">{s.km} km mark · {s.type}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{s.duration}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-border bg-amber-50 dark:bg-amber-950/10">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 text-sm">🌡️ Desert Safety Protocol</h4>
                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <li>• Tire burst probability HIGH: Nitrogen inflation mandatory</li>
                      <li>• Carry 50L emergency water per truck</li>
                      <li>• Satellite communicator required for Riyadh-Muscat corridor</li>
                      <li>• Dispatch ETA alerts every 2 hours via SMS</li>
                      <li>• Night driving preferred in summer months (May–Sep)</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── PORTS TAB ── */}
          <TabsContent value="ports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PORT_DATA.map(port => (
                <Card key={port.name} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-primary" />{port.name}
                      </CardTitle>
                      <Badge className={`text-xs ${port.status === "optimal" ? "bg-green-100 text-green-800" : port.status === "good" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {port.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{port.country}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold text-foreground">{port.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold text-foreground">{port.congestion}%</p>
                        <p className="text-xs text-muted-foreground">Congestion</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Port Efficiency</span><span>{port.efficiency}%</span>
                      </div>
                      <Progress value={port.efficiency} className="h-1.5" />
                      <div className="flex justify-between text-xs mt-2">
                        <span>Avg Clearance Time</span><span className="font-medium">{port.avgClearance}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Monthly TEU Capacity</span><span className="font-medium">{(port.monthlyTEU / 1000).toFixed(0)}K TEU</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Yard Turnaround</span><span className="font-medium">{port.yardTurnaround} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Port Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={portPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="port" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="efficiency" name="Efficiency %" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                    <Bar dataKey="congestion" name="Congestion %" fill="hsl(var(--destructive))" radius={[3,3,0,0]} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CUSTOMS & VAT TAB ── */}
          <TabsContent value="customs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">GCC VAT Matrix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {GCC_COUNTRIES.map(c => (
                    <div key={c.code} className="flex items-center justify-between p-2 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{c.code}</Badge>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.majorPort}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${c.vatRate === 0 ? "text-green-600" : c.vatRate >= 10 ? "text-red-600" : "text-yellow-600"}`}>{c.vatRate}% VAT</p>
                        <p className="text-xs text-muted-foreground">{c.currency}</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mt-2">
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">🔄 Auto VAT Logic Active</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Cross-border B2B shipments auto-apply reverse charge. KSA (15%) flagged for highest VAT exposure.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Islamic Finance Mode</CardTitle>
                      <div
                        className={`w-10 h-6 rounded-full cursor-pointer transition-colors ${islamicFinanceMode ? "bg-primary" : "bg-muted"} flex items-center px-1`}
                        onClick={() => setIslamicFinanceMode(!islamicFinanceMode)}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${islamicFinanceMode ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {islamicFinanceMode ? (
                      <div className="space-y-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">Sharia-Compliant Mode Active</Badge>
                        {[
                          { label: "Financing Type", value: "Murabaha (Cost-Plus)" },
                          { label: "Interest Structure", value: "Profit-sharing only" },
                          { label: "Insurance Type", value: "Takaful (Cooperative)" },
                          { label: "Payment Terms", value: "Halal-compliant net terms" },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Enable to activate Sharia-compliant financing, Murabaha structures, and Takaful insurance options for GCC freight operations.</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cross-Border Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { doc: "GCC Certificate of Origin", status: "required", auto: true },
                      { doc: "Customs Declaration (Bayan)", status: "required", auto: true },
                      { doc: "Packing List", status: "required", auto: false },
                      { doc: "Commercial Invoice (Arabic)", status: "required", auto: true },
                      { doc: "Phytosanitary Certificate", status: "conditional", auto: false },
                      { doc: "SABER Certificate (KSA)", status: "conditional", auto: false },
                    ].map(d => (
                      <div key={d.doc} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{d.doc}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={`text-xs ${d.status === "required" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{d.status}</Badge>
                          {d.auto && <Badge className="text-xs bg-green-100 text-green-800">auto-gen</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── DASHBOARD TAB ── */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "GCC Revenue (YTD)", value: "AED 18.4M", change: "+34%" },
                { label: "Avg Border Clearance", value: "3.1 hours", change: "-0.8h vs Q3" },
                { label: "Port Score (Jebel Ali)", value: "94%", change: "Top Performer" },
                { label: "GCC Compliance Rate", value: "91.2%", change: "+2.4%" },
              ].map(kpi => (
                <Card key={kpi.label} className="border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{kpi.value}</p>
                    <p className="text-xs text-green-600 font-medium">{kpi.change}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customs Delay Forecast - Next 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={[
                    { day: "W1", uae: 6, ksa: 14, qat: 7, oman: 10 },
                    { day: "W2", uae: 7, ksa: 16, qat: 6, oman: 11 },
                    { day: "W3", uae: 8, ksa: 13, qat: 8, oman: 9 },
                    { day: "W4", uae: 6, ksa: 12, qat: 7, oman: 10 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="h" />
                    <Tooltip />
                    <Area type="monotone" dataKey="ksa" name="KSA" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="oman" name="Oman" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="uae" name="UAE" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="qat" name="Qatar" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GCCTradeCorridorAI;
