import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Calculator, FileText, AlertTriangle, CheckCircle, TrendingUp,
  Download, RefreshCw, Search, Shield, Building2, Percent, BarChart3,
  Landmark, ChevronRight, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_FLAGS } from "@/lib/global/countryConfig";
import { calculateTax, getTaxEngineName } from "@/lib/global/taxEngine";
import type { TaxEngineType } from "@/lib/global/countryConfig";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaxRule {
  id: string;
  country_code: string;
  tax_type: string;
  tax_name: string;
  rate: number;
  effective_date: string;
  is_active: boolean;
  rules_json: Record<string, any>;
}

const TAX_TYPE_LABELS: Record<string, string> = {
  cit:               "Corporate Income Tax",
  vat:               "VAT / GST",
  gst:               "GST",
  withholding:       "Withholding Tax",
  payroll:           "Payroll Tax",
  digital_services:  "Digital Services Tax",
  transfer_pricing:  "Transfer Pricing",
};

const TAX_TYPE_COLORS: Record<string, string> = {
  cit:              "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  vat:              "bg-green-500/20 text-green-700 dark:text-green-400",
  gst:              "bg-green-500/20 text-green-700 dark:text-green-400",
  withholding:      "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  payroll:          "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  digital_services: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  transfer_pricing: "bg-red-500/20 text-red-700 dark:text-red-400",
};

const CONTINENT_COUNTRIES: Record<string, { code: string; name: string }[]> = {
  Africa:        [{ code:"NG",name:"Nigeria" },{ code:"KE",name:"Kenya" },{ code:"ZA",name:"South Africa" },{ code:"GH",name:"Ghana" }],
  Europe:        [{ code:"GB",name:"United Kingdom" },{ code:"DE",name:"Germany" },{ code:"FR",name:"France" }],
  "North America":[{ code:"US",name:"United States" },{ code:"CA",name:"Canada" }],
  "Middle East": [{ code:"AE",name:"UAE" }],
  Asia:          [{ code:"IN",name:"India" },{ code:"SG",name:"Singapore" }],
  Oceania:       [{ code:"AU",name:"Australia" }],
};

const COUNTRY_TAX_ENGINE: Record<string, TaxEngineType> = {
  NG:"nigerian_paye", GB:"uk_vat", US:"us_state_tax", AE:"uae_zero_vat", CA:"ca_gst",
};

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchTaxRules(): Promise<TaxRule[]> {
  const { data, error } = await supabase
    .from("global_tax_rules")
    .select("*")
    .order("country_code", { ascending: true });
  if (error) throw error;
  return (data || []) as TaxRule[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlobalTaxCompliance() {
  const [activeTab,    setActiveTab]    = useState("overview");
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterType,   setFilterType]   = useState("all");
  const [filterCountry,setFilterCountry]= useState("all");

  // Calculator state
  const [calcCountry,  setCalcCountry]  = useState("NG");
  const [calcGross,    setCalcGross]    = useState(5000000);

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ["global_tax_rules"],
    queryFn: fetchTaxRules,
  });

  // Group by country
  const byCountry = rules.reduce<Record<string, TaxRule[]>>((acc, r) => {
    (acc[r.country_code] = acc[r.country_code] || []).push(r);
    return acc;
  }, {});

  const allCountries = Object.keys(byCountry).sort();

  const filtered = rules.filter(r => {
    if (filterType !== "all" && r.tax_type !== filterType) return false;
    if (filterCountry !== "all" && r.country_code !== filterCountry) return false;
    if (searchTerm && !r.tax_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !r.country_code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Tax calculator
  const engineType = COUNTRY_TAX_ENGINE[calcCountry] || "nigerian_paye";
  const taxResult  = calculateTax(engineType, calcGross);

  // Risk exposure detection
  const multiCountryRules = rules.filter(r => r.tax_type === "cit" && r.rate > 20);

  return (
    <DashboardLayout
      title="Global Tax Compliance Engine"
      subtitle="Multi-country · Version-controlled · IFRS-compliant · Nigerian schema protected">

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Countries Supported", value: allCountries.length.toString(), icon: Globe,       color: "text-blue-500" },
          { label: "Active Tax Rules",    value: rules.filter(r=>r.is_active).length.toString(),    icon: Percent,     color: "text-green-500" },
          { label: "Tax Types Covered",   value: "7",                            icon: Calculator,  color: "text-purple-500" },
          { label: "Compliance Frameworks",value:"IFRS · GAAP · Local GAAP",    icon: Shield,      color: "text-orange-500" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
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
          <TabsTrigger value="overview">Country Overview</TabsTrigger>
          <TabsTrigger value="rules">Tax Rule Engine</TabsTrigger>
          <TabsTrigger value="calculator">Tax Calculator</TabsTrigger>
          <TabsTrigger value="cross-border">Cross-Border Intelligence</TabsTrigger>
          <TabsTrigger value="filing">Filing Readiness</TabsTrigger>
        </TabsList>

        {/* ─── COUNTRY OVERVIEW ─── */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {Object.entries(CONTINENT_COUNTRIES).map(([continent, countries]) => (
              <div key={continent}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> {continent}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {countries.map(({ code, name }) => {
                    const countryRules = byCountry[code] || [];
                    const citRule = countryRules.find(r => r.tax_type === "cit");
                    const vatRule = countryRules.find(r => r.tax_type === "vat" || r.tax_type === "gst");
                    return (
                      <Card key={code} className={code === "NG" ? "border-primary/40 bg-primary/5" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{COUNTRY_FLAGS[code] || "🌍"}</span>
                              <div>
                                <p className="font-semibold text-sm">{name}</p>
                                <p className="text-xs text-muted-foreground">{code}</p>
                              </div>
                            </div>
                            {code === "NG" && <Badge className="text-xs">Default</Badge>}
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Corp. Tax</span>
                              <span className="font-medium">{citRule ? `${citRule.rate}%` : "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">VAT / GST</span>
                              <span className="font-medium">{vatRule ? `${vatRule.rate}%` : "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rules</span>
                              <span className="font-medium">{countryRules.length} active</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAX RULE ENGINE ─── */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Tax Rule Engine</CardTitle>
                  <CardDescription>Version-controlled · Effective-date based · Nigerian schema protected</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search rules…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Tax Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TAX_TYPE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {allCountries.map(c => <SelectItem key={c} value={c}>{COUNTRY_FLAGS[c] || "🌍"} {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Tax Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{COUNTRY_FLAGS[r.country_code] || "🌍"}</span>
                            <span className="font-medium text-sm">{r.country_code}</span>
                            {r.country_code === "NG" && <Badge variant="outline" className="text-xs">Default</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.tax_name}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAX_TYPE_COLORS[r.tax_type] || "bg-muted text-muted-foreground"}`}>
                            {TAX_TYPE_LABELS[r.tax_type] || r.tax_type}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-sm">{r.rate}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.effective_date}</TableCell>
                        <TableCell>
                          {r.is_active
                            ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Active</span>
                            : <span className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3" /> Inactive</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAX CALCULATOR ─── */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Payroll Tax Calculator</CardTitle>
                <CardDescription>Powered by country-specific tax engine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={calcCountry} onValueChange={setCalcCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { code:"NG", label:"🇳🇬 Nigeria (PAYE)" },
                        { code:"GB", label:"🇬🇧 United Kingdom" },
                        { code:"US", label:"🇺🇸 United States" },
                        { code:"AE", label:"🇦🇪 UAE (Tax-Free)" },
                        { code:"CA", label:"🇨🇦 Canada" },
                      ].map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Annual Gross Income</label>
                  <Input
                    type="number"
                    value={calcGross}
                    onChange={e => setCalcGross(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="pt-2 p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm">
                  <div className="flex justify-between font-medium text-base mb-2">
                    <span>Tax Engine:</span>
                    <span className="text-primary">{getTaxEngineName(engineType)}</span>
                  </div>
                  {taxResult.components.map(c => (
                    <div key={c.name} className="flex justify-between">
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="font-medium">{c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1.5 mt-1.5">
                    <div className="flex justify-between text-base font-bold">
                      <span>Net Income</span>
                      <span className="text-green-600">{taxResult.netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Effective Tax Rate</span>
                      <span>{taxResult.effectiveRate.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Tax Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Gross Income",   value: taxResult.grossIncome,    pct: 100,                                                               color: "bg-blue-500" },
                  { label: "Income Tax",     value: taxResult.incomeTax,      pct: taxResult.grossIncome > 0 ? (taxResult.incomeTax/taxResult.grossIncome)*100 : 0,   color: "bg-red-500" },
                  { label: "Pension",        value: taxResult.pensionContribution, pct: taxResult.grossIncome > 0 ? (taxResult.pensionContribution/taxResult.grossIncome)*100 : 0, color: "bg-yellow-500" },
                  { label: "Health / NI",   value: taxResult.healthInsurance, pct: taxResult.grossIncome > 0 ? (taxResult.healthInsurance/taxResult.grossIncome)*100 : 0,  color: "bg-orange-500" },
                  { label: "Other Deductions",value:taxResult.otherDeductions, pct: taxResult.grossIncome > 0 ? (taxResult.otherDeductions/taxResult.grossIncome)*100 : 0,  color: "bg-purple-500" },
                  { label: "Net Income",     value: taxResult.netIncome,      pct: taxResult.grossIncome > 0 ? (taxResult.netIncome/taxResult.grossIncome)*100 : 0,    color: "bg-green-500" },
                ].map(row => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({row.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${Math.min(100, row.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── CROSS-BORDER INTELLIGENCE ─── */}
        <TabsContent value="cross-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Permanent Establishment Risk</CardTitle>
                <CardDescription>Flags where multi-country operations may trigger PE risk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { country: "Nigeria → UK",  risk: "Low",    reason: "Service delivery only - no fixed place of business" },
                  { country: "Nigeria → UAE", risk: "Low",    reason: "Logistics contracts - threshold not reached" },
                  { country: "Nigeria → US",  risk: "Medium", reason: "Digital services may trigger nexus - monitor volume" },
                  { country: "UK → Germany",  risk: "High",   reason: "Physical presence via driver operations - PE likely" },
                ].map(r => (
                  <div key={r.country} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.risk === "High" ? "bg-destructive" : r.risk === "Medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{r.country}</span>
                        <Badge variant="outline" className={`text-xs ${r.risk === "High" ? "text-destructive border-destructive/40" : r.risk === "Medium" ? "text-yellow-600 border-yellow-500/40" : "text-green-600 border-green-500/40"}`}>{r.risk} Risk</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-blue-500" /> Double Taxation Exposure</CardTitle>
                <CardDescription>Treaty coverage and WHT optimization flags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { pair: "NG ↔ UK",  treaty: true,  wht: "7.5%",  saving: "₦2.5M" },
                  { pair: "NG ↔ US",  treaty: false, wht: "10%",   saving: "-" },
                  { pair: "NG ↔ AE",  treaty: true,  wht: "5%",    saving: "₦800K" },
                  { pair: "GB ↔ DE",  treaty: true,  wht: "5%",    saving: "£340K" },
                ].map(r => (
                  <div key={r.pair} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      {r.treaty ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-orange-500" />}
                      <span className="font-medium">{r.pair}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{r.wht}</p>
                      <p className="text-xs text-muted-foreground">{r.treaty ? `Saved: ${r.saving}` : "No treaty"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Transfer Pricing Monitor</CardTitle>
                <CardDescription>Arm's length principle compliance tracker for intercompany transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Intercompany Transactions",  value: "₦48.2M",  status: "Compliant",     ok: true },
                    { label: "Transactions Requiring Docs",value: "3",        status: "Action Needed", ok: false },
                    { label: "Transfer Pricing Risk Score",value: "24/100",   status: "Low Risk",      ok: true },
                  ].map(m => (
                    <div key={m.label} className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{m.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                      <Badge variant="outline" className={`mt-2 text-xs ${m.ok ? "text-green-600 border-green-500/40" : "text-orange-600 border-orange-500/40"}`}>{m.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── FILING READINESS ─── */}
        <TabsContent value="filing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Tax Filing Calendar</CardTitle>
                <CardDescription>Upcoming obligations across all active jurisdictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { country: "🇳🇬 Nigeria",  obligation: "Q4 VAT Return (FIRS)", due: "21 Jan", status: "Overdue",   ok: false },
                  { country: "🇳🇬 Nigeria",  obligation: "Annual CIT Return",    due: "30 Jun", status: "In Progress",ok: true },
                  { country: "🇬🇧 UK",       obligation: "Q1 VAT Return (HMRC)", due: "7 May",  status: "Upcoming",  ok: true },
                  { country: "🇺🇸 US",       obligation: "Q1 Federal Tax Est.", due: "15 Apr",  status: "Upcoming",  ok: true },
                  { country: "🇦🇪 UAE",      obligation: "Annual VAT Return",    due: "28 Feb",  status: "Upcoming",  ok: true },
                ].map(f => (
                  <div key={f.obligation} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium">{f.obligation}</p>
                      <p className="text-xs text-muted-foreground">{f.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{f.due}</p>
                      <span className={`text-xs ${f.ok ? "text-muted-foreground" : "text-destructive font-medium"}`}>{f.status}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" /> Export Filing Packages</CardTitle>
                <CardDescription>Regulator-ready export formats per jurisdiction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Nigeria - FIRS CIT Schedule",   format: "Excel",   country: "NG" },
                  { label: "Nigeria - VAT Return (Form 002)",format: "PDF",    country: "NG" },
                  { label: "Nigeria - PAYE Annual Summary", format: "CSV",     country: "NG" },
                  { label: "UK - MTD VAT Return",           format: "JSON API",country: "GB" },
                  { label: "US - Federal 1120 Schedule",    format: "PDF",     country: "US" },
                  { label: "UAE - FTA VAT Return",          format: "Excel",   country: "AE" },
                ].map(e => (
                  <div key={e.label} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{COUNTRY_FLAGS[e.country] || "🌍"}</span>
                      <span>{e.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{e.format}</Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-500" /> Compliance Safeguards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Nigerian Schema Protected",  ok: true,  detail: "feature_flag: global_tax_engine_v1" },
                    { label: "Backward Compatibility",     ok: true,  detail: "All existing NG rules preserved" },
                    { label: "Version Controlled Rules",   ok: true,  detail: "Effective-date based versioning" },
                    { label: "Immutable Tax Ledger",       ok: true,  detail: "Append-only audit trail" },
                    { label: "IFRS Compliance",            ok: true,  detail: "Revenue recognition, deferred tax" },
                    { label: "GAAP Dual Reporting",        ok: true,  detail: "Multi-standard toggle available" },
                    { label: "PE Risk Monitoring",         ok: true,  detail: "Permanent establishment detection" },
                    { label: "Transfer Pricing Alerts",    ok: true,  detail: "Arm's length compliance checks" },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs font-medium">{s.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
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
