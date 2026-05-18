import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  COUNTRY_DEFAULTS,
  COUNTRY_FLAGS,
  formatPrice,
} from "@/lib/global/countryConfig";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Globe,
  TrendingUp,
  DollarSign,
  Truck,
  Target,
  Calculator,
} from "lucide-react";

// ─── Model Constants (from strategy doc) ───────────────────────

const BLENDED_ARPV_USD = 285; // Average Revenue Per Vehicle/month
const GROSS_MARGIN_TARGET = 0.78;

interface RegionProjection {
  code: string;
  name: string;
  flag: string;
  year1Vehicles: number;
  year2Vehicles: number;
  year3Vehicles: number;
  arpv: number; // local ARPV in USD equivalent
  currency: string;
}

const BASE_PROJECTIONS: RegionProjection[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", year1Vehicles: 1200, year2Vehicles: 2500, year3Vehicles: 4000, arpv: 180, currency: "NGN" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", year1Vehicles: 300, year2Vehicles: 900, year3Vehicles: 1800, arpv: 350, currency: "GBP" },
  { code: "US", name: "United States", flag: "🇺🇸", year1Vehicles: 0, year2Vehicles: 700, year3Vehicles: 2000, arpv: 380, currency: "USD" },
  { code: "AE", name: "UAE", flag: "🇦🇪", year1Vehicles: 0, year2Vehicles: 400, year3Vehicles: 900, arpv: 320, currency: "AED" },
  { code: "CA", name: "Canada", flag: "🇨🇦", year1Vehicles: 0, year2Vehicles: 0, year3Vehicles: 800, arpv: 300, currency: "CAD" },
];

const VALUATION_MULTIPLES = {
  nigeriaOnly: { low: 2, high: 4 },
  multiRegion: { low: 6, high: 10 },
  enterprisePenetration: { low: 8, high: 12 },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface LiveBaseline {
  vehicles: number;
  annualRevenueUSD: number;
  mrrUSD: number;
}

interface RevenueProjectionModelProps {
  liveBaseline?: LiveBaseline;
}

const RevenueProjectionModel = ({ liveBaseline }: RevenueProjectionModelProps) => {
  const [enterprisePct, setEnterprisePct] = useState(20);
  const [growthMultiplier, setGrowthMultiplier] = useState(100); // 100 = base case

  const scale = growthMultiplier / 100;
  const hasLive = !!liveBaseline && liveBaseline.vehicles > 0;

  // Year 1 = live platform baseline. Y2/Y3 = forward scenario projections.
  // Scenario assumptions (transparent, single source of truth):
  const Y2_VEHICLE_MULTIPLE = 3; // 3x fleet by Y2
  const Y3_VEHICLE_MULTIPLE = 8; // 8x fleet by Y3
  const NEW_REGION_ARPV_LIFT = 1.25; // global expansion lifts blended ARPV ~25%

  const liveVehicles = liveBaseline?.vehicles ?? 0;
  const liveARR = liveBaseline?.annualRevenueUSD ?? 0;
  const livePerVehicleARPV =
    liveVehicles > 0 && liveARR > 0 ? liveARR / liveVehicles / 12 : BLENDED_ARPV_USD;

  const year1Vehicles = Math.round(liveVehicles * scale);
  const year2Vehicles = Math.round(liveVehicles * Y2_VEHICLE_MULTIPLE * scale);
  const year3Vehicles = Math.round(liveVehicles * Y3_VEHICLE_MULTIPLE * scale);

  const year1ARR = year1Vehicles * livePerVehicleARPV * 12;
  const year2ARR = year2Vehicles * livePerVehicleARPV * 12;
  const year3ARR = year3Vehicles * livePerVehicleARPV * NEW_REGION_ARPV_LIFT * 12;

  // Enterprise uplift on Y3
  const enterpriseARPV = 400;
  const blendedARPV3 =
    livePerVehicleARPV * NEW_REGION_ARPV_LIFT * (1 - enterprisePct / 100) +
    enterpriseARPV * (enterprisePct / 100);
  const totalVehiclesY3 = year3Vehicles;
  const enterpriseAdjustedARR = totalVehiclesY3 * blendedARPV3 * 12;

  // Gross profit
  const year3GrossProfit = year3ARR * GROSS_MARGIN_TARGET;

  // Valuation scenarios
  const valuationLow = year3ARR * VALUATION_MULTIPLES.multiRegion.low;
  const valuationHigh = enterpriseAdjustedARR * VALUATION_MULTIPLES.enterprisePenetration.high;

  // Chart data
  const arrChartData = [
    { year: "Year 1 (live)", arr: year1ARR, vehicles: year1Vehicles },
    { year: "Year 2 (proj.)", arr: year2ARR, vehicles: year2Vehicles },
    { year: "Year 3 (proj.)", arr: year3ARR, vehicles: year3Vehicles },
  ];

  const marginData = [
    { name: "Subscription", margin: 88, revenue: year3ARR * 0.58 },
    { name: "Per-Drop Fees", margin: 75, revenue: year3ARR * 0.42 },
  ];

  const metricsToTrack = [
    { label: "Net Revenue Retention", target: ">110%", status: "Track" },
    { label: "CAC Payback", target: "<12 months", status: "Track" },
    { label: "Annual Churn", target: "<8%", status: "Track" },
    { label: "Gross Margin", target: "78%+", status: "Track" },
    { label: "LTV:CAC Ratio", target: ">3x", status: "Track" },
    { label: "Sales Cycle (SMB)", target: "<30 days", status: "Track" },
  ];

  const fmtUSD = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

  if (!hasLive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-heading font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              3-Year Revenue Projection Model
            </h3>
            <p className="text-sm text-muted-foreground">
              Investor-ready financial forecast - anchored to live platform fleet
            </p>
          </div>
          <Badge variant="outline">Confidential</Badge>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-2">
            <Calculator className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No live fleet baseline yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Projections require at least one registered vehicle and recorded revenue. Once your fleet is onboarded, Year 1 will reflect live ARR and Years 2–3 will scale from it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-heading font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            3-Year Revenue Projection Model
          </h3>
          <p className="text-sm text-muted-foreground">
            Year 1 anchored to live platform data. Years 2–3 are forward-looking scenario projections.
          </p>
        </div>
        <Badge variant="outline">Confidential</Badge>
      </div>

      {/* Live baseline banner */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="font-medium">Live baseline:</span>
        <span><Truck className="w-3.5 h-3.5 inline mr-1" />{liveVehicles.toLocaleString()} vehicles</span>
        <span>${liveARR.toLocaleString(undefined, { maximumFractionDigits: 0 })} TTM revenue</span>
        <span className="text-muted-foreground">ARPV ≈ ${livePerVehicleARPV.toFixed(0)}/vehicle/month</span>
      </div>

      {/* Scenario Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Scenario Modeler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Growth Rate: {growthMultiplier}% of base case</Label>
              <Slider
                value={[growthMultiplier]}
                min={50}
                max={200}
                step={10}
                onValueChange={(v) => setGrowthMultiplier(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                50% = conservative, 100% = base, 200% = aggressive
              </p>
            </div>
            <div className="space-y-2">
              <Label>Enterprise Penetration: {enterprisePct}% of Y3 fleet</Label>
              <Slider
                value={[enterprisePct]}
                min={0}
                max={50}
                step={5}
                onValueChange={(v) => setEnterprisePct(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Enterprise fleets pay ~$400/vehicle/month vs $285 blended
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ARR Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { year: "Year 1", arr: year1ARR, vehicles: arrChartData[0].vehicles, markets: "Live baseline" },
          { year: "Year 2", arr: year2ARR, vehicles: arrChartData[1].vehicles, markets: `Projected (${Y2_VEHICLE_MULTIPLE}x fleet)` },
          { year: "Year 3", arr: year3ARR, vehicles: arrChartData[2].vehicles, markets: `Projected (${Y3_VEHICLE_MULTIPLE}x fleet)` },
        ].map((item, i) => (
          <motion.div key={item.year} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={i === 2 ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{item.year} ARR</p>
                <p className="text-3xl font-bold font-heading">{fmtUSD(item.arr)}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {item.vehicles.toLocaleString()} vehicles
                  </span>
                  <span>{item.markets}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ARR Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ARR Growth Trajectory</CardTitle>
          <CardDescription>Annual Recurring Revenue by year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number) => [`$${(value / 1_000_000).toFixed(2)}M`, "ARR"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="arr" name="ARR" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles by Year + Margin Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet Growth Trajectory</CardTitle>
            <CardDescription>Live Year 1 vs projected Years 2–3</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arrChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), "Vehicles"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="vehicles" name="Vehicles" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin Structure</CardTitle>
            <CardDescription>Target SaaS gross margins by revenue stream</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {marginData.map((m) => (
              <div key={m.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{m.name}</span>
                  <span className="font-medium">{m.margin}% gross margin</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${m.margin}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{fmtUSD(m.revenue)} revenue</p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Year 3 Gross Profit</span>
              <span className="text-primary">{fmtUSD(year3GrossProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Scenarios */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Valuation Scenarios
          </CardTitle>
          <CardDescription>Based on Year 3 ARR multiples by market positioning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-xs text-muted-foreground">Nigeria-Only (2–4x ARR)</p>
              <p className="text-lg font-bold">
                {fmtUSD(year3ARR * 2)} – {fmtUSD(year3ARR * 4)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 space-y-1 border border-primary/20">
              <p className="text-xs text-muted-foreground">Multi-Region SaaS (6–10x)</p>
              <p className="text-lg font-bold text-primary">
                {fmtUSD(valuationLow)} – {fmtUSD(year3ARR * 10)}
              </p>
              <Badge variant="secondary" className="text-xs">Base Case</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-xs text-muted-foreground">Enterprise Penetration (8–12x)</p>
              <p className="text-lg font-bold">
                {fmtUSD(enterpriseAdjustedARR * 8)} – {fmtUSD(valuationHigh)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year-over-Year Projection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Year-over-Year Projection</CardTitle>
          <CardDescription>Derived from live ARPV ${livePerVehicleARPV.toFixed(0)}/vehicle/month, growth scale {growthMultiplier}%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Period</th>
                  <th className="text-right py-2 px-3">Source</th>
                  <th className="text-right py-2 px-3">Vehicles</th>
                  <th className="text-right py-2 px-3">ARPV (USD)</th>
                  <th className="text-right py-2 px-3">ARR</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium">Year 1</td>
                  <td className="text-right py-2 px-3"><Badge variant="secondary" className="text-xs">Live</Badge></td>
                  <td className="text-right py-2 px-3">{year1Vehicles.toLocaleString()}</td>
                  <td className="text-right py-2 px-3">${livePerVehicleARPV.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-medium">{fmtUSD(year1ARR)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium">Year 2</td>
                  <td className="text-right py-2 px-3"><Badge variant="outline" className="text-xs">Projected</Badge></td>
                  <td className="text-right py-2 px-3">{year2Vehicles.toLocaleString()}</td>
                  <td className="text-right py-2 px-3">${livePerVehicleARPV.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-medium">{fmtUSD(year2ARR)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Year 3</td>
                  <td className="text-right py-2 px-3"><Badge variant="outline" className="text-xs">Projected</Badge></td>
                  <td className="text-right py-2 px-3">{year3Vehicles.toLocaleString()}</td>
                  <td className="text-right py-2 px-3">${(livePerVehicleARPV * NEW_REGION_ARPV_LIFT).toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-medium">{fmtUSD(year3ARR)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Investor Metrics Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Key Investor Metrics to Track
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metricsToTrack.map((m) => (
              <div key={m.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">Target: {m.target}</p>
                </div>
                <Badge variant={m.status === "On Target" ? "default" : "secondary"} className="text-xs">
                  {m.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Narrative */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h4 className="font-heading font-semibold mb-3">Strategic Narrative</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            {[
              { flag: "🇳🇬", text: "Nigeria builds algorithm intelligence moat" },
              { flag: "🇬🇧", text: "UK validates premium pricing" },
              { flag: "🇺🇸", text: "US drives ARR scale" },
              { flag: "🇦🇪", text: "UAE improves margin quality" },
              { flag: "🇨🇦", text: "Canada strengthens Western credibility" },
            ].map((item) => (
              <div key={item.flag} className="p-3 rounded-lg border border-border text-center">
                <p className="text-2xl mb-1">{item.flag}</p>
                <p className="text-xs text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 italic text-center">
            "African-built logistics intelligence exporting operational efficiency globally."
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueProjectionModel;
