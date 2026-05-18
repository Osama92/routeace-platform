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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DollarSign,
  Users,
  Calculator,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle,
  Loader2,
  History,
  Eye,
  Truck,
  Briefcase,
  Building2,
  Receipt,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { usePayrollFetch } from "@/hooks/usePayrollFetch";
import { useAuth } from "@/contexts/AuthContext";
import PayrollLoadingSkeleton from "@/components/payroll/PayrollLoadingSkeleton";
import PayrollErrorFallback from "@/components/payroll/PayrollErrorFallback";
import ReconciliationAlert from "@/components/payroll/ReconciliationAlert";

// Nigeria Tax Calculation
interface TaxDeductibles {
  nhf: number;
  nhis: number;
  pension: number;
  lifeInsurance: number;
  rentRelief: number;
}

const calculateNigeriaTax = (annualIncome: number, deductibles?: TaxDeductibles) => {
  const totalDeductions = deductibles
    ? (deductibles.nhf || 0) +
      (deductibles.nhis || 0) +
      (deductibles.pension || 0) +
      (deductibles.lifeInsurance || 0) +
      Math.min(deductibles.rentRelief || 0, 500000)
    : 0;

  const taxableIncome = Math.max(0, annualIncome - totalDeductions);
  const MINIMUM_WAGE_THRESHOLD = 840000;

  if (taxableIncome <= MINIMUM_WAGE_THRESHOLD) {
    return { tax: 0, effectiveRate: 0, taxableIncome, totalDeductions };
  }

  let tax = 0;
  let remaining = taxableIncome;

  const brackets = [
    { limit: 800000, rate: 0.0 },
    { limit: 2200000, rate: 0.15 },
    { limit: 9000000, rate: 0.18 },
    { limit: 13000000, rate: 0.21 },
    { limit: 25000000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 },
  ];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  const effectiveRate = annualIncome > 0 ? (tax / annualIncome) * 100 : 0;
  return { tax, effectiveRate, taxableIncome, totalDeductions };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

interface PayrollEntry {
  id: string;
  name: string;
  type: "driver" | "owned_staff" | "outsourced_staff";
  salaryType: string;
  grossMonthly: number;
  monthlyTax: number;
  netMonthly: number;
  effectiveRate: number;
  tripCount?: number;
  partnerName?: string;
  remitaRRR?: string;
  remitaStatus?: string;
}

interface PayrollPreview {
  drivers: PayrollEntry[];
  ownedStaff: PayrollEntry[];
  outsourcedStaff: PayrollEntry[];
  totals: {
    totalEntries: number;
    totalGross: number;
    totalTax: number;
    totalNet: number;
  };
}

const PayrollPage = () => {
  const [processing, setProcessing] = useState(false);
  const [generatingRRR, setGeneratingRRR] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [activeTab, setActiveTab] = useState("preview");
  const [categoryTab, setCategoryTab] = useState("all");
  const { toast } = useToast();
  const { organizationId, userRole } = useAuth();
  const [cooAcknowledged, setCooAcknowledged] = useState(false);
  const isCOO = userRole === "org_admin" || userRole === "super_admin" || userRole === "admin";
  const requiresAck = userRole === "finance_manager";
  const gateOpen = !requiresAck || cooAcknowledged;

  // Use the enhanced payroll fetch hook with retry logic
  const {
    loading,
    error,
    retryCount,
    payrollPreview,
    reconciliation,
    fetchPayrollData,
    resetError,
  } = usePayrollFetch(organizationId);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: format(date, "MMMM yyyy"),
    };
  });

  // Fetch payroll data on mount and when month changes
  useEffect(() => {
    fetchPayrollData(selectedMonth);
  }, [selectedMonth, fetchPayrollData]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allEntries = getFilteredEntries();
    if (selectedIds.size === allEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allEntries.map((e) => e.id)));
    }
  };

  const getFilteredEntries = (): PayrollEntry[] => {
    switch (categoryTab) {
      case "drivers":
        return payrollPreview.drivers;
      case "owned_staff":
        return payrollPreview.ownedStaff;
      case "outsourced_staff":
        return payrollPreview.outsourcedStaff;
      default:
        return [
          ...payrollPreview.drivers,
          ...payrollPreview.ownedStaff,
          ...payrollPreview.outsourcedStaff,
        ];
    }
  };

  const handleProcessPayroll = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to process",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const periodStart = startOfMonth(new Date(year, month - 1)).toISOString();
      const periodEnd = endOfMonth(new Date(year, month - 1)).toISOString();
      const periodLabel = monthOptions.find((m) => m.value === selectedMonth)?.label;

      // Separate driver and staff entries
      const driverInserts: any[] = [];
      const staffInserts: any[] = [];
      const expenseInserts: any[] = [];

      selectedIds.forEach((id) => {
        const allEntries = [
          ...payrollPreview.drivers,
          ...payrollPreview.ownedStaff,
          ...payrollPreview.outsourcedStaff,
        ];
        const entry = allEntries.find((e) => e.id === id);
        if (!entry) return;

        if (entry.type === "driver") {
          const driverId = id.replace("driver-", "");
          driverInserts.push({
            driver_id: driverId,
            salary_type: entry.salaryType,
            gross_amount: entry.grossMonthly,
            tax_amount: entry.monthlyTax,
            taxable_income: entry.grossMonthly,
            net_amount: entry.netMonthly,
            period_start: periodStart,
            period_end: periodEnd,
            status: "paid",
            notes: `Payroll for ${periodLabel}`,
          });

          expenseInserts.push({
            category: "driver_salary" as const,
            amount: entry.netMonthly,
            description: `Driver Salary - ${entry.name} (${periodLabel})`,
            expense_date: new Date().toISOString().split("T")[0],
            driver_id: driverId,
          });
        } else {
          const staffId = id.replace("staff-", "");
          staffInserts.push({
            staff_id: staffId,
            salary_type: entry.salaryType,
            gross_amount: entry.grossMonthly,
            tax_amount: entry.monthlyTax,
            taxable_income: entry.grossMonthly,
            net_amount: entry.netMonthly,
            period_start: periodStart,
            period_end: periodEnd,
            status: "paid",
            notes: `Payroll for ${periodLabel}`,
          });

          expenseInserts.push({
            category: "staff_salary" as const,
            amount: entry.netMonthly,
            description: `Staff Salary - ${entry.name} (${periodLabel})`,
            expense_date: new Date().toISOString().split("T")[0],
          });
        }
      });

      // Insert all records in parallel
      if (driverInserts.length > 0) {
        const { error } = await supabase.from("driver_salaries").insert(driverInserts);
        if (error) throw error;
      }
      if (staffInserts.length > 0) {
        const { error } = await supabase.from("staff_salaries").insert(staffInserts);
        if (error) throw error;
      }
      if (expenseInserts.length > 0) {
        const { error } = await supabase.from("expenses").insert(expenseInserts);
        if (error) throw error;
      }

      toast({
        title: "Payroll Processed",
        description: `Successfully processed payroll for ${selectedIds.size} entries`,
      });

      setSelectedIds(new Set());
      fetchPayrollData(selectedMonth);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payroll",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateRRR = async (entry: PayrollEntry) => {
    setGeneratingRRR(entry.id);
    try {
      const response = await supabase.functions.invoke("remita-tax-integration", {
        body: {
          action: "generate_rrr",
          taxData: {
            driver_id: entry.id,
            driver_name: entry.name,
            tin: "",
            total_gross: entry.grossMonthly * 12,
            total_tax: entry.monthlyTax * 12,
            period_year: parseInt(selectedMonth.split("-")[0]),
          },
        },
      });

      if (response.error) throw response.error;

      if (response.data?.success && response.data?.rrr) {
        toast({
          title: "RRR Generated",
          description: `RRR: ${response.data.rrr}`,
        });
      } else {
        toast({
          title: "RRR Generation",
          description: response.data?.error || "Remita integration not configured. Please add REMITA_MERCHANT_ID, REMITA_API_KEY, and REMITA_SERVICE_TYPE_ID secrets.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate RRR",
        variant: "destructive",
      });
    } finally {
      setGeneratingRRR(null);
    }
  };

  const filteredEntries = getFilteredEntries();

  // Category-specific totals for preview
  const getCategoryTotals = () => {
    const entries = getFilteredEntries();
    return {
      count: entries.length,
      gross: entries.reduce((acc, e) => acc + e.grossMonthly, 0),
      tax: entries.reduce((acc, e) => acc + e.monthlyTax, 0),
      net: entries.reduce((acc, e) => acc + e.netMonthly, 0),
    };
  };

  const categoryTotals = getCategoryTotals();

  return (
    <DashboardLayout
      title="Unified Payroll"
      subtitle="Process payroll for drivers and staff with tax calculations"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview & Process
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Payroll History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          {/* COO Acknowledgement Gate - required before Finance can process payroll or generate RRRs */}
          {requiresAck && !cooAcknowledged && (
            <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  COO acknowledgement required
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  This payroll run requires acknowledgement from the Organisation Admin before payroll can be processed or RRRs can be generated.
                </p>
              </div>
            </div>
          )}
          {isCOO && requiresAck === false && !cooAcknowledged && (
            <div className="flex items-center justify-between gap-3 p-4 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">COO authorisation pending</p>
                  <p className="text-sm text-muted-foreground">
                    Acknowledge this payroll run to authorise Finance to process payments and generate tax remittances.
                  </p>
                </div>
              </div>
              <Button onClick={() => setCooAcknowledged(true)}>
                Acknowledge & Authorise Payroll
              </Button>
            </div>
          )}
          {cooAcknowledged && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-success/5 border border-success/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-success" />
              <p className="text-sm text-success">Payroll authorised by COO - Finance can now process payments and generate RRRs.</p>
            </div>
          )}
          {/* Period Selector */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <div className="flex gap-4 items-center">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pay Period</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48 bg-secondary/50">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => fetchPayrollData(selectedMonth)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <Button
                  onClick={handleProcessPayroll}
                  disabled={processing || !gateOpen}
                  title={!gateOpen ? "COO must acknowledge this payroll run first" : undefined}
                  className="bg-success hover:bg-success/90"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Process Payroll ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Payroll Preview Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Payroll Simulation - {monthOptions.find((m) => m.value === selectedMonth)?.label}
                </CardTitle>
                <CardDescription>
                  Estimated payroll costs before processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{payrollPreview.totals.totalEntries}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Drivers</p>
                    <p className="text-xl font-bold text-info">{payrollPreview.drivers.length}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Owned Staff</p>
                    <p className="text-xl font-bold text-success">{payrollPreview.ownedStaff.length}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Outsourced Staff</p>
                    <p className="text-xl font-bold text-warning">{payrollPreview.outsourcedStaff.length}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border-2 border-success/30">
                    <p className="text-xs text-muted-foreground">Total Net Payable</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(payrollPreview.totals.totalNet)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Gross:</span>
                    <span className="font-medium">
                      {formatCurrency(payrollPreview.totals.totalGross)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total PAYE Tax:</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(payrollPreview.totals.totalTax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Net:</span>
                    <span className="font-bold text-success">
                      {formatCurrency(payrollPreview.totals.totalNet)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Filter Tabs */}
          <Tabs value={categoryTab} onValueChange={setCategoryTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Users className="w-4 h-4" />
                All ({payrollPreview.totals.totalEntries})
              </TabsTrigger>
              <TabsTrigger value="drivers" className="gap-2">
                <Truck className="w-4 h-4" />
                Drivers ({payrollPreview.drivers.length})
              </TabsTrigger>
              <TabsTrigger value="owned_staff" className="gap-2">
                <Briefcase className="w-4 h-4" />
                Owned Staff ({payrollPreview.ownedStaff.length})
              </TabsTrigger>
              <TabsTrigger value="outsourced_staff" className="gap-2">
                <Building2 className="w-4 h-4" />
                Outsourced ({payrollPreview.outsourcedStaff.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Summary */}
          {categoryTab !== "all" && (
            <Card className="mb-4 border-border/50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <strong>{categoryTotals.count}</strong> entries
                  </span>
                  <span>
                    Gross: <strong>{formatCurrency(categoryTotals.gross)}</strong>
                  </span>
                  <span>
                    Tax: <strong className="text-destructive">-{formatCurrency(categoryTotals.tax)}</strong>
                  </span>
                  <span>
                    Net: <strong className="text-success">{formatCurrency(categoryTotals.net)}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payroll Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payroll entries found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredEntries.length && filteredEntries.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Salary Type</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggleSelect(entry.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.name}</p>
                            {entry.tripCount !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {entry.tripCount} trips this month
                              </p>
                            )}
                            {entry.partnerName && (
                              <p className="text-xs text-muted-foreground">
                                via {entry.partnerName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.type === "driver"
                                ? "default"
                                : entry.type === "owned_staff"
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              entry.type === "driver"
                                ? "bg-info/20 text-info"
                                : entry.type === "owned_staff"
                                ? "bg-success/20 text-success"
                                : "bg-warning/20 text-warning"
                            }
                          >
                            {entry.type === "driver"
                              ? "Driver"
                              : entry.type === "owned_staff"
                              ? "Owned Staff"
                              : "Outsourced"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.salaryType.replace("_", "-")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.grossMonthly)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(entry.monthlyTax)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-success">
                          {formatCurrency(entry.netMonthly)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateRRR(entry)}
                            disabled={generatingRRR === entry.id || !gateOpen}
                            title={!gateOpen ? "COO must acknowledge this payroll run first" : undefined}
                          >
                            {generatingRRR === entry.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Receipt className="w-4 h-4" />
                            )}
                            <span className="ml-1 hidden md:inline">RRR</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>
                View processed payroll batches and generate tax remittance codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Payroll history will be displayed here after processing payroll.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PayrollPage;