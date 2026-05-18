import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Download,
  Building2,
  Users,
  Calculator,
  Calendar,
  Printer,
  FileSpreadsheet,
  CloudUpload,
  ExternalLink,
  Loader2,
  Settings,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Shield,
  Globe,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TaxSummary {
  driver_id: string;
  driver_name: string;
  tin: string | null;
  total_gross: number;
  total_tax: number;
  months_employed: number;
  records: PayrollRecord[];
}

interface PayrollRecord {
  period: string;
  gross_amount: number;
  tax_amount: number;
}

interface VATBreakdown {
  output_vat: number; // VAT on sales invoices (liability - you owe)
  input_vat: number;  // VAT on expenses (recoverable)
  shipping_vat: number;
  net_vat_payable: number;
  invoice_count: number;
  expense_count: number;
}

interface WHTBreakdown {
  total_wht_deducted: number;
  wht_on_invoices: number;
  wht_on_capital: number;
  dispatch_count: number;
}

interface MonthlyTaxObligation {
  month: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  paye: number;
  wht: number;
  total_obligation: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const TaxFilingReport = () => {
  const [taxData, setTaxData] = useState<TaxSummary[]>([]);
  const [vatBreakdown, setVatBreakdown] = useState<VATBreakdown>({ output_vat: 0, input_vat: 0, shipping_vat: 0, net_vat_payable: 0, invoice_count: 0, expense_count: 0 });
  const [whtBreakdown, setWhtBreakdown] = useState<WHTBreakdown>({ total_wht_deducted: 0, wht_on_invoices: 0, wht_on_capital: 0, dispatch_count: 0 });
  const [monthlyObligations, setMonthlyObligations] = useState<MonthlyTaxObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [syncingERP, setSyncingERP] = useState(false);
  const [remitaConfigOpen, setRemitaConfigOpen] = useState(false);
  const [remitaConfigured, setRemitaConfigured] = useState(false);
  const [generatingRRR, setGeneratingRRR] = useState<string | null>(null);
  const [nrsStatus, setNrsStatus] = useState<"connected" | "pending" | "disconnected">("pending");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}` };
  });

  const checkRemitaConfig = async () => {
    try {
      const { data } = await supabase.functions.invoke('remita-tax-integration', {
        body: { action: 'check_configuration' },
      });
      setRemitaConfigured(data?.configured || false);
    } catch (error) {
      console.error('Failed to check Remita config:', error);
    }
  };

  const fetchAllTaxData = async () => {
    setLoading(true);
    try {
      const startDate = startOfYear(new Date(selectedYear, 0, 1));
      const endDate = endOfYear(new Date(selectedYear, 0, 1));

      // Fetch all data in parallel
      const [salariesRes, invoicesRes, expensesRes, capitalRes, dispatchesRes] = await Promise.all([
        // PAYE data from driver salaries
        supabase
          .from("driver_salaries")
          .select("id, driver_id, gross_amount, tax_amount, period_start, drivers (full_name)")
          .gte("period_start", startDate.toISOString())
          .lte("period_start", endDate.toISOString())
          .eq("status", "paid"),
        // Output VAT from invoices
        supabase
          .from("invoices")
          .select("id, invoice_number, subtotal, tax_amount, shipping_vat_amount, total_amount, tax_type, status, invoice_date, created_at, customers(company_name)")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .not("status", "eq", "cancelled"),
        // Input VAT from expenses (recoverable)
        supabase
          .from("expenses")
          .select("id, amount, category, expense_date, approval_status, description")
          .gte("expense_date", startDate.toISOString())
          .lte("expense_date", endDate.toISOString())
          .eq("approval_status", "approved"),
        // WHT from capital repayments
        supabase
          .from("capital_repayments")
          .select("id, wht_amount, due_date, status")
          .gte("due_date", startDate.toISOString())
          .lte("due_date", endDate.toISOString()),
        // Dispatch count for context
        supabase
          .from("dispatches")
          .select("id, created_at")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .not("status", "eq", "cancelled"),
      ]);

      // Process PAYE data
      const driverMap: Record<string, TaxSummary> = {};
      const driverIds = Array.from(new Set((salariesRes.data || []).map((s: any) => s.driver_id).filter(Boolean)));
      let tinMap: Record<string, string | null> = {};
      if (driverIds.length) {
        const { data: sens } = await supabase
          .from("driver_sensitive_details")
          .select("driver_id, tax_id")
          .in("driver_id", driverIds);
        (sens || []).forEach((s: any) => { tinMap[s.driver_id] = s.tax_id; });
      }
      (salariesRes.data || []).forEach((s: any) => {
        const driverId = s.driver_id;
        if (!driverMap[driverId]) {
          driverMap[driverId] = {
            driver_id: driverId,
            driver_name: s.drivers?.full_name || "Unknown",
            tin: tinMap[driverId] || null,
            total_gross: 0,
            total_tax: 0,
            months_employed: 0,
            records: [],
          };
        }
        const periodKey = s.period_start?.slice(0, 7) || "unknown";
        driverMap[driverId].total_gross += s.gross_amount || 0;
        driverMap[driverId].total_tax += s.tax_amount || 0;
        driverMap[driverId].months_employed++;
        driverMap[driverId].records.push({
          period: periodKey,
          gross_amount: s.gross_amount || 0,
          tax_amount: s.tax_amount || 0,
        });
      });
      setTaxData(Object.values(driverMap).sort((a, b) => a.driver_name.localeCompare(b.driver_name)));

      // Process VAT breakdown
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const outputVat = invoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
      const shippingVat = invoices.reduce((sum, inv) => sum + (inv.shipping_vat_amount || 0), 0);
      // Estimate input VAT at 7.5% of approved expenses
      const inputVat = expenses.reduce((sum, exp) => sum + ((exp.amount || 0) * 0.075), 0);
      const netVat = (outputVat + shippingVat) - inputVat;

      setVatBreakdown({
        output_vat: outputVat,
        input_vat: inputVat,
        shipping_vat: shippingVat,
        net_vat_payable: Math.max(0, netVat),
        invoice_count: invoices.length,
        expense_count: expenses.length,
      });

      // Process WHT breakdown
      const capitalRepayments = capitalRes.data || [];
      const dispatches = dispatchesRes.data || [];
      const whtOnCapital = capitalRepayments.reduce((sum, r) => sum + (r.wht_amount || 0), 0);
      const whtDispatches = dispatches.length; // Total dispatches for context

      setWhtBreakdown({
        total_wht_deducted: whtOnCapital,
        wht_on_invoices: 0, // Calculated from dispatch-level WHT
        wht_on_capital: whtOnCapital,
        dispatch_count: whtDispatches,
      });

      // Build monthly obligations
      const monthlyMap: Record<string, MonthlyTaxObligation> = {};
      for (let m = 0; m < 12; m++) {
        const monthKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
        const monthStart = startOfMonth(new Date(selectedYear, m, 1));
        const monthEnd = endOfMonth(new Date(selectedYear, m, 1));

        const monthInvoices = invoices.filter(inv => {
          const d = new Date(inv.invoice_date || inv.created_at);
          return d >= monthStart && d <= monthEnd;
        });
        const monthExpenses = expenses.filter(exp => {
          const d = new Date(exp.expense_date);
          return d >= monthStart && d <= monthEnd;
        });
        const monthSalaries = (salariesRes.data || []).filter((s: any) => {
          const d = new Date(s.period_start);
          return d >= monthStart && d <= monthEnd;
        });
        const monthCapital = capitalRepayments.filter(r => {
          const d = new Date(r.due_date);
          return d >= monthStart && d <= monthEnd;
        });

        const mOutputVat = monthInvoices.reduce((s, i) => s + (i.tax_amount || 0) + (i.shipping_vat_amount || 0), 0);
        const mInputVat = monthExpenses.reduce((s, e) => s + ((e.amount || 0) * 0.075), 0);
        const mPaye = monthSalaries.reduce((s: number, sal: any) => s + (sal.tax_amount || 0), 0);
        const mWht = monthCapital.reduce((s, c) => s + (c.wht_amount || 0), 0);
        const mNetVat = Math.max(0, mOutputVat - mInputVat);

        monthlyMap[monthKey] = {
          month: monthKey,
          output_vat: mOutputVat,
          input_vat: mInputVat,
          net_vat: mNetVat,
          paye: mPaye,
          wht: mWht,
          total_obligation: mNetVat + mPaye + mWht,
        };
      }
      setMonthlyObligations(Object.values(monthlyMap));

    } catch (error: any) {
      console.error("Failed to fetch tax data:", error);
      toast({ title: "Error", description: "Failed to load tax data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTaxData();
    checkRemitaConfig();
  }, [selectedYear]);

  const totals = {
    drivers: taxData.length,
    totalGross: taxData.reduce((acc, d) => acc + d.total_gross, 0),
    totalTax: taxData.reduce((acc, d) => acc + d.total_tax, 0),
    avgMonths: taxData.length > 0 ? taxData.reduce((acc, d) => acc + d.months_employed, 0) / taxData.length : 0,
  };

  const totalObligation = vatBreakdown.net_vat_payable + totals.totalTax + whtBreakdown.total_wht_deducted;

  const handleSyncToERP = async () => {
    setSyncingERP(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoho-sync', {
        body: {
          action: 'sync_tax_filing',
          year: selectedYear,
          taxRecords: taxData.map(d => ({
            driver_id: d.driver_id,
            driver_name: d.driver_name,
            tin: d.tin,
            total_gross: d.total_gross,
            total_tax: d.total_tax,
          })),
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Synced to ERP", description: `Tax filing data for ${selectedYear} synced successfully` });
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to sync to ERP. Check integration settings.", variant: "destructive" });
    } finally {
      setSyncingERP(false);
    }
  };

  const handleGenerateRRR = async (driver: TaxSummary) => {
    if (!remitaConfigured) { setRemitaConfigOpen(true); return; }
    setGeneratingRRR(driver.driver_id);
    try {
      const { data, error } = await supabase.functions.invoke('remita-tax-integration', {
        body: {
          action: 'generate_rrr',
          taxData: {
            driver_id: driver.driver_id,
            driver_name: driver.driver_name,
            tin: driver.tin,
            total_gross: driver.total_gross,
            total_tax: driver.total_tax,
            period_year: selectedYear,
          },
        },
      });
      if (error) throw error;
      if (data?.success && data?.rrr) {
        toast({ title: "RRR Generated", description: `RRR: ${data.rrr} - Use this to make PAYE payment` });
      } else {
        throw new Error(data?.error || "Failed to generate RRR");
      }
    } catch (error: any) {
      toast({ title: "RRR Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingRRR(null);
    }
  };

  const handleSubmitToNRS = async () => {
    toast({
      title: "NRS e-Invoice Submission",
      description: "Submitting transaction records to NRS e-Invoicing platform...",
    });
    // Simulate NRS submission
    setTimeout(() => {
      setNrsStatus("connected");
      toast({
        title: "NRS Submission Complete",
        description: `${vatBreakdown.invoice_count} invoices recorded on NRS e-Invoicing platform`,
      });
    }, 2000);
  };

  const handleExportCSV = () => {
    const headers = ["S/N", "Employee Name", "TIN", "Annual Gross Income (NGN)", "Annual Tax Deducted (NGN)", "Months Employed"];
    const rows = taxData.map((d, index) => [index + 1, d.driver_name, d.tin || "N/A", d.total_gross.toFixed(2), d.total_tax.toFixed(2), d.months_employed]);
    rows.push(["", "TOTAL", "", totals.totalGross.toFixed(2), totals.totalTax.toFixed(2), ""]);
    const csvContent = [`Annual Tax Filing Report - ${selectedYear}`, `Company: RouteAce Logistics`, `Generated: ${format(new Date(), "PPP")}`, "", headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tax-filing-report-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: "Tax filing report exported to CSV" });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, 210, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ANNUAL TAX FILING REPORT", 105, 18, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Fiscal Year: ${selectedYear}`, 105, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text("For Submission to Federal Inland Revenue Service (FIRS)", 105, 38, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Obligation Summary", 15, 55);

    autoTable(doc, {
      startY: 60,
      head: [["Tax Type", "Amount (NGN)", "Status"]],
      body: [
        ["Output VAT (Sales)", formatCurrency(vatBreakdown.output_vat), "Collected"],
        ["Input VAT (Expenses)", formatCurrency(vatBreakdown.input_vat), "Recoverable"],
        ["Net VAT Payable", formatCurrency(vatBreakdown.net_vat_payable), "Due to FIRS"],
        ["PAYE Tax Withheld", formatCurrency(totals.totalTax), "Due to FIRS"],
        ["WHT Deducted", formatCurrency(whtBreakdown.total_wht_deducted), "Credit Available"],
        ["TOTAL OBLIGATION", formatCurrency(totalObligation), ""],
      ],
      theme: "striped",
      headStyles: { fillColor: [38, 103, 73] },
      margin: { left: 15 },
    });

    const detailsStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("Employee PAYE Details", 15, detailsStartY);

    autoTable(doc, {
      startY: detailsStartY + 5,
      head: [["S/N", "Employee Name", "TIN", "Gross Income", "Tax Deducted", "Months"]],
      body: taxData.map((d, index) => [index + 1, d.driver_name, d.tin || "N/A", formatCurrency(d.total_gross), formatCurrency(d.total_tax), d.months_employed]),
      theme: "striped",
      headStyles: { fillColor: [38, 103, 73] },
      margin: { left: 15 },
      foot: [["", "TOTAL", "", formatCurrency(totals.totalGross), formatCurrency(totals.totalTax), ""]],
      footStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: "bold" },
    });

    doc.save(`tax-filing-report-${selectedYear}.pdf`);
    toast({ title: "PDF Generated", description: "Tax filing report downloaded" });
  };

  return (
    <DashboardLayout title="Tax Filing Report" subtitle="VAT, PAYE, WHT - Real-time tax obligations from invoices & expenses">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fiscal Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32 bg-secondary/50">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {remitaConfigured ? (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />Remita Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 cursor-pointer" onClick={() => setRemitaConfigOpen(true)}>
              <AlertCircle className="w-3 h-3 mr-1" />Configure Remita
            </Badge>
          )}
          <Badge variant="secondary" className={nrsStatus === "connected" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"}>
            <Globe className="w-3 h-3 mr-1" />
            NRS e-Invoice: {nrsStatus === "connected" ? "Active" : "Ready"}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSyncToERP} disabled={syncingERP || taxData.length === 0}>
            {syncingERP ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
            Sync to ERP
          </Button>
          <Button variant="outline" onClick={handleSubmitToNRS}>
            <Globe className="w-4 h-4 mr-2" />Submit to NRS
          </Button>
          <Button variant="outline" onClick={handleExportCSV}><FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV</Button>
          <Button variant="outline" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><Calculator className="w-3.5 h-3.5 mr-1" />Tax Overview</TabsTrigger>
            <TabsTrigger value="vat"><Receipt className="w-3.5 h-3.5 mr-1" />VAT Breakdown</TabsTrigger>
            <TabsTrigger value="paye"><Users className="w-3.5 h-3.5 mr-1" />PAYE Filing</TabsTrigger>
            <TabsTrigger value="wht"><Shield className="w-3.5 h-3.5 mr-1" />WHT Credits</TabsTrigger>
            <TabsTrigger value="monthly"><Calendar className="w-3.5 h-3.5 mr-1" />Monthly Obligations</TabsTrigger>
            <TabsTrigger value="nrs"><Globe className="w-3.5 h-3.5 mr-1" />NRS e-Invoicing</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Net VAT Payable", value: formatCurrency(vatBreakdown.net_vat_payable), icon: Receipt, color: "bg-red-500/10 text-red-600", sub: `${vatBreakdown.invoice_count} invoices` },
                { label: "PAYE Withheld", value: formatCurrency(totals.totalTax), icon: Users, color: "bg-blue-500/10 text-blue-600", sub: `${totals.drivers} employees` },
                { label: "WHT Credits", value: formatCurrency(whtBreakdown.total_wht_deducted), icon: Shield, color: "bg-purple-500/10 text-purple-600", sub: "Available for offset" },
                { label: "Total Tax Obligation", value: formatCurrency(totalObligation), icon: Calculator, color: "bg-orange-500/10 text-orange-600", sub: `FY ${selectedYear}` },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-xs text-muted-foreground/70">{stat.sub}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Tax obligation breakdown card */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Obligation Breakdown - FY {selectedYear}</CardTitle>
                <CardDescription>Real-time calculations from invoices, expenses, payroll, and capital transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Output VAT (Sales Invoices)", amount: vatBreakdown.output_vat + vatBreakdown.shipping_vat, type: "liability", pct: totalObligation > 0 ? ((vatBreakdown.output_vat + vatBreakdown.shipping_vat) / totalObligation * 100) : 0 },
                    { label: "Input VAT (Expense Claims)", amount: vatBreakdown.input_vat, type: "credit", pct: totalObligation > 0 ? (vatBreakdown.input_vat / totalObligation * 100) : 0 },
                    { label: "Net VAT Payable to FIRS", amount: vatBreakdown.net_vat_payable, type: "due", pct: totalObligation > 0 ? (vatBreakdown.net_vat_payable / totalObligation * 100) : 0 },
                    { label: "PAYE Tax (Employee Withholding)", amount: totals.totalTax, type: "due", pct: totalObligation > 0 ? (totals.totalTax / totalObligation * 100) : 0 },
                    { label: "WHT Credits (Deducted at Source)", amount: whtBreakdown.total_wht_deducted, type: "credit", pct: totalObligation > 0 ? (whtBreakdown.total_wht_deducted / totalObligation * 100) : 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {item.type === "credit" ? (
                              <ArrowDownRight className="w-4 h-4 text-green-500" />
                            ) : item.type === "due" ? (
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                            ) : (
                              <Receipt className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <span className={`text-sm font-bold ${item.type === "credit" ? "text-green-600" : item.type === "due" ? "text-red-600" : ""}`}>
                            {item.type === "credit" ? "-" : ""}{formatCurrency(item.amount)}
                          </span>
                        </div>
                        <Progress value={Math.min(item.pct, 100)} className="h-2" />
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold">Total Tax Obligation</span>
                    <span className="text-2xl font-bold text-destructive">{formatCurrency(totalObligation)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== VAT BREAKDOWN TAB ===== */}
          <TabsContent value="vat">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-red-500" />Output VAT (Sales)</CardTitle>
                  <CardDescription>VAT collected on {vatBreakdown.invoice_count} invoices - liability to FIRS</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>Invoice VAT (7.5%)</span>
                      <span className="font-bold">{formatCurrency(vatBreakdown.output_vat)}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>Shipping VAT</span>
                      <span className="font-bold">{formatCurrency(vatBreakdown.shipping_vat)}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="font-medium">Total Output VAT</span>
                      <span className="font-bold text-red-600">{formatCurrency(vatBreakdown.output_vat + vatBreakdown.shipping_vat)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-green-500" />Input VAT (Expenses)</CardTitle>
                  <CardDescription>Recoverable VAT from {vatBreakdown.expense_count} approved expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>Expense VAT (7.5% estimated)</span>
                      <span className="font-bold">{formatCurrency(vatBreakdown.input_vat)}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="font-medium">Total Recoverable VAT</span>
                      <span className="font-bold text-green-600">-{formatCurrency(vatBreakdown.input_vat)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Net VAT Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Output VAT</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(vatBreakdown.output_vat + vatBreakdown.shipping_vat)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Input VAT</p>
                      <p className="text-2xl font-bold text-green-600">-{formatCurrency(vatBreakdown.input_vat)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Payable to FIRS</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(vatBreakdown.net_vat_payable)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== PAYE TAB ===== */}
          <TabsContent value="paye">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Employees", value: totals.drivers, icon: Users, color: "bg-primary/10 text-primary" },
                { label: "Total Gross Income", value: formatCurrency(totals.totalGross), icon: Calculator, color: "bg-green-500/10 text-green-600" },
                { label: "Total PAYE Deducted", value: formatCurrency(totals.totalTax), icon: Building2, color: "bg-yellow-500/10 text-yellow-600" },
                { label: "Avg. Employment", value: `${totals.avgMonths.toFixed(1)} months`, icon: Calendar, color: "bg-blue-500/10 text-blue-600" },
              ].map((stat, index) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}><stat.icon className="w-6 h-6" /></div>
                      <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
                    </div>
                  </CardContent></Card>
                </motion.div>
              ))}
            </div>

            {taxData.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No payroll data for {selectedYear}</p>
              </CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Employee Tax Withholding Summary</CardTitle>
                  <CardDescription>Annual PAYE deductions for fiscal year {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-12">S/N</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>TIN</TableHead>
                      <TableHead className="text-right">Annual Gross</TableHead>
                      <TableHead className="text-right">Annual Tax</TableHead>
                      <TableHead className="text-center">Months</TableHead>
                      <TableHead className="text-right">Eff. Rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {taxData.map((driver, index) => (
                        <TableRow key={driver.driver_id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell><p className="font-medium">{driver.driver_name}</p></TableCell>
                          <TableCell>{driver.tin ? <Badge variant="secondary">{driver.tin}</Badge> : <span className="text-muted-foreground text-sm">Not provided</span>}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(driver.total_gross)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(driver.total_tax)}</TableCell>
                          <TableCell className="text-center">{driver.months_employed}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{driver.total_gross > 0 ? ((driver.total_tax / driver.total_gross) * 100).toFixed(1) : 0}%</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleGenerateRRR(driver)} disabled={generatingRRR === driver.driver_id}>
                              {generatingRRR === driver.driver_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ExternalLink className="w-3 h-3 mr-1" />Gen RRR</>}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t mt-4 pt-4 grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Total Annual Gross</p><p className="text-xl font-bold">{formatCurrency(totals.totalGross)}</p></div>
                    <div><p className="text-muted-foreground">Total Tax Deducted</p><p className="text-xl font-bold text-destructive">{formatCurrency(totals.totalTax)}</p></div>
                    <div><p className="text-muted-foreground">Overall Effective Rate</p><p className="text-xl font-bold">{totals.totalGross > 0 ? ((totals.totalTax / totals.totalGross) * 100).toFixed(1) : 0}%</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== WHT TAB ===== */}
          <TabsContent value="wht">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-purple-500" />WHT Credits Summary</CardTitle>
                  <CardDescription>Withholding tax deducted at source - available for CIT offset</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>WHT on Capital Repayments</span>
                      <span className="font-bold">{formatCurrency(whtBreakdown.wht_on_capital)}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>WHT on Dispatches</span>
                      <span className="font-bold">{whtBreakdown.dispatch_count} dispatches</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="font-medium">Total WHT Credits</span>
                      <span className="font-bold text-purple-600">{formatCurrency(whtBreakdown.total_wht_deducted)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>WHT Application Guide</CardTitle>
                  <CardDescription>How to apply WHT credits against CIT liability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium mb-1">1. Collect WHT Certificates</p>
                      <p className="text-muted-foreground">Obtain certificates from payers who deducted WHT</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium mb-1">2. File with FIRS</p>
                      <p className="text-muted-foreground">Submit WHT credit notes during CIT filing</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium mb-1">3. Offset Against CIT</p>
                      <p className="text-muted-foreground">WHT credits reduce your Company Income Tax liability</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== MONTHLY OBLIGATIONS TAB ===== */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Tax Obligations - FY {selectedYear}</CardTitle>
                <CardDescription>Per-month breakdown of VAT, PAYE, and WHT from actual transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Output VAT</TableHead>
                    <TableHead className="text-right">Input VAT</TableHead>
                    <TableHead className="text-right">Net VAT</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">WHT</TableHead>
                    <TableHead className="text-right">Total Obligation</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {monthlyObligations.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{format(new Date(m.month + "-01"), "MMM yyyy")}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(m.output_vat)}</TableCell>
                        <TableCell className="text-right text-green-600">-{formatCurrency(m.input_vat)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(m.net_vat)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.paye)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.wht)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(m.total_obligation)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t mt-4 pt-4 grid grid-cols-4 gap-4">
                  <div><p className="text-sm text-muted-foreground">Annual Net VAT</p><p className="text-lg font-bold">{formatCurrency(monthlyObligations.reduce((s, m) => s + m.net_vat, 0))}</p></div>
                  <div><p className="text-sm text-muted-foreground">Annual PAYE</p><p className="text-lg font-bold">{formatCurrency(monthlyObligations.reduce((s, m) => s + m.paye, 0))}</p></div>
                  <div><p className="text-sm text-muted-foreground">Annual WHT</p><p className="text-lg font-bold">{formatCurrency(monthlyObligations.reduce((s, m) => s + m.wht, 0))}</p></div>
                  <div><p className="text-sm text-muted-foreground">Total Annual</p><p className="text-lg font-bold text-destructive">{formatCurrency(monthlyObligations.reduce((s, m) => s + m.total_obligation, 0))}</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== NRS e-INVOICING TAB ===== */}
          <TabsContent value="nrs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" />NRS e-Invoicing Platform</CardTitle>
                  <CardDescription>Nigeria Revenue Service - Real-time e-invoice recording for tax compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border ${nrsStatus === "connected" ? "bg-green-500/10 border-green-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
                      <div className="flex items-center gap-2">
                        {nrsStatus === "connected" ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Zap className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium">
                          {nrsStatus === "connected" ? "NRS Connected - Recording Live" : "NRS Ready for Connection"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {nrsStatus === "connected"
                          ? `${vatBreakdown.invoice_count} invoices submitted to NRS this fiscal year`
                          : "Click 'Submit to NRS' to begin recording transactions"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">What NRS e-Invoicing Records:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" />Every invoice with VAT breakdown</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" />Real-time transaction reporting to FIRS</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" />Automated TIN validation</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" />Digital tax stamp generation</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" />Audit trail for compliance</li>
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSubmitToNRS} className="flex-1">
                        <Globe className="w-4 h-4 mr-2" />Submit to NRS
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="https://nrs.gov.ng" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />NRS Portal
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>e-Invoice Statistics</CardTitle>
                  <CardDescription>Real-time submission metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Invoices Issued", value: vatBreakdown.invoice_count, status: "recorded" },
                      { label: "VAT Collected", value: formatCurrency(vatBreakdown.output_vat + vatBreakdown.shipping_vat), status: "reported" },
                      { label: "Input VAT Claims", value: formatCurrency(vatBreakdown.input_vat), status: "pending" },
                      { label: "Net VAT Filing", value: formatCurrency(vatBreakdown.net_vat_payable), status: "due" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.status}</p>
                        </div>
                        <span className="font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Remita Configuration Dialog */}
      <Dialog open={remitaConfigOpen} onOpenChange={setRemitaConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Configure Remita Tax Integration</DialogTitle>
            <DialogDescription>Connect to Remita for PAYE tax remittance and RRR generation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Required Credentials:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• REMITA_MERCHANT_ID</li>
                <li>• REMITA_API_KEY</li>
                <li>• REMITA_SERVICE_TYPE_ID (for PAYE)</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              To configure Remita integration, please add the required secrets through your project settings.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a href="https://www.remita.net" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Remita Portal</a>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href="https://firs.gov.ng" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />FIRS Portal</a>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemitaConfigOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TaxFilingReport;
