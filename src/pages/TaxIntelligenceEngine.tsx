import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calculator, FileText, Shield, TrendingUp, AlertTriangle,
  CheckCircle, Download, Info, Building2, Percent, DollarSign,
  ArrowRight, Landmark, BookOpen, Zap, Lock
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { useRegion } from "@/contexts/RegionContext";
import { format, startOfMonth, subMonths, endOfMonth } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WHTCategory {
  service: string;
  recipient: string;
  whtRate: number;
  creditNote: boolean;
  firsRef: string;
}

interface CITProjection {
  quarter: string;
  revenue: number;
  deductibleExpenses: number;
  taxableProfit: number;
  citPayable: number;
  whtCreditApplied: number;
  netCIT: number;
}

interface VATEntry {
  period: string;
  outputVAT: number;
  inputVAT: number;
  netPayable: number;
  status: "paid" | "due" | "pending";
}

interface LegalOptimization {
  title: string;
  category: string;
  estimatedSaving: number;
  complexity: "low" | "medium" | "high";
  framework: string;
  description: string;
  checklist: string[];
  disclaimer: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const WHT_CATEGORIES_NG: WHTCategory[] = [
  { service: "Freight / Haulage", recipient: "Company", whtRate: 5, creditNote: true, firsRef: "CITA S.78" },
  { service: "Management Fee", recipient: "Company", whtRate: 10, creditNote: true, firsRef: "CITA S.78" },
  { service: "Technical / Consulting", recipient: "Company", whtRate: 10, creditNote: true, firsRef: "CITA S.78" },
  { service: "Rent / Lease", recipient: "Company", whtRate: 10, creditNote: true, firsRef: "CITA S.78" },
  { service: "Dividend", recipient: "Company", whtRate: 10, creditNote: false, firsRef: "CITA S.80" },
  { service: "Interest", recipient: "Company", whtRate: 10, creditNote: false, firsRef: "CITA S.79" },
  { service: "Royalties", recipient: "Company", whtRate: 10, creditNote: false, firsRef: "CITA S.81" },
  { service: "Director Fees", recipient: "Individual", whtRate: 10, creditNote: false, firsRef: "CITA S.82" },
];

const CIT_PROJECTIONS: CITProjection[] = [
  { quarter: "Q1 2025", revenue: 34_700_000, deductibleExpenses: 24_900_000, taxableProfit: 9_800_000, citPayable: 2_940_000, whtCreditApplied: 480_000, netCIT: 2_460_000 },
  { quarter: "Q2 2025", revenue: 41_200_000, deductibleExpenses: 28_400_000, taxableProfit: 12_800_000, citPayable: 3_840_000, whtCreditApplied: 620_000, netCIT: 3_220_000 },
  { quarter: "Q3 2025", revenue: 48_900_000, deductibleExpenses: 33_100_000, taxableProfit: 15_800_000, citPayable: 4_740_000, whtCreditApplied: 740_000, netCIT: 4_000_000 },
  { quarter: "Q4 2025", revenue: 52_400_000, deductibleExpenses: 35_900_000, taxableProfit: 16_500_000, citPayable: 4_950_000, whtCreditApplied: 810_000, netCIT: 4_140_000 },
];

// VAT data is now fetched from real invoices + expenses via useRealVATLedger hook
function useRealVATLedger() {
  return useQuery({
    queryKey: ["real-vat-ledger"],
    queryFn: async () => {
      const now = new Date();
      const months: VATEntry[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const periodLabel = format(monthStart, "MMM yyyy");

        const [invoicesRes, expensesRes] = await Promise.all([
          supabase.from("invoices").select("tax_amount").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()).not("status", "eq", "cancelled"),
          supabase.from("expenses").select("amount").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
        ]);

        const outputVAT = (invoicesRes.data || []).reduce((s, inv) => s + Number(inv.tax_amount || 0), 0);
        // Estimate input VAT at 7.5% of expenses (recoverable portion)
        const totalExpenses = (expensesRes.data || []).reduce((s, exp) => s + Number(exp.amount || 0), 0);
        const inputVAT = Math.round(totalExpenses * 0.075);
        const netPayable = outputVAT - inputVAT;
        
        const isPast = monthEnd < now;
        const isCurrent = monthStart <= now && monthEnd >= now;
        const status: "paid" | "due" | "pending" = isPast ? "paid" : isCurrent ? "due" : "pending";

        months.push({ period: periodLabel, outputVAT, inputVAT, netPayable, status });
      }
      return months;
    },
  });
}

const LEGAL_OPTIMIZATIONS: LegalOptimization[] = [
  {
    title: "Capital Allowance Structuring",
    category: "Asset Depreciation",
    estimatedSaving: 1_200_000,
    complexity: "low",
    framework: "CITA Section 27 & 3rd Schedule",
    description: "Fleet vehicles qualify for Initial Allowance (95%) in year 1 under Nigerian tax law, substantially reducing taxable profit in the acquisition year.",
    checklist: ["Vehicle purchase invoices", "Asset register update", "FIRS Capital Allowance Form", "Auditor sign-off"],
    disclaimer: true,
  },
  {
    title: "WHT Credit Offset Against CIT",
    category: "Tax Credit Utilization",
    estimatedSaving: 640_000,
    complexity: "low",
    framework: "CITA Section 78 & FIRS WHT Regulations",
    description: "All WHT deducted by customers (5%) on freight income is fully creditable against your annual CIT liability. Unclaimed credits accumulate for up to 5 years.",
    checklist: ["WHT credit notes from each customer", "FIRS Credit Note Form WHT 01", "Annual CIT return (Form C.O.2)", "Bank statements corroborating deductions"],
    disclaimer: true,
  },
  {
    title: "Investment Tax Credit - Pioneer Status",
    category: "Government Incentive",
    estimatedSaving: 4_200_000,
    complexity: "high",
    framework: "NIPC Act + CITA Section 25",
    description: "Logistics companies operating in pioneer industries (infrastructure) may qualify for 3–5 year tax holiday under NIPC Pioneer Status. Application to NIPC required.",
    checklist: ["NIPC Pioneer Status application", "Proof of sector eligibility", "Capital investment schedule (min ₦10M)", "Projected employment numbers", "Legal opinion letter"],
    disclaimer: true,
  },
  {
    title: "Export Processing Zone Incentive",
    category: "Trade Incentive",
    estimatedSaving: 2_800_000,
    complexity: "high",
    framework: "NEPZA Act + CITA Exemption",
    description: "Freight services rendered for exports through NEPZA-designated zones are exempt from CIT and VAT. Requires NEPZA operator license.",
    checklist: ["NEPZA zone registration", "Export documentation per NESS", "Certificate of export for each consignment", "Annual NEPZA audit compliance"],
    disclaimer: true,
  },
  {
    title: "Double Taxation Treaty Leverage",
    category: "Cross-Border Optimization",
    estimatedSaving: 980_000,
    complexity: "medium",
    framework: "Nigeria's DTAs with UK, UAE, South Africa",
    description: "WHT on cross-border service payments (management fees, royalties) may be reduced from 10% to 5–7.5% under applicable double taxation agreements.",
    checklist: ["Certificate of tax residence from foreign authority", "DTA relief application to FIRS", "Transaction documentation showing cross-border nature", "Legal opinion from tax counsel"],
    disclaimer: true,
  },
];

const COMPLEXITY_COLOR = { low: "text-emerald-600", medium: "text-amber-600", high: "text-destructive" };
const COMPLEXITY_BG = { low: "bg-emerald-500/10", medium: "bg-amber-500/10", high: "bg-destructive/10" };
const PIE_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#6366f1", "#ef4444"];

const fmt = (n: number) => `₦${n.toLocaleString()}`;

// ─── WHT Calculator ─────────────────────────────────────────────────────────────

function WHTCalculator() {
  const [amount, setAmount] = useState(1000000);
  const [category, setCategory] = useState("Freight / Haulage");

  const selectedCat = WHT_CATEGORIES_NG.find(c => c.service === category) ?? WHT_CATEGORIES_NG[0];
  const whtAmount = amount * (selectedCat.whtRate / 100);
  const netPayable = amount - whtAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Calculator className="w-4 h-4 text-primary" /> WHT Calculator</CardTitle>
        <CardDescription>Compute withholding tax deduction and credit note value</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Service Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHT_CATEGORIES_NG.map(c => (
                  <SelectItem key={c.service} value={c.service} className="text-xs">{c.service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Amount (₦)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">WHT Rate</span>
            <span className="font-bold">{selectedCat.whtRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">WHT Deducted</span>
            <span className="font-bold text-destructive">({fmt(whtAmount)})</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Net Payable to Vendor</span>
            <span className="font-bold text-primary">{fmt(netPayable)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit Note Eligible</span>
            <span className={`font-semibold ${selectedCat.creditNote ? "text-emerald-600" : "text-muted-foreground"}`}>
              {selectedCat.creditNote ? "✓ Yes" : "✗ No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">FIRS Reference</span>
            <span className="font-mono text-xs text-muted-foreground">{selectedCat.firsRef}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          ⚠️ WHT credit notes received from customers are creditable against your annual CIT liability. Ensure you collect and retain all WHT credit notes.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── CIT Projection Chart ────────────────────────────────────────────────────────

function CITProjectionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-primary" /> CIT Liability Forecast (2025)</CardTitle>
        <CardDescription>Quarterly CIT projection with WHT credit offsets - Nigeria 30% CIT rate</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={CIT_PROJECTIONS}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `₦${(v / 1e6).toFixed(1)}M`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              formatter={(v: number) => fmt(v)}
            />
            <Bar dataKey="citPayable" name="Gross CIT" fill="hsl(var(--primary))" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
            <Bar dataKey="whtCreditApplied" name="WHT Credit" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="netCIT" name="Net CIT Due" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Total Gross CIT</div>
            <div className="font-bold">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.citPayable, 0))}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <div className="text-xs text-muted-foreground">WHT Credits Saved</div>
            <div className="font-bold text-emerald-600">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.whtCreditApplied, 0))}</div>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <div className="text-xs text-muted-foreground">Net CIT Payable</div>
            <div className="font-bold text-primary">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.netCIT, 0))}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── VAT Ledger ──────────────────────────────────────────────────────────────────

function VATLedger({ data }: { data: VATEntry[] }) {
  const totalOutput = data.reduce((a, v) => a + v.outputVAT, 0);
  const totalInput = data.reduce((a, v) => a + v.inputVAT, 0);
  const totalNet = data.reduce((a, v) => a + v.netPayable, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No VAT data yet. VAT will populate automatically from invoices and expenses.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Percent className="w-4 h-4 text-primary" /> VAT Ledger - Live Data</CardTitle>
        <CardDescription>Output VAT from invoices · Input VAT estimated at 7.5% of expenses · FIRS filing due 21st each month</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Output VAT (Collected)</TableHead>
              <TableHead className="text-right">Input VAT (Recoverable)</TableHead>
              <TableHead className="text-right">Net VAT Payable</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(v => (
              <TableRow key={v.period}>
                <TableCell className="font-medium text-sm">{v.period}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(v.outputVAT)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-emerald-600">({fmt(v.inputVAT)})</TableCell>
                <TableCell className="text-right font-bold">{fmt(v.netPayable)}</TableCell>
                <TableCell>
                  <Badge className={
                    v.status === "paid" ? "bg-emerald-500/20 text-emerald-700 text-xs" :
                    v.status === "due" ? "bg-destructive/20 text-destructive text-xs" :
                    "bg-muted text-muted-foreground text-xs"
                  }>{v.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="grid grid-cols-3 gap-3 p-4 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total Output VAT</div>
            <div className="font-bold">{fmt(totalOutput)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total Input VAT (Saved)</div>
            <div className="font-bold text-emerald-600">({fmt(totalInput)})</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Net VAT Remitted</div>
            <div className="font-bold text-primary">{fmt(totalNet)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Legal Optimization Panel ────────────────────────────────────────────────────

function LegalOptimizationPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const totalPotentialSaving = LEGAL_OPTIMIZATIONS.reduce((a, o) => a + o.estimatedSaving, 0);

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Landmark className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">Legal Framework Optimization Engine</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Identifies legitimate, fully-compliant tax optimization strategies under Nigerian and international law. 
              Estimated total potential saving: <span className="font-bold text-primary">{fmt(totalPotentialSaving)}/year</span>
            </div>
          </div>
          <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">COMPLIANT</Badge>
        </CardContent>
      </Card>

      {LEGAL_OPTIMIZATIONS.map(opt => (
        <Card key={opt.title} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-semibold text-sm">{opt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.framework}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`text-xs ${COMPLEXITY_BG[opt.complexity]} ${COMPLEXITY_COLOR[opt.complexity]}`}>
                  {opt.complexity} complexity
                </Badge>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Est. Saving</div>
                  <div className="font-bold text-emerald-600 text-sm">{fmt(opt.estimatedSaving)}</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{opt.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{opt.category}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setExpanded(expanded === opt.title ? null : opt.title)}
              >
                {expanded === opt.title ? "Collapse" : "View Checklist"}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {expanded === opt.title && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Documentation Checklist
                </div>
                {opt.checklist.map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
                {opt.disclaimer && (
                  <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    <strong>Disclaimer:</strong> This represents a legally permissible optimization strategy under current Nigerian tax law. Consult a qualified tax advisor before implementation. Tax laws are subject to change. RouteAce makes no representation as to the specific tax liability outcomes.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── WHT Rate Table ─────────────────────────────────────────────────────────────

function WHTRateTable() {
  const accumulated = WHT_CATEGORIES_NG.reduce((a, c) => a + (c.whtRate * 200000), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4 text-primary" /> Nigerian WHT Rate Schedule</CardTitle>
        <CardDescription>Per CITA and Finance Act amendments - effective January 2024</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service / Payment Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="text-center">WHT Rate</TableHead>
              <TableHead className="text-center">Credit Note</TableHead>
              <TableHead>FIRS Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WHT_CATEGORIES_NG.map(c => (
              <TableRow key={c.service}>
                <TableCell className="font-medium text-sm">{c.service}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.recipient}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono text-xs">{c.whtRate}%</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {c.creditNote
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                    : <span className="text-xs text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.firsRef}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <strong>Credit Accumulation:</strong> WHT credit notes are valid for 5 years. Unutilized credits can be carried forward and applied against future CIT returns.
            Always issue a WHT credit note to vendors within 30 days of deduction.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function TaxIntelligenceEngine() {
  const { isNGMode } = useRegion();
  const [activeTab, setActiveTab] = useState("vat");
  const { data: vatData = [], isLoading: vatLoading } = useRealVATLedger();

  const isNG = isNGMode;

  // KPIs - computed from real VAT data where available
  const totalWHTCredits = 2_650_000;
  const pendingVAT = vatData.filter(v => v.status === "due").reduce((a, v) => a + v.netPayable, 0);
  const annualCITNet = CIT_PROJECTIONS.reduce((a, q) => a + q.netCIT, 0);
  const optimizationOpportunity = LEGAL_OPTIMIZATIONS.reduce((a, o) => a + o.estimatedSaving, 0);

  return (
    <DashboardLayout
      title="Tax Intelligence Engine"
      subtitle="VAT Ledger · WHT Automation · CIT Projection · Legal Framework Optimizer"
    >
      {/* Region notice */}
      {!isNG && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-muted-foreground">Displaying Nigerian tax modules. Switch region to load country-specific tax rules for your Global corridor.</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "WHT Credits Accumulated", value: fmt(totalWHTCredits), icon: Percent, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "VAT Due This Month", value: fmt(pendingVAT), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Net CIT Payable (FY 2025)", value: fmt(annualCITNet), icon: Building2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Optimization Opportunity", value: fmt(optimizationOpportunity), icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="vat">VAT Ledger</TabsTrigger>
          <TabsTrigger value="wht">WHT Engine</TabsTrigger>
          <TabsTrigger value="cit">CIT Projection</TabsTrigger>
          <TabsTrigger value="optimize">Legal Optimizer</TabsTrigger>
          <TabsTrigger value="filing">Filing Summary</TabsTrigger>
        </TabsList>

        {/* VAT LEDGER */}
        <TabsContent value="vat" className="space-y-4">
          {vatLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading VAT data...</CardContent></Card>
          ) : (
            <>
              <VATLedger data={vatData} />
              {vatData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">VAT Trend (₦)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={vatData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `₦${(v / 1e6).toFixed(1)}M`} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmt(v)} />
                        <Area type="monotone" dataKey="outputVAT" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Output VAT" strokeWidth={2} />
                        <Area type="monotone" dataKey="inputVAT" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Input VAT" strokeWidth={2} />
                        <Area type="monotone" dataKey="netPayable" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} name="Net Payable" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* WHT ENGINE */}
        <TabsContent value="wht" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WHTCalculator />
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> WHT Credits Accumulated
                </CardTitle>
                <CardDescription>Credits receivable from customers - creditable against CIT</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { customer: "DANGOTE GROUP", wht: 210_000, creditRef: "WHT-2025-001", status: "received" },
                    { customer: "MTN NIGERIA", wht: 105_000, creditRef: "WHT-2025-002", status: "received" },
                    { customer: "NESTLE NG", wht: 78_000, creditRef: "WHT-2025-003", status: "pending" },
                    { customer: "TOYOTA (NG)", wht: 49_000, creditRef: "WHT-2025-004", status: "pending" },
                  ].map(c => (
                    <div key={c.customer} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                      <div>
                        <div className="font-medium text-sm">{c.customer}</div>
                        <div className="font-mono text-xs text-muted-foreground">{c.creditRef}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">{fmt(c.wht)}</div>
                        <Badge className={c.status === "received" ? "bg-emerald-500/20 text-emerald-700 text-xs" : "bg-muted text-muted-foreground text-xs"}>
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <WHTRateTable />
        </TabsContent>

        {/* CIT PROJECTION */}
        <TabsContent value="cit" className="space-y-4">
          <CITProjectionChart />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quarterly CIT Breakdown</CardTitle>
              <CardDescription>30% CIT rate on taxable profit after allowable deductions and WHT credits</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Deductibles</TableHead>
                    <TableHead className="text-right">Taxable Profit</TableHead>
                    <TableHead className="text-right">Gross CIT (30%)</TableHead>
                    <TableHead className="text-right">WHT Credit</TableHead>
                    <TableHead className="text-right">Net CIT Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CIT_PROJECTIONS.map(q => (
                    <TableRow key={q.quarter}>
                      <TableCell className="font-medium text-sm">{q.quarter}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(q.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">({fmt(q.deductibleExpenses)})</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(q.taxableProfit)}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(q.citPayable)}</TableCell>
                      <TableCell className="text-right text-emerald-600">({fmt(q.whtCreditApplied)})</TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(q.netCIT)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold bg-muted/20">
                    <TableCell>Full Year 2025</TableCell>
                    <TableCell className="text-right">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.revenue, 0))}</TableCell>
                    <TableCell className="text-right text-emerald-600">({fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.deductibleExpenses, 0))})</TableCell>
                    <TableCell className="text-right">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.taxableProfit, 0))}</TableCell>
                    <TableCell className="text-right">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.citPayable, 0))}</TableCell>
                    <TableCell className="text-right text-emerald-600">({fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.whtCreditApplied, 0))})</TableCell>
                    <TableCell className="text-right text-primary">{fmt(CIT_PROJECTIONS.reduce((a, q) => a + q.netCIT, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEGAL OPTIMIZER */}
        <TabsContent value="optimize">
          <LegalOptimizationPanel />
        </TabsContent>

        {/* FILING SUMMARY */}
        <TabsContent value="filing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Annual Filing Calendar</CardTitle>
                <CardDescription>Nigerian FIRS deadlines for 2025</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Monthly VAT Returns", deadline: "21st of following month", authority: "FIRS", status: "ongoing" },
                  { label: "Monthly WHT Remittance", deadline: "21st of following month", authority: "FIRS", status: "ongoing" },
                  { label: "Annual PAYE (H1 Return)", deadline: "31 January 2025", authority: "FIRS / SBIR", status: "done" },
                  { label: "Annual CIT Return (Full Yr)", deadline: "30 June 2025", authority: "FIRS", status: "upcoming" },
                  { label: "Pension Contribution", deadline: "7th of following month", authority: "PenCom", status: "ongoing" },
                  { label: "Annual NSITF Return", deadline: "31 March 2025", authority: "NSITF", status: "upcoming" },
                  { label: "Transfer Pricing Return", deadline: "30 June 2025", authority: "FIRS", status: "upcoming" },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <div className="font-medium text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.deadline} - {f.authority}</div>
                    </div>
                    <Badge className={
                      f.status === "done" ? "bg-emerald-500/20 text-emerald-700 text-xs" :
                      f.status === "ongoing" ? "bg-primary/20 text-primary text-xs" :
                      "bg-amber-500/20 text-amber-700 text-xs"
                    }>{f.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Tax Liability Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "CIT (Net)", value: 13_820_000 },
                        { name: "VAT (Net)", value: 9_317_500 },
                        { name: "PAYE", value: 4_380_000 },
                        { name: "WHT Remitted", value: 2_450_000 },
                        { name: "Pension", value: 876_000 },
                      ]}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    >
                      {PIE_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {[
                    { name: "CIT (Net)", value: 13_820_000 },
                    { name: "VAT (Net)", value: 9_317_500 },
                    { name: "PAYE", value: 4_380_000 },
                    { name: "WHT Remitted", value: 2_450_000 },
                    { name: "Pension", value: 876_000 },
                  ].map((item, i) => (
                    <div key={item.name} className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" size="sm" variant="outline">
                  <Download className="w-3 h-3 mr-1.5" /> Export Annual Tax Summary (PDF)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
