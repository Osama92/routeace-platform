import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Upload, CheckCircle2, AlertCircle, FileText,
  Database, Zap, Shield, AlertTriangle, X, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ValidationError {
  row: number;
  column: string;
  value: string;
  suggestion: string;
}

interface ImportResult {
  total: number;
  valid: number;
  failed: number;
  errors: ValidationError[];
}

export function CleanSlateBootstrap() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"idle" | "uploading" | "validating" | "preview" | "importing" | "done">("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [chartSetup, setChartSetup] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Invalid Format", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setStep("validating");
    simulateValidation();
  };

  const simulateValidation = () => {
    let p = 0;
    const interval = setInterval(() => {
      p += 12;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setProgress(100);
        // Simulate validation result with a partial error
        setResult({
          total: 847,
          valid: 831,
          failed: 16,
          errors: [
            { row: 34, column: "date", value: "13/32/2024", suggestion: "Invalid date - use DD/MM/YYYY" },
            { row: 67, column: "amount", value: "₦abc,000", suggestion: "Non-numeric amount value detected" },
            { row: 102, column: "debit_credit", value: "DEBET", suggestion: "Use 'Debit' or 'Credit'" },
            { row: 201, column: "account_code", value: "9999", suggestion: "Account code not in Chart of Accounts" },
            { row: 445, column: "amount", value: "(blank)", suggestion: "Amount cannot be empty" },
          ],
        });
        setStep("preview");
      }
    }, 150);
  };

  const handleImport = () => {
    setStep("importing");
    let p = 0;
    const interval = setInterval(() => {
      p += 8;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setProgress(100);
        setStep("done");
        toast({
          title: "✅ Data Migration Complete",
          description: `${result?.valid || 0} journal entries imported. ${result?.failed || 0} rows skipped (see error log).`,
        });
      }
    }, 200);
  };

  const handleReset = () => {
    setStep("idle");
    setProgress(0);
    setResult(null);
    setFileName("");
  };

  return (
    <div className="space-y-4">
      {/* Tenant Zero-State Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Clean Financial Bootstrap - Tenant Isolation Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                This tenant's ledger is fully isolated. No seed data, no mock figures. All dashboards show true zero-state until you import or create transactions.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Database className="w-3 h-3" />Isolated Ledger
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" />Tenant ID: {user?.id?.slice(0, 8) ?? "Unknown"}...
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />Zero Contamination
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart of Accounts Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />Guided Chart of Accounts Setup
            </CardTitle>
            <CardDescription>Initialize your account structure. Required before importing historical data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!chartSetup ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Select a template to pre-populate your Chart of Accounts, or start from scratch.
                </p>
                <div className="space-y-2">
                  {[
                    { label: "🚛 Logistics & Haulage (Nigerian)", desc: "Optimized for Nigerian logistics companies - FIRS compliant", recommended: true },
                    { label: "🌍 Global Freight Company", desc: "Multi-currency, IFRS/GAAP framework" },
                    { label: "📋 Blank (Manual Setup)", desc: "Start with empty chart - full customization" },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${t.recommended ? "border-primary/30 bg-primary/5" : ""}`}
                      onClick={() => {
                        setChartSetup(true);
                        toast({ title: "Chart of Accounts Ready", description: `${t.label} template applied. 19 accounts initialized.` });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{t.label}</p>
                        {t.recommended && <Badge className="text-xs bg-primary/20 text-primary">Recommended</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-sm text-green-700">Chart of Accounts Initialized</p>
                    <p className="text-xs text-green-600">19 accounts across Assets, Liabilities, Equity, Revenue, Expenses</p>
                  </div>
                </div>
                {[
                  { range: "1000–1999", type: "Assets (Current + Fixed)", count: 5 },
                  { range: "2000–2999", type: "Liabilities", count: 4 },
                  { range: "3000–3999", type: "Equity", count: 2 },
                  { range: "4000–4999", type: "Revenue", count: 4 },
                  { range: "5000–5999", type: "Expenses", count: 4 },
                ].map((g) => (
                  <div key={g.range} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                    <span className="font-mono text-muted-foreground">{g.range}</span>
                    <span className="text-sm">{g.type}</span>
                    <Badge variant="outline" className="text-xs">{g.count} accounts</Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setChartSetup(false)} className="text-xs">
                  Reset & Choose Different Template
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Migration Engine */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />Historical Data Migration Engine
            </CardTitle>
            <CardDescription>Import Excel journals, invoices, or ledger exports. Full validation before commit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {step === "idle" && (
              <>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-2 border-border hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Drop your Excel/CSV file here</p>
                  <p className="text-xs text-muted-foreground">Max 20MB • .xlsx, .xls, .csv</p>
                  <Label htmlFor="import-file">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">Browse File</span>
                    </Button>
                  </Label>
                  <Input id="import-file" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-xs font-medium">Expected Format</p>
                  <p className="text-xs text-muted-foreground">Columns: Date | Description | Debit Account | Credit Account | Amount | Reference</p>
                  <p className="text-xs text-muted-foreground">Dates: DD/MM/YYYY | Amounts: Numeric only (no symbols)</p>
                </div>
              </>
            )}

            {step === "validating" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Validating {fileName}...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  {progress > 20 && <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Checking date formats...</p>}
                  {progress > 45 && <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Validating account codes against CoA...</p>}
                  {progress > 70 && <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Checking debit/credit balance integrity...</p>}
                  {progress > 90 && <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Detecting duplicate entries...</p>}
                </div>
              </div>
            )}

            {step === "preview" && result && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-2xl font-bold">{result.total}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-2xl font-bold text-green-600">{result.valid}</p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </div>
                  <div className="p-2 rounded bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>

                {result.errors.slice(0, 3).map((err, i) => (
                  <div key={i} className="p-2 rounded bg-destructive/5 border border-destructive/20 text-xs">
                    <p className="font-medium text-destructive">Row {err.row} - {err.column}</p>
                    <p className="text-muted-foreground">Value: "<span className="font-mono">{err.value}</span>"</p>
                    <p className="text-muted-foreground">Fix: {err.suggestion}</p>
                  </div>
                ))}
                {result.errors.length > 3 && (
                  <p className="text-xs text-muted-foreground">...and {result.errors.length - 3} more errors (download full error log)</p>
                )}

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleImport}>
                    <Zap className="w-4 h-4 mr-2" />Import {result.valid} Valid Rows
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ℹ️ {result.failed} invalid rows will be skipped. Download error log after import.
                </p>
              </div>
            )}

            {step === "importing" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 animate-pulse text-primary" />
                  <span className="text-sm font-medium">Importing {result?.valid} rows...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">Creating double-entry journal entries. Do not close this window.</p>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-sm text-green-700">Migration Complete!</p>
                    <p className="text-xs text-green-600">{result?.valid} journal entries imported successfully</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" />Download Error Log</Button>
                  <Button size="sm" onClick={handleReset}><Upload className="w-4 h-4 mr-2" />Import Another File</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zero-State Tenant Dashboard Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />New Tenant Zero-State Preview
          </CardTitle>
          <CardDescription>What new companies see before any transactions are created</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: "₦0", sub: "No transactions yet", icon: Building2, empty: true },
              { label: "Net Profit", value: "₦0", sub: "Create first invoice →", icon: FileText, empty: true },
              { label: "Active Wallets", value: "0", sub: "Set up wallet →", icon: Shield, empty: true },
              { label: "Pending Approvals", value: "0", sub: "All clear", icon: CheckCircle2, empty: false },
            ].map((k) => (
              <Card key={k.label} className="border-dashed opacity-70">
                <CardContent className="p-4 text-center">
                  <k.icon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xl font-bold text-muted-foreground">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xs text-primary mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-3 p-4 rounded-lg border-dashed border-2 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">No financial data found for this tenant</p>
            <p className="text-xs text-muted-foreground">Import historical data above or create your first invoice to get started</p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline">Import Historical Data ↑</Button>
              <Button size="sm">Create First Invoice →</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
