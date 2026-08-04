import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, TrendingDown, Shield, Download, Globe, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (n: number, sym = "₦") =>
  `${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

// WHT withholding rate applied to the pre-tax value of invoices/bills.
// Flat 2% for now (goods/contracts rate) — can be split by goods vs
// services (5%) once line items carry a category classification.
const WHT_RATE_PERCENT = 2;

// Nigeria CIT turnover banding (Finance Act): companies with annual
// turnover up to ₦50m pay 0% CIT; above ₦50m pay 30%. Other countries'
// bands can be added here as they're confirmed; tax_rates table remains
// a fallback/guide for countries not yet modeled with real banding.
const CIT_BANDS: Record<string, { threshold: number; lowRate: number; highRate: number }> = {
  NG: { threshold: 50_000_000, lowRate: 0, highRate: 30 },
};

export default function TaxEngines() {
  const [country, setCountry] = useState("NG");
  const { organizationId } = useAuth();

  // Manual CIT adjustment inputs — the platform has no asset register or
  // prior-year loss tracking yet, so these are entered by the user per the
  // standard CIT computation: PBT + disallowed expenses - capital allowances - loss relief.
  const [disallowedExpenses, setDisallowedExpenses] = useState("0");
  const [capitalAllowances, setCapitalAllowances] = useState("0");
  const [lossRelief, setLossRelief] = useState("0");

  const { data: taxRates = [] } = useQuery({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("tax_rates").select("*").eq("is_active", true).order("country_code");
      return data || [];
    },
  });

  // VAT + WHT source: live invoices (output) and vendor bills (input) —
  // same source of truth as Accounts Ledger and Tax Filing Report.
  // tax_ledger / accounting_ledger are never written to by the invoice/bill
  // flow, so this page previously always showed zero.
  const { data: invoices = [] } = useQuery({
    queryKey: ["tax-engine-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, tax_amount, shipping_vat_amount, subtotal, total_amount, status, invoice_date, created_at, customers(company_name)")
        .eq("organization_id", organizationId)
        .neq("status", "cancelled");
      return data || [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["tax-engine-bills", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("id, bill_number, tax_amount, total_amount, vendor_name, payment_status, bill_date, created_at")
        .eq("organization_id", organizationId)
        .neq("payment_status", "cancelled");
      return data || [];
    },
  });

  const { data: glData = [] } = useQuery({
    queryKey: ["gl-for-tax", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("accounting_ledger")
        .select("*")
        .eq("organization_id", organizationId)
        .order("entry_date", { ascending: false });
      return data || [];
    },
  });

  const countryRates = taxRates.filter(r => r.country_code === country);
  const vatRate = countryRates.find(r => r.tax_type === "VAT")?.rate_percentage || 0;
  const fallbackCitRate = countryRates.find(r => r.tax_type === "CIT")?.rate_percentage || 0;

  // VAT netting from live invoices/bills
  const outputVat = invoices.reduce((s, inv: any) => s + (inv.tax_amount || 0) + (inv.shipping_vat_amount || 0), 0);
  const inputVat = bills.reduce((s, b: any) => s + (b.tax_amount || 0), 0);
  const vatNet = outputVat - inputVat;

  // WHT on invoices raised — deducted BY YOUR CUSTOMER before they pay you,
  // then remitted to FIRS on your behalf. Computed as 2% of pre-tax invoice value.
  const whtOnInvoiceLines = useMemo(() => invoices.map((inv: any) => ({
    id: inv.id,
    number: inv.invoice_number || inv.id.slice(0, 8),
    party: inv.customers?.company_name || "Customer",
    date: inv.invoice_date || inv.created_at,
    base: inv.subtotal || 0,
    wht: (inv.subtotal || 0) * (WHT_RATE_PERCENT / 100),
  })), [invoices]);
  const whtOnInvoices = whtOnInvoiceLines.reduce((s, l) => s + l.wht, 0);

  // WHT on vendor bills — deducted BY YOU from what you pay vendors, then
  // remitted to FIRS on the vendor's behalf. Computed as 2% of the bill's
  // pre-VAT (net) amount.
  const whtOnBillLines = useMemo(() => bills.map((b: any) => ({
    id: b.id,
    number: b.bill_number || b.id.slice(0, 8),
    party: b.vendor_name || "Vendor",
    date: b.bill_date || b.created_at,
    base: (b.total_amount || 0) - (b.tax_amount || 0),
    wht: ((b.total_amount || 0) - (b.tax_amount || 0)) * (WHT_RATE_PERCENT / 100),
  })), [bills]);
  const whtOnBills = whtOnBillLines.reduce((s, l) => s + l.wht, 0);

  const totalWht = whtOnInvoices + whtOnBills;

  // CIT — turnover-banded rate + full computation:
  // Taxable Profit = PBT + Disallowed Expenses - Capital Allowances - Loss Relief
  const glRevenue = glData.filter((e: any) => e.account_type === "revenue" || e.account_name?.includes("revenue")).reduce((s: number, e: any) => s + Number(e.credit || 0), 0);
  const glExpenses = glData.filter((e: any) => e.account_type === "expense" || e.account_name?.includes("expense") || e.account_name?.includes("cost")).reduce((s: number, e: any) => s + Number(e.debit || 0), 0);

  const invoiceRevenue = invoices.reduce((s, inv: any) => s + (inv.subtotal || 0), 0);
  const billExpenses = bills.reduce((s, b: any) => s + ((b.total_amount || 0) - (b.tax_amount || 0)), 0);

  const totalRevenue = glData.length > 0 ? glRevenue : invoiceRevenue;
  const totalExpenses = glData.length > 0 ? glExpenses : billExpenses;
  const profitBeforeTax = totalRevenue - totalExpenses;

  const annualTurnover = totalRevenue; // same figure used as "Total Revenue" — CIT turnover basis

  const citBand = CIT_BANDS[country];
  const citRate = citBand
    ? (annualTurnover <= citBand.threshold ? citBand.lowRate : citBand.highRate)
    : fallbackCitRate;

  const disallowed = parseFloat(disallowedExpenses) || 0;
  const allowances = parseFloat(capitalAllowances) || 0;
  const relief = parseFloat(lossRelief) || 0;
  const taxableProfit = Math.max(0, profitBeforeTax + disallowed - allowances - relief);

  const citProjected = Math.max(0, (taxableProfit * citRate) / 100);
  const citAfterWht = Math.max(0, citProjected - totalWht);

  const countries = [...new Set(taxRates.map(r => r.country_code)), ...Object.keys(CIT_BANDS)].filter((v, i, a) => a.indexOf(v) === i);

  const hasVatEntries = invoices.some((i: any) => (i.tax_amount || 0) + (i.shipping_vat_amount || 0) > 0) || bills.some((b: any) => (b.tax_amount || 0) > 0);

  return (
    <DashboardLayout title="Tax Automation Engine" subtitle="VAT netting, WHT tracking & CIT projection - multi-country compliant">
      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline"><Download className="w-4 h-4 mr-1" />Export Tax Report</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Output VAT", value: fmt(outputVat), icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", sub: `${vatRate}% rate` },
          { label: "Input VAT", value: fmt(inputVat), icon: TrendingDown, color: "text-blue-500", bg: "bg-blue-500/10", sub: "Claimable" },
          { label: "VAT Net Payable", value: fmt(vatNet), icon: Calculator, color: vatNet > 0 ? "text-destructive" : "text-green-500", bg: vatNet > 0 ? "bg-destructive/10" : "bg-green-500/10", sub: vatNet < 0 ? "VAT Credit" : "Due to authority" },
          { label: "CIT Projected", value: fmt(citAfterWht), icon: Shield, color: "text-primary", bg: "bg-primary/10", sub: `${citRate}% rate, after WHT credits` },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
              <div>
                <p className="text-xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-[10px] text-muted-foreground">{k.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="vat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vat">VAT Engine</TabsTrigger>
          <TabsTrigger value="wht">WHT Tracker</TabsTrigger>
          <TabsTrigger value="cit">CIT Projection</TabsTrigger>
          <TabsTrigger value="rates">Tax Rates</TabsTrigger>
        </TabsList>

        {/* VAT Engine */}
        <TabsContent value="vat">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">VAT Netting Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Output VAT (Sales)</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(outputVat)}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">Input VAT (Purchases)</p>
                  <p className="text-2xl font-bold text-blue-600">{fmt(inputVat)}</p>
                </div>
                <div className={`p-4 rounded-lg border ${vatNet > 0 ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20"}`}>
                  <p className="text-sm text-muted-foreground">Net VAT {vatNet > 0 ? "Payable" : "Credit"}</p>
                  <p className={`text-2xl font-bold ${vatNet > 0 ? "text-destructive" : "text-green-600"}`}>{fmt(vatNet)}</p>
                </div>
              </div>
              {!hasVatEntries && (
                <p className="text-center py-8 text-muted-foreground">No VAT entries yet. Post invoices and vendor bills to populate.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHT Tracker */}
        <TabsContent value="wht">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Withholding Tax Tracker</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Total WHT Deducted (on Invoices Raised)</p>
                  <p className="text-2xl font-bold">{fmt(whtOnInvoices)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{WHT_RATE_PERCENT}% of invoice value before tax — withheld by customers, available as CIT credit</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">WHT Deducted Across All Vendors</p>
                  <p className="text-2xl font-bold">{fmt(whtOnBills)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{WHT_RATE_PERCENT}% of VATed bill amount — withheld from vendor payments, remitted to FIRS</p>
                </div>
              </div>

              {whtOnInvoiceLines.length === 0 && whtOnBillLines.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No WHT entries. WHT is calculated from invoices raised and vendor bills.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
                      WHT on Invoices ({whtOnInvoiceLines.length})
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-xs">Invoice #</TableHead><TableHead className="text-xs">Customer</TableHead><TableHead className="text-xs text-right">WHT</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {whtOnInvoiceLines.filter(l => l.wht > 0).map(l => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs font-medium">{l.number}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{l.party}</TableCell>
                              <TableCell className="text-xs text-right font-semibold">{fmt(l.wht)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
                      WHT on Vendor Bills ({whtOnBillLines.length})
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-xs">Bill #</TableHead><TableHead className="text-xs">Vendor</TableHead><TableHead className="text-xs text-right">WHT</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {whtOnBillLines.filter(l => l.wht > 0).map(l => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs font-medium">{l.number}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{l.party}</TableCell>
                              <TableCell className="text-xs text-right font-semibold">{fmt(l.wht)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CIT Projection */}
        <TabsContent value="cit">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Corporate Income Tax Projection</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Total Revenue (Turnover)</span><span className="font-bold text-green-600">{fmt(totalRevenue)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Total Expenses</span><span className="font-bold text-destructive">{fmt(totalExpenses)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-primary/5 border border-primary/20"><span className="text-sm font-medium">Profit Before Tax</span><span className="font-bold">{fmt(profitBeforeTax)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">+ Disallowed Expenses</span><span className="font-bold">{fmt(disallowed)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">- Capital Allowances</span><span className="font-bold text-green-600">({fmt(allowances)})</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">- Loss Relief b/f</span><span className="font-bold text-green-600">({fmt(relief)})</span></div>
                    <div className="flex justify-between p-3 rounded bg-primary/10 border border-primary/30"><span className="text-sm font-medium">Taxable Profit</span><span className="font-bold">{fmt(taxableProfit)}</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded bg-muted/50">
                      <span className="text-sm">CIT Rate ({country}{citBand ? ` — turnover-banded` : ""})</span>
                      <span className="font-bold">{citRate}%</span>
                    </div>
                    {citBand && (
                      <p className="text-[11px] text-muted-foreground px-3 -mt-2">
                        Turnover {fmt(annualTurnover)} {annualTurnover <= citBand.threshold ? "≤" : ">"} {fmt(citBand.threshold)} threshold → {citRate}% band
                      </p>
                    )}
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Gross CIT</span><span className="font-bold">{fmt(citProjected)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Less: WHT Credits</span><span className="font-bold text-green-600">({fmt(totalWht)})</span></div>
                    <div className="flex justify-between p-3 rounded bg-destructive/5 border border-destructive/20"><span className="text-sm font-medium">Net CIT Payable</span><span className="font-bold text-destructive">{fmt(citAfterWht)}</span></div>

                    <div className="pt-2 space-y-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground">Manual Adjustments</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="disallowed" className="text-xs">Disallowed Expenses (fines, penalties, non-deductible depreciation)</Label>
                        <Input id="disallowed" type="number" value={disallowedExpenses} onChange={e => setDisallowedExpenses(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="allowances" className="text-xs">Capital Allowances</Label>
                        <Input id="allowances" type="number" value={capitalAllowances} onChange={e => setCapitalAllowances(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="relief" className="text-xs">Loss Relief Carried Forward</Label>
                        <Input id="relief" type="number" value={lossRelief} onChange={e => setLossRelief(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                {taxableProfit <= 0 && (
                  <div className="flex items-center gap-2 p-3 rounded bg-green-500/5 border border-green-500/20">
                    <AlertTriangle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">No CIT payable - tax loss position. Loss can be carried forward.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Rates */}
        <TabsContent value="rates">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" />Configured Tax Rates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                These are reference/default rates. Nigeria's CIT rate is computed dynamically from turnover banding
                (see CIT Projection tab) rather than the flat rate below.
              </p>
              <Table>
                <TableHeader><TableRow><TableHead>Country</TableHead><TableHead>Tax Type</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Rate %</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {taxRates.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.country_code}</TableCell>
                      <TableCell><Badge variant="outline">{r.tax_type}</Badge></TableCell>
                      <TableCell>{r.tax_name}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.rate_percentage).toFixed(1)}%</TableCell>
                      <TableCell>{r.is_active ? <Badge className="bg-green-500/15 text-green-600">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
