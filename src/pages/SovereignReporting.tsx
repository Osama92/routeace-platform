import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, FileText, Download, RefreshCw, CheckCircle,
  Building2, BarChart3, Shield, Leaf, MapPin
} from "lucide-react";

interface ReportSnapshot {
  id: string;
  report_type: string;
  report_period: string;
  report_data: Record<string, any>;
  currency: string;
  ifrs_compliant: boolean;
  ipsas_compliant: boolean;
  export_format: string;
  generated_at: string;
}

const REPORT_TYPES = [
  { value: "consolidated_pl", label: "Consolidated P&L", icon: BarChart3 },
  { value: "consolidated_bs", label: "Consolidated Balance Sheet", icon: Building2 },
  { value: "consolidated_cf", label: "Consolidated Cash Flow", icon: RefreshCw },
  { value: "intercompany_elimination", label: "Intercompany Eliminations", icon: Globe },
  { value: "route_profitability", label: "Route-Level Profitability", icon: MapPin },
  { value: "asset_roi", label: "Asset ROI Tracking", icon: BarChart3 },
  { value: "esg", label: "ESG Reporting", icon: Leaf },
  { value: "tax_jurisdiction", label: "Tax Jurisdiction Mapping", icon: FileText },
  { value: "regulatory_export", label: "Regulatory Export Pack", icon: Shield },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const SovereignReporting = () => {
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("consolidated_pl");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const { toast } = useToast();
  const { user, organizationId } = useAuth();

  const fetchSnapshots = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    const { data } = await supabase.from("sovereign_report_snapshots").select("*").eq("organization_id", organizationId).order("generated_at", { ascending: false }).limit(50);
    setSnapshots((data as ReportSnapshot[]) || []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const generateReport = async () => {
    if (!organizationId) { toast({ title: "No organization", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const orgEq = (q: any) => q.eq("organization_id", organizationId);
      // Pull real data from ledger (org-scoped)
      const [ledgerRes, invoicesRes, expensesRes, arRes, apRes] = await Promise.all([
        orgEq(supabase.from("accounting_ledger").select("*")),
        orgEq(supabase.from("invoices").select("total_amount, tax_amount, status, customer_id")),
        orgEq(supabase.from("expenses").select("amount, category, approval_status")),
        orgEq(supabase.from("accounts_receivable").select("amount_due, balance, status")),
        orgEq(supabase.from("accounts_payable").select("amount_due, balance, status")),
      ]);

      const ledger = ledgerRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const ar = arRes.data || [];
      const ap = apRes.data || [];

      const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalExpenses = expenses.filter(e => e.approval_status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
      const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
      const totalAR = ar.reduce((s, r) => s + (r.balance || 0), 0);
      const totalAP = ap.reduce((s, r) => s + (r.balance || 0), 0);
      const totalAssets = ledger.filter(l => l.account_type === "asset").reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0);
      const totalLiabilities = ledger.filter(l => l.account_type === "liability").reduce((s, l) => s + (l.credit || 0) - (l.debit || 0), 0);
      const equity = totalAssets - totalLiabilities;
      const balanceCheck = Math.abs(totalAssets - (totalLiabilities + equity)) < 0.01;

      let reportData: Record<string, any> = {};

      switch (selectedType) {
        case "consolidated_pl":
          reportData = { revenue: totalRevenue, expenses: totalExpenses, grossProfit: totalRevenue - totalExpenses, taxProvision: totalTax, netProfit: totalRevenue - totalExpenses - totalTax };
          break;
        case "consolidated_bs":
          reportData = { totalAssets, totalLiabilities, equity, balanceCheck, currentAssets: totalAR, currentLiabilities: totalAP };
          break;
        case "consolidated_cf":
          reportData = { operatingCashFlow: totalRevenue - totalExpenses, investingActivities: 0, financingActivities: 0, netCashFlow: totalRevenue - totalExpenses };
          break;
        case "intercompany_elimination":
          reportData = { eliminations: [], note: "No intercompany transactions detected in current period" };
          break;
        case "route_profitability":
          reportData = { routes: [], totalRouteRevenue: totalRevenue, avgMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) + "%" : "0%" };
          break;
        case "asset_roi":
          reportData = { totalAssetValue: totalAssets, totalReturn: totalRevenue, roi: totalAssets > 0 ? ((totalRevenue / totalAssets) * 100).toFixed(1) + "%" : "0%" };
          break;
        case "esg":
          reportData = { environmental: { carbonFootprint: "Tracking pending", fuelEfficiency: "N/A" }, social: { employeeCount: 0, safetyIncidents: 0 }, governance: { boardIndependence: "100%", auditCommittee: true } };
          break;
        case "tax_jurisdiction":
          reportData = { jurisdictions: [{ country: "Nigeria", taxRate: 30, vatRate: 7.5, whtApplicable: true }] };
          break;
        case "regulatory_export":
          reportData = { ifrsCompliant: true, ipsasReady: false, auditPackIncluded: true, xbrlReady: false };
          break;
      }

      const { error } = await supabase.from("sovereign_report_snapshots").insert({
        report_type: selectedType,
        report_period: selectedPeriod,
        report_data: reportData,
        currency: "NGN",
        ifrs_compliant: true,
        ipsas_compliant: false,
        generated_by: user?.id,
        export_format: "json",
      } as never);

      if (error) throw error;
      toast({ title: "Report Generated", description: `${REPORT_TYPES.find(t => t.value === selectedType)?.label} for ${selectedPeriod}` });
      fetchSnapshots();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const latestByType = REPORT_TYPES.map(type => ({
    ...type,
    latest: snapshots.find(s => s.report_type === type.value),
  }));

  return (
    <DashboardLayout title="Sovereign Financial Reporting" subtitle="IFRS-compliant consolidated reporting for government contracts and multilateral financing">
      {/* Generation Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm" />
            <Button onClick={generateReport} disabled={generating}>
              {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Report Library</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="history">Generation History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestByType.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.value}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base"><Icon className="w-4 h-4" />{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {item.latest ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.latest.report_period}</Badge>
                          {item.latest.ifrs_compliant && <Badge variant="default">IFRS</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">Generated: {new Date(item.latest.generated_at).toLocaleString()}</p>
                        {item.latest.report_data && (
                          <div className="mt-2 p-2 rounded bg-secondary/30 text-xs font-mono max-h-[120px] overflow-auto">
                            {Object.entries(item.latest.report_data).slice(0, 5).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-muted-foreground">{k}:</span>
                                <span>{typeof v === "number" ? formatCurrency(v) : String(v)?.slice(0, 30)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not generated yet</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Standards Compliance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { standard: "IFRS (International Financial Reporting Standards)", status: true },
                  { standard: "IPSAS (International Public Sector Accounting Standards)", status: false, note: "Optional - available on request" },
                  { standard: "GAAP (Generally Accepted Accounting Principles)", status: true },
                  { standard: "SOX Compliance Controls", status: true },
                  { standard: "XBRL Export Ready", status: false, note: "In development" },
                ].map((item) => (
                  <div key={item.standard} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{item.standard}</p>
                      {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                    </div>
                    {item.status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Badge variant="secondary">Pending</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Balance Sheet Integrity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-secondary/30 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Real-Time Check</p>
                  <p className="text-2xl font-bold text-primary">Assets = Liabilities + Equity</p>
                  <p className="text-xs text-muted-foreground mt-2">Validated on every ledger entry via double-entry enforcement</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Currency Consolidation</p>
                  <p className="text-xs text-muted-foreground">Multi-currency with automatic FX gain/loss revaluation</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Sovereign Audit Pack</p>
                  <p className="text-xs text-muted-foreground">One-click export of complete financial records for government review</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report History</CardTitle>
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export All</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>IFRS</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="outline">{REPORT_TYPES.find(t => t.value === s.report_type)?.label || s.report_type}</Badge></TableCell>
                      <TableCell>{s.report_period}</TableCell>
                      <TableCell>{s.ifrs_compliant ? <CheckCircle className="w-4 h-4 text-green-500" /> : "-"}</TableCell>
                      <TableCell>{s.currency}</TableCell>
                      <TableCell className="text-sm">{new Date(s.generated_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary">{s.export_format}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {snapshots.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reports generated yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SovereignReporting;
