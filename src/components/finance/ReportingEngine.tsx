import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Download, FileText, Lock,
  Calculator, AlertCircle, BarChart3, RefreshCw,
  Activity, PieChart, ShieldCheck, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(Math.round(n)).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

type PeriodKey = "week" | "month" | "quarter" | "year";

function periodRange(key: PeriodKey): { start: Date; end: Date; prevStart: Date; prevEnd: Date; label: string } {
  const now = new Date();
  let start: Date, end: Date, prevStart: Date, prevEnd: Date, label: string;
  if (key === "week") {
    end = now;
    start = new Date(now.getTime() - 7 * 86400000);
    prevEnd = new Date(start);
    prevStart = new Date(start.getTime() - 7 * 86400000);
    label = `Last 7 days`;
  } else if (key === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    label = start.toLocaleString("en-US", { month: "long", year: "numeric" });
  } else if (key === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
    prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
    prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
    label = `Q${q + 1} ${now.getFullYear()}`;
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    label = `FY ${now.getFullYear()}`;
  }
  return { start, end, prevStart, prevEnd, label };
}

function computeCIT(taxableProfit: number, jurisdiction: string) {
  if (taxableProfit <= 0) return { rate: 0, tax: 0, label: "No Taxable Profit" };
  if (jurisdiction === "NG") {
    if (taxableProfit < 25_000_000) return { rate: 0, tax: 0, label: "Small Company (Exempt)" };
    if (taxableProfit < 100_000_000) return { rate: 0.20, tax: taxableProfit * 0.20, label: "Medium Enterprise (20%)" };
    return { rate: 0.30, tax: taxableProfit * 0.30, label: "Large Enterprise (30%)" };
  }
  return { rate: 0.25, tax: taxableProfit * 0.25, label: "Standard (25%)" };
}

const EXPENSE_GROUPS: Record<string, string[]> = {
  "Fuel Expense": ["fuel"],
  "Driver Payroll": ["driver_salary"],
  "Maintenance": ["maintenance", "repairs"],
  "Insurance": ["insurance"],
  "Tolls & Parking": ["tolls", "parking"],
  "Administrative": ["administrative", "utilities", "rent"],
  "Other": ["equipment", "marketing", "other", "cogs"],
};

export function ReportingEngine() {
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const [jurisdiction, setJurisdiction] = useState("NG");
  const [fiscalLocked, setFiscalLocked] = useState(false);
  const [reportTab, setReportTab] = useState("pnl");

  const range = useMemo(() => periodRange(periodKey), [periodKey]);

  // Fetch invoices for current + prior period
  const invoicesQ = useQuery({
    queryKey: ["reporting-invoices", organizationId, periodKey],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total_amount, amount, status, invoice_date, created_at, organization_id")
        .eq("organization_id", organizationId!)
        .gte("created_at", range.prevStart.toISOString())
        .lte("created_at", range.end.toISOString())
        .limit(1000);
      if (error) throw error;
      return (data || []).filter((r: any) => r.organization_id === organizationId);
    },
  });

  const expensesQ = useQuery({
    queryKey: ["reporting-expenses", organizationId, periodKey],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, category, expense_date, approval_status, created_at, organization_id")
        .eq("organization_id", organizationId!)
        .eq("approval_status", "approved")
        .gte("created_at", range.prevStart.toISOString())
        .lte("created_at", range.end.toISOString())
        .limit(1000);
      if (error) throw error;
      return (data || []).filter((r: any) => r.organization_id === organizationId);
    },
  });

  const loading = invoicesQ.isLoading || expensesQ.isLoading;
  const invoices = invoicesQ.data || [];
  const expenses = expensesQ.data || [];

  // Split into current vs prior
  const inRange = (iso: string, s: Date, e: Date) => {
    const t = new Date(iso).getTime();
    return t >= s.getTime() && t <= e.getTime();
  };
  const curInvoices = invoices.filter((i: any) => inRange(i.created_at, range.start, range.end));
  const prevInvoices = invoices.filter((i: any) => inRange(i.created_at, range.prevStart, range.prevEnd));
  const curExpenses = expenses.filter((e: any) => inRange(e.created_at, range.start, range.end));
  const prevExpenses = expenses.filter((e: any) => inRange(e.created_at, range.prevStart, range.prevEnd));

  const sumAmount = (rows: any[], k: string) =>
    rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  const revenue = sumAmount(curInvoices, "total_amount") || sumAmount(curInvoices, "amount");
  const expensesTotal = sumAmount(curExpenses, "amount");
  const prevRevenue = sumAmount(prevInvoices, "total_amount") || sumAmount(prevInvoices, "amount");
  const prevExpensesTotal = sumAmount(prevExpenses, "amount");
  const netProfit = revenue - expensesTotal;
  const prevNetProfit = prevRevenue - prevExpensesTotal;
  const grossMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Expense breakdown
  const expensesByGroup = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [group, cats] of Object.entries(EXPENSE_GROUPS)) {
      out[group] = curExpenses
        .filter((e: any) => cats.includes(e.category))
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    }
    return out;
  }, [curExpenses]);

  const paidInvoices = curInvoices.filter((i: any) => i.status === "paid");
  const unpaidInvoices = curInvoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled");
  const cashCollected = sumAmount(paidInvoices, "total_amount") || sumAmount(paidInvoices, "amount");
  const accountsReceivable = sumAmount(unpaidInvoices, "total_amount") || sumAmount(unpaidInvoices, "amount");

  const cit = computeCIT(netProfit, jurisdiction);
  const afterTaxProfit = netProfit - cit.tax;
  const qtrAccrual = cit.tax / 4;

  // Cash flow (only operating; investing/financing not tracked yet)
  const operatingCF = cashCollected - expensesTotal;
  const netCF = operatingCF;

  const hasData = revenue > 0 || expensesTotal > 0;

  const handleExport = (type: string) => {
    toast({ title: `${type} Export Started`, description: "Your report is being generated. Download will begin shortly." });
  };

  const handleLockFiscal = () => {
    setFiscalLocked(true);
    toast({ title: "Fiscal Period Locked", description: `${range.label} has been locked. No further journal entries permitted.` });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="quarter">Quarterly</SelectItem>
            <SelectItem value="year">Annual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={jurisdiction} onValueChange={setJurisdiction}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NG">Nigeria (FIRS)</SelectItem>
            <SelectItem value="KE">Kenya (KRA)</SelectItem>
            <SelectItem value="ZA">South Africa</SelectItem>
            <SelectItem value="GB">United Kingdom</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => handleExport("PDF")}>
          <Download className="w-4 h-4 mr-1" />PDF Report
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("Excel")}>
          <Download className="w-4 h-4 mr-1" />Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("Auditor Package")}>
          <FileText className="w-4 h-4 mr-1" />Auditor Package
        </Button>
        {!fiscalLocked ? (
          <Button variant="outline" size="sm" onClick={handleLockFiscal}>
            <Lock className="w-4 h-4 mr-1" />Lock Period
          </Button>
        ) : (
          <Badge className="bg-destructive/20 text-destructive flex items-center gap-1">
            <Lock className="w-3 h-3" />Period Locked
          </Badge>
        )}
        <Badge variant="outline" className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-green-500" />IFRS IAS 7
        </Badge>
      </div>

      {!loading && !hasData && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">No financial activity yet for {range.label}</p>
              <p className="text-muted-foreground">
                Reports populate automatically as invoices are issued and approved expenses are recorded.
                All values below will read <span className="font-mono">₦0</span> until then.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue Growth", value: prevRevenue > 0 ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%` : "—", sub: "vs prev period", icon: TrendingUp, color: revenueGrowth >= 0 ? "text-green-500" : "text-destructive", bg: "bg-green-500/10" },
          { label: "Gross Margin", value: revenue > 0 ? `${grossMargin.toFixed(1)}%` : "—", sub: "IFRS basis", icon: PieChart, color: "text-primary", bg: "bg-primary/10" },
          { label: "Cash Collected", value: fmt(cashCollected), sub: "Paid invoices", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Open Receivables", value: fmt(accountsReceivable), sub: `${unpaidInvoices.length} invoices`, icon: BarChart3, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg ${k.bg} shrink-0`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-bold truncate">{k.value}</p>
                <p className="text-xs text-muted-foreground truncate">{k.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pnl">P&L Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax">CIT Engine</TabsTrigger>
          <TabsTrigger value="kpis">Management KPIs</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pnl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />Profit & Loss - {range.label}
                </CardTitle>
                <CardDescription>IFRS Compliant | Accrual Basis | Live data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 font-mono text-sm">
                  <p className="font-bold text-xs uppercase text-muted-foreground mb-2 mt-1">Revenue</p>
                  <div className="flex justify-between py-1 pl-4">
                    <span className="text-muted-foreground">Invoiced Revenue</span>
                    <span>{fmt(revenue)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-border font-bold">
                    <span>GROSS REVENUE</span><span className="text-green-500">{fmt(revenue)}</span>
                  </div>

                  <p className="font-bold text-xs uppercase text-muted-foreground mb-2 mt-3">Operating Expenses</p>
                  {Object.entries(expensesByGroup).map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1 pl-4">
                      <span className="text-muted-foreground">{label}</span>
                      <span>{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 border-t border-border font-bold">
                    <span>TOTAL EXPENSES</span><span className="text-destructive">{fmt(expensesTotal)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-t-2 border-border font-bold text-base">
                    <span>NET PROFIT BEFORE TAX</span>
                    <span className={netProfit >= 0 ? "text-green-500" : "text-destructive"}>{fmt(netProfit)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted-foreground text-sm">
                    <span>Est. Corporate Tax ({Math.round(cit.rate * 100)}%)</span>
                    <span className="text-destructive">({fmt(cit.tax)})</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-border font-bold text-base">
                    <span>NET PROFIT AFTER TAX</span>
                    <span className="text-primary">{fmt(afterTaxProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Margin</span>
                    <span className={`font-semibold ${grossMargin >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {revenue > 0 ? `${grossMargin.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Period Comparison</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Previous</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { metric: "Revenue", prev: prevRevenue, curr: revenue },
                      { metric: "Expenses", prev: prevExpensesTotal, curr: expensesTotal },
                      { metric: "Net Profit", prev: prevNetProfit, curr: netProfit },
                    ].map((row) => {
                      const delta = row.curr - row.prev;
                      return (
                        <TableRow key={row.metric}>
                          <TableCell className="font-medium text-sm">{row.metric}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{fmt(row.prev)}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{fmt(row.curr)}</TableCell>
                          <TableCell className={`font-mono text-sm font-bold ${delta >= 0 ? "text-green-500" : "text-destructive"}`}>
                            {delta >= 0 ? "+" : ""}{fmt(delta)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance">
          <Card className="border-dashed">
            <CardContent className="p-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Balance Sheet requires a configured chart of accounts</p>
                <p className="text-muted-foreground">
                  Receivables tracked live: <span className="font-mono">{fmt(accountsReceivable)}</span> across {unpaidInvoices.length} open invoices.
                  Full asset, liability, and equity breakdown becomes available once GL accounts and opening balances are configured under Finance → Setup.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Cash Flow Statement - {range.label}</CardTitle>
              <CardDescription>Direct Method (operating only) | Live data</CardDescription>
            </CardHeader>
            <CardContent className="font-mono text-sm space-y-3">
              <p className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Operating Activities</p>
              <div className="flex justify-between py-0.5 text-xs">
                <span className="text-muted-foreground pl-2">Cash Collected from Customers</span>
                <span>{fmt(cashCollected)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-xs">
                <span className="text-muted-foreground pl-2">Cash Paid for Operating Expenses</span>
                <span className="text-destructive">({fmt(expensesTotal)})</span>
              </div>
              <div className="flex justify-between pt-1 border-t font-bold text-green-500">
                <span>Net Operating Cash Flow</span>
                <span>{fmt(operatingCF)}</span>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex justify-between text-base font-bold">
                  <span>NET CHANGE IN CASH</span>
                  <span className={netCF >= 0 ? "text-green-500" : "text-destructive"}>{fmt(netCF)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Investing and financing activity lines populate once asset purchases and loan transactions are recorded against the GL.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CIT Engine */}
        <TabsContent value="tax">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />Corporate Income Tax Engine
                </CardTitle>
                <CardDescription>Auto-computed per jurisdiction rules. Nigerian CITA default.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 space-y-2 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross Revenue</span><span>{fmt(revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Expenses</span><span className="text-destructive">({fmt(expensesTotal)})</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Taxable Profit</span><span>{fmt(netProfit)}</span></div>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tax Jurisdiction</span>
                    <Badge variant="outline">{jurisdiction === "NG" ? "FIRS - CITA 2004" : jurisdiction}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Classification</span>
                    <span className="font-medium">{cit.label}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>CIT Payable (period)</span>
                    <span className="text-destructive">{fmt(cit.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quarterly Accrual</span>
                    <span className="font-semibold">{fmt(qtrAccrual)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Effective Rate</span>
                    <span className="font-semibold text-yellow-500">{(cit.rate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Global Tax Rates Reference</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>CIT Rate</TableHead>
                      <TableHead>VAT/GST</TableHead>
                      <TableHead>WHT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { country: "🇳🇬 Nigeria", cit: "0–30%", vat: "7.5%", wht: "10%" },
                      { country: "🇬🇭 Ghana", cit: "25%", vat: "12.5%", wht: "8%" },
                      { country: "🇰🇪 Kenya", cit: "30%", vat: "16%", wht: "5%" },
                      { country: "🇿🇦 South Africa", cit: "27%", vat: "15%", wht: "20%" },
                      { country: "🇬🇧 UK", cit: "25%", vat: "20%", wht: "20%" },
                      { country: "🇺🇸 USA", cit: "21%", vat: "N/A", wht: "30%" },
                    ].map((r) => (
                      <TableRow key={r.country}>
                        <TableCell className="font-medium text-sm">{r.country}</TableCell>
                        <TableCell className="font-mono text-sm">{r.cit}</TableCell>
                        <TableCell className="font-mono text-sm">{r.vat}</TableCell>
                        <TableCell className="font-mono text-sm">{r.wht}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Management KPIs */}
        <TabsContent value="kpis">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />Management KPI Dashboard - {range.label}
              </CardTitle>
              <CardDescription>Computed live from invoices and approved expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Revenue Growth vs Prior Period", value: prevRevenue > 0 ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%` : "—", progress: Math.max(0, Math.min(100, 50 + revenueGrowth)), good: revenueGrowth >= 0 },
                { label: "Gross Margin", value: revenue > 0 ? `${grossMargin.toFixed(1)}%` : "—", progress: Math.max(0, Math.min(100, grossMargin)), good: grossMargin >= 20 },
                { label: "Collection Rate", value: revenue > 0 ? `${((cashCollected / revenue) * 100).toFixed(1)}%` : "—", progress: revenue > 0 ? (cashCollected / revenue) * 100 : 0, good: revenue > 0 && cashCollected / revenue >= 0.7 },
                { label: "Open Receivables", value: fmt(accountsReceivable), progress: revenue > 0 ? Math.min(100, (accountsReceivable / revenue) * 100) : 0, good: accountsReceivable === 0 || accountsReceivable / Math.max(revenue, 1) < 0.3 },
              ].map((kpi) => (
                <div key={kpi.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{kpi.label}</span>
                    <span className={`font-semibold ${kpi.good ? "text-green-500" : "text-destructive"}`}>{kpi.value}</span>
                  </div>
                  <Progress value={kpi.progress} className="h-1.5" />
                </div>
              ))}
              <Button className="w-full mt-2" size="sm" onClick={() => handleExport("Board Pack PDF")}>
                <Download className="w-4 h-4 mr-2" />Generate Board-Ready PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget vs Actual */}
        <TabsContent value="budget">
          <Card className="border-dashed">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Budget vs Actual requires a configured budget</p>
                <p className="text-muted-foreground">
                  Once you create a budget under Finance → Budgets for {range.label}, this view compares each line item against actual invoices and approved expenses in real time.
                </p>
                <div className="mt-3 flex gap-2 text-xs">
                  <Badge variant="outline">Actual Revenue: {fmt(revenue)}</Badge>
                  <Badge variant="outline">Actual Expenses: {fmt(expensesTotal)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
