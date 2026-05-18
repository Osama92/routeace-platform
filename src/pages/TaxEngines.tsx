import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, TrendingDown, Shield, Download, Globe, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number, sym = "₦") =>
  `${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function TaxEngines() {
  const [country, setCountry] = useState("NG");

  const { data: taxRates = [] } = useQuery({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("tax_rates").select("*").eq("is_active", true).order("country_code");
      return data || [];
    },
  });

  const { data: taxLedger = [] } = useQuery({
    queryKey: ["tax-ledger"],
    queryFn: async () => {
      const { data } = await supabase.from("tax_ledger").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: glData = [] } = useQuery({
    queryKey: ["gl-for-tax"],
    queryFn: async () => {
      const { data } = await supabase.from("accounting_ledger").select("*").order("entry_date", { ascending: false });
      return data || [];
    },
  });

  const countryRates = taxRates.filter(r => r.country_code === country);
  const vatRate = countryRates.find(r => r.tax_type === "VAT")?.rate_percentage || 0;
  const citRate = countryRates.find(r => r.tax_type === "CIT")?.rate_percentage || 0;

  // Compute VAT from GL
  const outputVat = taxLedger.filter(t => t.tax_type === "VAT" && t.direction === "output").reduce((s, t) => s + Number(t.amount), 0);
  const inputVat = taxLedger.filter(t => t.tax_type === "VAT" && t.direction === "input").reduce((s, t) => s + Number(t.amount), 0);
  const vatNet = outputVat - inputVat;

  // WHT tracking
  const whtEntries = taxLedger.filter(t => t.tax_type === "WHT");
  const totalWht = whtEntries.reduce((s, t) => s + Number(t.amount), 0);

  // CIT estimation from GL
  const totalRevenue = glData.filter(e => e.account_type === "revenue" || e.account_name?.includes("revenue")).reduce((s, e) => s + Number(e.credit || 0), 0);
  const totalExpenses = glData.filter(e => e.account_type === "expense" || e.account_name?.includes("expense") || e.account_name?.includes("cost")).reduce((s, e) => s + Number(e.debit || 0), 0);
  const profitBeforeTax = totalRevenue - totalExpenses;
  const citProjected = Math.max(0, (profitBeforeTax * citRate) / 100);
  const citAfterWht = Math.max(0, citProjected - totalWht);

  const countries = [...new Set(taxRates.map(r => r.country_code))];

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
              {taxLedger.filter(t => t.tax_type === "VAT").length === 0 && (
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
                  <p className="text-sm text-muted-foreground">Total WHT Deducted</p>
                  <p className="text-2xl font-bold">{fmt(totalWht)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Available as CIT credit</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">WHT Entries</p>
                  <p className="text-2xl font-bold">{whtEntries.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all vendors</p>
                </div>
              </div>
              {whtEntries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No WHT entries. WHT is auto-calculated when vendor payments are processed.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {whtEntries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{e.vendor_name || "-"}</TableCell>
                        <TableCell>{e.tax_rate_applied}%</TableCell>
                        <TableCell className="text-right font-medium">{fmt(Number(e.amount))}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{e.period || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Total Revenue</span><span className="font-bold text-green-600">{fmt(totalRevenue)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Total Expenses</span><span className="font-bold text-destructive">{fmt(totalExpenses)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-primary/5 border border-primary/20"><span className="text-sm font-medium">Profit Before Tax</span><span className="font-bold">{fmt(profitBeforeTax)}</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">CIT Rate ({country})</span><span className="font-bold">{citRate}%</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Gross CIT</span><span className="font-bold">{fmt(citProjected)}</span></div>
                    <div className="flex justify-between p-3 rounded bg-muted/50"><span className="text-sm">Less: WHT Credits</span><span className="font-bold text-green-600">({fmt(totalWht)})</span></div>
                    <div className="flex justify-between p-3 rounded bg-destructive/5 border border-destructive/20"><span className="text-sm font-medium">Net CIT Payable</span><span className="font-bold text-destructive">{fmt(citAfterWht)}</span></div>
                  </div>
                </div>
                {profitBeforeTax <= 0 && (
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
            <CardContent>
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
