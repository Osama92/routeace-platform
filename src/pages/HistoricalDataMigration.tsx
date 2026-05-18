import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  Download,
  History,
  Loader2,
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  parseExcelFileRobust,
  historicalInvoiceHeaderMap,
  HistoricalInvoiceRow,
  generateHistoricalDataTemplate,
  RowError,
  sanitizeNumber,
} from "@/lib/excelParser";

interface HistoricalRecord {
  id: string;
  customer_name: string;
  vendor_name: string | null;
  period_year: number;
  period_month: number;
  trips_count: number;
  total_revenue: number;
  total_cost: number;
  imported_at: string;
  source_file: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const HISTORICAL_FIELD_TYPES: Partial<Record<keyof HistoricalInvoiceRow, 'string' | 'number' | 'date'>> = {
  customer_name: 'string',
  vendor_name: 'string',
  period_year: 'number',
  period_month: 'number',
  trips_count: 'number',
  total_revenue: 'number',
  total_cost: 'number',
  profit_margin: 'number',
  km_covered: 'number',
  tonnage_loaded: 'number',
  num_deliveries: 'number',
  amount_vatable: 'number',
  amount_not_vatable: 'number',
  extra_dropoffs: 'number',
  extra_dropoff_cost: 'number',
  total_vendor_cost: 'number',
  sub_total: 'number',
  vat_amount: 'number',
  gross_profit: 'number',
  payment_terms_days: 'number',
  week_num: 'number',
  transaction_date: 'date',
  invoice_date: 'date',
  payment_receipt_date: 'date',
  due_date: 'date',
  invoice_paid_date: 'date',
};

const HistoricalDataMigration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<HistoricalInvoiceRow[]>([]);
  const [rowErrors, setRowErrors] = useState<{ row: Partial<HistoricalInvoiceRow>; errors: RowError[] }[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [partners, setPartners] = useState<{ id: string; company_name: string }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  
  // Filter state
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>("all");

  useState(() => {
    fetchInitialData();
  });

  async function fetchInitialData() {
    try {
      const [customersRes, partnersRes, historicalRes] = await Promise.all([
        supabase.from("customers").select("id, company_name").order("company_name"),
        supabase.from("partners").select("id, company_name").eq("partner_type", "vendor").order("company_name"),
        (supabase.from("historical_invoice_data" as any).select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(500) as any),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (partnersRes.data) setPartners(partnersRes.data);
      if (historicalRes.data) setHistoricalRecords(historicalRes.data);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setRowErrors([]);
    setParseWarnings([]);
    setShowErrors(false);

    try {
      const result = await parseExcelFileRobust<HistoricalInvoiceRow>(
        file,
        historicalInvoiceHeaderMap,
        ['customer_name', 'period_year', 'period_month'],
        HISTORICAL_FIELD_TYPES
      );

      setParsedData(result.validRows);
      setRowErrors(result.invalidRows);
      setParseWarnings(result.warnings);

      if (result.validRows.length === 0 && result.invalidRows.length === 0) {
        toast({
          title: "No Data Found",
          description: "No rows found. Ensure 'Customer Name', 'Year', and 'Month' columns exist.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "File Parsed",
          description: `${result.validRows.length} valid, ${result.invalidRows.length} with errors (out of ${result.totalRows} total)`,
          variant: result.invalidRows.length > 0 ? "default" : "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Parse Error",
        description: error.message || "Failed to parse Excel file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findCustomerId = (name: string): string | null => {
    const match = customers.find(
      (c) => c.company_name.toLowerCase() === name.toLowerCase()
    );
    return match?.id || null;
  };

  const findPartnerId = (name: string): string | null => {
    if (!name) return null;
    const match = partners.find(
      (p) => p.company_name.toLowerCase() === name.toLowerCase()
    );
    return match?.id || null;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    // Deduplication: build a set of existing keys
    const existingKeys = new Set(
      historicalRecords.map(r => `${r.customer_name}-${r.period_year}-${r.period_month}`)
    );

    try {
      // Batch insert in chunks of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        const batch = parsedData.slice(i, i + BATCH_SIZE);
        const insertRows = batch
          .filter(row => {
            const key = `${row.customer_name}-${row.period_year}-${row.period_month}`;
            if (existingKeys.has(key)) return false;
            existingKeys.add(key);
            return true;
          })
          .map(row => ({
            customer_id: findCustomerId(row.customer_name),
            customer_name: row.customer_name,
            vendor_id: row.vendor_name ? findPartnerId(row.vendor_name) : null,
            vendor_name: row.vendor_name || null,
            period_year: sanitizeNumber(row.period_year) || new Date().getFullYear(),
            period_month: sanitizeNumber(row.period_month) || 1,
            tonnage: row.tonnage || null,
            truck_type: row.truck_type || null,
            route: row.route || null,
            pickup_location: row.pickup_location || null,
            delivery_location: row.delivery_location || null,
            trips_count: sanitizeNumber(row.trips_count) || 0,
            total_revenue: sanitizeNumber(row.total_revenue) || 0,
            total_cost: sanitizeNumber(row.total_cost) || 0,
            profit_margin: sanitizeNumber(row.profit_margin) || 0,
            notes: row.notes || null,
            imported_by: user?.id,
            source_file: fileName,
          }));

        if (insertRows.length === 0) continue;

        const { error, data } = await (supabase.from("historical_invoice_data" as any).insert(insertRows) as any);

        if (error) {
          console.error("Batch insert error:", error);
          errorCount += insertRows.length;
        } else {
          successCount += insertRows.length;
        }
      }

      toast({
        title: "Import Complete",
        description: `${successCount} imported successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}${parsedData.length - successCount - errorCount > 0 ? ` ${parsedData.length - successCount - errorCount} skipped (duplicates).` : ''}`,
      });

      if (successCount > 0) {
        fetchInitialData();
        setParsedData([]);
        setRowErrors([]);
        setFileName(null);
      }
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import historical data",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Filter records
  const filteredRecords = historicalRecords.filter((r) => {
    if (filterYear !== "all" && r.period_year.toString() !== filterYear) return false;
    if (filterMonth !== "all" && r.period_month.toString() !== filterMonth) return false;
    return true;
  });

  // Summary stats
  const summaryStats = {
    totalRecords: filteredRecords.length,
    totalRevenue: filteredRecords.reduce((sum, r) => sum + (r.total_revenue || 0), 0),
    totalCost: filteredRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0),
    totalTrips: filteredRecords.reduce((sum, r) => sum + (r.trips_count || 0), 0),
  };

  const years = Array.from(new Set(historicalRecords.map((r) => r.period_year))).sort((a, b) => b - a);

  return (
    <DashboardLayout
      title="Historical Data Migration"
      subtitle="Import and manage historical invoice data for comparison and analytics"
    >
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Upload Historical Data
            </CardTitle>
            <CardDescription>
              Upload Excel files (.xlsx, .csv) with historical invoice/trip data. Dates, numbers, and headers are auto-normalized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Select Excel File
              </Button>
              <Button variant="ghost" onClick={generateHistoricalDataTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              {fileName && <Badge variant="secondary">{fileName}</Badge>}
            </div>

            {/* Warnings */}
            {parseWarnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
                {parseWarnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            {/* Row Errors Section */}
            {rowErrors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {rowErrors.length} rows have errors (will be skipped)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowErrors(!showErrors)}
                  >
                    {showErrors ? "Hide Details" : "Show Details"}
                  </Button>
                </div>
                {showErrors && (
                  <div className="max-h-[200px] overflow-auto mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Column</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead>Suggested Fix</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowErrors.flatMap((item) =>
                          item.errors.map((err, i) => (
                            <TableRow key={`${err.rowNumber}-${i}`}>
                              <TableCell className="font-mono text-xs">{err.rowNumber}</TableCell>
                              <TableCell className="font-mono text-xs">{err.column}</TableCell>
                              <TableCell className="text-xs text-destructive">{err.error}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{err.suggestedFix}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Valid Preview Section */}
            {parsedData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
                    {parsedData.length} records ready for import
                  </p>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Import {parsedData.length} Records
                  </Button>
                </div>
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Trips</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 20).map((row, index) => {
                        const hasCustomer = !!findCustomerId(row.customer_name);
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {row.customer_name}
                                {!hasCustomer && (
                                  <span title="Customer not found in system">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{row.vendor_name || '-'}</TableCell>
                            <TableCell>
                              {MONTHS.find(m => m.value === Number(row.period_month))?.label} {row.period_year}
                            </TableCell>
                            <TableCell className="text-right">{row.trips_count || 0}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Number(row.total_revenue) || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                Ready
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {parsedData.length > 20 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Showing first 20 of {parsedData.length} valid rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Imported Historical Data
                </CardTitle>
                <CardDescription>
                  View and filter previously imported historical records
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Year</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Month</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Records", value: summaryStats.totalRecords.toLocaleString() },
                { label: "Total Revenue", value: formatCurrency(summaryStats.totalRevenue) },
                { label: "Total Cost", value: formatCurrency(summaryStats.totalCost) },
                { label: "Total Trips", value: summaryStats.totalTrips.toLocaleString() },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-muted/50 rounded-lg p-4"
                >
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Records Table */}
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.slice(0, 100).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.customer_name}</TableCell>
                      <TableCell>{record.vendor_name || '-'}</TableCell>
                      <TableCell>
                        {MONTHS.find(m => m.value === record.period_month)?.label} {record.period_year}
                      </TableCell>
                      <TableCell className="text-right">{record.trips_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_cost)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                          {record.source_file || 'Manual'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No historical data found. Upload an Excel file to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {filteredRecords.length > 100 && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Showing first 100 of {filteredRecords.length} records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HistoricalDataMigration;
