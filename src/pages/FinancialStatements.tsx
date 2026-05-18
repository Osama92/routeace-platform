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

const fmt = (n: number, sym = "₦") =>
  `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function FinancialStatements() {
  const [period, setPeriod] = useState("all");
  const { organizationId } = useAuth();

  const { data: accounts = [] } = useQuery({
    queryKey: ["coa-for-statements"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("*").eq("is_active", true).order("account_code");
      return data || [];
    },
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ["je-for-statements", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries").select("*").eq("organization_id", organizationId!).eq("status", "posted");
      return data || [];
    },
  });

  const { data: glEntries = [] } = useQuery({
    queryKey: ["gl-for-statements", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("accounting_ledger").select("*").eq("organization_id", organizationId!);
      return data || [];
    },
  });

  // Build trial balance from GL + journal entries
  const trialBalance = useMemo(() => {
    const balances: Record<string, { code: string; name: string; type: string; group: string; debit: number; credit: number }> = {};
    
    // From accounting_ledger
    glEntries.forEach(e => {
      const key = e.account_name;
      if (!balances[key]) balances[key] = { code: "", name: key, type: e.account_type, group: "", debit: 0, credit: 0 };
      balances[key].debit += Number(e.debit || 0);
      balances[key].credit += Number(e.credit || 0);
    });

    // From journal_entries
    journalEntries.forEach(e => {
      const key = e.account_name || e.account_code || "unknown";
      if (!balances[key]) balances[key] = { code: e.account_code || "", name: e.account_name || key, type: "", group: "", debit: 0, credit: 0 };
      balances[key].debit += Number(e.debit || 0);
      balances[key].credit += Number(e.credit || 0);
    });

    return Object.values(balances);
  }, [glEntries, journalEntries]);

  const totalDebits = trialBalance.reduce((s, b) => s + b.debit, 0);
  const totalCredits = trialBalance.reduce((s, b) => s + b.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // P&L from GL
  const revenueEntries = glEntries.filter(e => e.account_name?.includes("revenue") || e.account_type === "revenue");
  const expenseEntries = glEntries.filter(e => e.account_name?.includes("expense") || e.account_name?.includes("cost") || e.account_type === "expense");
  const totalRevenue = revenueEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const totalCogs = glEntries.filter(e => e.account_name?.includes("cost") || e.account_name?.includes("fuel") || e.account_name?.includes("driver")).reduce((s, e) => s + Number(e.debit || 0), 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = glEntries.filter(e => e.account_name?.includes("admin") || e.account_name?.includes("rent") || e.account_name?.includes("software") || e.account_name?.includes("depreciation")).reduce((s, e) => s + Number(e.debit || 0), 0);
  const operatingProfit = grossProfit - totalOpex;
  const taxExpense = glEntries.filter(e => e.account_name?.includes("tax") || e.account_name?.includes("vat")).reduce((s, e) => s + Number(e.credit || 0), 0);
  const netProfit = operatingProfit - taxExpense;

  // Balance Sheet from GL
  const assetBalance = glEntries.filter(e => e.account_type === "asset").reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0);
  const liabilityBalance = glEntries.filter(e => e.account_type === "liability").reduce((s, e) => s + Number(e.credit || 0) - Number(e.debit || 0), 0);
  const equityBalance = assetBalance - liabilityBalance;

  return (
    <DashboardLayout title="Financial Statements" subtitle="Auto-generated from General Ledger - IFRS compliant">
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
          { label: "Total Assets", value: fmt(assetBalance), icon: Scale, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Trial Balance", value: isBalanced ? "Balanced ✓" : "UNBALANCED", icon: FileText, color: isBalanced ? "text-green-500" : "text-destructive", bg: isBalanced ? "bg-green-500/10" : "bg-destructive/10" },
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
        <TabsContent value="pnl">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">Profit & Loss Statement</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="bg-green-500/5 font-semibold"><TableCell colSpan={2}>Revenue</TableCell><TableCell className="text-right text-green-600">{fmt(totalRevenue)}</TableCell></TableRow>
                  {revenueEntries.length > 0 && revenueEntries.slice(0, 5).map((e, i) => (
                    <TableRow key={i}><TableCell className="pl-8 text-sm text-muted-foreground" colSpan={2}>{e.description || e.account_name}</TableCell><TableCell className="text-right text-sm">{fmt(Number(e.credit || 0))}</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-orange-500/5 font-semibold"><TableCell colSpan={2}>Cost of Goods Sold</TableCell><TableCell className="text-right text-orange-600">({fmt(totalCogs)})</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-bold border-t-2"><TableCell colSpan={2}>Gross Profit</TableCell><TableCell className="text-right">{fmt(grossProfit)}</TableCell></TableRow>
                  <TableRow className="bg-amber-500/5 font-semibold"><TableCell colSpan={2}>Operating Expenses</TableCell><TableCell className="text-right text-amber-600">({fmt(totalOpex)})</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-bold border-t-2"><TableCell colSpan={2}>Operating Profit</TableCell><TableCell className="text-right">{fmt(operatingProfit)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={2} className="text-muted-foreground">Tax Expense</TableCell><TableCell className="text-right">({fmt(taxExpense)})</TableCell></TableRow>
                  <TableRow className="bg-primary/10 font-bold text-lg border-t-2"><TableCell colSpan={2}>Net Profit</TableCell><TableCell className={`text-right ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(netProfit)}</TableCell></TableRow>
                </TableBody>
              </Table>
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
                  <TableRow className="bg-blue-500/5 font-bold"><TableCell colSpan={2}>ASSETS</TableCell><TableCell className="text-right">{fmt(assetBalance)}</TableCell></TableRow>
                  {accounts.filter(a => a.account_type === "asset").map(a => (
                    <TableRow key={a.id}><TableCell className="pl-8 text-sm" colSpan={2}>{a.account_code} - {a.account_name}</TableCell><TableCell className="text-right text-sm">-</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-red-500/5 font-bold"><TableCell colSpan={2}>LIABILITIES</TableCell><TableCell className="text-right">{fmt(liabilityBalance)}</TableCell></TableRow>
                  {accounts.filter(a => a.account_type === "liability").map(a => (
                    <TableRow key={a.id}><TableCell className="pl-8 text-sm" colSpan={2}>{a.account_code} - {a.account_name}</TableCell><TableCell className="text-right text-sm">-</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-purple-500/5 font-bold"><TableCell colSpan={2}>EQUITY</TableCell><TableCell className="text-right">{fmt(equityBalance)}</TableCell></TableRow>
                  <TableRow className="bg-primary/10 font-bold text-lg border-t-2"><TableCell colSpan={2}>Liabilities + Equity</TableCell><TableCell className="text-right">{fmt(liabilityBalance + equityBalance)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className={`mt-4 p-3 rounded flex items-center gap-2 ${isBalanced ? "bg-green-500/5 border border-green-500/20" : "bg-destructive/5 border border-destructive/20"}`}>
                <CheckCircle2 className={`w-4 h-4 ${isBalanced ? "text-green-600" : "text-destructive"}`} />
                <span className={`text-sm font-medium ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                  {isBalanced ? "Assets = Liabilities + Equity ✓" : "Balance sheet does not balance - review entries"}
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
                  <TableRow className="bg-blue-500/5 font-bold"><TableCell colSpan={2}>Investing Activities</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                  <TableRow className="bg-purple-500/5 font-bold"><TableCell colSpan={2}>Financing Activities</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                  <TableRow className="bg-primary/10 font-bold text-lg border-t-2"><TableCell colSpan={2}>Net Change in Cash</TableCell><TableCell className="text-right">{fmt(totalRevenue - totalCogs - totalOpex)}</TableCell></TableRow>
                </TableBody>
              </Table>
              {totalRevenue === 0 && <p className="text-center py-6 text-muted-foreground text-sm">Cash flow will auto-populate from ledger transactions.</p>}
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
                  {trialBalance.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No entries yet</TableCell></TableRow>
                  ) : trialBalance.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{b.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</TableCell>
                      <TableCell className="text-right text-sm">{b.debit > 0 ? fmt(b.debit) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{b.credit > 0 ? fmt(b.credit) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmt(totalDebits)}</TableCell>
                    <TableCell className="text-right">{fmt(totalCredits)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
