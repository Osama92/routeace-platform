import { useState } from "react";
import { InvoiceCreationDialog } from "@/components/invoice/InvoiceCreationDialog";
import AgentInsightWidget from "@/components/finance/AgentInsightWidget";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import usePermissions from "@/hooks/usePermissions";
import RevenueInsightsPanel from "@/components/analytics/RevenueInsightsPanel";
import useTenantMode from "@/hooks/useTenantMode";
import { DeptFinanceManagerDashboard } from "@/pages/dept/DeptDashboards";
import OpsOnboardingChecklist from "@/components/operations/OpsOnboardingChecklist";
import { useOpsOnboardingCounts } from "@/hooks/useOpsOnboardingCounts";
import RouteLevelCosting from "@/components/analytics/RouteLevelCosting";
import CustomerProfitabilityReport from "@/components/analytics/CustomerProfitabilityReport";
import AssetProfitabilityCard from "@/components/kpi/AssetProfitabilityCard";
import FinanceKPIIntelligence from "@/components/finance/FinanceKPIIntelligence";
import PAYECalculator from "@/components/finance/PAYECalculator";
import FinanceIntelligenceEngine from "@/components/finance/FinanceIntelligenceEngine";
import { 
  FileText, CreditCard, Wallet, Download, RefreshCw, CheckCircle,
  Clock, TrendingUp, AlertTriangle, Plus, Send, BarChart3, Brain, Activity
} from "lucide-react";
import { format } from "date-fns";

const FinanceManagerDashboard = () => {
  const { isDepartment } = useTenantMode();
  if (isDepartment) return <DeptFinanceManagerDashboard />;
  return <FinanceManagerDashboardInner />;
};

const FinanceManagerDashboardInner = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const { can, logDenial } = usePermissions();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("intelligence");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const orgFilter = organizationId ?? "00000000-0000-0000-0000-000000000000";
  const { data: onboardingCounts } = useOpsOnboardingCounts();

  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ["finance-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("invoices") as any)
        .select(`*, customers (company_name)`)
        .eq("organization_id", orgFilter)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Fetch financial summary
  const { data: financialSummary } = useQuery({
    queryKey: ["finance-summary", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const [invoicesData, expensesData] = await Promise.all([
        (supabase.from("invoices") as any).select("total_amount, status").eq("organization_id", orgFilter).gte("created_at", startOfMonth),
        (supabase.from("expenses") as any).select("amount, approval_status").eq("organization_id", orgFilter).gte("created_at", startOfMonth)
      ]);
      const totalRevenue = invoicesData.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const paidRevenue = invoicesData.data?.filter(i => i.status === "paid").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const pendingRevenue = invoicesData.data?.filter(i => i.status === "pending").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const totalExpenses = expensesData.data?.filter(e => e.approval_status === "approved").reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      return { totalRevenue, paidRevenue, pendingRevenue, totalExpenses };
    }
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      toast({ title: "Success", description: "Invoice approved" });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "overdue": return "destructive";
      case "approved": return "default";
      default: return "secondary";
    }
  };

  return (
    <DashboardLayout title="Finance Manager" subtitle="Financial Intelligence & Decision Engine">
      {/* Onboarding Checklist (auto-hides once complete) */}
      <div className="mb-6">
        <OpsOnboardingChecklist
          fleetCount={onboardingCounts?.fleetCount ?? 0}
          vehicleCount={onboardingCounts?.vehicleCount ?? 0}
          driverCount={onboardingCounts?.driverCount ?? 0}
          dispatchCount={onboardingCounts?.dispatchCount ?? 0}
          orderCount={onboardingCounts?.orderCount ?? 0}
          routePlanCount={onboardingCounts?.routePlanCount ?? 0}
          waybillCount={onboardingCounts?.waybillCount ?? 0}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "MTD Revenue", value: `₦${((financialSummary?.totalRevenue || 0) / 1e6).toFixed(2)}M`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Collected", value: `₦${((financialSummary?.paidRevenue || 0) / 1e6).toFixed(2)}M`, icon: Wallet, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Pending", value: `₦${((financialSummary?.pendingRevenue || 0) / 1e6).toFixed(2)}M`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "MTD Expenses", value: `₦${((financialSummary?.totalExpenses || 0) / 1e6).toFixed(2)}M`, icon: CreditCard, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Agent Insight Widget */}
      <div className="mb-6">
        <AgentInsightWidget />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="intelligence" className="gap-1"><Brain className="w-3.5 h-3.5" />Intelligence Engine</TabsTrigger>
          <TabsTrigger value="kpi-intel" className="gap-1"><Activity className="w-3.5 h-3.5" />KPI Suite</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="insights">Revenue Insights</TabsTrigger>
          <TabsTrigger value="assets">Asset Profitability</TabsTrigger>
          <TabsTrigger value="routes">Route Costing</TabsTrigger>
          <TabsTrigger value="clients">Client Profitability</TabsTrigger>
          <TabsTrigger value="paye" className="gap-1">PAYE Calculator</TabsTrigger>
        </TabsList>

        {/* Intelligence Engine Tab - PRIMARY */}
        <TabsContent value="intelligence">
          <FinanceIntelligenceEngine />
        </TabsContent>

        <TabsContent value="kpi-intel">
          <FinanceKPIIntelligence />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Management</CardTitle>
                  <CardDescription>Create, approve, and track invoices</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["finance-invoices"] })}>
                    <RefreshCw className="w-4 h-4 mr-1" />Refresh
                  </Button>
                  <Button size="sm" onClick={() => setInvoiceDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />Create Invoice
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customers?.company_name}</TableCell>
                      <TableCell className="font-medium">₦{(invoice.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell><Badge variant={getStatusColor(invoice.status || "")}>{invoice.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {invoice.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => approveInvoiceMutation.mutate(invoice.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" />Approve
                            </Button>
                          )}
                          {invoice.status === "approved" && (
                            <Button size="sm" variant="outline"><Send className="w-3 h-3 mr-1" />Send</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights"><RevenueInsightsPanel /></TabsContent>
        <TabsContent value="assets">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetProfitabilityCard />
            <Card>
              <CardHeader>
                <CardTitle>Asset Profitability Analysis</CardTitle>
                <CardDescription>Detailed breakdown by asset type and period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Track profit margins for fleet assets.</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Revenue: Completed deliveries, rental income, trip fees</li>
                      <li>• Costs: Fuel, driver payroll, maintenance, depreciation</li>
                      <li>• Aggregated by asset, fleet, monthly, and quarterly</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="routes"><RouteLevelCosting /></TabsContent>
        <TabsContent value="clients"><CustomerProfitabilityReport /></TabsContent>
        <TabsContent value="paye"><PAYECalculator /></TabsContent>
      </Tabs>

      <InvoiceCreationDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["finance-invoices"] })}
      />
    </DashboardLayout>
  );
};

export default FinanceManagerDashboard;
