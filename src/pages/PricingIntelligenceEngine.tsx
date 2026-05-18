import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Calculator, TrendingUp, AlertTriangle, Shield, Globe, Fuel,
  Truck, BarChart3, Zap, RefreshCw, Download, CheckCircle, Info,
  DollarSign, MapPin, Activity, Scale
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { useRegion } from "@/contexts/RegionContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricingInputs {
  corridor: string;
  truckType: string;
  cargoType: string;
  cargoValue: number;
  distanceKm: number;
  fuelPricePerLiter: number;
  tollCost: number;
  customsDuty: number;
  portFees: number;
  driverWage: number;
  insuranceBase: number;
  congestionLevel: number;
  politicalRisk: number;
  driverReliability: number;
  carbonPenalty: number;
}

interface PricingOutput {
  basePrice: number;
  riskAdjustedPrice: number;
  insurancePremium: number;
  marginProjection: number;
  confidenceScore: number;
  competitiveBenchmark: { low: number; mid: number; high: number };
  breakdown: Record<string, number>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TRUCK_TYPES = [
  { value: "bike", label: "Bike / Cycle (≤50kg)", fuelFactor: 0.04 },
  { value: "van", label: "Van / Light (≤2T)", fuelFactor: 0.10 },
  { value: "6wheel_15t", label: "15T 6-Wheeler", fuelFactor: 0.35 },
  { value: "rigid_20t", label: "20T Rigid HGV", fuelFactor: 0.45 },
  { value: "artic", label: "Articulated (30T+)", fuelFactor: 0.60 },
];

const CARGO_TYPES = [
  { value: "fmcg", label: "FMCG", riskMultiplier: 1.0 },
  { value: "petroleum", label: "Petroleum / Hazmat", riskMultiplier: 2.3 },
  { value: "agriculture", label: "Agriculture / Perishable", riskMultiplier: 1.4 },
  { value: "construction", label: "Construction / Heavy", riskMultiplier: 1.2 },
  { value: "electronics", label: "Electronics / High Value", riskMultiplier: 1.8 },
  { value: "cold_chain", label: "Cold Chain / Pharma", riskMultiplier: 1.6 },
];

const CORRIDORS = [
  "Lagos → Kano", "Lagos → Port Harcourt", "Lagos → Abuja", "Lagos → Ibadan",
  "Abuja → Kano", "London → Manchester", "Dubai → Abu Dhabi",
  "New York → Chicago", "Shanghai → Beijing",
];

const corridorBenchmarkData = [
  { corridor: "Lagos–Kano", base: 285000, competitive: 310000, premium: 380000 },
  { corridor: "Lagos–PH", base: 195000, competitive: 220000, premium: 270000 },
  { corridor: "Lagos–Abuja", base: 145000, competitive: 165000, premium: 200000 },
  { corridor: "EU Corridor", base: 1200, competitive: 1450, premium: 1900 },
  { corridor: "US I-95", base: 2800, competitive: 3200, premium: 4100 },
];

const riskTrendData = [
  { month: "Aug", security: 42, weather: 28, compliance: 15, fuel: 35 },
  { month: "Sep", security: 38, weather: 32, compliance: 18, fuel: 42 },
  { month: "Oct", security: 55, weather: 25, compliance: 22, fuel: 38 },
  { month: "Nov", security: 48, weather: 40, compliance: 20, fuel: 45 },
  { month: "Dec", security: 44, weather: 55, compliance: 17, fuel: 52 },
  { month: "Jan", security: 50, weather: 30, compliance: 24, fuel: 48 },
];

// ─── Core Pricing Engine ──────────────────────────────────────────────────────
function calculateFreightPrice(inputs: PricingInputs): PricingOutput {
  const truck = TRUCK_TYPES.find(t => t.value === inputs.truckType) || TRUCK_TYPES[2];
  const cargo = CARGO_TYPES.find(c => c.value === inputs.cargoType) || CARGO_TYPES[0];

  // Component costs
  const fuelCost = inputs.distanceKm * truck.fuelFactor * inputs.fuelPricePerLiter;
  const driverCost = inputs.driverWage;
  const tollCost = inputs.tollCost;
  const customsCost = inputs.customsDuty;
  const portCost = inputs.portFees;
  const carbonCost = inputs.carbonPenalty;

  const totalDirectCost = fuelCost + driverCost + tollCost + customsCost + portCost + carbonCost;

  // Risk-adjusted margin buffer
  const riskScore = (
    (inputs.congestionLevel * 0.30) +
    (inputs.politicalRisk * 0.40) +
    ((100 - inputs.driverReliability) * 0.30)
  ) / 100;

  const riskBuffer = totalDirectCost * (0.12 + riskScore * 0.18);
  const basePrice = totalDirectCost + riskBuffer;

  // Insurance premium: Base Rate × Risk Multiplier × Cargo Value Modifier
  const baseInsuranceRate = 0.0015;
  const riskMultiplier = 1 + riskScore * 2;
  const cargoMod = cargo.riskMultiplier;
  const insurancePremium = inputs.cargoValue * baseInsuranceRate * riskMultiplier * cargoMod;

  // Risk-adjusted price
  const compliancePremium = (inputs.carbonPenalty > 0 ? 0.08 : 0) * basePrice;
  const riskAdjustedPrice = basePrice + insurancePremium + compliancePremium;

  // Margin projection (targeting 22–35% gross margin)
  const marginTarget = 0.28;
  const marginProjection = (riskAdjustedPrice * marginTarget);

  // Confidence score
  const dataFactor = 85;
  const congestionPenalty = inputs.congestionLevel * 0.15;
  const reliabilityBonus = inputs.driverReliability * 0.08;
  const confidenceScore = Math.min(98, Math.max(40, dataFactor - congestionPenalty + reliabilityBonus));

  // Competitive benchmark
  const competitiveBenchmark = {
    low: riskAdjustedPrice * 0.82,
    mid: riskAdjustedPrice,
    high: riskAdjustedPrice * 1.28,
  };

  return {
    basePrice,
    riskAdjustedPrice,
    insurancePremium,
    marginProjection,
    confidenceScore,
    competitiveBenchmark,
    breakdown: {
      "Fuel Cost": fuelCost,
      "Driver Wage": driverCost,
      "Toll & Road": tollCost,
      "Customs/Duty": customsCost,
      "Port Fees": portCost,
      "Carbon Tax": carbonCost,
      "Risk Buffer": riskBuffer,
      "Insurance": insurancePremium,
    },
  };
}

const fmt = (n: number, sym = "₦") => `${sym}${Math.round(n).toLocaleString()}`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function PricingIntelligenceEngine() {
  const { region, isNGMode } = useRegion();
  const sym = region.currencySymbol;

  const [activeTab, setActiveTab] = useState("calculator");
  const [inputs, setInputs] = useState<PricingInputs>({
    corridor: "Lagos → Kano",
    truckType: "6wheel_15t",
    cargoType: "fmcg",
    cargoValue: isNGMode ? 15_000_000 : 50_000,
    distanceKm: 1000,
    fuelPricePerLiter: isNGMode ? 750 : 1.8,
    tollCost: isNGMode ? 45_000 : 200,
    customsDuty: isNGMode ? 0 : 800,
    portFees: isNGMode ? 0 : 300,
    driverWage: isNGMode ? 85_000 : 1_200,
    insuranceBase: isNGMode ? 50_000 : 300,
    congestionLevel: 55,
    politicalRisk: 30,
    driverReliability: 80,
    carbonPenalty: isNGMode ? 0 : 150,
  });

  const setInput = (key: keyof PricingInputs, value: number | string) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const result = useMemo(() => calculateFreightPrice(inputs), [inputs]);

  const radarData = [
    { subject: "Fuel Stability", value: 100 - inputs.congestionLevel * 0.5 },
    { subject: "Driver Score", value: inputs.driverReliability },
    { subject: "Route Safety", value: 100 - inputs.politicalRisk },
    { subject: "Compliance", value: inputs.carbonPenalty > 0 ? 75 : 90 },
    { subject: "SLA Risk", value: 100 - inputs.congestionLevel * 0.6 },
  ];

  const breakdownData = Object.entries(result.breakdown).map(([name, value]) => ({ name, value: Math.round(value) }));

  const confidenceColor = result.confidenceScore >= 80 ? "text-emerald-500" :
    result.confidenceScore >= 60 ? "text-amber-500" : "text-destructive";

  const confidenceLabel = result.confidenceScore >= 80 ? "Low SLA Risk" :
    result.confidenceScore >= 60 ? "Moderate Risk" : "High Risk - Review";

  return (
    <DashboardLayout
      title="Freight Pricing Intelligence Engine"
      subtitle="AI-powered corridor-aware pricing · Risk-adjusted · Multi-region"
    >
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Recommended Price", value: fmt(result.riskAdjustedPrice, sym), icon: DollarSign, color: "text-primary" },
          { label: "Insurance Premium", value: fmt(result.insurancePremium, sym), icon: Shield, color: "text-blue-500" },
          { label: "Margin Projection", value: fmt(result.marginProjection, sym), icon: TrendingUp, color: "text-emerald-500" },
          { label: "Confidence Score", value: `${Math.round(result.confidenceScore)}%`, icon: Zap, color: confidenceColor },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="calculator">Price Calculator</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="benchmark">Corridor Benchmark</TabsTrigger>
          <TabsTrigger value="risk">Risk Signals</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory Map</TabsTrigger>
        </TabsList>

        {/* ─── CALCULATOR ─── */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Inputs */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Route Config */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" />Route Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Corridor</label>
                    <Select value={inputs.corridor} onValueChange={v => setInput("corridor", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CORRIDORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Truck Type</label>
                    <Select value={inputs.truckType} onValueChange={v => setInput("truckType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TRUCK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Cargo Type</label>
                    <Select value={inputs.cargoType} onValueChange={v => setInput("cargoType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CARGO_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Distance (km)</label>
                    <Input type="number" value={inputs.distanceKm} onChange={e => setInput("distanceKm", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Cargo Value ({sym})</label>
                    <Input type="number" value={inputs.cargoValue} onChange={e => setInput("cargoValue", Number(e.target.value))} />
                  </div>
                </CardContent>
              </Card>

              {/* Cost Inputs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Fuel className="w-4 h-4" />Cost Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Fuel Price / Litre ({sym})</label>
                    <Input type="number" value={inputs.fuelPricePerLiter} onChange={e => setInput("fuelPricePerLiter", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Toll Cost ({sym})</label>
                    <Input type="number" value={inputs.tollCost} onChange={e => setInput("tollCost", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Customs Duty ({sym})</label>
                    <Input type="number" value={inputs.customsDuty} onChange={e => setInput("customsDuty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Port Fees ({sym})</label>
                    <Input type="number" value={inputs.portFees} onChange={e => setInput("portFees", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Driver Wage ({sym})</label>
                    <Input type="number" value={inputs.driverWage} onChange={e => setInput("driverWage", Number(e.target.value))} />
                  </div>
                  {!isNGMode && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Carbon Penalty ({sym})</label>
                      <Input type="number" value={inputs.carbonPenalty} onChange={e => setInput("carbonPenalty", Number(e.target.value))} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Sliders */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Risk Signal Calibration</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: "congestionLevel" as const, label: "Corridor Congestion", color: "text-amber-500" },
                    { key: "politicalRisk" as const, label: "Political / Security Risk", color: "text-destructive" },
                    { key: "driverReliability" as const, label: "Driver Reliability", color: "text-emerald-500" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-xs font-medium text-muted-foreground">{label}</label>
                        <span className={`text-sm font-bold ${color}`}>{inputs[key]}%</span>
                      </div>
                      <Slider
                        value={[inputs[key] as number]}
                        min={0} max={100} step={5}
                        onValueChange={([v]) => setInput(key, v)}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Output Panel */}
            <div className="space-y-4">
              {/* Confidence Score */}
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Route Confidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold mb-1 ${confidenceColor}`}>
                    {Math.round(result.confidenceScore)}%
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{confidenceLabel}</p>
                  <Progress value={result.confidenceScore} className="h-2" />
                </CardContent>
              </Card>

              {/* Price Output */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pricing Output</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-semibold">{fmt(result.basePrice, sym)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Insurance Premium</span>
                    <span className="font-semibold text-blue-500">{fmt(result.insurancePremium, sym)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Recommended Price</span>
                    <span className="text-primary">{fmt(result.riskAdjustedPrice, sym)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-500">
                    <span className="text-muted-foreground">Margin (28%)</span>
                    <span className="font-semibold">{fmt(result.marginProjection, sym)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Benchmark */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Competitive Benchmark</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { label: "Budget Carriers", value: result.competitiveBenchmark.low, color: "text-muted-foreground" },
                    { label: "Market Mid", value: result.competitiveBenchmark.mid, color: "text-primary" },
                    { label: "Premium / Specialist", value: result.competitiveBenchmark.high, color: "text-emerald-500" },
                  ].map(b => (
                    <div key={b.label} className="flex justify-between">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className={`font-semibold ${b.color}`}>{fmt(b.value, sym)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Radar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Route Health Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export Pricing Report
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── COST BREAKDOWN ─── */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Component Analysis</CardTitle>
                <CardDescription>What makes up the route price</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={breakdownData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(val) => [`${sym}${Number(val).toLocaleString()}`, ""]} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Itemised Cost Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(result.breakdown).map(([name, value]) => {
                    const pct = (value / result.riskAdjustedPrice) * 100;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{name}</span>
                          <div className="flex gap-3">
                            <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                            <span className="font-semibold">{fmt(value, sym)}</span>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                    <span>Total (Risk-Adjusted)</span>
                    <span className="text-primary">{fmt(result.riskAdjustedPrice, sym)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── BENCHMARK ─── */}
        <TabsContent value="benchmark">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Corridor Pricing Benchmark ({sym})</CardTitle>
                <CardDescription>Base · Competitive · Premium pricing by corridor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={corridorBenchmarkData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="corridor" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="base" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Budget" />
                    <Bar dataKey="competitive" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Competitive" />
                    <Bar dataKey="premium" fill="hsl(173, 60%, 65%)" radius={[4, 4, 0, 0]} name="Premium" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Margin Intelligence by Corridor</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {corridorBenchmarkData.map(c => (
                    <div key={c.corridor} className="p-3 border rounded-lg">
                      <p className="text-xs font-semibold text-foreground mb-2">{c.corridor}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span>{sym}{(c.base/1000).toFixed(0)}K</span></div>
                        <div className="flex justify-between text-primary font-semibold"><span>Market</span><span>{sym}{(c.competitive/1000).toFixed(0)}K</span></div>
                        <div className="flex justify-between text-emerald-500"><span>Premium</span><span>{sym}{(c.premium/1000).toFixed(0)}K</span></div>
                        <div className="flex justify-between border-t pt-1 text-amber-500">
                          <span>Spread</span>
                          <span>{(((c.premium - c.base) / c.base) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── RISK SIGNALS ─── */}
        <TabsContent value="risk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Risk Signal Trend (6-Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={riskTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="security" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Security Risk" strokeWidth={2} />
                    <Area type="monotone" dataKey="fuel" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Fuel Volatility" strokeWidth={2} />
                    <Area type="monotone" dataKey="weather" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Weather Risk" strokeWidth={2} />
                    <Area type="monotone" dataKey="compliance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Compliance Risk" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {[
              {
                title: isNGMode ? "🇳🇬 Nigeria Risk Signals" : "🌍 Global Risk Signals",
                items: isNGMode ? [
                  { label: "LASTMA Alert - Lagos Island", level: "High", color: "destructive" },
                  { label: "Axle Load Enforcement - Sagamu Rd", level: "Medium", color: "secondary" },
                  { label: "Fuel Scarcity Index - North", level: "High", color: "destructive" },
                  { label: "Security Advisory - Kano Corridor", level: "Monitor", color: "outline" },
                ] : [
                  { label: "EU Cabotage Restriction - FR/DE", level: "Active", color: "destructive" },
                  { label: "Carbon ETS Threshold - UK", level: "Near Limit", color: "secondary" },
                  { label: "US DOT HOS Compliance", level: "Review", color: "secondary" },
                  { label: "GCC Border Delay - UAE/SA", level: "Monitor", color: "outline" },
                ]
              },
              {
                title: "Insurance Premium Factors",
                items: [
                  { label: `Cargo Type: ${CARGO_TYPES.find(c => c.value === inputs.cargoType)?.label}`, level: `${CARGO_TYPES.find(c => c.value === inputs.cargoType)?.riskMultiplier}x`, color: "outline" },
                  { label: "Driver Reliability Score", level: `${inputs.driverReliability}%`, color: inputs.driverReliability >= 75 ? "outline" : "secondary" },
                  { label: "Corridor Risk Score", level: `${inputs.congestionLevel}%`, color: inputs.congestionLevel >= 60 ? "secondary" : "outline" },
                  { label: "Political Risk Signal", level: `${inputs.politicalRisk}%`, color: inputs.politicalRisk >= 50 ? "destructive" : "outline" },
                ]
              }
            ].map(panel => (
              <Card key={panel.title}>
                <CardHeader><CardTitle className="text-base">{panel.title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {panel.items.map(item => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <Badge variant={item.color as any} className="text-xs">{item.level}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── REGULATORY MAP ─── */}
        <TabsContent value="regulatory">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                region: "🇳🇬 Nigeria", rules: [
                  { name: "FIRS VAT (7.5%)", status: "Active", risk: "Low" },
                  { name: "WHT on Haulage (5%)", status: "Active", risk: "Low" },
                  { name: "Axle Load Regulation", status: "Enforced", risk: "Medium" },
                  { name: "LASTMA Traffic Rules", status: "Variable", risk: "High" },
                  { name: "NESREA Environmental", status: "Active", risk: "Low" },
                ]
              },
              {
                region: "🇪🇺 European Union", rules: [
                  { name: "Cabotage 3-in-7 Rule", status: "Strict", risk: "High" },
                  { name: "Reg 561/2006 Driver Hours", status: "Mandatory", risk: "High" },
                  { name: "EU ETS Carbon Tax", status: "2025 Active", risk: "Medium" },
                  { name: "LEZ Emission Standards", status: "City-Level", risk: "Medium" },
                  { name: "CMR Consignment Notes", status: "Required", risk: "Low" },
                ]
              },
              {
                region: "🇺🇸 United States", rules: [
                  { name: "FMCSA HOS (11h drive limit)", status: "Mandatory", risk: "High" },
                  { name: "IFTA Fuel Tax Filing", status: "Quarterly", risk: "Medium" },
                  { name: "DOT Weight Limits", status: "80,000 lbs", risk: "Medium" },
                  { name: "ELD Mandate", status: "Required", risk: "Low" },
                  { name: "Hazmat Placard Rules", status: "Cargo-Dependent", risk: "Variable" },
                ]
              },
              {
                region: "🇦🇪 GCC / Middle East", rules: [
                  { name: "UAE Customs Unified Tariff", status: "5% Base", risk: "Low" },
                  { name: "GCC Transit Permit", status: "Required", risk: "Medium" },
                  { name: "Saudi Arabia SABER", status: "Mandatory", risk: "Medium" },
                  { name: "Desert Route Heat Risk", status: "Seasonal", risk: "High" },
                  { name: "Jebel Ali Port Rules", status: "Active", risk: "Low" },
                ]
              },
            ].map(panel => (
              <Card key={panel.region}>
                <CardHeader>
                  <CardTitle className="text-sm">{panel.region}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {panel.rules.map(rule => (
                    <div key={rule.name} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{rule.status}</p>
                      </div>
                      <Badge variant={rule.risk === "High" ? "destructive" : rule.risk === "Medium" ? "secondary" : "outline"} className="text-xs">
                        {rule.risk}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
