import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Shield, AlertTriangle, CheckCircle, Search, Zap,
  BookOpen, FileText, TrendingUp, Activity, Lock, Scale,
  Truck, Flag, Building2, Layers, ArrowRight, Info, Eye
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RegCorridorRisk {
  corridor: string;
  complianceScore: number;
  customsRisk: number;
  sanctionsRisk: number;
  taxRisk: number;
  cabotageRisk: number;
  overallRisk: "low" | "medium" | "high" | "critical";
  activeAlerts: string[];
  jurisdiction: string[];
}

interface RegulatoryAlert {
  id: string;
  type: "change" | "sanction" | "compliance" | "enforcement";
  severity: "info" | "warning" | "critical";
  country: string;
  title: string;
  description: string;
  effectiveDate: string;
  affectedCorridors: string[];
  actionRequired: boolean;
}

interface CountryRiskIndex {
  country: string;
  code: string;
  flag: string;
  continent: string;
  regulatory: number;
  customs: number;
  political: number;
  sanctionsExposure: number;
  enforcement: number;
  overall: number;
  trend: "improving" | "stable" | "worsening";
}

interface ComplianceRule {
  region: string;
  framework: string;
  category: string;
  requirement: string;
  status: "compliant" | "partial" | "non-compliant" | "not-applicable";
  penalty: string;
  source: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const CORRIDOR_RISKS: RegCorridorRisk[] = [
  {
    corridor: "Lagos → Kano",
    complianceScore: 88,
    customsRisk: 12,
    sanctionsRisk: 5,
    taxRisk: 18,
    cabotageRisk: 8,
    overallRisk: "low",
    activeAlerts: ["LASTMA enforcement surge (Dec 2024)", "NCS axle load check – Ore checkpoint"],
    jurisdiction: ["Nigeria"],
  },
  {
    corridor: "Lagos → Accra (GH)",
    complianceScore: 74,
    customsRisk: 42,
    sanctionsRisk: 8,
    taxRisk: 31,
    cabotageRisk: 22,
    overallRisk: "medium",
    activeAlerts: ["ECOWAS customs harmonization pending", "Ghana GRA import levy revision Q1 2025"],
    jurisdiction: ["Nigeria", "Benin", "Togo", "Ghana"],
  },
  {
    corridor: "Rotterdam → Warsaw (EU Cabotage)",
    complianceScore: 91,
    customsRisk: 6,
    sanctionsRisk: 15,
    taxRisk: 12,
    cabotageRisk: 38,
    overallRisk: "medium",
    activeAlerts: ["EU cabotage limit: 3 ops in 7 days", "Carbon levy active – EU ETS threshold approaching", "Poland road tax SENT compliance required"],
    jurisdiction: ["Netherlands", "Germany", "Poland"],
  },
  {
    corridor: "Dubai → Riyadh (GCC)",
    complianceScore: 85,
    customsRisk: 28,
    sanctionsRisk: 22,
    taxRisk: 14,
    cabotageRisk: 31,
    overallRisk: "medium",
    activeAlerts: ["GCC Customs Union harmonization active", "Saudi Arabia: CITC permit required for 3PL"],
    jurisdiction: ["UAE", "Saudi Arabia"],
  },
  {
    corridor: "Shanghai → Almaty (BRI)",
    complianceScore: 58,
    customsRisk: 62,
    sanctionsRisk: 44,
    taxRisk: 38,
    cabotageRisk: 55,
    overallRisk: "critical",
    activeAlerts: ["Kazakhstan transit permit backlog – 14 day delay", "China export licensing tightened (dual-use goods)", "Russia-adjacent sanctions screening required", "Xinjiang cargo: additional customs documentary review"],
    jurisdiction: ["China", "Kazakhstan", "Russia"],
  },
  {
    corridor: "Houston → Chicago (US Interstate)",
    complianceScore: 82,
    customsRisk: 10,
    sanctionsRisk: 5,
    taxRisk: 24,
    cabotageRisk: 12,
    overallRisk: "low",
    activeAlerts: ["FMCSA ELD mandate compliance required", "Texas DOT overweight permit for axle > 80,000 lbs", "Illinois Motor Fuel Tax update effective Feb 2025"],
    jurisdiction: ["United States"],
  },
];

const REGULATORY_ALERTS: RegulatoryAlert[] = [
  {
    id: "RA-001",
    type: "enforcement",
    severity: "critical",
    country: "Nigeria",
    title: "LASTMA Enforcement Intensification - Q1 2025",
    description: "Lagos State Traffic Management Authority has deployed 200+ additional units along major freight corridors. Non-compliance with loading zone rules now results in immediate vehicle impoundment.",
    effectiveDate: "Jan 15, 2025",
    affectedCorridors: ["Lagos–Ibadan", "Lagos–Apapa Port", "Lagos–Kano"],
    actionRequired: true,
  },
  {
    id: "RA-002",
    type: "change",
    severity: "warning",
    country: "European Union",
    title: "EU ETS Phase 4 - Road Freight Carbon Levy",
    description: "The EU Emissions Trading System Phase 4 extends to road freight from 2025. Carriers operating in EU must purchase carbon credits for emissions exceeding threshold. Estimated cost: €0.08–€0.12 per tonne-km.",
    effectiveDate: "Jan 1, 2025",
    affectedCorridors: ["Rotterdam–Warsaw", "Hamburg–Paris", "Munich–Barcelona"],
    actionRequired: true,
  },
  {
    id: "RA-003",
    type: "sanction",
    severity: "critical",
    country: "Global",
    title: "OFAC Sanctions Update - Belt & Road Adjacent Countries",
    description: "US OFAC updated sanctions list impacting several Belt & Road corridor intermediaries. Cargo transiting Russia, Belarus, and certain Iran-adjacent routes requires enhanced screening.",
    effectiveDate: "Dec 1, 2024",
    affectedCorridors: ["Shanghai–Almaty", "Moscow–Berlin"],
    actionRequired: true,
  },
  {
    id: "RA-004",
    type: "compliance",
    severity: "warning",
    country: "Saudi Arabia",
    title: "CITC 3PL License Mandate - Saudi Arabia",
    description: "Saudi Arabia's Communications, Space & Technology Commission now requires all 3PL operators to hold a CITC license for freight operations above 10 tons. Grace period ends March 2025.",
    effectiveDate: "Mar 1, 2025",
    affectedCorridors: ["Dubai–Riyadh", "Jeddah–Riyadh"],
    actionRequired: false,
  },
  {
    id: "RA-005",
    type: "change",
    severity: "info",
    country: "Ghana",
    title: "GRA Import Levy Revision - Effective Q1 2025",
    description: "Ghana Revenue Authority revising import levy rates on petroleum products and manufactured goods. Expected increase of 2–3% on current rates. Impacts Lagos–Accra corridor cost modeling.",
    effectiveDate: "Feb 1, 2025",
    affectedCorridors: ["Lagos–Accra"],
    actionRequired: false,
  },
  {
    id: "RA-006",
    type: "enforcement",
    severity: "warning",
    country: "Nigeria",
    title: "NCS Axle Load Enforcement - Federal Highways",
    description: "Nigerian Customs Service has deployed weigh stations at 12 new checkpoints on federal highways. Overloaded vehicles face ₦500,000–₦2M fines plus cargo seizure.",
    effectiveDate: "Nov 1, 2024",
    affectedCorridors: ["Lagos–Kano", "Sagamu–Ore–Benin", "Abuja–Kano"],
    actionRequired: true,
  },
];

const COUNTRY_RISK_INDEX: CountryRiskIndex[] = [
  { country: "Nigeria", code: "NG", flag: "🇳🇬", continent: "Africa", regulatory: 62, customs: 58, political: 71, sanctionsExposure: 15, enforcement: 68, overall: 65, trend: "stable" },
  { country: "United Kingdom", code: "GB", flag: "🇬🇧", continent: "Europe", regulatory: 88, customs: 85, political: 22, sanctionsExposure: 8, enforcement: 91, overall: 82, trend: "stable" },
  { country: "United States", code: "US", flag: "🇺🇸", continent: "N. America", regulatory: 85, customs: 82, political: 18, sanctionsExposure: 5, enforcement: 94, overall: 80, trend: "improving" },
  { country: "UAE", code: "AE", flag: "🇦🇪", continent: "Middle East", regulatory: 78, customs: 74, political: 28, sanctionsExposure: 22, enforcement: 80, overall: 72, trend: "improving" },
  { country: "China", code: "CN", flag: "🇨🇳", continent: "Asia", regulatory: 55, customs: 48, political: 68, sanctionsExposure: 58, enforcement: 62, overall: 52, trend: "worsening" },
  { country: "Kazakhstan", code: "KZ", flag: "🇰🇿", continent: "Asia", regulatory: 44, customs: 38, political: 52, sanctionsExposure: 62, enforcement: 41, overall: 42, trend: "worsening" },
  { country: "Ghana", code: "GH", flag: "🇬🇭", continent: "Africa", regulatory: 71, customs: 66, political: 35, sanctionsExposure: 12, enforcement: 68, overall: 68, trend: "improving" },
  { country: "Saudi Arabia", code: "SA", flag: "🇸🇦", continent: "Middle East", regulatory: 72, customs: 68, political: 32, sanctionsExposure: 28, enforcement: 76, overall: 70, trend: "stable" },
];

const COMPLIANCE_RULES: ComplianceRule[] = [
  { region: "Nigeria", framework: "NCS Axle Load", category: "Transport", requirement: "Max 10T single axle / 16T tandem", status: "compliant", penalty: "₦500K–₦2M + seizure", source: "NCS Act" },
  { region: "Nigeria", framework: "FIRS VAT", category: "Tax", requirement: "7.5% VAT on all taxable supplies", status: "compliant", penalty: "200% of unpaid VAT", source: "FIRS VAT Act 2019" },
  { region: "Nigeria", framework: "NDPR", category: "Data Privacy", requirement: "Data localization for Nigerian PII", status: "compliant", penalty: "₦10M or 2% of revenue", source: "NDPR 2019" },
  { region: "European Union", framework: "EU Cabotage", category: "Transport", requirement: "Max 3 cabotage ops within 7 days", status: "partial", penalty: "€2,000–€50,000 + ban", source: "Reg. 1072/2009" },
  { region: "European Union", framework: "EU ETS Phase 4", category: "Environment", requirement: "Carbon credits for emissions > threshold", status: "partial", penalty: "€100/tonne CO2", source: "EU ETS Directive" },
  { region: "European Union", framework: "GDPR", category: "Data Privacy", requirement: "Data subject rights + DPA registration", status: "compliant", penalty: "€20M or 4% global revenue", source: "GDPR 2018" },
  { region: "United States", framework: "FMCSA ELD", category: "Transport", requirement: "Electronic logging device mandatory", status: "compliant", penalty: "$1,000–$16,000 per violation", source: "49 CFR Part 395" },
  { region: "United States", framework: "OFAC Sanctions", category: "Compliance", requirement: "Screen all counterparties against SDN list", status: "compliant", penalty: "Up to $1M + criminal", source: "50 USC 1705" },
  { region: "GCC", framework: "GCC Customs Union", category: "Customs", requirement: "Common External Tariff harmonization", status: "partial", penalty: "100–300% of duty evaded", source: "GCC CU Agreement" },
  { region: "Belt & Road", framework: "SCO Transit Rules", category: "Transport", requirement: "TIR Carnet or equivalent transit documentation", status: "non-compliant", penalty: "Cargo detention + fines", source: "SCO Treaty" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLE = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  warning: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  info: "bg-blue-500/20 text-blue-700 border-blue-500/30",
};

const RISK_COLOR = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-orange-600",
  critical: "text-destructive",
};

const RISK_BADGE = {
  low: "bg-emerald-500/20 text-emerald-700",
  medium: "bg-amber-500/20 text-amber-700",
  high: "bg-orange-500/20 text-orange-700",
  critical: "bg-destructive/20 text-destructive",
};

const STATUS_STYLE = {
  "compliant": "bg-emerald-500/20 text-emerald-700",
  "partial": "bg-amber-500/20 text-amber-700",
  "non-compliant": "bg-destructive/20 text-destructive",
  "not-applicable": "bg-muted text-muted-foreground",
};

const TREND_ICON = {
  improving: <span className="text-emerald-500">▲</span>,
  stable: <span className="text-muted-foreground">●</span>,
  worsening: <span className="text-destructive">▼</span>,
};

// ─── Sub Components ─────────────────────────────────────────────────────────────

function CorridorRiskCard({ c }: { c: RegCorridorRisk }) {
  const [expanded, setExpanded] = useState(false);
  const radarData = [
    { axis: "Customs", value: 100 - c.customsRisk },
    { axis: "Sanctions", value: 100 - c.sanctionsRisk },
    { axis: "Tax", value: 100 - c.taxRisk },
    { axis: "Cabotage", value: 100 - c.cabotageRisk },
    { axis: "Compliance", value: c.complianceScore },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              {c.corridor}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.jurisdiction.join(" · ")}</div>
          </div>
          <Badge className={`text-xs ${RISK_BADGE[c.overallRisk]}`}>{c.overallRisk} risk</Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Customs", val: c.customsRisk },
            { label: "Sanctions", val: c.sanctionsRisk },
            { label: "Tax", val: c.taxRisk },
            { label: "Cabotage", val: c.cabotageRisk },
          ].map(m => (
            <div key={m.label} className="text-center p-2 rounded bg-muted/50">
              <div className={`text-lg font-bold ${m.val > 40 ? "text-destructive" : m.val > 20 ? "text-amber-500" : "text-emerald-600"}`}>{m.val}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Compliance Score</span>
          <span className={`text-xs font-bold ${RISK_COLOR[c.overallRisk]}`}>{c.complianceScore}%</span>
        </div>
        <Progress value={c.complianceScore} className="h-1.5 mb-3" />

        {c.activeAlerts.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-amber-600" onClick={() => setExpanded(!expanded)}>
            <AlertTriangle className="w-3 h-3 mr-1.5" /> {c.activeAlerts.length} Active Alerts
            <ArrowRight className="w-3 h-3 ml-auto" />
          </Button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {c.activeAlerts.map(a => (
              <div key={a} className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400">{a}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function RegulatoryMappingAI() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");

  const criticalAlerts = REGULATORY_ALERTS.filter(a => a.severity === "critical").length;
  const actionRequired = REGULATORY_ALERTS.filter(a => a.actionRequired).length;
  const avgComplianceScore = Math.round(CORRIDOR_RISKS.reduce((a, c) => a + c.complianceScore, 0) / CORRIDOR_RISKS.length);
  const highRiskCorridors = CORRIDOR_RISKS.filter(c => c.overallRisk === "high" || c.overallRisk === "critical").length;

  const filteredAlerts = REGULATORY_ALERTS.filter(a => {
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !a.country.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredRules = COMPLIANCE_RULES.filter(r => {
    if (filterRegion !== "all" && r.region !== filterRegion) return false;
    if (searchQuery && !r.requirement.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.framework.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const uniqueRegions = Array.from(new Set(COMPLIANCE_RULES.map(r => r.region)));

  return (
    <DashboardLayout
      title="Global Regulatory Mapping AI"
      subtitle="Real-time compliance intelligence · Corridor risk scoring · 100+ jurisdictions"
    >
      {/* Security Header */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl mb-6 flex items-start gap-3">
        <Scale className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-foreground text-sm">Sovereign-Grade Regulatory Intelligence Engine</div>
          <div className="text-xs text-muted-foreground mt-1">
            Legal text parsed via NLP and structured into machine-readable compliance rules. Change detection active across 100+ jurisdictions.
            Government-facing data is fully anonymized and aggregated.
          </div>
        </div>
        <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">AI-PARSED</Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Critical Alerts Active", value: criticalAlerts.toString(), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Action Required", value: actionRequired.toString(), icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Avg Corridor Compliance", value: `${avgComplianceScore}%`, icon: Shield, color: "text-primary", bg: "bg-primary/10" },
          { label: "High-Risk Corridors", value: highRiskCorridors.toString(), icon: Flag, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${k.bg}`}>
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

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search regulations, corridors, countries…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="alerts">Regulatory Alerts</TabsTrigger>
          <TabsTrigger value="corridors">Corridor Risk Map</TabsTrigger>
          <TabsTrigger value="country-risk">Country Risk Index</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Matrix</TabsTrigger>
          <TabsTrigger value="framework">Framework Map</TabsTrigger>
        </TabsList>

        {/* REGULATORY ALERTS */}
        <TabsContent value="alerts" className="space-y-3">
          {filteredAlerts.map(alert => (
            <Card key={alert.id} className={`border ${SEVERITY_STYLE[alert.severity]}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5">
                    {alert.severity === "critical"
                      ? <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      : alert.severity === "warning"
                      ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      : <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-semibold text-sm">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {alert.country} · Effective {alert.effectiveDate}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {alert.actionRequired && (
                      <Badge className="bg-destructive/20 text-destructive text-xs">Action Required</Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{alert.type}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{alert.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {alert.affectedCorridors.map(c => (
                    <Badge key={c} variant="outline" className="text-xs">
                      <Truck className="w-2.5 h-2.5 mr-1" />{c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* CORRIDOR RISK MAP */}
        <TabsContent value="corridors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {CORRIDOR_RISKS.map(c => <CorridorRiskCard key={c.corridor} c={c} />)}
          </div>
        </TabsContent>

        {/* COUNTRY RISK INDEX */}
        <TabsContent value="country-risk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Country Risk Radar</CardTitle>
                <CardDescription>Composite risk score across regulatory dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={COUNTRY_RISK_INDEX} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="flag" tick={{ fontSize: 14 }} width={30} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number, name: string) => [`${v}/100`, name]}
                    />
                    <Bar dataKey="overall" name="Overall Score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Dimension Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {COUNTRY_RISK_INDEX.map(c => (
                  <div key={c.code} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{c.flag}</span>
                        <div>
                          <div className="font-medium text-sm">{c.country}</div>
                          <div className="text-xs text-muted-foreground">{c.continent}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {TREND_ICON[c.trend]}
                        <span className={`text-lg font-bold ${c.overall > 70 ? "text-emerald-600" : c.overall > 50 ? "text-amber-600" : "text-destructive"}`}>
                          {c.overall}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {[
                        { label: "Reg.", val: c.regulatory },
                        { label: "Customs", val: c.customs },
                        { label: "Political", val: 100 - c.political },
                        { label: "Sanctions", val: 100 - c.sanctionsExposure },
                        { label: "Enforce.", val: c.enforcement },
                      ].map(m => (
                        <div key={m.label} className="bg-muted/50 rounded p-1">
                          <div className={`text-sm font-bold ${m.val > 70 ? "text-emerald-600" : m.val > 50 ? "text-amber-500" : "text-destructive"}`}>{m.val}</div>
                          <div className="text-xs text-muted-foreground">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COMPLIANCE MATRIX */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Multi-Jurisdiction Compliance Matrix</CardTitle>
                  <CardDescription>Live compliance status across all active regulatory frameworks</CardDescription>
                </div>
                <div className="flex gap-2">
                  {uniqueRegions.map(r => (
                    <Button
                      key={r}
                      variant={filterRegion === r ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setFilterRegion(filterRegion === r ? "all" : r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left p-3 font-medium">Region</th>
                      <th className="text-left p-3 font-medium">Framework</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Requirement</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 font-medium text-xs">{r.region}</td>
                        <td className="p-3 text-xs font-mono">{r.framework}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{r.category}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-60">{r.requirement}</td>
                        <td className="p-3 text-center">
                          <Badge className={`text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
                        </td>
                        <td className="p-3 text-xs text-destructive font-medium">{r.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FRAMEWORK MAP */}
        <TabsContent value="framework">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                region: "🇳🇬 Nigeria",
                color: "border-green-500/30 bg-green-500/5",
                frameworks: [
                  { name: "CITA - Company Income Tax Act", status: "active", detail: "30% CIT, WHT credits, capital allowances" },
                  { name: "FIRS VAT Act 2019", status: "active", detail: "7.5% standard rate, zero-rated exports" },
                  { name: "NDPR 2019", status: "active", detail: "Nigeria Data Protection Regulation" },
                  { name: "NCS Axle Load Regulation", status: "active", detail: "10T single axle, 16T tandem limit" },
                  { name: "LASTMA Operational Rules", status: "active", detail: "Lagos freight zone hours, loading dock compliance" },
                  { name: "NESREA Environmental Act", status: "monitoring", detail: "Fleet emission compliance" },
                ],
              },
              {
                region: "🇪🇺 European Union",
                color: "border-blue-500/30 bg-blue-500/5",
                frameworks: [
                  { name: "GDPR - General Data Protection Regulation", status: "active", detail: "Data subject rights, DPA registration" },
                  { name: "EU Cabotage Regulation 1072/2009", status: "active", detail: "3 ops within 7 days, then 4-day cooldown" },
                  { name: "EU ETS Phase 4 (2025)", status: "active", detail: "Carbon credits for road freight" },
                  { name: "Posting of Workers Directive", status: "monitoring", detail: "Driver wage parity for international trips" },
                  { name: "SENT System (Poland)", status: "active", detail: "Goods monitoring for fuel/tobacco transport" },
                ],
              },
              {
                region: "🇺🇸 United States",
                color: "border-purple-500/30 bg-purple-500/5",
                frameworks: [
                  { name: "FMCSA ELD Mandate (49 CFR 395)", status: "active", detail: "Electronic logging devices mandatory" },
                  { name: "OFAC Sanctions (50 USC 1705)", status: "active", detail: "SDN list screening, maximum civil penalties" },
                  { name: "DOT HOS Regulations", status: "active", detail: "11 driving hours max, 30-min breaks" },
                  { name: "CCPA (California)", status: "active", detail: "Consumer data rights for CA residents" },
                  { name: "FMCSA Safety Rating", status: "monitoring", detail: "Annual CSA score compliance" },
                ],
              },
              {
                region: "🌐 GCC / Belt & Road",
                color: "border-amber-500/30 bg-amber-500/5",
                frameworks: [
                  { name: "GCC Customs Union", status: "active", detail: "Common External Tariff, harmonized rules" },
                  { name: "Saudi CITC 3PL Mandate", status: "active", detail: "License required from Mar 2025" },
                  { name: "TIR Carnet Convention", status: "partial", detail: "Required for BRI transit documentation" },
                  { name: "SCO Transit Framework", status: "monitoring", detail: "Shanghai Cooperation Organization rules" },
                  { name: "China Export Control Law (2020)", status: "active", detail: "Dual-use goods require export license" },
                ],
              },
            ].map(section => (
              <Card key={section.region} className={`border ${section.color}`}>
                <CardHeader>
                  <CardTitle className="text-base">{section.region}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.frameworks.map(f => (
                    <div key={f.name} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border">
                      {f.status === "active"
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        : f.status === "partial"
                        ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        : <Eye className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />}
                      <div>
                        <div className="text-xs font-semibold">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.detail}</div>
                      </div>
                      <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs capitalize">{f.status}</Badge>
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
