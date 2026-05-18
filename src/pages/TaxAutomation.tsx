import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Globe, Calculator, FileText, Download, CheckCircle, AlertTriangle,
  TrendingUp, DollarSign, BarChart3, Building2, RefreshCw, Shield
} from "lucide-react";

const fmt = (n: number, sym = "₦") => `${sym}${n.toLocaleString()}`;

const countryTaxRules = [
  { country: "🇳🇬 Nigeria", vatRate: "7.5%", withholdingTax: "5-10%", corporateTax: "30%", digitalTax: "N/A", engine: "FIRS" },
  { country: "🇰🇪 Kenya", vatRate: "16%", withholdingTax: "5%", corporateTax: "30%", digitalTax: "1.5%", engine: "KRA" },
  { country: "🇬🇭 Ghana", vatRate: "15%", withholdingTax: "8%", corporateTax: "25%", digitalTax: "N/A", engine: "GRA" },
  { country: "🇿🇦 South Africa", vatRate: "15%", withholdingTax: "15%", corporateTax: "27%", digitalTax: "N/A", engine: "SARS" },
  { country: "🇬🇧 United Kingdom", vatRate: "20%", withholdingTax: "20%", corporateTax: "25%", digitalTax: "2%", engine: "HMRC" },
  { country: "🇺🇸 United States", vatRate: "N/A (State)", withholdingTax: "30%", corporateTax: "21%", digitalTax: "Varies", engine: "IRS" },
  { country: "🇦🇪 UAE", vatRate: "5%", withholdingTax: "0%", corporateTax: "9%", digitalTax: "N/A", engine: "FTA" },
];

const taxLiabilities = [
  { type: "VAT (7.5%)", period: "Feb 2025", base: 34_700_000, rate: 7.5, amount: 2_602_500, status: "due", dueDate: "Mar 21, 2025" },
  { type: "WHT on Contractors", period: "Feb 2025", base: 4_800_000, rate: 5.0, amount: 240_000, status: "paid", dueDate: "Paid Mar 1, 2025" },
  { type: "PAYE (Staff)", period: "Feb 2025", base: 7_300_000, rate: 15.0, amount: 1_095_000, status: "paid", dueDate: "Paid Feb 28, 2025" },
  { type: "Company Income Tax", period: "Q1 2025", base: 34_700_000, rate: 30.0, amount: 10_410_000, status: "estimated", dueDate: "Jun 30, 2025" },
];

const invoiceTaxBreakdown = [
  { invoice: "INV-2025-0041", customer: "DANGOTE GROUP", amount: 4_200_000, vat: 315_000, wht: 210_000, net: 3_675_000 },
  { invoice: "INV-2025-0042", customer: "MTN NIGERIA", amount: 2_100_000, vat: 157_500, wht: 105_000, net: 1_837_500 },
  { invoice: "INV-2025-0043", customer: "TOYOTA (NG)", amount: 980_000, vat: 73_500, wht: 49_000, net: 857_500 },
  { invoice: "INV-2025-0044", customer: "NESTLE NG", amount: 1_560_000, vat: 117_000, wht: 78_000, net: 1_365_000 },
];

export default function TaxAutomation() {
  const [activeTab, setActiveTab] = useState("overview");
  const [calcBase, setCalcBase] = useState("");
  const [calcCountry, setCalcCountry] = useState("nigeria");
  const [calcResult, setCalcResult] = useState<{ vat: number; wht: number; net: number } | null>(null);

  const calculateTax = () => {
    const base = parseFloat(calcBase);
    if (isNaN(base)) return;
    const rates: Record<string, { vat: number; wht: number }> = {
      nigeria: { vat: 0.075, wht: 0.05 },
      kenya: { vat: 0.16, wht: 0.05 },
      ghana: { vat: 0.15, wht: 0.08 },
      uk: { vat: 0.20, wht: 0.20 },
      uae: { vat: 0.05, wht: 0.00 },
    };
    const r = rates[calcCountry] || { vat: 0.075, wht: 0.05 };
    const vat = base * r.vat;
    const wht = base * r.wht;
    setCalcResult({ vat, wht, net: base - wht + vat });
  };

  return (
    <DashboardLayout title="Cross-Border Tax Automation Engine" subtitle="Dynamic tax rules, automated calculation, and government filing per country">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Tax Liability (Feb)", value: fmt(14_347_500), icon: DollarSign, color: "text-destructive" },
          { label: "Taxes Paid (Feb)", value: fmt(1_335_000), icon: CheckCircle, color: "text-green-500" },
          { label: "Countries Configured", value: "7", icon: Globe, color: "text-primary" },
          { label: "Filings Due This Month", value: "2", icon: AlertTriangle, color: "text-yellow-500" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="overview">Tax Overview</TabsTrigger>
          <TabsTrigger value="country-rules">Country Rules</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="invoice-tax">Invoice Tax</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="filing">Government Filing</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Tax Breakdown (Feb 2025)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "VAT (7.5%)", amount: 2_602_500, percent: 36, color: "bg-primary" },
                  { type: "Withholding Tax (5%)", amount: 240_000, percent: 3, color: "bg-orange-500" },
                  { type: "PAYE (Staff)", amount: 1_095_000, percent: 15, color: "bg-blue-500" },
                  { type: "Company Income Tax (Est.)", amount: 10_410_000, percent: 100, color: "bg-destructive" },
                ].map((t) => (
                  <div key={t.type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.type}</span>
                      <span className="font-bold">{fmt(t.amount)}</span>
                    </div>
                    <Progress value={t.percent} className={`h-2 [&>div]:${t.color}`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Compliance Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { framework: "IFRS", status: "compliant", desc: "Financial statements meet international standards" },
                  { framework: "GAAP", status: "compliant", desc: "Generally Accepted Accounting Principles enforced" },
                  { framework: "FIRS (Nigeria)", status: "compliant", desc: "VAT, PAYE, CIT filings up to date" },
                  { framework: "Transfer Pricing", status: "in-progress", desc: "Cross-border transaction policy being finalized" },
                ].map((c) => (
                  <div key={c.framework} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {c.status === "compliant"
                      ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-semibold text-sm">{c.framework}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── COUNTRY RULES ─── */}
        <TabsContent value="country-rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-4 h-4" />Country Tax Rule Engine</CardTitle>
              <CardDescription>Dynamic tax rules auto-applied based on country of operation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>VAT/GST Rate</TableHead>
                    <TableHead>Withholding Tax</TableHead>
                    <TableHead>Corporate Tax</TableHead>
                    <TableHead>Digital Services Tax</TableHead>
                    <TableHead>Tax Authority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryTaxRules.map((c) => (
                    <TableRow key={c.country}>
                      <TableCell className="font-medium">{c.country}</TableCell>
                      <TableCell className="font-mono">{c.vatRate}</TableCell>
                      <TableCell className="font-mono">{c.withholdingTax}</TableCell>
                      <TableCell className="font-mono">{c.corporateTax}</TableCell>
                      <TableCell className="font-mono">{c.digitalTax}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.engine}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LIABILITIES ─── */}
        <TabsContent value="liabilities">
          <Card>
            <CardHeader><CardTitle className="text-base">Tax Liabilities Tracker</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Taxable Base</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxLiabilities.map((t) => (
                    <TableRow key={t.type}>
                      <TableCell className="font-medium text-sm">{t.type}</TableCell>
                      <TableCell className="text-xs">{t.period}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(t.base)}</TableCell>
                      <TableCell>{t.rate}%</TableCell>
                      <TableCell className="font-bold">{fmt(t.amount)}</TableCell>
                      <TableCell>
                        <Badge className={
                          t.status === "paid" ? "bg-green-500/20 text-green-700" :
                          t.status === "due" ? "bg-destructive/20 text-destructive" :
                          "bg-blue-500/20 text-blue-700"
                        }>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── INVOICE TAX ─── */}
        <TabsContent value="invoice-tax">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Tax Breakdown</CardTitle>
              <CardDescription>Per-invoice VAT and withholding tax calculation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice Amount</TableHead>
                    <TableHead>VAT (7.5%)</TableHead>
                    <TableHead>WHT (5%)</TableHead>
                    <TableHead>Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceTaxBreakdown.map((inv) => (
                    <TableRow key={inv.invoice}>
                      <TableCell className="font-mono text-xs">{inv.invoice}</TableCell>
                      <TableCell className="font-medium text-sm">{inv.customer}</TableCell>
                      <TableCell className="font-bold">{fmt(inv.amount)}</TableCell>
                      <TableCell className="text-green-600">{fmt(inv.vat)}</TableCell>
                      <TableCell className="text-destructive">({fmt(inv.wht)})</TableCell>
                      <TableCell className="font-bold text-primary">{fmt(inv.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CALCULATOR ─── */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />Cross-Border Tax Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country of Operation</label>
                  <Select value={calcCountry} onValueChange={setCalcCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nigeria">🇳🇬 Nigeria</SelectItem>
                      <SelectItem value="kenya">🇰🇪 Kenya</SelectItem>
                      <SelectItem value="ghana">🇬🇭 Ghana</SelectItem>
                      <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="uae">🇦🇪 UAE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Amount</label>
                  <Input type="number" placeholder="Enter amount" value={calcBase} onChange={(e) => setCalcBase(e.target.value)} />
                </div>
                <Button className="w-full" onClick={calculateTax}>Calculate Tax</Button>
                {calcResult && (
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex justify-between text-sm"><span>VAT Amount</span><span className="font-bold text-green-500">{fmt(calcResult.vat)}</span></div>
                    <div className="flex justify-between text-sm"><span>Withholding Tax</span><span className="font-bold text-destructive">({fmt(calcResult.wht)})</span></div>
                    <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Net Amount Payable</span><span className="text-primary">{fmt(calcResult.net)}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Transfer Pricing Log</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Cross-border intercompany transactions subject to arm's length pricing</p>
                {[
                  { entity: "RouteAce NG → RouteAce UK", amount: 12_000_000, type: "Management Fee", compliant: true },
                  { entity: "RouteAce NG → RouteAce KE", amount: 4_500_000, type: "Technology License", compliant: true },
                  { entity: "RouteAce UK → RouteAce NG", amount: 8_200_000, type: "Software SaaS", compliant: false },
                ].map((t) => (
                  <div key={t.entity} className="flex items-start gap-3 p-3 rounded-lg border">
                    {t.compliant
                      ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-xs font-medium">{t.entity}</p>
                      <p className="text-xs text-muted-foreground">{t.type} - {fmt(t.amount)}</p>
                    </div>
                    <Badge className={t.compliant ? "bg-green-500/20 text-green-700 text-xs" : "bg-yellow-500/20 text-yellow-700 text-xs"}>
                      {t.compliant ? "Compliant" : "Review"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── FILING ─── */}
        <TabsContent value="filing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" />Government Filing Export</CardTitle>
                  <CardDescription>Auto-generate filing reports for each tax authority</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "FIRS VAT Return (Form 002)", authority: "FIRS Nigeria", period: "Feb 2025", status: "ready", format: "XML + PDF" },
                { name: "PAYE Monthly Remittance", authority: "FIRS Nigeria", period: "Feb 2025", status: "ready", format: "EXCEL" },
                { name: "Company Income Tax Estimate", authority: "FIRS Nigeria", period: "Q1 2025", status: "pending", format: "PDF" },
                { name: "WHT Credit Note Report", authority: "FIRS Nigeria", period: "Feb 2025", status: "ready", format: "PDF" },
                { name: "KRA VAT Return (Kenya)", authority: "KRA Kenya", period: "Feb 2025", status: "pending", format: "iTax XML" },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.authority} • {f.period} • Format: {f.format}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={f.status === "ready" ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}>
                      {f.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={f.status !== "ready"}>
                      <Download className="w-3 h-3 mr-1" />Download
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
