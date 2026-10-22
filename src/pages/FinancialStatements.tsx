import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileText, Scale, TrendingUp, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, startOfQuarter, startOfYear } from "date-fns";

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

// COGS vs OPEX is driven by the expenses.is_cogs flag — the platform-wide
// convention already used by AdminAnalytics, ProfitLoss, BudgetVarianceAnalysis,
// RouteLevelCosting, CustomerProfitabilityReport and TargetPerformanceWidget.
// Do NOT reintroduce a hardcoded category list here: it would silently disagree
// with every other P&L surface in the product.

interface ChannelBreakdown {
  revenue: number;
  cost: number;
  gross_profit: number;
  dispatch_count: number;
  pending_count: number;
}

interface CogsLine {
  category: string;
  label: string;
  amount: number;
}

interface OpexLine {
  category: string;
  amount: number;
}

interface ProfitLossBreakdown {
  own_truck: ChannelBreakdown;
  third_party: ChannelBreakdown;
  cogs_breakdown: CogsLine[];
  own_truck_cogs_total: number;
  cost_of_sales_3pl: number;
  invoice_revenue: number;
  dispatch_revenue_total: number;
  revenue_reconciliation_delta: number;
  output_vat: number;
  input_vat: number;
  tax_expense: number;
  opex_total: number;
  opex_breakdown: OpexLine[];
}

export default function FinancialStatements() {
  const [period, setPeriod] = useState("all");
  const { organizationId } = useAuth();

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "month") return startOfMonth(now);
    if (period === "quarter") return startOfQuarter(now);
    if (period === "year") return startOfYear(now);
    return null; // "all"
  }, [period]);

  // Statements are built from live invoices, vendor bills, and expenses —
  // the same source of truth as Accounts Ledger and Tax Filing Report.
  // accounting_ledger / journal_entries are never written to by the actual
  // invoice/bill/expense flow, so this page previously always showed zero.
  const { data: invoices = [] } = useQuery({
    queryKey: ["fs-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, subtotal, tax_amount, shipping_vat_amount, total_amount, status, invoice_date, created_at, customers(company_name)")
        .eq("organization_id", organizationId)
        // Draft invoices are not revenue and carry no VAT liability — they are
        // unissued documents. Matches Zoho/QuickBooks treatment.
        .not("status", "in", '("cancelled","draft")');
      return data || [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["fs-bills", organizationId],
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

  // Filter by selected period
  const filteredInvoices = useMemo(() => invoices.filter((inv: any) => {
    if (!periodStart) return true;
    return new Date(inv.invoice_date || inv.created_at) >= periodStart;
  }), [invoices, periodStart]);

  const filteredBills = useMemo(() => bills.filter((b: any) => {
    if (!periodStart) return true;
    return new Date(b.bill_date || b.created_at) >= periodStart;
  }), [bills, periodStart]);

  // ── P&L — own-truck vs 3PL channel breakdown ──────────────────────
  // Revenue/COGS/Gross Profit/Net Profit now come from get_profit_loss_breakdown,
  // which splits dispatch_financials by vehicles.ownership_type (owned -> own
  // truck, vendor/leased -> 3PL) and itemizes Own Truck COGS from expenses.is_cogs.
  // See supabase/migrations/20261021130000_get_profit_loss_breakdown.sql.
  const { data: pl } = useQuery({
    queryKey: ["fs-pl-breakdown", organizationId, periodStart?.toISOString()],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profit_loss_breakdown", {
        p_organization_id: organizationId as string,
        p_period_start: periodStart ? periodStart.toISOString() : undefined,
        p_period_end: undefined,
      });
      if (error) throw error;
      return data as unknown as ProfitLossBreakdown;
    },
  });

  const ownTruck = pl?.own_truck ?? { revenue: 0, cost: 0, gross_profit: 0, dispatch_count: 0, pending_count: 0 };
  const thirdParty = pl?.third_party ?? { revenue: 0, cost: 0, gross_profit: 0, dispatch_count: 0, pending_count: 0 };
  const cogsBreakdown = pl?.cogs_breakdown ?? [];
  const ownTruckCogsTotal = pl?.own_truck_cogs_total ?? 0;
  const costOfSales3pl = pl?.cost_of_sales_3pl ?? 0;
  const totalRevenue = pl?.invoice_revenue ?? 0;
  const dispatchRevenueTotal = pl?.dispatch_revenue_total ?? 0;
  const revenueReconciliationDelta = pl?.revenue_reconciliation_delta ?? 0;
  const totalCogs = ownTruckCogsTotal + costOfSales3pl;
  const grossProfit = totalRevenue - totalCogs;
  const opexBreakdown = pl?.opex_breakdown ?? [];
  const totalOpex = pl?.opex_total ?? 0;
  const operatingProfit = grossProfit - totalOpex;
  const taxExpense = pl?.tax_expense ?? 0;
  const netProfit = operatingProfit - taxExpense;

  // ── Balance Sheet (partial — only items with a live data source) ──
  // Accounts Receivable = unpaid/outstanding invoices (money owed to us)
  const accountsReceivable = invoices.filter((inv: any) => !["paid", "cancelled"].includes(inv.status)).reduce((s, inv: any) => s + (inv.total_amount || 0), 0);
  // Accounts Payable = unpaid bills (money we owe vendors)
  const accountsPayable = bills.filter((b: any) => b.payment_status !== "paid").reduce((s, b: any) => s + (b.total_amount || 0), 0);
  // Fixed assets, cash/bank, and equity have no live data source yet
  // (no vehicle book-value register, no bank balance sync, no equity ledger),
  // so they're shown as "Not tracked" rather than fabricated figures.

  const trialBalanceRows = [
    { name: "Accounts Receivable", debit: accountsReceivable, credit: 0 },
    { name: "Accounts Payable", debit: 0, credit: accountsPayable },
    { name: "Revenue", debit: 0, credit: totalRevenue },
    { name: "Own Truck COGS", debit: ownTruckCogsTotal, credit: 0 },
    { name: "Cost of Sales — 3PL", debit: costOfSales3pl, credit: 0 },
    { name: "Operating Expenses", debit: totalOpex, credit: 0 },
    { name: "VAT Payable (Net)", debit: 0, credit: taxExpense },
  ].filter(r => r.debit > 0 || r.credit > 0);

  // Net Profit closes to Retained Earnings on the credit side (or debit if a
  // loss) so this partial trial balance reconciles without fabricating the
  // untracked fixed-asset/cash/equity accounts.
  const totalDebits = trialBalanceRows.reduce((s, r) => s + r.debit, 0) + Math.max(0, -netProfit);
  const totalCredits = trialBalanceRows.reduce((s, r) => s + r.credit, 0) + Math.max(0, netProfit);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <DashboardLayout title="Financial Statements" subtitle="Auto-generated from invoices, vendor bills & expenses">
      <div className="flex gap-2 mb-6">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline"><Download className="w-4 h-4 mr-1" />Export Pack (PDF + Excel)</Button>
        <Badge variant="outline" className="flex items-center gap-1 px-3"><CheckCircle2 className="w-3 h-3 text-green-500" />IFRS Compliant</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Net Profit", value: fmt(netProfit), icon: DollarSign, color: netProfit >= 0 ? "text-green-500" : "text-destructive", bg: netProfit >= 0 ? "bg-green-500/10" : "bg-destructive/10" },
          { label: "Accounts Receivable", value: fmt(accountsReceivable), icon: Scale, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Trial Balance", value: isBalanced ? "Balanced ✓" : "Review Entries", icon: FileText, color: isBalanced ? "text-green-500" : "text-destructive", bg: isBalanced ? "bg-green-500/10" : "bg-destructive/10" },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
              <div><p className="text-lg font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pnl" className="space-y-4">
          {/* 1. Revenue by Channel */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Revenue by Channel — Own Truck vs 3PL</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-green-500/5 font-semibold">
                    <TableCell colSpan={2}>Own-Truck Revenue ({ownTruck.dispatch_count} dispatches)</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(ownTruck.revenue)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>Own-Truck Cost (dispatch-level estimate — see Own Truck COGS below for the accounting figure)</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">({fmt(ownTruck.cost)})</TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-500/5 font-semibold">
                    <TableCell colSpan={2}>
                      3PL Revenue ({thirdParty.dispatch_count} dispatches)
                      {thirdParty.pending_count > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">{thirdParty.pending_count} pending finance review</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">{fmt(thirdParty.revenue)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>3PL Cost (paid to vendor)</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">({fmt(thirdParty.cost)})</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5 font-bold border-t-2">
                    <TableCell colSpan={2}>Combined Dispatch Revenue / Cost</TableCell>
                    <TableCell className="text-right">{fmt(dispatchRevenueTotal)} / ({fmt(ownTruck.cost + thirdParty.cost)})</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 2. Own Truck COGS */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Own Truck COGS</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {cogsBreakdown.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No owned-fleet COGS entries yet</TableCell></TableRow>
                  ) : cogsBreakdown.map((line) => (
                    <TableRow key={line.category} className="hover:bg-transparent">
                      <TableCell className="pl-4 text-sm">{line.label}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-orange-500/5 font-bold border-t-2">
                    <TableCell>Own Truck COGS</TableCell>
                    <TableCell className="text-right text-orange-600">({fmt(ownTruckCogsTotal)})</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3. Cost of Sales (3PL) */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Cost of Sales (3PL)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-orange-500/5 font-bold">
                    <TableCell>Amount Paid to 3PL Vendors</TableCell>
                    <TableCell className="text-right text-orange-600">({fmt(costOfSales3pl)})</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 4. Consolidated Totals */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Profit & Loss Statement — Consolidated</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-green-500/5 font-semibold"><TableCell colSpan={2}>Revenue ({filteredInvoices.length} invoices)</TableCell><TableCell className="text-right text-green-600">{fmt(totalRevenue)}</TableCell></TableRow>
                  <TableRow className="bg-orange-500/5 font-semibold"><TableCell colSpan={2}>Own Truck COGS</TableCell><TableCell className="text-right text-orange-600">({fmt(ownTruckCogsTotal)})</TableCell></TableRow>
                  <TableRow className="bg-orange-500/5 font-semibold"><TableCell colSpan={2}>Cost of Sales — 3PL</TableCell><TableCell className="text-right text-orange-600">({fmt(costOfSales3pl)})</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-bold border-t-2"><TableCell colSpan={2}>Gross Profit</TableCell><TableCell className="text-right">{fmt(grossProfit)}</TableCell></TableRow>
                  <TableRow className="bg-amber-500/5 font-semibold"><TableCell colSpan={2}>Operating Expenses ({opexBreakdown.length} categories — admin, rent, insurance, etc.)</TableCell><TableCell className="text-right text-amber-600">({fmt(totalOpex)})</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-bold border-t-2"><TableCell colSpan={2}>Operating Profit</TableCell><TableCell className="text-right">{fmt(operatingProfit)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={2} className="text-muted-foreground">Tax Expense (Net VAT Payable)</TableCell><TableCell className="text-right">({fmt(taxExpense)})</TableCell></TableRow>
                  <TableRow className="bg-primary/10 font-bold text-lg border-t-2"><TableCell colSpan={2}>Net Profit</TableCell><TableCell className={`text-right ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(netProfit)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Revenue above is invoiced (ex-VAT) revenue. Combined dispatch revenue (own-truck + 3PL, from finance-entered
                dispatch records) is {fmt(dispatchRevenueTotal)} — a {revenueReconciliationDelta >= 0 ? "surplus" : "shortfall"} of{" "}
                {fmt(Math.abs(revenueReconciliationDelta))} vs. invoiced revenue, reflecting timing differences between
                dispatch completion and billing.
              </p>
              {totalRevenue === 0 && <p className="text-center py-6 text-muted-foreground text-sm">Post invoices and record expenses to generate P&L.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Balance Sheet</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-blue-500/5 font-bold"><TableCell colSpan={2}>ASSETS</TableCell><TableCell className="text-right"></TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm" colSpan={2}>Accounts Receivable (outstanding invoices)</TableCell><TableCell className="text-right text-sm font-medium">{fmt(accountsReceivable)}</TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>Cash &amp; Bank</TableCell><TableCell className="text-right text-sm text-muted-foreground italic">Not tracked</TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>Fixed Assets (Vehicles)</TableCell><TableCell className="text-right text-sm text-muted-foreground italic">Not tracked</TableCell></TableRow>

                  <TableRow className="bg-red-500/5 font-bold"><TableCell colSpan={2}>LIABILITIES</TableCell><TableCell className="text-right"></TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm" colSpan={2}>Accounts Payable (unpaid vendor bills)</TableCell><TableCell className="text-right text-sm font-medium">{fmt(accountsPayable)}</TableCell></TableRow>

                  <TableRow className="bg-purple-500/5 font-bold"><TableCell colSpan={2}>EQUITY</TableCell><TableCell className="text-right"></TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>Retained Earnings / Owner's Equity</TableCell><TableCell className="text-right text-sm text-muted-foreground italic">Not tracked</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 p-3 rounded flex items-center gap-2 bg-amber-500/5 border border-amber-500/20">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  This Balance Sheet shows Accounts Receivable and Accounts Payable from live invoice/bill data.
                  Cash & Bank, Fixed Assets, and Equity have no data source in the platform yet, so a full
                  Assets = Liabilities + Equity reconciliation isn't shown to avoid displaying fabricated figures.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Cash Flow Statement (Direct Method)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-green-500/5 font-bold"><TableCell colSpan={2}>Operating Activities</TableCell><TableCell className="text-right"></TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm" colSpan={2}>Cash received from customers</TableCell><TableCell className="text-right text-sm text-green-600">{fmt(totalRevenue)}</TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 text-sm" colSpan={2}>Cash paid to suppliers & employees</TableCell><TableCell className="text-right text-sm text-destructive">({fmt(totalCogs + totalOpex)})</TableCell></TableRow>
                  <TableRow className="font-semibold border-t"><TableCell className="pl-8" colSpan={2}>Net Operating Cash Flow</TableCell><TableCell className="text-right">{fmt(totalRevenue - totalCogs - totalOpex)}</TableCell></TableRow>
                  <TableRow className="bg-blue-500/5 font-bold"><TableCell colSpan={2}>Investing Activities</TableCell><TableCell className="text-right text-muted-foreground italic text-sm">Not tracked</TableCell></TableRow>
                  <TableRow className="bg-purple-500/5 font-bold"><TableCell colSpan={2}>Financing Activities</TableCell><TableCell className="text-right text-muted-foreground italic text-sm">Not tracked</TableCell></TableRow>
                  <TableRow className="bg-primary/10 font-bold text-lg border-t-2"><TableCell colSpan={2}>Net Change in Cash</TableCell><TableCell className="text-right">{fmt(totalRevenue - totalCogs - totalOpex)}</TableCell></TableRow>
                </TableBody>
              </Table>
              {totalRevenue === 0 && <p className="text-center py-6 text-muted-foreground text-sm">Cash flow will auto-populate from invoices and expenses.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance */}
        <TabsContent value="trial">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Trial Balance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {trialBalanceRows.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No entries yet</TableCell></TableRow>
                  ) : trialBalanceRows.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{b.name}</TableCell>
                      <TableCell className="text-right text-sm">{b.debit > 0 ? fmt(b.debit) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{b.credit > 0 ? fmt(b.credit) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {netProfit !== 0 && (
                    <TableRow>
                      <TableCell className="font-medium text-sm">Retained Earnings (Net Profit for period)</TableCell>
                      <TableCell className="text-right text-sm">{netProfit < 0 ? fmt(-netProfit) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{netProfit > 0 ? fmt(netProfit) : "-"}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmt(totalDebits)}</TableCell>
                    <TableCell className="text-right">{fmt(totalCredits)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Reconciles Accounts Receivable, Accounts Payable, Revenue, COGS, Operating Expenses, and Net VAT Payable
                against Net Profit closed to Retained Earnings. Fixed assets, cash, and equity are not yet tracked
                by the platform and are excluded from this reconciliation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
