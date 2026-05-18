import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CheckCircle, Zap, Shield, Globe, Cpu, Truck, Package, RefreshCw,
  Calculator, ArrowRight, Sparkles, TrendingDown, Code, Lock, Activity,
  Bike, Car,
} from "lucide-react";
import {
  COUNTRY_DEFAULTS,
  COUNTRY_FLAGS,
  formatPrice,
  type CountryConfig,
} from "@/lib/global/countryConfig";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── Country-Specific Per-Drop Base Rates ─── */
const COUNTRY_BASE_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
  NG: { rate: 50, symbol: "₦", code: "NGN" },
  KE: { rate: 6, symbol: "KSh", code: "KES" },
  GB: { rate: 0.20, symbol: "£", code: "GBP" },
  US: { rate: 0.25, symbol: "$", code: "USD" },
  AE: { rate: 0.60, symbol: "د.إ", code: "AED" },
  CA: { rate: 0.22, symbol: "C$", code: "CAD" },
};

/* ─── Complexity Multipliers ─── */
const FLEET_TYPES = [
  { value: "bike", label: "Bike / Motorcycle", multiplier: 1.0, icon: Bike },
  { value: "van", label: "Van / Car", multiplier: 1.2, icon: Car },
  { value: "truck", label: "Truck", multiplier: 1.5, icon: Truck },
];

const ROUTE_MULTIPLIERS = [
  { value: "standard", label: "Standard", multiplier: 1.0 },
  { value: "multi-drop", label: "Multi-drop Route", multiplier: 1.3 },
  { value: "cold-chain", label: "Cold-chain", multiplier: 1.4 },
];

/* ─── Volume Discount Logic ─── */
function getVolumeDiscount(monthly: number): number {
  if (monthly >= 50000) return 0.20;
  if (monthly >= 10000) return 0.10;
  return 0;
}

function getDropPrice(baseRate: number, fleetMultiplier: number, routeMultiplier: number, monthly: number): number {
  const raw = baseRate * fleetMultiplier * routeMultiplier;
  const discount = getVolumeDiscount(monthly);
  return +(raw * (1 - discount)).toFixed(4);
}

/* ─── AI Credit Packs ─── */
const AI_CREDIT_PACKS = [
  { name: "Starter Pack", credits: 500, priceUSD: 49 },
  { name: "Growth Pack", credits: 2000, priceUSD: 179 },
  { name: "Pro Pack", credits: 10000, priceUSD: 799 },
];

/* ─── Regions ─── */
const REGIONS = [
  { code: "US", label: "USD (Global)" },
  { code: "NG", label: "Nigeria" },
  { code: "GB", label: "UK" },
  { code: "AE", label: "UAE" },
  { code: "CA", label: "Canada" },
];

/* ─── Per-Vehicle Tiers ─── */
interface TierDef {
  name: string;
  priceUSD: number | null;
  perVehicle: boolean;
  subtitle?: string;
  icon?: typeof Truck;
  highlighted?: boolean;
  aiCredits?: number;
  features: string[];
}

const GLOBAL_TIERS: Record<string, TierDef> = {
  free: {
    name: "Free",
    priceUSD: 0,
    perVehicle: false,
    features: ["10 stops/day", "1 vehicle", "Basic tracking", "Email support"],
  },
  starter: {
    name: "Starter",
    priceUSD: 99,
    perVehicle: true,
    subtitle: "Best for Haulage",
    icon: Truck,
    features: ["Fleet dispatching", "Driver management", "Basic routing", "Trip monitoring", "Standard reports"],
  },
  growth: {
    name: "Growth",
    priceUSD: 149,
    perVehicle: true,
    subtitle: "Best for Multidrop",
    icon: Package,
    highlighted: true,
    aiCredits: 500,
    features: ["Everything in Starter", "AI route optimization", "Fuel intelligence", "Margin routing", "SLA prediction", "500 AI credits/mo included"],
  },
  enterprise: {
    name: "Enterprise",
    priceUSD: null,
    perVehicle: false,
    subtitle: "Custom",
    icon: Shield,
    features: ["Everything in Growth", "White-label portal", "API access", "Dedicated support", "Custom SLAs", "Data isolation"],
  },
};

/* ─── Volume Discount Schedule ─── */
const VOLUME_DISCOUNTS = [
  { label: "0 – 10K drops/mo", price: 0.09, benchmark: 0.15 },
  { label: "10K – 50K drops/mo", price: 0.075, benchmark: 0.15 },
  { label: "50K+ drops/mo", price: 0.06, benchmark: 0.15 },
];

function getDropPriceSimple(monthly: number): number {
  if (monthly >= 50000) return 0.06;
  if (monthly >= 10000) return 0.075;
  return 0.09;
}

/* ─── Per-Drop Tiers ─── */
const PER_DROP_TIERS = [
  {
    name: "Starter",
    pricePerDrop: 0.09,
    dropsPerMonth: null,
    highlighted: false,
    subtitle: "Developers & Small Fleets",
    features: ["Unlimited drops", "$0.09/stop", "Basic route optimization", "Standard tracking", "1,000 API calls/day", "Email support"],
    benchmark: { global: 0.15, savings: 40 },
  },
  {
    name: "Growth",
    pricePerDrop: 0.075,
    dropsPerMonth: null,
    highlighted: true,
    subtitle: "10K–50K drops/mo",
    features: ["Volume-discounted drops", "$0.075/stop", "AI route optimization", "Dispatch + tracking APIs", "SLA engine", "Analytics dashboard", "10,000 API calls/day", "Priority support"],
    benchmark: { global: 0.15, savings: 50 },
  },
  {
    name: "Enterprise",
    pricePerDrop: 0.06,
    dropsPerMonth: null,
    highlighted: false,
    subtitle: "50K+ drops/mo",
    features: ["Lowest per-stop rate", "$0.06/stop at volume", "Full API suite", "Custom SLAs", "Dedicated infrastructure", "AI optimization", "White-label portal", "99.99% uptime SLA"],
    benchmark: { global: 0.15, savings: 60 },
  },
  {
    name: "Custom",
    pricePerDrop: null,
    dropsPerMonth: null,
    highlighted: false,
    subtitle: "Platforms & Governments",
    features: ["Negotiated per-stop rate", "White-label APIs", "Dedicated clusters", "Custom integrations", "Account manager", "Enterprise SLA"],
    benchmark: null,
  },
];

/* ─── API Endpoint Pricing ─── */
const API_ENDPOINTS = [
  { endpoint: "/api/v1/dispatch/create", desc: "Create and manage dispatches", perCall: 0.025, plan: "Growth" },
  { endpoint: "/api/v1/route/optimize", desc: "AI-powered route optimization", perCall: 0.05, plan: "Growth" },
  { endpoint: "/api/v1/tracking/live", desc: "Real-time shipment tracking", perCall: 0.01, plan: "Free" },
  { endpoint: "/api/v1/fleet/manage", desc: "Fleet management operations", perCall: 0.02, plan: "Growth" },
  { endpoint: "/api/v1/pricing/calculate", desc: "Dynamic rate quotes", perCall: 0.015, plan: "Free" },
  { endpoint: "/api/v1/pod/verify", desc: "Proof of delivery verification", perCall: 0.02, plan: "Growth" },
  { endpoint: "/api/v1/analytics/query", desc: "Performance analytics", perCall: 0.035, plan: "Scale" },
  { endpoint: "/api/v1/invoice/create", desc: "Programmatic invoicing", perCall: 0.03, plan: "Growth" },
];

const API_RATE_LIMITS = [
  { tier: "Free", reqDay: "1,000", reqMin: "10", webhooks: false, support: "Community" },
  { tier: "Growth", reqDay: "10,000", reqMin: "100", webhooks: true, support: "Priority" },
  { tier: "Scale", reqDay: "100,000", reqMin: "1,000", webhooks: true, support: "Dedicated" },
  { tier: "Enterprise", reqDay: "Unlimited", reqMin: "Custom", webhooks: true, support: "24/7 SLA" },
];

/* ─── FX multiplier from USD ─── */
function getRegionalPrice(usdPrice: number, regionCode: string): number {
  const cfg = COUNTRY_DEFAULTS[regionCode];
  if (!cfg || regionCode === "US") return usdPrice;
  const usCfg = COUNTRY_DEFAULTS["US"];
  if (!usCfg?.starterPrice || !cfg.starterPrice) return usdPrice;
  const ratio = cfg.starterPrice / usCfg.starterPrice;
  return Math.round(usdPrice * ratio);
}

function fmtRegional(usd: number, code: string) {
  const cfg = COUNTRY_DEFAULTS[code] || COUNTRY_DEFAULTS["US"];
  const localPrice = getRegionalPrice(usd, code);
  return formatPrice(localPrice, cfg as Partial<CountryConfig>);
}

/* ─── Per-drop / per-call USD → local conversion via COUNTRY_BASE_RATES ─── */
function localFromUSD(usd: number, code: string): number {
  const cfg = COUNTRY_BASE_RATES[code] || COUNTRY_BASE_RATES.US;
  const us = COUNTRY_BASE_RATES.US;
  const ratio = cfg.rate / us.rate;
  return usd * ratio;
}

/** Format a small per-unit USD price (e.g. $0.09/drop) in local currency. */
function fmtUnit(usd: number, code: string): string {
  const cfg = COUNTRY_BASE_RATES[code] || COUNTRY_BASE_RATES.US;
  const local = localFromUSD(usd, code);
  // For NGN / KES keep whole numbers, otherwise 2-3 decimals
  if (cfg.code === "NGN" || cfg.code === "KES") {
    return `${cfg.symbol}${Math.round(local).toLocaleString()}`;
  }
  return `${cfg.symbol}${local < 1 ? local.toFixed(3) : local.toFixed(2)}`;
}

/** Format a larger total USD amount (monthly cost) in local currency. */
function fmtTotal(usd: number, code: string): string {
  const cfg = COUNTRY_BASE_RATES[code] || COUNTRY_BASE_RATES.US;
  const local = localFromUSD(usd, code);
  return `${cfg.symbol}${Math.round(local).toLocaleString()}`;
}

/* ─────────────────────────────────────────── */
const GlobalPricingPage = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState("US");
  const [pricingModel, setPricingModel] = useState<"vehicle" | "drop" | "api">("vehicle");

  return (
    <div className="space-y-20">
      {/* ─── HERO ─── */}
      <section className="text-center pt-16 pb-8 px-6">
        <Badge variant="secondary" className="mb-4">Global Pricing</Badge>
        <h1 className="text-4xl md:text-5xl font-bold font-heading max-w-3xl mx-auto leading-tight">
          Global Logistics Infrastructure - Pay Your Way
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          Per vehicle, per delivery, or per API call. AI-powered routing, margin optimization, and transparent pricing - built for any scale.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Button size="lg" onClick={() => navigate("/signup/company")}>
            Start Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/developer-platform")}>
            <Code className="mr-2 w-4 h-4" /> API Docs
          </Button>
        </div>
      </section>

      {/* ─── REGION SELECTOR ─── */}
      <div className="flex justify-center gap-2 flex-wrap px-6">
        {REGIONS.map((r) => (
          <Button
            key={r.code}
            variant={region === r.code ? "default" : "outline"}
            size="sm"
            onClick={() => setRegion(r.code)}
            className="gap-1.5"
          >
            <span>{COUNTRY_FLAGS[r.code]}</span>
            {r.label}
          </Button>
        ))}
      </div>

      {/* ─── PRICING MODEL TABS ─── */}
      <section className="px-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={pricingModel} onValueChange={(v) => setPricingModel(v as any)} className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="vehicle" className="gap-1.5">
                <Truck className="w-4 h-4" /> Per Vehicle
              </TabsTrigger>
              <TabsTrigger value="drop" className="gap-1.5">
                <Package className="w-4 h-4" /> Per Drop
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1.5">
                <Code className="w-4 h-4" /> API Access
              </TabsTrigger>
            </TabsList>

            {/* ─── PER VEHICLE TAB ─── */}
            <TabsContent value="vehicle">
              <div className="grid md:grid-cols-4 gap-6">
                {Object.entries(GLOBAL_TIERS).map(([key, tier], idx) => (
                  <motion.div
                    key={`${region}-${key}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * idx }}
                  >
                    <Card className={`h-full flex flex-col ${tier.highlighted ? "border-2 border-primary shadow-lg relative" : ""}`}>
                      {tier.highlighted && (
                        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                          Most Popular
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          {tier.icon && <tier.icon className="w-5 h-5 text-primary" />}
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                        </div>
                        {tier.subtitle && (
                          <p className="text-xs text-muted-foreground">{tier.subtitle}</p>
                        )}
                        <div className="text-3xl font-bold mt-2">
                          {tier.priceUSD === null
                            ? "Custom"
                            : tier.priceUSD === 0
                              ? fmtRegional(0, region)
                              : fmtRegional(tier.priceUSD, region)}
                          {tier.perVehicle && (
                            <span className="text-sm font-normal text-muted-foreground">/vehicle/mo</span>
                          )}
                        </div>
                        {tier.aiCredits && (
                          <Badge variant="secondary" className="w-fit text-xs mt-1">
                            <Cpu className="w-3 h-3 mr-1" />
                            {tier.aiCredits} AI credits included
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <ul className="space-y-2 flex-1">
                          {tier.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full mt-6"
                          variant={tier.highlighted ? "default" : "outline"}
                          onClick={() => navigate("/signup/company")}
                        >
                          {tier.priceUSD === null ? "Contact Sales" : "Get Started"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* ─── PER DROP TAB ─── */}
            <TabsContent value="drop">
              <div className="text-center mb-6">
                <p className="text-muted-foreground">Pay only for deliveries completed. No vehicle minimums. Volume discounts applied automatically.</p>
              </div>

              {/* Country Base Rate Table */}
              <Card className="mb-8 max-w-3xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" /> Country-Specific Base Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>Base Rate / Drop</TableHead>
                        <TableHead>Currency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(COUNTRY_BASE_RATES).map(([code, info]) => (
                        <TableRow key={code} className={region === code ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">
                            {COUNTRY_FLAGS[code] || "🌍"} {code}
                          </TableCell>
                          <TableCell className="font-bold text-primary">{info.symbol}{info.rate}</TableCell>
                          <TableCell className="text-muted-foreground">{info.code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Complexity Multipliers */}
              <Card className="mb-8 max-w-3xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" /> Complexity Multipliers
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Final price = Base Rate × Fleet Type × Route Type × Volume Discount</p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium mb-2">Fleet Type</p>
                      <Table>
                        <TableBody>
                          {FLEET_TYPES.map((ft) => (
                            <TableRow key={ft.value}>
                              <TableCell className="font-medium">{ft.label}</TableCell>
                              <TableCell className="text-right font-mono">×{ft.multiplier}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Route Type</p>
                      <Table>
                        <TableBody>
                          {ROUTE_MULTIPLIERS.map((rm) => (
                            <TableRow key={rm.value}>
                              <TableCell className="font-medium">{rm.label}</TableCell>
                              <TableCell className="text-right font-mono">×{rm.multiplier}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Volume Discount Schedule */}
              <Card className="mb-8 max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-primary" /> Volume Discount Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Monthly Volume</TableHead>
                        <TableHead>RouteAce Price</TableHead>
                        <TableHead>Competitor Avg</TableHead>
                        <TableHead>Your Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {VOLUME_DISCOUNTS.map((v) => (
                        <TableRow key={v.label}>
                          <TableCell className="font-medium">{v.label}</TableCell>
                          <TableCell className="text-primary font-bold">{fmtUnit(v.price, region)}/stop</TableCell>
                          <TableCell className="text-muted-foreground">{fmtUnit(v.benchmark, region)}/stop</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {Math.round((1 - v.price / v.benchmark) * 100)}% cheaper
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-4 gap-6">
                {PER_DROP_TIERS.map((tier, idx) => (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * idx }}
                  >
                    <Card className={`h-full flex flex-col ${tier.highlighted ? "border-2 border-primary shadow-lg relative" : ""}`}>
                      {tier.highlighted && (
                        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                          Best Value
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{tier.subtitle}</p>
                        <div className="text-3xl font-bold mt-2">
                          {tier.pricePerDrop === null
                            ? "Custom"
                            : fmtUnit(tier.pricePerDrop, region)}
                          {tier.pricePerDrop !== null && (
                            <span className="text-sm font-normal text-muted-foreground">/drop</span>
                          )}
                        </div>
                        {/* competitor savings badge removed — see Nigeria-first section below */}
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <ul className="space-y-2 flex-1">
                          {tier.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full mt-6"
                          variant={tier.highlighted ? "default" : "outline"}
                          onClick={() => navigate("/signup/company")}
                        >
                          {tier.pricePerDrop === null ? "Contact Sales" : "Start Saving"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Nigeria-first value section (replaces competitor comparison) */}
              <div className="space-y-8 mt-10">
                {/* Hero statement */}
                <div className="text-center py-4">
                  <h2 className="text-2xl font-bold tracking-tight mb-3">
                    Why Nigerian businesses choose RouteAce over international alternatives
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
                    Most logistics software was built for US and European roads. RouteAce was built for Nigeria — with Nigerian pricing, Nigerian infrastructure, and Nigerian operations in mind.
                  </p>
                </div>

                {/* 5 reasons grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      icon: "₦",
                      title: "Priced in Naira",
                      body: "No dollar invoices that change every month when the exchange rate moves. ₦5,000 per vehicle is ₦5,000 — always.",
                    },
                    {
                      icon: "🛣️",
                      title: "Built for Nigerian roads",
                      body: "LASTMA checkpoints, NARTO rate cards, Nigerian waybill formats, and corridor intelligence from Lagos–Kano to Port Harcourt–Abuja. Not US suburbs.",
                    },
                    {
                      icon: "🎁",
                      title: "30-day free trial",
                      body: "No credit card. No dollar billing. No automatic charge. Sign up, use the full platform, and pay only when you are ready.",
                    },
                    {
                      icon: "🕐",
                      title: "Support in your timezone",
                      body: "WAT support — not a US help desk 6 hours behind you. When something breaks at 8am Lagos time, someone answers.",
                    },
                    {
                      icon: "💰",
                      title: "30–60% less than global tools",
                      body: "International logistics SaaS platforms typically cost $35–$200/month before add-ons. RouteAce starts at ₦5,000 per vehicle — and covers more of what Nigerian operations actually need.",
                    },
                    {
                      icon: "🏭",
                      title: "LC, LD and FMCG in one platform",
                      body: "Run a fleet company, a corporate logistics department, or an FMCG distribution operation — all on one platform. No global tool covers all three.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost comparison bar — no names, just category */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <h3 className="font-semibold text-sm mb-4">Typical monthly cost — 10 vehicles</h3>
                  <div className="space-y-3">
                    {[
                      { label: "RouteAce", amount: "₦50,000", width: "25%", highlight: true },
                      { label: "Typical global platform (entry tier)", amount: "~₦67,000", width: "33%", highlight: false },
                      { label: "Typical global platform (mid tier)", amount: "~₦133,000", width: "66%", highlight: false },
                      { label: "Typical global platform (enterprise)", amount: "~₦273,000+", width: "100%", highlight: false },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${row.highlight ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                            {row.label}
                          </span>
                          <span className={`text-xs font-semibold ${row.highlight ? "text-primary" : "text-foreground"}`}>
                            {row.amount}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${row.highlight ? "bg-primary" : "bg-muted-foreground/30"}`}
                            style={{ width: row.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Global platform prices are approximate starting tiers converted at ₦1,367/$1 as of May 2026. Actual pricing varies by provider and plan. RouteAce price shown for 10 vehicles on the LC Professional plan.
                  </p>
                </div>

                {/* CTA */}
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Join Nigerian fleet operators, logistics directors, and FMCG distributors already on RouteAce.
                  </p>
                  <Button size="lg" onClick={() => navigate("/signup")}>
                    Start free 30-day trial
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    No credit card · No dollar billing · Cancel anytime
                  </p>
                </div>
              </div>
            </TabsContent>


            {/* ─── API ACCESS TAB ─── */}
            <TabsContent value="api">
              <div className="space-y-8">
                <div className="text-center mb-4">
                  <p className="text-muted-foreground">Build on RouteAce infrastructure. Metered billing per API call.</p>
                </div>

                {/* Rate Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Rate Limits & Access Tiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tier</TableHead>
                          <TableHead>Requests/Day</TableHead>
                          <TableHead>Requests/Min</TableHead>
                          <TableHead>Webhooks</TableHead>
                          <TableHead>Support</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {API_RATE_LIMITS.map((r) => (
                          <TableRow key={r.tier}>
                            <TableCell className="font-medium">{r.tier}</TableCell>
                            <TableCell>{r.reqDay}</TableCell>
                            <TableCell>{r.reqMin}</TableCell>
                            <TableCell>{r.webhooks ? <CheckCircle className="w-4 h-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell>{r.support}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Endpoint Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="w-5 h-5 text-primary" />
                      Endpoint Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Per Call</TableHead>
                          <TableHead>Min Plan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {API_ENDPOINTS.map((ep) => (
                          <TableRow key={ep.endpoint}>
                            <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                            <TableCell className="text-sm">{ep.desc}</TableCell>
                            <TableCell className="font-bold">{fmtUnit(ep.perCall, region)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{ep.plan}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="text-center">
                  <Button onClick={() => navigate("/developer-platform")} className="gap-2">
                    <Code className="w-4 h-4" /> View Full Developer Docs
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ─── AI CREDIT PACKS ─── */}
      <section className="px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold font-heading flex items-center justify-center gap-2">
              <Cpu className="w-6 h-6 text-primary" /> AI Credit Packs
            </h2>
            <p className="text-muted-foreground mt-2">
              1 AI credit per 10 deliveries optimized. Unused credits roll over for 3 months.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {AI_CREDIT_PACKS.map((pack, idx) => (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-base">{pack.name}</CardTitle>
                    <div className="text-3xl font-bold text-primary">
                      {pack.credits.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">credits</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-4">
                      {fmtRegional(pack.priceUSD, region)}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ≈ {(pack.credits * 10).toLocaleString()} deliveries optimized
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/signup/company")}>
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TCO CALCULATOR ─── */}
      <TCOCalculator region={region} />

      {/* ─── TRUST BADGES ─── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6">
          {[
            { icon: Globe, label: "Multi-currency billing" },
            { icon: Shield, label: "VAT compliant" },
            { icon: Zap, label: "Secure payments" },
            { icon: Sparkles, label: "Global infrastructure" },
            { icon: Code, label: "Developer-grade API" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
              <b.icon className="w-4 h-4 text-primary" />
              {b.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/* ──── TCO Calculator (Enhanced with fleet type, country, cost-over-time graph) ──── */
function TCOCalculator({ region }: { region: string }) {
  const [mode, setMode] = useState<"vehicle" | "drop">("drop");
  const [vehicles, setVehicles] = useState(10);
  const [deliveries, setDeliveries] = useState(5000);
  const [fleetType, setFleetType] = useState("van");
  const [routeType, setRouteType] = useState("standard");
  const [country, setCountry] = useState(region);
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [apiAccess, setApiAccess] = useState(false);
  const [dedicatedSupport, setDedicatedSupport] = useState(false);

  const fleetMultiplier = FLEET_TYPES.find(f => f.value === fleetType)?.multiplier || 1.0;
  const routeMultiplier = ROUTE_MULTIPLIERS.find(r => r.value === routeType)?.multiplier || 1.0;
  const baseRate = COUNTRY_BASE_RATES[country]?.rate || 0.25;
  const currSymbol = COUNTRY_BASE_RATES[country]?.symbol || "$";

  const costs = useMemo(() => {
    // Global enterprise platform benchmark (no named providers)
    const globalEnterpriseCost = vehicles <= 5 ? 750 : vehicles <= 15 ? 1500 : 2500;
    let globalEnterprise = globalEnterpriseCost;
    if (whiteLabel) globalEnterprise += 350;
    if (apiAccess) globalEnterprise += 250;
    if (dedicatedSupport) globalEnterprise += 500;

    // Typical global mid-tier (1.3x base rate)
    const globalMidRate = baseRate * 1.3;
    let globalMidTier = mode === "drop" ? deliveries * globalMidRate * fleetMultiplier * routeMultiplier : vehicles * 150;
    if (apiAccess) globalMidTier += 200;
    if (whiteLabel) globalMidTier += 350;

    let routeace: number;
    if (mode === "drop") {
      const effectiveRate = getDropPrice(baseRate, fleetMultiplier, routeMultiplier, deliveries);
      routeace = deliveries * effectiveRate;
    } else {
      const creditsNeeded = Math.ceil(deliveries / 10);
      const freeCredits = 500;
      const extraCredits = Math.max(0, creditsNeeded - freeCredits);
      const creditCost = extraCredits * 0.08;
      routeace = vehicles * 149 + creditCost;
    }

    const savingsVsGlobal = Math.max(0, globalMidTier - routeace);
    const savingsPercent = globalMidTier > 0 ? Math.round((savingsVsGlobal / globalMidTier) * 100) : 0;
    const effectiveDropRate = mode === "drop" ? getDropPrice(baseRate, fleetMultiplier, routeMultiplier, deliveries) : null;

    return {
      globalEnterprise: Math.round(globalEnterprise),
      globalMidTier: Math.round(globalMidTier),
      routeace: Math.round(routeace),
      savingsVsGlobal: Math.round(savingsVsGlobal),
      savingsPercent,
      dropRate: effectiveDropRate,
    };
  }, [mode, vehicles, deliveries, fleetType, routeType, country, whiteLabel, apiAccess, dedicatedSupport, baseRate, fleetMultiplier, routeMultiplier]);

  // 12-month cost projection
  const projectionData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        month: `M${month}`,
        RouteAce: costs.routeace * month,
        "Global mid-tier": costs.globalMidTier * month,
        "Global enterprise": costs.globalEnterprise * month,
      };
    });
  }, [costs]);

  const savingsEnterprise = Math.max(0, costs.globalEnterprise - costs.routeace);
  const savingsMidTier = costs.savingsVsGlobal;

  return (
    <section className="px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-heading flex items-center justify-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            See How Much You Save with RouteAce
          </h2>
          <p className="text-muted-foreground mt-2">
            Compare RouteAce vs competitors - real-time savings calculation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Billing model toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Label className="text-sm">Billing model:</Label>
                <Button size="sm" variant={mode === "vehicle" ? "default" : "ghost"} onClick={() => setMode("vehicle")}>
                  <Truck className="w-3 h-3 mr-1" /> Per Vehicle
                </Button>
                <Button size="sm" variant={mode === "drop" ? "default" : "ghost"} onClick={() => setMode("drop")}>
                  <Package className="w-3 h-3 mr-1" /> Per Drop
                </Button>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-sm">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_BASE_RATES).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {COUNTRY_FLAGS[code] || "🌍"} {code} - {info.symbol}{info.rate}/drop
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fleet Type */}
              {mode === "drop" && (
                <div className="space-y-2">
                  <Label className="text-sm">Fleet Type (×{fleetMultiplier})</Label>
                  <Select value={fleetType} onValueChange={setFleetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLEET_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>
                          {ft.label} (×{ft.multiplier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Route Type */}
              {mode === "drop" && (
                <div className="space-y-2">
                  <Label className="text-sm">Route Type (×{routeMultiplier})</Label>
                  <Select value={routeType} onValueChange={setRouteType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTE_MULTIPLIERS.map((rm) => (
                        <SelectItem key={rm.value} value={rm.value}>
                          {rm.label} (×{rm.multiplier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "vehicle" && (
                <div className="space-y-2">
                  <Label>Vehicles: <strong>{vehicles}</strong></Label>
                  <Slider value={[vehicles]} onValueChange={([v]) => setVehicles(v)} min={1} max={200} step={1} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Monthly Deliveries: <strong>{deliveries.toLocaleString()}</strong></Label>
                <Slider value={[deliveries]} onValueChange={([v]) => setDeliveries(v)} min={100} max={100000} step={100} />
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>White-label portal</Label>
                  <Switch checked={whiteLabel} onCheckedChange={setWhiteLabel} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>API access</Label>
                  <Switch checked={apiAccess} onCheckedChange={setApiAccess} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Dedicated support</Label>
                  <Switch checked={dedicatedSupport} onCheckedChange={setDedicatedSupport} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison */}
          <div className="space-y-4">
            <Card className="border-muted">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Global enterprise platform</p>
                  <p className="text-xs text-muted-foreground">Task-based tiers + add-ons</p>
                </div>
                <p className="text-2xl font-bold">{currSymbol}{costs.globalEnterprise.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Global mid-tier platform</p>
                  <p className="text-xs text-muted-foreground">~{currSymbol}{(baseRate * 1.3).toFixed(2)}/stop avg</p>
                </div>
                <p className="text-2xl font-bold">{currSymbol}{costs.globalMidTier.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-primary">RouteAce</p>
                    <p className="text-xs text-muted-foreground">
                      {mode === "drop" ? `${currSymbol}${costs.dropRate}/stop (volume-tiered)` : `${currSymbol}${Math.round(localFromUSD(149, country)).toLocaleString()}/vehicle + AI credits`}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{currSymbol}{costs.routeace.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
                {(savingsEnterprise > 0 || savingsMidTier > 0) && (
                  <div className="mt-3 flex gap-3 flex-wrap">
                    {savingsEnterprise > 0 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Save {currSymbol}{savingsEnterprise.toLocaleString()} vs global enterprise
                      </Badge>
                    )}
                    {savingsMidTier > 0 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Save {currSymbol}{savingsMidTier.toLocaleString()} vs global average ({costs.savingsPercent}%)
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Annual Summary */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Annual Projection</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Global enterprise</p>
                    <p className="font-bold">{currSymbol}{(costs.globalEnterprise * 12).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Global mid-tier</p>
                    <p className="font-bold">{currSymbol}{(costs.globalMidTier * 12).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground text-primary">RouteAce</p>
                    <p className="font-bold text-primary">{currSymbol}{(costs.routeace * 12).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cost Over Time Graph */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Cumulative Cost Over 12 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currSymbol}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `${currSymbol}${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="Global enterprise" stroke="hsl(0 0% 60%)" fill="hsl(0 0% 60% / 0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Global mid-tier" stroke="hsl(30 80% 55%)" fill="hsl(30 80% 55% / 0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="RouteAce" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default GlobalPricingPage;
