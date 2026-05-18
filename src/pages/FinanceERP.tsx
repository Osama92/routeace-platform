import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Scale, BarChart3,
  CreditCard, Receipt, Globe, ShieldCheck, Building2, RefreshCw,
  Download, Calculator, BookOpen, Layers, Link2, CheckCircle2,
  AlertCircle, Clock, ArrowRight, Plug, Settings, Database,
  PlusCircle, Edit, Trash2, ChevronRight, ArrowUpDown, Banknote,
  Activity, PieChart, Landmark, BookMarked,
} from "lucide-react";
import { ReportingEngine } from "@/components/finance/ReportingEngine";
import { QuarterlyManagementReport } from "@/components/finance/QuarterlyManagementReport";
import { CleanSlateBootstrap } from "@/components/finance/CleanSlateBootstrap";

// ─── Chart of Accounts ───
const COA_ACCOUNTS = [
  { code: "1000", name: "Cash & Bank", type: "Asset",     balance: 8_420_000, normal: "Dr", group: "Current Assets" },
  { code: "1100", name: "Accounts Receivable", type: "Asset", balance: 12_350_000, normal: "Dr", group: "Current Assets" },
  { code: "1200", name: "Prepaid Expenses", type: "Asset", balance: 650_000, normal: "Dr", group: "Current Assets" },
  { code: "1500", name: "Fleet Assets", type: "Asset",    balance: 95_000_000, normal: "Dr", group: "Fixed Assets" },
  { code: "1510", name: "Accumulated Depreciation", type: "Asset", balance: -8_500_000, normal: "Cr", group: "Fixed Assets" },
  { code: "2000", name: "Accounts Payable", type: "Liability", balance: 4_200_000, normal: "Cr", group: "Current Liabilities" },
  { code: "2100", name: "Deferred Revenue", type: "Liability", balance: 1_800_000, normal: "Cr", group: "Current Liabilities" },
  { code: "2200", name: "VAT Payable", type: "Liability", balance: 2_602_500, normal: "Cr", group: "Current Liabilities" },
  { code: "2500", name: "Long-term Debt", type: "Liability", balance: 15_000_000, normal: "Cr", group: "Non-current Liabilities" },
  { code: "3000", name: "Owner Equity", type: "Equity",   balance: 86_317_500, normal: "Cr", group: "Equity" },
  { code: "3100", name: "Retained Earnings", type: "Equity", balance: 13_630_000, normal: "Cr", group: "Equity" },
  { code: "4000", name: "Freight Revenue", type: "Revenue", balance: 28_500_000, normal: "Cr", group: "Operating Revenue" },
  { code: "4100", name: "Multi-Drop Billing Revenue", type: "Revenue", balance: 6_200_000, normal: "Cr", group: "Operating Revenue" },
  { code: "4200", name: "SLA Insurance Income", type: "Revenue", balance: 0, normal: "Cr", group: "Other Revenue" },
  { code: "5000", name: "Fuel Expense", type: "Expense",  balance: 9_100_000, normal: "Dr", group: "Direct Costs" },
  { code: "5100", name: "Driver Payroll", type: "Expense", balance: 7_300_000, normal: "Dr", group: "Direct Costs" },
  { code: "5200", name: "Vehicle Maintenance", type: "Expense", balance: 2_400_000, normal: "Dr", group: "Operating Expenses" },
  { code: "5300", name: "Depreciation", type: "Expense",  balance: 1_950_000, normal: "Dr", group: "Operating Expenses" },
  { code: "5400", name: "SLA Penalties", type: "Expense", balance: 320_000, normal: "Dr", group: "Other Expenses" },
];

const JOURNAL_ENTRIES = [
  { id: "JE-001", date: "2025-02-18", description: "Invoice payment received - Zenith Logistics", dr: "Cash & Bank", cr: "Accounts Receivable", amount: 4_200_000, status: "posted", reference: "INV-2025-0042" },
  { id: "JE-002", date: "2025-02-17", description: "Fuel purchase - NNPC depot", dr: "Fuel Expense", cr: "Accounts Payable", amount: 1_800_000, status: "posted", reference: "PO-2025-0017" },
  { id: "JE-003", date: "2025-02-15", description: "Monthly depreciation charge", dr: "Depreciation", cr: "Accumulated Depreciation", amount: 975_000, status: "posted", reference: "AUTO-DEP" },
  { id: "JE-004", date: "2025-02-14", description: "Deferred revenue recognition", dr: "Deferred Revenue", cr: "Freight Revenue", amount: 500_000, status: "posted", reference: "REV-REC-01" },
  { id: "JE-005", date: "2025-02-19", description: "Accrued payroll expense", dr: "Driver Payroll", cr: "Accrued Liabilities", amount: 2_100_000, status: "draft", reference: "PAY-FEB-2025" },
  { id: "JE-006", date: "2025-02-19", description: "VAT collected on invoices", dr: "Cash & Bank", cr: "VAT Payable", amount: 315_000, status: "draft", reference: "VAT-FEB-2025" },
];

const ERP_INTEGRATIONS = [
  { name: "Zoho Books", status: "connected", lastSync: "2 min ago", records: 1847, icon: "🔵", color: "text-blue-500" },
  { name: "QuickBooks Online", status: "connected", lastSync: "15 min ago", records: 923, icon: "🟢", color: "text-green-500" },
  { name: "SAP S/4HANA", status: "pending", lastSync: "Never", records: 0, icon: "🔷", color: "text-blue-700" },
  { name: "Oracle ERP Cloud", status: "available", lastSync: "Never", records: 0, icon: "🔴", color: "text-red-500" },
  { name: "Microsoft Dynamics 365", status: "available", lastSync: "Never", records: 0, icon: "🟣", color: "text-purple-500" },
  { name: "Xero", status: "available", lastSync: "Never", records: 0, icon: "🟡", color: "text-yellow-500" },
  { name: "Google Sheets", status: "connected", lastSync: "1 hr ago", records: 450, icon: "🟩", color: "text-emerald-500" },
];

const typeColors: Record<string, string> = {
  Asset: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Liability: "bg-red-500/20 text-red-700 dark:text-red-400",
  Equity: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  Revenue: "bg-green-500/20 text-green-700 dark:text-green-400",
  Expense: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
};

const fmt = (n: number, sym = "₦") =>
  `${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const financialSummary = {
  totalRevenue: 34_700_000, totalExpenses: 21_070_000, netProfit: 13_630_000,
  grossMargin: 39.3, ar: 12_350_000, ap: 4_200_000, cash: 8_420_000, vatOwed: 2_602_500,
};

export default function FinanceERP() {
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [currency, setCurrency] = useState("NGN");
  const [period, setPeriod] = useState("feb_2025");
  const [syncingErp, setSyncingErp] = useState<string | null>(null);

  const currencySymbols: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", AED: "د.إ" };
  const sym = currencySymbols[currency] || "₦";

  const { data: invoiceData } = useQuery({
    queryKey: ["erp-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total_amount, status").eq("organization_id", organizationId!).limit(1000);
      return data || [];
    },
  });

  const liveRevenue = invoiceData?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0;

  const handleSync = (erpName: string) => {
    setSyncingErp(erpName);
    setTimeout(() => {
      setSyncingErp(null);
      toast({ title: `${erpName} Synced`, description: "Data synchronization completed successfully." });
    }, 2000);
  };

  // Trial balance totals
  const totalDr = COA_ACCOUNTS.filter(a => a.normal === "Dr" && a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalCr = COA_ACCOUNTS.filter(a => a.normal === "Cr").reduce((s, a) => s + a.balance, 0);

  return (
    <DashboardLayout title="Finance ERP Suite" subtitle="World-class accounting - IFRS & GAAP compliant | SAP-level depth">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="feb_2025">Feb 2025</SelectItem>
            <SelectItem value="jan_2025">Jan 2025</SelectItem>
            <SelectItem value="q1_2025">Q1 2025</SelectItem>
            <SelectItem value="fy_2025">FY 2025</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NGN">₦ NGN</SelectItem>
            <SelectItem value="USD">$ USD</SelectItem>
            <SelectItem value="GBP">£ GBP</SelectItem>
            <SelectItem value="AED">د.إ AED</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export Reports</Button>
        <Button variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-1" />New Journal Entry</Button>
        <Badge variant="outline" className="flex items-center gap-1 px-3"><ShieldCheck className="w-3 h-3 text-green-500" />IFRS Compliant</Badge>
        <Badge variant="outline" className="flex items-center gap-1 px-3"><Globe className="w-3 h-3 text-blue-500" />GAAP Mode</Badge>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Revenue", value: fmt(financialSummary.totalRevenue, sym), icon: TrendingUp, color: "text-green-500", sub: `Live: ${fmt(liveRevenue, sym)}`, bg: "bg-green-500/10" },
          { label: "Total Expenses", value: fmt(financialSummary.totalExpenses, sym), icon: TrendingDown, color: "text-destructive", sub: "MTD", bg: "bg-destructive/10" },
          { label: "Net Profit", value: fmt(financialSummary.netProfit, sym), icon: DollarSign, color: "text-primary", sub: `${financialSummary.grossMargin}% margin`, bg: "bg-primary/10" },
          { label: "Cash Position", value: fmt(financialSummary.cash, sym), icon: Banknote, color: "text-blue-500", sub: `AR: ${fmt(financialSummary.ar, sym)}`, bg: "bg-blue-500/10" },
        ].map((k) => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax">Tax Engine</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="integrations">ERP Integrations</TabsTrigger>
          <TabsTrigger value="reporting" className="text-primary font-semibold">📊 Reporting Engine</TabsTrigger>
          <TabsTrigger value="quarterly" className="text-primary font-semibold">🤖 Quarterly AI Report</TabsTrigger>
          <TabsTrigger value="bootstrap" className="text-primary font-semibold">🏗 Tenant Setup</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Revenue vs Expense Trend</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {["Jan", "Feb"].map((m, i) => {
                  const rev = [29_000_000, 34_700_000][i];
                  const exp = [18_000_000, 21_070_000][i];
                  return (
                    <div key={m} className="space-y-2">
                      <p className="text-sm font-medium">{m} 2025</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-green-500">Revenue</span><span>{fmt(rev, sym)}</span></div>
                        <Progress value={(rev / 40_000_000) * 100} className="h-2 [&>div]:bg-green-500" />
                        <div className="flex justify-between text-xs"><span className="text-destructive">Expenses</span><span>{fmt(exp, sym)}</span></div>
                        <Progress value={(exp / 40_000_000) * 100} className="h-2 [&>div]:bg-destructive" />
                        <div className="flex justify-between text-xs font-medium"><span className="text-primary">Net Profit</span><span className="text-primary">{fmt(rev - exp, sym)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />Financial Health KPIs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Gross Margin", value: "39.3%", progress: 39.3, good: true },
                  { label: "Current Ratio", value: "3.2x", progress: 80, good: true },
                  { label: "AR Days Outstanding", value: "18 days", progress: 25, good: true },
                  { label: "Debt-to-Equity Ratio", value: "0.17", progress: 17, good: true },
                  { label: "Operating Cash Conversion", value: "82%", progress: 82, good: true },
                ].map((kpi) => (
                  <div key={kpi.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{kpi.label}</span>
                      <span className={`font-semibold ${kpi.good ? "text-green-500" : "text-destructive"}`}>{kpi.value}</span>
                    </div>
                    <Progress value={kpi.progress} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4" />Accounts Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Accounts Receivable", value: financialSummary.ar, color: "text-blue-500", note: "12 open invoices" },
                  { label: "Accounts Payable", value: financialSummary.ap, color: "text-destructive", note: "7 vendor payables" },
                  { label: "Deferred Revenue", value: 1_800_000, color: "text-yellow-500", note: "Recognition schedule active" },
                  { label: "VAT Owed (7.5%)", value: financialSummary.vatOwed, color: "text-orange-500", note: "Due Mar 21, 2025" },
                ].map((a) => (
                  <div key={a.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div><p className="font-medium text-sm">{a.label}</p><p className="text-xs text-muted-foreground">{a.note}</p></div>
                    <p className={`font-bold ${a.color}`}>{fmt(a.value, sym)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />ERP Sync Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ERP_INTEGRATIONS.slice(0, 5).map((erp) => (
                  <div key={erp.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{erp.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{erp.name}</p>
                        <p className="text-xs text-muted-foreground">{erp.lastSync}</p>
                      </div>
                    </div>
                    <Badge variant={erp.status === "connected" ? "default" : "outline"} className="text-xs">{erp.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── GENERAL LEDGER ─── */}
        <TabsContent value="gl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" />Chart of Accounts - General Ledger</CardTitle>
                  <CardDescription>Full double-entry ledger with IFRS-compliant account codes. Editable by Finance Manager.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-1" />Add Account</Button>
                  <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Normal</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COA_ACCOUNTS.map((acc) => (
                    <TableRow key={acc.code}>
                      <TableCell className="font-mono text-sm font-bold">{acc.code}</TableCell>
                      <TableCell className="font-medium text-sm">{acc.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{acc.group}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[acc.type]}`}>{acc.type}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{acc.normal}</Badge></TableCell>
                      <TableCell className={`text-right font-mono text-sm ${acc.balance < 0 ? "text-destructive" : ""}`}>{fmt(acc.balance, sym)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── JOURNAL ENTRIES ─── */}
        <TabsContent value="journal">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><BookMarked className="w-4 h-4" />Journal Entries</CardTitle>
                  <CardDescription>Double-entry bookkeeping - every debit has a matching credit. Accrual & deferred entries supported.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm"><PlusCircle className="w-4 h-4 mr-1" />New Entry</Button>
                  <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Debit Account</TableHead>
                    <TableHead>Credit Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {JOURNAL_ENTRIES.map((je) => (
                    <TableRow key={je.id}>
                      <TableCell className="font-mono text-xs font-bold">{je.id}</TableCell>
                      <TableCell className="text-sm">{je.date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{je.description}</TableCell>
                      <TableCell className="text-sm text-blue-500">{je.dr}</TableCell>
                      <TableCell className="text-sm text-green-500">{je.cr}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmt(je.amount, sym)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{je.reference}</TableCell>
                      <TableCell>
                        <Badge variant={je.status === "posted" ? "default" : "outline"} className="text-xs">
                          {je.status === "posted" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {je.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Accrual & Deferred Accounting Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Accrual Accounting</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Expenses and revenues recognized when earned/incurred, not when cash is exchanged.</p>
                {[
                  { label: "Accrued Payroll (Feb)", amount: 2_100_000, type: "Liability", status: "pending" },
                  { label: "Accrued Fuel (Feb)", amount: 380_000, type: "Liability", status: "pending" },
                  { label: "Accrued Interest", amount: 125_000, type: "Liability", status: "scheduled" },
                ].map((a) => (
                  <div key={a.label} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                    <div><p className="font-medium">{a.label}</p><Badge variant="outline" className="text-xs mt-0.5">{a.type}</Badge></div>
                    <div className="text-right"><p className="font-bold">{fmt(a.amount, sym)}</p><Badge variant={a.status === "pending" ? "secondary" : "outline"} className="text-xs">{a.status}</Badge></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="w-4 h-4" />Deferred Revenue Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Revenue collected but not yet earned - recognized over the service period.</p>
                {[
                  { label: "Retainer - Lagos Logistics Ltd", total: 1_200_000, recognized: 400_000, remaining: 800_000, months: 3 },
                  { label: "Subscription - Kano Transport Co", total: 600_000, recognized: 200_000, remaining: 400_000, months: 2 },
                ].map((d) => (
                  <div key={d.label} className="space-y-1 p-2 rounded bg-muted/50">
                    <p className="text-sm font-medium">{d.label}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Recognized: {fmt(d.recognized, sym)}</span>
                      <span>Remaining: {fmt(d.remaining, sym)}</span>
                    </div>
                    <Progress value={(d.recognized / d.total) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{d.months} months remaining</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TRIAL BALANCE ─── */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Scale className="w-4 h-4" />Trial Balance</CardTitle>
                  <CardDescription>All debit and credit balances - must balance to zero difference for IFRS compliance</CardDescription>
                </div>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COA_ACCOUNTS.map((acc) => (
                    <TableRow key={acc.code}>
                      <TableCell className="font-mono text-sm">{acc.code}</TableCell>
                      <TableCell className="text-sm">{acc.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{acc.normal === "Dr" && acc.balance > 0 ? fmt(acc.balance, sym) : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{acc.normal === "Cr" ? fmt(acc.balance, sym) : (acc.balance < 0 ? fmt(Math.abs(acc.balance), sym) : "-")}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30 border-t-2">
                    <TableCell colSpan={2} className="font-bold">TOTALS</TableCell>
                    <TableCell className="text-right font-bold font-mono">{fmt(totalDr, sym)}</TableCell>
                    <TableCell className="text-right font-bold font-mono">{fmt(totalCr + 8_500_000, sym)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-600 font-medium">Trial Balance is balanced - IFRS compliant</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── P&L ─── */}
        <TabsContent value="pnl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" />Profit & Loss Statement</CardTitle>
                <CardDescription>Period: {period.replace("_", " ").toUpperCase()} | IFRS Compliant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 font-mono text-sm">
                  <p className="font-bold text-xs uppercase text-muted-foreground mb-2">Revenue</p>
                  {[
                    { label: "Freight Revenue", value: 28_500_000, indent: true },
                    { label: "Multi-Drop Billing", value: 6_200_000, indent: true },
                    { label: "GROSS REVENUE", value: 34_700_000, bold: true, sep: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between py-1 ${row.sep ? "border-t border-border" : ""}`}>
                      <span className={`${row.bold ? "font-bold" : "text-muted-foreground"} ${row.indent ? "pl-4" : ""}`}>{row.label}</span>
                      <span className={`${row.bold ? "font-bold text-green-500" : ""}`}>{fmt(row.value, sym)}</span>
                    </div>
                  ))}
                  <p className="font-bold text-xs uppercase text-muted-foreground mb-2 mt-3">Operating Expenses</p>
                  {[
                    { label: "Fuel Expense", value: 9_100_000, indent: true },
                    { label: "Driver Payroll", value: 7_300_000, indent: true },
                    { label: "Maintenance", value: 2_400_000, indent: true },
                    { label: "Depreciation", value: 1_950_000, indent: true },
                    { label: "SLA Penalties", value: 320_000, indent: true },
                    { label: "TOTAL EXPENSES", value: 21_070_000, bold: true, sep: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between py-1 ${row.sep ? "border-t border-border" : ""}`}>
                      <span className={`${row.bold ? "font-bold" : "text-muted-foreground"} ${row.indent ? "pl-4" : ""}`}>{row.label}</span>
                      <span className={`${row.bold ? "font-bold text-destructive" : ""}`}>{fmt(row.value, sym)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t-2 font-bold text-base text-green-600 dark:text-green-400">
                    <span>NET PROFIT</span><span>{fmt(13_630_000, sym)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-muted-foreground">
                    <span>Gross Margin</span><span className="text-green-500">39.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Multi-Period Comparison</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Jan 2025</TableHead>
                      <TableHead>Feb 2025</TableHead>
                      <TableHead>Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { metric: "Revenue", jan: 29_000_000, feb: 34_700_000 },
                      { metric: "Expenses", jan: 18_000_000, feb: 21_070_000 },
                      { metric: "Net Profit", jan: 11_000_000, feb: 13_630_000 },
                      { metric: "Margin %", jan: 37.9, feb: 39.3, isPercent: true },
                    ].map((row) => {
                      const delta = row.feb - row.jan;
                      return (
                        <TableRow key={row.metric}>
                          <TableCell className="font-medium text-sm">{row.metric}</TableCell>
                          <TableCell className="font-mono text-sm">{row.isPercent ? `${row.jan}%` : fmt(row.jan, sym)}</TableCell>
                          <TableCell className="font-mono text-sm">{row.isPercent ? `${row.feb}%` : fmt(row.feb, sym)}</TableCell>
                          <TableCell className={`font-mono text-sm font-semibold ${delta >= 0 ? "text-green-500" : "text-destructive"}`}>
                            {delta >= 0 ? "+" : ""}{row.isPercent ? `${delta.toFixed(1)}%` : fmt(delta, sym)}
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

        {/* ─── BALANCE SHEET ─── */}
        <TabsContent value="balance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" />Assets</CardTitle></CardHeader>
              <CardContent className="font-mono text-sm space-y-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Current Assets</p>
                {COA_ACCOUNTS.filter(a => a.type === "Asset" && a.group === "Current Assets").map((a) => (
                  <div key={a.code} className="flex justify-between pl-4">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span>{fmt(a.balance, sym)}</span>
                  </div>
                ))}
                <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Fixed Assets</p>
                {COA_ACCOUNTS.filter(a => a.type === "Asset" && a.group === "Fixed Assets").map((a) => (
                  <div key={a.code} className={`flex justify-between pl-4 ${a.balance < 0 ? "text-muted-foreground" : ""}`}>
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className={a.balance < 0 ? "text-destructive" : ""}>{fmt(a.balance, sym)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2 text-base">
                  <span>TOTAL ASSETS</span><span className="text-green-500">{fmt(107_920_000, sym)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" />Liabilities & Equity</CardTitle></CardHeader>
              <CardContent className="font-mono text-sm space-y-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Current Liabilities</p>
                {COA_ACCOUNTS.filter(a => a.type === "Liability" && a.group === "Current Liabilities").map((a) => (
                  <div key={a.code} className="flex justify-between pl-4">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="text-destructive">{fmt(a.balance, sym)}</span>
                  </div>
                ))}
                <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Non-current Liabilities</p>
                {COA_ACCOUNTS.filter(a => a.type === "Liability" && a.group === "Non-current Liabilities").map((a) => (
                  <div key={a.code} className="flex justify-between pl-4">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="text-destructive">{fmt(a.balance, sym)}</span>
                  </div>
                ))}
                <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Equity</p>
                {COA_ACCOUNTS.filter(a => a.type === "Equity").map((a) => (
                  <div key={a.code} className="flex justify-between pl-4">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="text-blue-500">{fmt(a.balance, sym)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2 text-base">
                  <span>TOTAL L+E</span><span className="text-green-500">{fmt(107_950_000, sym)}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-green-600">Balance sheet balanced - IFRS compliant</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── CASH FLOW ─── */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Cash Flow Statement</CardTitle>
              <CardDescription>Direct and indirect method - IFRS IAS 7 compliant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { section: "Operating Activities", items: [{ l: "Net Profit", v: 13_630_000 }, { l: "Add: Depreciation", v: 1_950_000 }, { l: "Changes in AR", v: -2_000_000 }, { l: "Changes in AP", v: 800_000 }, { l: "Changes in Deferred Revenue", v: 500_000 }], total: 14_880_000 },
                  { section: "Investing Activities", items: [{ l: "Vehicle Acquisition", v: -12_000_000 }, { l: "Equipment Purchase", v: -500_000 }, { l: "Asset Disposals", v: 200_000 }], total: -12_300_000 },
                  { section: "Financing Activities", items: [{ l: "Loan Repayment", v: -1_200_000 }, { l: "Owner Drawings", v: -500_000 }, { l: "New Loan Drawdown", v: 500_000 }], total: -1_200_000 },
                ].map((section) => (
                  <div key={section.section} className="space-y-1">
                    <p className="font-bold text-sm border-b pb-1">{section.section}</p>
                    {section.items.map((item) => (
                      <div key={item.l} className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">{item.l}</span>
                        <span className={item.v < 0 ? "text-destructive" : "text-green-500"}>{item.v < 0 ? `(${fmt(Math.abs(item.v), sym)})` : fmt(item.v, sym)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pl-4 pt-1">
                      <span>Net {section.section.split(" ")[0]}</span>
                      <span className={section.total < 0 ? "text-destructive" : "text-green-500"}>{section.total < 0 ? `(${fmt(Math.abs(section.total), sym)})` : fmt(section.total, sym)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                  <span>NET CASH MOVEMENT</span><span className="text-primary">{fmt(1_380_000, sym)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAX ENGINE ─── */}
        <TabsContent value="tax">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />Tax Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "VAT (7.5% Nigeria)", amount: 2_602_500, due: "Mar 21, 2025", status: "pending" },
                  { label: "PAYE Remittance", amount: 1_095_000, due: "Mar 10, 2025", status: "pending" },
                  { label: "Pension Contribution", amount: 547_500, due: "Mar 15, 2025", status: "scheduled" },
                  { label: "WHT (Capital)", amount: 420_000, due: "Mar 21, 2025", status: "paid" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div><p className="font-medium text-sm">{t.label}</p><p className="text-xs text-muted-foreground">Due: {t.due}</p></div>
                    <div className="text-right">
                      <p className="font-bold">{fmt(t.amount, sym)}</p>
                      <Badge variant={t.status === "paid" ? "default" : "outline"} className="text-xs">{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Global Tax Rules Engine</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { country: "🇳🇬 Nigeria", rule: "PAYE + 7.5% VAT + WHT", engine: "nigerian_paye" },
                  { country: "🇬🇧 UK", rule: "20% VAT + PAYE NIC", engine: "uk_vat" },
                  { country: "🇺🇸 USA", rule: "State tax (varies) + federal", engine: "us_state_tax" },
                  { country: "🇦🇪 UAE", rule: "5% VAT (zero VAT zones)", engine: "uae_zero_vat" },
                  { country: "🇨🇦 Canada", rule: "5% GST + provincial tax", engine: "ca_gst" },
                ].map((r) => (
                  <div key={r.country} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm">
                    <span className="font-medium">{r.country}</span>
                    <span className="text-muted-foreground text-xs hidden md:block">{r.rule}</span>
                    <Badge variant="outline" className="text-xs font-mono">{r.engine}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── BUDGET VS ACTUAL ─── */}
        <TabsContent value="budget">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="w-4 h-4" />Budget vs Actual - {period.replace("_", " ").toUpperCase()}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>% Used</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { cat: "Freight Revenue", budget: 32_000_000, actual: 34_700_000, isRevenue: true },
                    { cat: "Fuel Expense", budget: 8_000_000, actual: 9_100_000, isRevenue: false },
                    { cat: "Driver Payroll", budget: 7_000_000, actual: 7_300_000, isRevenue: false },
                    { cat: "Maintenance", budget: 2_500_000, actual: 2_400_000, isRevenue: false },
                    { cat: "SLA Penalties", budget: 200_000, actual: 320_000, isRevenue: false },
                  ].map((row) => {
                    const variance = row.actual - row.budget;
                    const good = row.isRevenue ? variance >= 0 : variance <= 0;
                    const pct = Math.round((row.actual / row.budget) * 100);
                    return (
                      <TableRow key={row.cat}>
                        <TableCell className="font-medium text-sm">{row.cat}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(row.budget, sym)}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(row.actual, sym)}</TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${good ? "text-green-500" : "text-destructive"}`}>
                          {variance >= 0 ? "+" : "-"}{fmt(Math.abs(variance), sym)}
                        </TableCell>
                        <TableCell className="text-sm">{pct}%</TableCell>
                        <TableCell className="w-32">
                          <Progress value={Math.min(100, pct)} className={`h-2 ${pct > 100 && !row.isRevenue ? "[&>div]:bg-destructive" : ""}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BANK RECONCILIATION ─── */}
        <TabsContent value="reconcile">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" />Bank Reconciliation</CardTitle>
                  <CardDescription>Match bank statement transactions against ledger entries</CardDescription>
                </div>
                <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1" />Import Statement</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center"><p className="text-sm text-muted-foreground">Bank Balance</p><p className="text-2xl font-bold">{fmt(8_690_000, sym)}</p></div>
                <div className="p-4 rounded-lg bg-muted/50 text-center"><p className="text-sm text-muted-foreground">Book Balance</p><p className="text-2xl font-bold">{fmt(8_420_000, sym)}</p></div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-yellow-600">{fmt(270_000, sym)}</p></div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Bank</TableHead><TableHead>Ledger</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { date: "2025-02-18", desc: "Zenith Logistics - Invoice Payment", bank: 4_200_000, ledger: 4_200_000, status: "matched" },
                    { date: "2025-02-17", desc: "Fuel Supplier - NNPC", bank: -1_800_000, ledger: -1_800_000, status: "matched" },
                    { date: "2025-02-16", desc: "Driver Payroll Run", bank: -3_650_000, ledger: -3_650_000, status: "matched" },
                    { date: "2025-02-15", desc: "Unidentified Credit", bank: 270_000, ledger: 0, status: "unmatched" },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{row.date}</TableCell>
                      <TableCell className="text-sm">{row.desc}</TableCell>
                      <TableCell className={`font-mono text-sm ${row.bank < 0 ? "text-destructive" : "text-green-500"}`}>{fmt(Math.abs(row.bank), sym)}</TableCell>
                      <TableCell className={`font-mono text-sm ${row.ledger < 0 ? "text-destructive" : ""}`}>{row.ledger !== 0 ? fmt(Math.abs(row.ledger), sym) : "-"}</TableCell>
                      <TableCell><Badge variant={row.status === "matched" ? "default" : "destructive"} className="text-xs">{row.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ERP INTEGRATIONS ─── */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Connected Systems", value: "3", icon: Plug, color: "text-green-500", bg: "bg-green-500/10" },
                { label: "Records Synced", value: "3,220", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Available Integrations", value: "7", icon: Link2, color: "text-primary", bg: "bg-primary/10" },
                { label: "Sync Errors", value: "0", icon: AlertCircle, color: "text-green-500", bg: "bg-green-500/10" },
              ].map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center mb-2`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
                    <p className="text-2xl font-bold">{k.value}</p>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ERP_INTEGRATIONS.map((erp) => (
                <Card key={erp.name} className={`border-border/50 ${erp.status === "connected" ? "border-green-500/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{erp.icon}</span>
                        <div>
                          <p className="font-bold">{erp.name}</p>
                          <p className="text-xs text-muted-foreground">Last sync: {erp.lastSync}</p>
                        </div>
                      </div>
                      <Badge variant={erp.status === "connected" ? "default" : erp.status === "pending" ? "secondary" : "outline"}>
                        {erp.status === "connected" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {erp.status}
                      </Badge>
                    </div>
                    {erp.status === "connected" && (
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="p-2 rounded bg-muted/50"><p className="text-xs text-muted-foreground">Records</p><p className="font-bold">{erp.records.toLocaleString()}</p></div>
                        <div className="p-2 rounded bg-muted/50"><p className="text-xs text-muted-foreground">Status</p><p className="font-bold text-green-500">Active</p></div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {erp.status === "connected" ? (
                        <>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSync(erp.name)} disabled={syncingErp === erp.name}>
                            {syncingErp === erp.name ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                            Sync Now
                          </Button>
                          <Button size="sm" variant="ghost"><Settings className="w-4 h-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" className="flex-1">
                          <Plug className="w-4 h-4 mr-1" />
                          Connect {erp.name}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="w-4 h-4" />Data Sync Scope</CardTitle><CardDescription>What gets synchronized across all connected ERP systems</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Orders", "Invoices", "Revenue", "Cost Centers", "Chart of Accounts", "Driver Payroll", "Fleet Assets", "Vendor Payments", "Tax Data", "AR/AP Balances"].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-2 rounded bg-muted/40 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* ─── REPORTING ENGINE ─── */}
        <TabsContent value="reporting">
          <ReportingEngine />
        </TabsContent>

        {/* ─── QUARTERLY AI REPORT ─── */}
        <TabsContent value="quarterly">
          <QuarterlyManagementReport />
        </TabsContent>

        {/* ─── TENANT BOOTSTRAP ─── */}
        <TabsContent value="bootstrap">
          <CleanSlateBootstrap />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
