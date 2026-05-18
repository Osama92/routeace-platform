import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Map, Truck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Brain, BarChart3, Euro, Fuel, Clock, Shield, Globe, Zap,
  Navigation, Target, Activity, RefreshCw, Download, Info,
  AlertCircle, Wind, Thermometer, Package, LineChart, Flag,
  Star, GitBranch, Layers, Radio, Gauge, Settings, Eye,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart as ReLineChart, Line, ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ─── FEATURE FLAG ─────────────────────────────────────────────────────────────
const TEC_AI_V1 = true;

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface EUCorridor {
  id: string;
  name: string;
  shortName: string;
  startCountry: string;
  endCountry: string;
  countries: string[];
  primaryHighways: string[];
  avgTransitHours: number;
  avgTollCost: number;
  avgBorderDelayMinutes: number;
  fuelPriceIndex: number; // 1–10
  slaRiskScore: number;   // 0–100
  emissionRestrictionLevel: "low" | "medium" | "high";
  seasonalRiskScore: number;
  congestionIndex: number;
  strategicPriorityScore: number;
  corridorScore?: number;
  status: "active" | "disrupted" | "restricted";
  disruption?: string;
  totalDistanceKm: number;
  reliabilityIndex: number;
  profitPerTonne: number;
  onTimeRate: number;
  vehicleRestrictions: string[];
}

interface CorridorComparison {
  corridorId: string;
  transitDays: number;
  totalToll: number;
  fuelCost: number;
  driverCost: number;
  maintenanceCost: number;
  totalCost: number;
  estimatedRevenue: number;
  profitMargin: number;
  slaConfidence: number;
  co2Kg: number;
  corridorScore: number;
}

interface AIInsight {
  severity: "info" | "warning" | "critical";
  corridor: string;
  message: string;
  impact: string;
  action: string;
  timestamp: string;
}

// ─── TEN-T CORRIDOR DATA ──────────────────────────────────────────────────────
const EU_CORRIDORS: EUCorridor[] = [
  {
    id: "scand-med",
    name: "Scandinavian–Mediterranean Corridor",
    shortName: "Scand–Med",
    startCountry: "🇫🇮 Finland",
    endCountry: "🇮🇹 Italy / 🇲🇹 Malta",
    countries: ["FI", "SE", "DK", "DE", "AT", "IT"],
    primaryHighways: ["E4", "E20", "E45", "A1", "A7", "A8"],
    avgTransitHours: 62,
    avgTollCost: 820,
    avgBorderDelayMinutes: 28,
    fuelPriceIndex: 7.2,
    slaRiskScore: 22,
    emissionRestrictionLevel: "high",
    seasonalRiskScore: 35, // winter alpine risk
    congestionIndex: 48,
    strategicPriorityScore: 94,
    totalDistanceKm: 3800,
    reliabilityIndex: 88,
    profitPerTonne: 142,
    onTimeRate: 91,
    vehicleRestrictions: ["weekend_ban_AT", "alpine_weight_limit"],
    status: "active",
  },
  {
    id: "rhine-alpine",
    name: "Rhine–Alpine Corridor",
    shortName: "Rhine–Alpine",
    startCountry: "🇳🇱 Netherlands",
    endCountry: "🇮🇹 Italy",
    countries: ["NL", "BE", "DE", "CH", "IT"],
    primaryHighways: ["A2", "A3", "E35", "A2-IT", "E62"],
    avgTransitHours: 28,
    avgTollCost: 412,
    avgBorderDelayMinutes: 15,
    fuelPriceIndex: 6.8,
    slaRiskScore: 18,
    emissionRestrictionLevel: "high",
    seasonalRiskScore: 28,
    congestionIndex: 61,
    strategicPriorityScore: 97,
    totalDistanceKm: 1850,
    reliabilityIndex: 93,
    profitPerTonne: 168,
    onTimeRate: 94,
    vehicleRestrictions: ["brenner_pass_weight", "night_ban_AT"],
    status: "active",
  },
  {
    id: "north-sea-baltic",
    name: "North Sea–Baltic Corridor",
    shortName: "N.Sea–Baltic",
    startCountry: "🇮🇪 Ireland",
    endCountry: "🇱🇻 Latvia / 🇱🇹 Lithuania",
    countries: ["IE", "UK", "NL", "BE", "DE", "PL", "LV", "LT"],
    primaryHighways: ["A14", "E28", "A2", "Via Baltica"],
    avgTransitHours: 44,
    avgTollCost: 580,
    avgBorderDelayMinutes: 42,
    fuelPriceIndex: 6.2,
    slaRiskScore: 31,
    emissionRestrictionLevel: "medium",
    seasonalRiskScore: 22,
    congestionIndex: 38,
    strategicPriorityScore: 89,
    totalDistanceKm: 2900,
    reliabilityIndex: 82,
    profitPerTonne: 128,
    onTimeRate: 87,
    vehicleRestrictions: ["uk_post_brexit", "pl_etoll"],
    status: "active",
    disruption: "Post-Brexit UK border delays averaging +47 min",
  },
  {
    id: "atlantic",
    name: "Atlantic Corridor",
    shortName: "Atlantic",
    startCountry: "🇮🇪 Ireland / 🇵🇹 Portugal",
    endCountry: "🇪🇸 Spain / 🇫🇷 France",
    countries: ["IE", "PT", "ES", "FR"],
    primaryHighways: ["A1-PT", "A1-ES", "A10", "A63", "A10-FR"],
    avgTransitHours: 36,
    avgTollCost: 640,
    avgBorderDelayMinutes: 12,
    fuelPriceIndex: 6.1,
    slaRiskScore: 28,
    emissionRestrictionLevel: "medium",
    seasonalRiskScore: 18,
    congestionIndex: 42,
    strategicPriorityScore: 85,
    totalDistanceKm: 2400,
    reliabilityIndex: 86,
    profitPerTonne: 121,
    onTimeRate: 88,
    vehicleRestrictions: ["es_sunday_ban"],
    status: "disrupted",
    disruption: "Spanish toll increase effective Jan 2026 (+7%)",
  },
  {
    id: "baltic-adriatic",
    name: "Baltic–Adriatic Corridor",
    shortName: "Baltic–Adriatic",
    startCountry: "🇵🇱 Poland",
    endCountry: "🇭🇷 Croatia / 🇮🇹 Italy",
    countries: ["PL", "AT", "SI", "HR", "IT"],
    primaryHighways: ["A1-PL", "A22-AT", "A10-AT", "A1-SI", "A4-IT"],
    avgTransitHours: 32,
    avgTollCost: 490,
    avgBorderDelayMinutes: 20,
    fuelPriceIndex: 5.9,
    slaRiskScore: 24,
    emissionRestrictionLevel: "medium",
    seasonalRiskScore: 30,
    congestionIndex: 35,
    strategicPriorityScore: 88,
    totalDistanceKm: 1980,
    reliabilityIndex: 87,
    profitPerTonne: 134,
    onTimeRate: 89,
    vehicleRestrictions: ["alpine_seasonal", "pl_etoll"],
    status: "active",
  },
  {
    id: "orient-east-med",
    name: "Orient / East-Med Corridor",
    shortName: "Orient–E.Med",
    startCountry: "🇩🇪 Germany",
    endCountry: "🇬🇷 Greece / 🇨🇾 Cyprus",
    countries: ["DE", "AT", "HU", "SK", "RO", "BG", "GR"],
    primaryHighways: ["A4-DE", "M1-HU", "A1-RO", "Eg. E79"],
    avgTransitHours: 56,
    avgTollCost: 340,
    avgBorderDelayMinutes: 65,
    fuelPriceIndex: 5.4,
    slaRiskScore: 47,
    emissionRestrictionLevel: "low",
    seasonalRiskScore: 25,
    congestionIndex: 44,
    strategicPriorityScore: 81,
    totalDistanceKm: 3200,
    reliabilityIndex: 74,
    profitPerTonne: 98,
    onTimeRate: 79,
    vehicleRestrictions: ["balkans_road_quality", "ro_weight_restrict"],
    status: "active",
  },
];

// ─── CORRIDOR SCORING ENGINE ──────────────────────────────────────────────────
function computeCorridorScore(c: EUCorridor): number {
  const timeEfficiency   = Math.max(0, 100 - (c.avgTransitHours / 72) * 100) / 100;
  const costEfficiency   = Math.max(0, 100 - (c.avgTollCost / 1000) * 100) / 100;
  const slaCompliance    = (100 - c.slaRiskScore) / 100;
  const fuelOpt          = (10 - c.fuelPriceIndex) / 9;
  const tollImpact       = Math.max(0, 1 - c.avgTollCost / 1000);
  const borderRisk       = Math.max(0, 1 - c.avgBorderDelayMinutes / 90);
  const emissionScore    = c.emissionRestrictionLevel === "low" ? 1 : c.emissionRestrictionLevel === "medium" ? 0.6 : 0.3;

  const score =
    (0.25 * timeEfficiency) +
    (0.20 * costEfficiency) +
    (0.15 * slaCompliance) +
    (0.10 * fuelOpt) +
    (0.10 * tollImpact) +
    (0.10 * borderRisk) +
    (0.10 * emissionScore);

  return Math.round(score * 100);
}

const SCORED_CORRIDORS = EU_CORRIDORS.map(c => ({ ...c, corridorScore: computeCorridorScore(c) }))
  .sort((a, b) => (b.corridorScore ?? 0) - (a.corridorScore ?? 0));

// ─── MOCK COMPARISON DATA ─────────────────────────────────────────────────────
function buildComparison(c: EUCorridor): CorridorComparison {
  const fuelCost  = c.totalDistanceKm * 0.38 * (c.fuelPriceIndex / 7);
  const driverCost = (c.avgTransitHours / 8) * 280;
  const maint     = c.totalDistanceKm * 0.12;
  const total     = fuelCost + driverCost + maint + c.avgTollCost;
  const revenue   = total * (1 + 0.18 + Math.random() * 0.1);
  const margin    = ((revenue - total) / revenue) * 100;

  return {
    corridorId: c.id,
    transitDays: parseFloat((c.avgTransitHours / 24).toFixed(1)),
    totalToll: c.avgTollCost,
    fuelCost: Math.round(fuelCost),
    driverCost: Math.round(driverCost),
    maintenanceCost: Math.round(maint),
    totalCost: Math.round(total),
    estimatedRevenue: Math.round(revenue),
    profitMargin: parseFloat(margin.toFixed(1)),
    slaConfidence: 100 - c.slaRiskScore,
    co2Kg: Math.round(c.totalDistanceKm * 0.85),
    corridorScore: c.corridorScore ?? 0,
  };
}

// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
const AI_INSIGHTS: AIInsight[] = [
  {
    severity: "warning",
    corridor: "Atlantic",
    message: "Atlantic Corridor performance dropped 7% due to toll increase in Spain.",
    impact: "Estimated margin compression of €128 per trip",
    action: "Consider Rhine–Alpine as primary alternative for Iberian freight",
    timestamp: "2h ago",
  },
  {
    severity: "critical",
    corridor: "Orient–E.Med",
    message: "Increased compliance risk in Poland due to cabotage saturation. 3 operators at limit.",
    impact: "Potential €4,200 fines + 4-day cooling forced delay",
    action: "Reroute via Baltic–Adriatic for PL-sourced freight",
    timestamp: "4h ago",
  },
  {
    severity: "info",
    corridor: "Rhine–Alpine",
    message: "Brenner Pass weight limits lifted seasonally until March - window for heavier loads.",
    impact: "20T HGV now viable. Revenue uplift potential €340/trip",
    action: "Activate 20T Rigid HGV for IT-bound cargo immediately",
    timestamp: "1d ago",
  },
  {
    severity: "warning",
    corridor: "N.Sea–Baltic",
    message: "Post-Brexit border delay spike detected. UK–EU crossing now +47 min average.",
    impact: "SLA breach risk +12% for UK-origin freight",
    action: "Pre-submit customs clearance 48h before crossing",
    timestamp: "6h ago",
  },
];

// ─── SELF-LEARNING DATA ───────────────────────────────────────────────────────
const LEARNING_DATA = [
  { week: "W1", predicted: 28, actual: 31, variance: 3 },
  { week: "W2", predicted: 32, actual: 30, variance: -2 },
  { week: "W3", predicted: 29, actual: 33, variance: 4 },
  { week: "W4", predicted: 30, actual: 28, variance: -2 },
  { week: "W5", predicted: 31, actual: 31, variance: 0 },
  { week: "W6", predicted: 29, actual: 30, variance: 1 },
  { week: "W7", predicted: 30, actual: 29, variance: -1 },
  { week: "W8", predicted: 28, actual: 28, variance: 0 },
];

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────
const ScoreBadge = ({ score }: { score: number }) => {
  if (score >= 85) return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">🟢 {score}% High</Badge>;
  if (score >= 65) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">🟡 {score}% Med</Badge>;
  return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">🔴 {score}% Risk</Badge>;
};

const EmissionBadge = ({ level }: { level: string }) => {
  const map: Record<string, string> = { low: "bg-green-500/20 text-green-700", medium: "bg-yellow-500/20 text-yellow-700", high: "bg-red-500/20 text-red-700" };
  return <Badge className={map[level]}>{level.toUpperCase()} LEZ Risk</Badge>;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "active") return <Badge className="bg-green-500/20 text-green-700">● Active</Badge>;
  if (status === "disrupted") return <Badge className="bg-orange-500/20 text-orange-700">⚠ Disrupted</Badge>;
  return <Badge className="bg-red-500/20 text-red-700">✕ Restricted</Badge>;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TECCorridorOptimizer() {
  const [selectedCorridor, setSelectedCorridor] = useState<string>("rhine-alpine");
  const [compareMode, setCompareMode]           = useState(false);
  const [vehicleType, setVehicleType]           = useState("20t_rigid_hgv");
  const [cargoType, setCargoType]               = useState("general_goods");
  const [longHaulMode, setLongHaulMode]         = useState(true);
  const [containerMode, setContainerMode]       = useState(false);
  const [aiLearningLevel]                       = useState(82);

  const selected = useMemo(
    () => SCORED_CORRIDORS.find(c => c.id === selectedCorridor) ?? SCORED_CORRIDORS[0],
    [selectedCorridor]
  );

  const comparisons = useMemo(() => SCORED_CORRIDORS.map(buildComparison), []);
  const selectedComparison = useMemo(() => comparisons.find(c => c.corridorId === selectedCorridor) ?? comparisons[0], [comparisons, selectedCorridor]);

  const best        = SCORED_CORRIDORS[0];
  const secondBest  = SCORED_CORRIDORS[1];

  const radarData = [
    { metric: "Time Efficiency",   value: Math.max(0, 100 - (selected.avgTransitHours / 72) * 100) },
    { metric: "Cost Efficiency",   value: Math.max(0, 100 - (selected.avgTollCost / 1000) * 100) },
    { metric: "SLA Confidence",   value: 100 - selected.slaRiskScore },
    { metric: "Border Flow",      value: Math.max(0, 100 - selected.avgBorderDelayMinutes) },
    { metric: "Fuel Efficiency",  value: (10 - selected.fuelPriceIndex) * 10 },
    { metric: "Reliability",      value: selected.reliabilityIndex },
  ];

  const barData = comparisons.map(c => ({
    name: SCORED_CORRIDORS.find(x => x.id === c.corridorId)?.shortName ?? c.corridorId,
    score: c.corridorScore,
    margin: c.profitMargin,
    sla: c.slaConfidence,
  }));

  if (!TEC_AI_V1) {
    return (
      <DashboardLayout title="TEC Corridor Optimizer" subtitle="Trans-European Corridor AI">
        <div className="flex items-center justify-center h-64">
          <Alert><AlertCircle className="h-4 w-4 mr-2" /><AlertDescription>TEC AI module is disabled. Set tec_ai_v1 = true to activate.</AlertDescription></Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="TEC Corridor Optimizer" subtitle="Trans-European Corridor AI">
      <div className="p-6 space-y-6">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Trans-European Corridor Optimizer</h1>
                <p className="text-muted-foreground text-sm">AI-driven TEN-T corridor intelligence • Real-time routing • Profit-aware routing</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
              <Brain className="w-3 h-3 mr-1" /> AI Confidence: {aiLearningLevel}%
            </Badge>
            <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
              <Radio className="w-3 h-3 mr-1" /> TEC-AI v1 Active
            </Badge>
            <Button size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          </div>
        </div>

        {/* ── AI RECOMMENDATION BANNER ───────────────────────────────────────── */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">AI Corridor Recommendation</p>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium text-foreground">Best:</span> {best.shortName} - Score {best.corridorScore}% &nbsp;|&nbsp;
                  <span className="font-medium text-foreground">Alternative:</span> {secondBest.shortName} - Score {secondBest.corridorScore}%
                </p>
              </div>
              <div className="flex gap-3 text-sm flex-shrink-0">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Estimated Toll</p>
                  <p className="font-bold">€{best.avgTollCost}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Transit</p>
                  <p className="font-bold">{(best.avgTransitHours / 24).toFixed(1)}d</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">SLA Conf.</p>
                  <p className="font-bold">{100 - best.slaRiskScore}%</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Corridor Score</p>
                  <p className="font-bold text-green-600">{best.corridorScore}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ACTIVE ALERTS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AI_INSIGHTS.filter(i => i.severity !== "info").map((insight, idx) => (
            <Alert key={idx} className={
              insight.severity === "critical"
                ? "border-red-500/40 bg-red-500/5"
                : "border-yellow-500/40 bg-yellow-500/5"
            }>
              <AlertTriangle className={`h-4 w-4 ${insight.severity === "critical" ? "text-red-500" : "text-yellow-500"}`} />
              <AlertDescription>
                <span className="font-semibold">[{insight.corridor}]</span> {insight.message}
                <br /><span className="text-xs text-muted-foreground">{insight.action}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>

        {/* ── MAIN TABS ──────────────────────────────────────────────────────── */}
        <Tabs defaultValue="corridors">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="corridors"><Map className="w-4 h-4 mr-1" />Corridor Intelligence</TabsTrigger>
            <TabsTrigger value="compare"><GitBranch className="w-4 h-4 mr-1" />Compare Corridors</TabsTrigger>
            <TabsTrigger value="route"><Navigation className="w-4 h-4 mr-1" />Route Planner</TabsTrigger>
            <TabsTrigger value="profit"><Euro className="w-4 h-4 mr-1" />Profit Intelligence</TabsTrigger>
            <TabsTrigger value="fuel"><Fuel className="w-4 h-4 mr-1" />Fuel & Energy</TabsTrigger>
            <TabsTrigger value="sla"><Shield className="w-4 h-4 mr-1" />SLA Overlay</TabsTrigger>
            <TabsTrigger value="learning"><Brain className="w-4 h-4 mr-1" />Self-Learning AI</TabsTrigger>
            <TabsTrigger value="investor"><Star className="w-4 h-4 mr-1" />Investor Mode</TabsTrigger>
          </TabsList>

          {/* ── CORRIDOR INTELLIGENCE ─────────────────────────────────────── */}
          <TabsContent value="corridors" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Corridor List */}
              <div className="md:col-span-1 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">TEN-T Corridors</p>
                {SCORED_CORRIDORS.map((c) => (
                  <Card
                    key={c.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedCorridor === c.id ? "border-primary ring-1 ring-primary/30" : ""}`}
                    onClick={() => setSelectedCorridor(c.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{c.shortName}</p>
                          <p className="text-xs text-muted-foreground">{c.startCountry} → {c.endCountry}</p>
                        </div>
                        <ScoreBadge score={c.corridorScore ?? 0} />
                      </div>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={c.status} />
                        <span className="text-xs text-muted-foreground">{c.totalDistanceKm.toLocaleString()} km</span>
                      </div>
                      {c.disruption && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />{c.disruption}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Corridor Detail */}
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selected.name}</CardTitle>
                      <div className="flex gap-2">
                        <ScoreBadge score={selected.corridorScore ?? 0} />
                        <StatusBadge status={selected.status} />
                      </div>
                    </div>
                    <CardDescription>
                      {selected.startCountry} → {selected.endCountry} · {selected.countries.join(" · ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Avg Transit", value: `${(selected.avgTransitHours / 24).toFixed(1)} days`, icon: Clock },
                        { label: "Avg Toll", value: `€${selected.avgTollCost}`, icon: Euro },
                        { label: "Border Delay", value: `${selected.avgBorderDelayMinutes} min`, icon: AlertCircle },
                        { label: "Reliability", value: `${selected.reliabilityIndex}%`, icon: Activity },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-muted/40 rounded-lg p-3 text-center">
                          <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold text-sm">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Highways */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">PRIMARY HIGHWAYS</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.primaryHighways.map(h => (
                          <Badge key={h} variant="outline" className="font-mono text-xs">{h}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">VEHICLE RESTRICTIONS</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.vehicleRestrictions.map(r => (
                          <Badge key={r} className="bg-orange-500/10 text-orange-700 border-orange-500/20 text-xs">
                            ⚠ {r.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Radar Chart */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">CORRIDOR INTELLIGENCE RADAR</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Emission */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Emission Restriction Level</span>
                      </div>
                      <EmissionBadge level={selected.emissionRestrictionLevel} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── COMPARE CORRIDORS ─────────────────────────────────────────── */}
          <TabsContent value="compare" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Corridor Score Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" name="Corridor Score" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="sla" name="SLA Confidence %" fill="hsl(var(--secondary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corridor</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Transit</TableHead>
                    <TableHead>Toll (€)</TableHead>
                    <TableHead>Fuel (€)</TableHead>
                    <TableHead>Driver (€)</TableHead>
                    <TableHead>Total Cost (€)</TableHead>
                    <TableHead>Revenue (€)</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>SLA Conf.</TableHead>
                    <TableHead>CO₂ (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map((c) => {
                    const corridor = SCORED_CORRIDORS.find(x => x.id === c.corridorId);
                    return (
                      <TableRow
                        key={c.corridorId}
                        className={c.corridorId === selectedCorridor ? "bg-primary/5" : ""}
                        onClick={() => setSelectedCorridor(c.corridorId)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">{corridor?.shortName}</TableCell>
                        <TableCell><ScoreBadge score={c.corridorScore} /></TableCell>
                        <TableCell>{c.transitDays}d</TableCell>
                        <TableCell>{c.totalToll.toLocaleString()}</TableCell>
                        <TableCell>{c.fuelCost.toLocaleString()}</TableCell>
                        <TableCell>{c.driverCost.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{c.totalCost.toLocaleString()}</TableCell>
                        <TableCell>{c.estimatedRevenue.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={c.profitMargin < 12 ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>
                            {c.profitMargin}%
                          </span>
                        </TableCell>
                        <TableCell>{c.slaConfidence}%</TableCell>
                        <TableCell>{c.co2Kg.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── ROUTE PLANNER INTEGRATION ─────────────────────────────────── */}
          <TabsContent value="route" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Navigation className="w-5 h-5" />Cross-Border Route Configuration</CardTitle>
                <CardDescription>Configure vehicle and cargo. Corridor AI activates automatically for 2+ EU countries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggles */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Long Haul Mode", state: longHaulMode, set: setLongHaulMode },
                    { label: "Container Mode", state: containerMode, set: setContainerMode },
                    { label: "Industrial Route", state: false, set: () => {} },
                  ].map(({ label, state, set }) => (
                    <div key={label} className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={state} onCheckedChange={set} />
                    </div>
                  ))}
                </div>

                {/* Vehicle & Cargo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bike">🚲 Bike</SelectItem>
                        <SelectItem value="van">🚐 Van</SelectItem>
                        <SelectItem value="bus">🚌 Bus</SelectItem>
                        <SelectItem value="15t_medium_heavy">🚛 15T Medium Heavy (6-Wheeler)</SelectItem>
                        <SelectItem value="20t_rigid_hgv">🚛 20T Rigid HGV (8-Wheeler)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo Type</Label>
                    <Select value={cargoType} onValueChange={setCargoType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_goods">General Goods</SelectItem>
                        <SelectItem value="construction_material">Construction Material</SelectItem>
                        <SelectItem value="containerized">Containerized</SelectItem>
                        <SelectItem value="perishable">Perishable</SelectItem>
                        <SelectItem value="mining_material">Mining Material</SelectItem>
                        <SelectItem value="industrial_machinery">Industrial Machinery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Corridor AI Output */}
                <div className="p-4 border border-primary/30 rounded-xl bg-primary/5 space-y-4">
                  <p className="font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Corridor AI Recommendation</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: "Corridor", value: best.shortName, accent: true },
                      { label: "Est. Transit", value: `${(best.avgTransitHours / 24).toFixed(1)} days`, accent: false },
                      { label: "Est. Toll", value: `€${best.avgTollCost}`, accent: false },
                      { label: "SLA Confidence", value: `${100 - best.slaRiskScore}%`, accent: false },
                      { label: "Corridor Score", value: `${best.corridorScore}%`, accent: true },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`font-bold text-sm ${accent ? "text-primary" : ""}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Vehicle compatibility */}
                  {(vehicleType === "20t_rigid_hgv" && best.vehicleRestrictions.length > 0) && (
                    <Alert className="border-yellow-500/40 bg-yellow-500/5">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-sm">
                        <strong>20T HGV restrictions detected:</strong> {best.vehicleRestrictions.join(", ")}. Verify permits before dispatch.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button className="flex-1">Confirm & Dispatch via {best.shortName}</Button>
                    <Button variant="outline"><GitBranch className="w-4 h-4 mr-1" />Compare Corridors</Button>
                  </div>
                </div>

                {/* Border delay risk */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Border Delay Risk Scores</p>
                  {SCORED_CORRIDORS.map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs w-28 text-muted-foreground">{c.shortName}</span>
                      <Progress value={c.avgBorderDelayMinutes} max={90} className="flex-1 h-2" />
                      <span className={`text-xs font-medium w-16 text-right ${c.avgBorderDelayMinutes > 50 ? "text-red-600" : c.avgBorderDelayMinutes > 25 ? "text-yellow-600" : "text-green-600"}`}>
                        {c.avgBorderDelayMinutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROFIT INTELLIGENCE ───────────────────────────────────────── */}
          <TabsContent value="profit" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Selected Corridor P&L</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Estimated Revenue", value: `€${selectedComparison.estimatedRevenue.toLocaleString()}`, positive: true },
                    { label: "Fuel Cost", value: `-€${selectedComparison.fuelCost.toLocaleString()}`, positive: false },
                    { label: "Toll Cost", value: `-€${selectedComparison.totalToll.toLocaleString()}`, positive: false },
                    { label: "Driver Cost", value: `-€${selectedComparison.driverCost.toLocaleString()}`, positive: false },
                    { label: "Maintenance", value: `-€${selectedComparison.maintenanceCost.toLocaleString()}`, positive: false },
                    { label: "Net Profit", value: `€${(selectedComparison.estimatedRevenue - selectedComparison.totalCost).toLocaleString()}`, positive: true },
                  ].map(({ label, value, positive }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className={`text-sm font-semibold ${label === "Net Profit" ? (positive ? "text-green-600" : "text-red-600") : ""}`}>{value}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Margin</span>
                      <span className={`text-sm font-bold ${selectedComparison.profitMargin < 12 ? "text-red-600" : "text-green-600"}`}>
                        {selectedComparison.profitMargin}%
                      </span>
                    </div>
                    {selectedComparison.profitMargin < 12 && (
                      <Alert className="mt-2 border-red-500/40 bg-red-500/5 py-2">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <AlertDescription className="text-xs">Warning: Route margin below 12%. Consider load consolidation.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Profit per Corridor</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={comparisons.map(c => ({
                      name: SCORED_CORRIDORS.find(x => x.id === c.corridorId)?.shortName,
                      profit: c.estimatedRevenue - c.totalCost,
                      margin: c.profitMargin,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="profit" name="Net Profit (€)" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Consolidation suggestions */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="w-4 h-4" />AI Consolidation Suggestions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { hub: "Milan Hub (IT)", saving: "6.2%", shipments: 3, corridor: "Rhine–Alpine / Baltic–Adriatic" },
                  { hub: "Rotterdam Hub (NL)", saving: "4.8%", shipments: 5, corridor: "Rhine–Alpine / North Sea–Baltic" },
                  { hub: "Frankfurt Hub (DE)", saving: "3.1%", shipments: 2, corridor: "Scand–Med / Orient–E.Med" },
                ].map((s) => (
                  <div key={s.hub} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">Consolidate {s.shipments} shipments via {s.hub}</p>
                      <p className="text-xs text-muted-foreground">{s.corridor}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold text-sm">+{s.saving} margin</p>
                      <Button size="sm" variant="outline" className="mt-1 h-6 text-xs">Apply</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FUEL & ENERGY ─────────────────────────────────────────────── */}
          <TabsContent value="fuel" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Fuel className="w-4 h-4" />Country Fuel Price Index</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { country: "🇧🇪 Belgium", priceL: 1.62, saving: "€128 vs DE", recommended: true },
                    { country: "🇩🇪 Germany", priceL: 1.78, saving: "", recommended: false },
                    { country: "🇫🇷 France", priceL: 1.71, saving: "€58 vs DE", recommended: false },
                    { country: "🇵🇱 Poland", priceL: 1.48, saving: "€214 vs DE", recommended: false },
                    { country: "🇪🇸 Spain", priceL: 1.55, saving: "€162 vs DE", recommended: false },
                    { country: "🇳🇱 Netherlands", priceL: 1.84, saving: "", recommended: false },
                  ].map(s => (
                    <div key={s.country} className={`flex items-center justify-between p-2 rounded-lg ${s.recommended ? "bg-green-500/10 border border-green-500/30" : "hover:bg-muted/30"}`}>
                      <span className="text-sm">{s.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">€{s.priceL}/L</span>
                        {s.saving && <Badge className="bg-green-500/20 text-green-700 text-xs">{s.saving}</Badge>}
                        {s.recommended && <Badge className="bg-primary/20 text-primary text-xs">Recommended</Badge>}
                      </div>
                    </div>
                  ))}
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <Fuel className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-sm">
                      <strong>Refuel in Belgium to save €128</strong> on Rhine–Alpine route. AdBlue available at all major stops.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wind className="w-4 h-4" />CO₂ Intelligence</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {comparisons.map(c => {
                      const name = SCORED_CORRIDORS.find(x => x.id === c.corridorId)?.shortName;
                      const maxCo2 = Math.max(...comparisons.map(x => x.co2Kg));
                      return (
                        <div key={c.corridorId} className="flex items-center gap-3">
                          <span className="text-xs w-28 text-muted-foreground">{name}</span>
                          <Progress value={(c.co2Kg / maxCo2) * 100} className="flex-1 h-2" />
                          <span className="text-xs font-medium w-20 text-right">{c.co2Kg.toLocaleString()} kg</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Best CO₂ Route</p>
                      <p className="font-bold text-sm text-green-600">Rhine–Alpine</p>
                      <p className="text-xs">1,573 kg / trip</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Emissions/Ton-KM</p>
                      <p className="font-bold text-sm">0.085 kg</p>
                      <p className="text-xs">Euro 6 HGV</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SLA OVERLAY ───────────────────────────────────────────────── */}
          <TabsContent value="sla" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4" />SLA Probability by Corridor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SCORED_CORRIDORS.map(c => {
                  const onTime = c.onTimeRate;
                  const risk = c.slaRiskScore;
                  return (
                    <div key={c.id} className={`p-4 rounded-xl border ${risk > 40 ? "border-red-500/30 bg-red-500/5" : risk > 20 ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{c.shortName}</p>
                          <p className="text-xs text-muted-foreground">{c.startCountry} → {c.endCountry}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">On-Time Probability</p>
                          <p className={`font-bold ${onTime >= 90 ? "text-green-600" : onTime >= 80 ? "text-yellow-600" : "text-red-600"}`}>{onTime}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={onTime} className="flex-1 h-2" />
                        {risk > 15 && (
                          <Badge className="bg-orange-500/20 text-orange-700 text-xs">SLA Risk {risk}%</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SELF-LEARNING AI ──────────────────────────────────────────── */}
          <TabsContent value="learning" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{aiLearningLevel}%</p>
                  <p className="text-muted-foreground text-sm">AI Learning Confidence</p>
                  <Progress value={aiLearningLevel} className="mt-3" />
                  <p className="text-xs text-muted-foreground mt-2">Next retrain: 7 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">1,284</p>
                  <p className="text-muted-foreground text-sm">Historical Trips Analyzed</p>
                  <p className="text-xs text-muted-foreground mt-1">Across 6 TEN-T corridors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">-14%</p>
                  <p className="text-muted-foreground text-sm">Prediction Error Reduction</p>
                  <p className="text-xs text-muted-foreground mt-1">vs. initial model (8 weeks)</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Predicted vs Actual Transit Hours (Rhine–Alpine)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ReLineChart data={LEARNING_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" name="Predicted (hrs)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="actual" name="Actual (hrs)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  </ReLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">AI Insight Feed</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {AI_INSIGHTS.map((insight, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                    insight.severity === "critical" ? "border-red-500 bg-red-500/5" :
                    insight.severity === "warning"  ? "border-yellow-500 bg-yellow-500/5" :
                    "border-blue-500 bg-blue-500/5"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">[{insight.corridor}] {insight.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">Impact: {insight.impact}</p>
                        <p className="text-xs mt-1 text-primary">→ {insight.action}</p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">{insight.timestamp}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── INVESTOR MODE ─────────────────────────────────────────────── */}
          <TabsContent value="investor" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Corridor Dominance Score", value: "74%", icon: Star, color: "text-yellow-600" },
                { label: "Cross-Border Penetration", value: "6 / 9 TEN-T", icon: Globe, color: "text-blue-600" },
                { label: "Total Corridor Revenue", value: "€2.4M / mo", icon: Euro, color: "text-green-600" },
                { label: "EU Expansion Index", value: "+18%", icon: TrendingUp, color: "text-primary" },
                { label: "Avg Haul Distance Growth", value: "+340 km YoY", icon: Navigation, color: "text-purple-600" },
                { label: "AI Optimization Impact", value: "€184K saved", icon: Brain, color: "text-indigo-600" },
                { label: "Freight Corridors Active", value: "6 corridors", icon: Layers, color: "text-orange-600" },
                { label: "On-Time Rate (EU)", value: "89.4%", icon: CheckCircle2, color: "text-green-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Positioning: RouteAce EU Corridor Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { competitor: "SAP TM", routeAce: 82, them: 91, dimension: "Feature Depth" },
                    { competitor: "Oracle TM", routeAce: 88, them: 85, dimension: "SME Accessibility" },
                    { competitor: "Transporeon", routeAce: 91, them: 78, dimension: "Corridor AI" },
                    { competitor: "Bringg Enterprise", routeAce: 87, them: 82, dimension: "Dispatch Integration" },
                    { competitor: "Industry Average", routeAce: 93, them: 70, dimension: "Emerging Markets" },
                  ].map(b => (
                    <div key={b.competitor} className="p-3 border rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">{b.dimension}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted-foreground">RouteAce</span>
                        <Progress value={b.routeAce} className="flex-1 h-1.5" />
                        <span className="font-bold text-primary">{b.routeAce}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted-foreground">{b.competitor}</span>
                        <Progress value={b.them} className="flex-1 h-1.5" />
                        <span className="font-medium text-muted-foreground">{b.them}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4 italic">
                  "Europe's AI Corridor Freight Optimizer - Not just a route planner, but a trade artery intelligence system."
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
