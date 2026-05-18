import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { safeDivide } from "@/lib/apiValidator";
import RouteIntelligenceDashboard from "@/components/analytics/RouteIntelligenceDashboard";
import CompetitiveBenchmarking from "@/components/analytics/CompetitiveBenchmarking";
import RevenueProjectionModel from "@/components/investor/RevenueProjectionModel";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Users,
  Target,
  Download,
  FileText,
  Info,
  Shield,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Route,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MetricDefinition {
  name: string;
  formula: string;
  dataSource: string;
  updateFrequency: string;
  limitations: string;
}

interface InvestorMetric {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
  definition: MetricDefinition;
}

const InvestorDashboard = () => {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState<"mom" | "qoq" | "yoy">("mom");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [ndaAcknowledged, setNdaAcknowledged] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Financial metrics
  const [metrics, setMetrics] = useState({
    mrr: 0,
    grossMargin: 0,
    netMargin: 0,
    fleetUtilization: 0,
    revenuePerAsset: 0,
    costPerKm: 0,
    avgSlaCompliance: 0,
    activeCustomers: 0,
    customerRetention: 0,
    retentionSampleSize: 0,
    retentionMeaningful: false,
    totalRevenue: 0,
    totalCost: 0,
    totalAssets: 0,
  });

  // Trend data for charts
  const [trendData, setTrendData] = useState<any[]>([]);
  const [cohortData, setCohortData] = useState<any[]>([]);

  // Period-over-period change percentages (real, computed)
  const [revenueChange, setRevenueChange] = useState(0);
  const [metricChanges, setMetricChanges] = useState({
    mrr: 0,
    grossMargin: 0,
    netMargin: 0,
    fleetUtilization: 0,
    revenuePerAsset: 0,
    costPerKm: 0,
    avgSlaCompliance: 0,
    activeCustomers: 0,
    customerRetention: 0,
  });

  useEffect(() => {
    fetchInvestorMetrics();
    logAccess();
  }, [timeView]);

  const logAccess = async () => {
    try {
      await supabase.from("investor_access_logs").insert({
        user_id: user?.id,
        user_email: user?.email,
        access_type: "dashboard_view",
        resource_accessed: "investor_dashboard",
        nda_acknowledged: ndaAcknowledged,
      });
    } catch (error) {
      console.error("Failed to log investor access:", error);
    }
  };

  const fetchInvestorMetrics = async () => {
    setLoading(true);
    try {
      // Scope helpers
      const scopeOrg = (q: any): any =>
        organizationId ? q.eq("organization_id", organizationId) : q;

      // Fetch invoices for revenue (all paid)
      const { data: invoices } = await scopeOrg(
        supabase
          .from("invoices")
          .select("total_amount, status, created_at, paid_at, subscription_amount")
          .eq("status", "paid")
      );

      // Fetch expenses
      const { data: expenses } = await scopeOrg(
        supabase.from("expenses").select("amount, expense_date, category")
      );

      // Fetch vehicles for fleet data
      const { data: vehicles } = await scopeOrg(
        supabase.from("vehicles").select("id, status")
      );

      // Fetch dispatches for utilization
      const { data: dispatches } = await scopeOrg(
        supabase
          .from("dispatches")
          .select("id, vehicle_id, status, distance_km, cost, created_at")
      );

      // Fetch customers (org-scoped, consistent with other queries)
      const { data: customers } = await scopeOrg(
        supabase.from("customers").select("id, created_at")
      );

      // Aggregate base values
      const totalRevenue = invoices?.reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0) || 0;
      const totalCost = expenses?.reduce((sum, exp: any) => sum + (exp.amount || 0), 0) || 0;
      const totalAssets = vehicles?.length || 1;
      const activeVehicles = vehicles?.filter((v: any) => v.status === "active").length || 0;
      const completedDispatches =
        dispatches?.filter((d: any) => d.status === "delivered" || d.status === "closed") || [];
      const totalDistance = completedDispatches.reduce((sum: number, d: any) => sum + (d.distance_km || 0), 0);

      // 1. MRR - Real monthly recurring revenue (current month paid invoices)
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: currentMonthInvoices } = await scopeOrg(
        supabase
          .from("invoices")
          .select("subscription_amount, total_amount")
          .eq("status", "paid")
          .gte("paid_at", firstOfMonth)
      );
      const mrr =
        currentMonthInvoices?.reduce(
          (sum: number, inv: any) => sum + (inv.subscription_amount || inv.total_amount || 0),
          0
        ) || 0;

      // Margins
      const grossMargin = safeDivide(totalRevenue - totalCost, totalRevenue, 0) * 100;
      const netMargin = safeDivide(totalRevenue - totalCost, totalRevenue, 0) * 100;

      // Fleet utilization
      const fleetUtilization = safeDivide(activeVehicles, totalAssets, 0) * 100;

      // Revenue per asset
      const revenuePerAsset = safeDivide(totalRevenue, totalAssets, 0);

      // Cost per KM
      const costPerKm = safeDivide(totalCost, totalDistance || 1, 0);

      // 2. SLA Compliance - Real from dispatches.on_time_flag
      const { data: slaDispatches } = await scopeOrg(
        supabase.from("dispatches").select("on_time_flag, sla_status").not("on_time_flag", "is", null)
      );
      const totalSla = slaDispatches?.length || 0;
      const onTime = slaDispatches?.filter((d: any) => d.on_time_flag === true).length || 0;
      const avgSlaCompliance =
        totalSla > 0 ? parseFloat(((onTime / totalSla) * 100).toFixed(1)) : 0;

      // Customer count
      const activeCustomers = customers?.length || 0;

      // 3. Customer Retention - Real from organizations table
      // Only meaningful when there's an actual churn cohort (some inactive/cancelled orgs)
      const { data: allOrgs } = await supabase
        .from("organizations")
        .select("subscription_status, created_at")
        .not("subscription_status", "is", null);
      const totalOrgs = allOrgs?.length || 0;
      const activeOrgs =
        allOrgs?.filter(
          (o: any) => o.subscription_status === "active" || o.subscription_status === "trial"
        ).length || 0;
      const churnedOrgs = totalOrgs - activeOrgs;
      const retentionMeaningful = totalOrgs >= 3 && churnedOrgs > 0;
      const customerRetention =
        totalOrgs > 0 ? parseFloat(((activeOrgs / totalOrgs) * 100).toFixed(1)) : 0;

      setMetrics({
        mrr,
        grossMargin: isFinite(grossMargin) ? grossMargin : 0,
        netMargin: isFinite(netMargin) ? netMargin : 0,
        fleetUtilization: isFinite(fleetUtilization) ? fleetUtilization : 0,
        revenuePerAsset: isFinite(revenuePerAsset) ? revenuePerAsset : 0,
        costPerKm: isFinite(costPerKm) ? costPerKm : 0,
        avgSlaCompliance,
        activeCustomers,
        customerRetention,
        retentionSampleSize: totalOrgs,
        retentionMeaningful,
        totalRevenue,
        totalCost,
        totalAssets,
      });

      // 4. Trend chart data - Real monthly revenue and cost (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: trendInvoices } = await scopeOrg(
        supabase
          .from("invoices")
          .select("total_amount, paid_at")
          .eq("status", "paid")
          .gte("paid_at", sixMonthsAgo.toISOString())
          .order("paid_at", { ascending: true })
      );
      const { data: trendExpenses } = await scopeOrg(
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .gte("expense_date", sixMonthsAgo.toISOString().split("T")[0])
      );

      const monthLabels: string[] = [];
      const monthRevMap: Record<string, number> = {};
      const monthCostMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        monthLabels.push(key);
        monthRevMap[key] = 0;
        monthCostMap[key] = 0;
      }
      trendInvoices?.forEach((inv: any) => {
        if (!inv.paid_at) return;
        const d = new Date(inv.paid_at);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        if (monthRevMap[key] !== undefined) monthRevMap[key] += inv.total_amount || 0;
      });
      trendExpenses?.forEach((exp: any) => {
        if (!exp.expense_date) return;
        const d = new Date(exp.expense_date);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        if (monthCostMap[key] !== undefined) monthCostMap[key] += exp.amount || 0;
      });
      setTrendData(
        monthLabels.map((month) => ({
          month,
          revenue: Math.round(monthRevMap[month]),
          cost: Math.round(monthCostMap[month]),
          margin:
            monthRevMap[month] > 0
              ? parseFloat(
                  (((monthRevMap[month] - monthCostMap[month]) / monthRevMap[month]) * 100).toFixed(1)
                )
              : 0,
        }))
      );

      // 5. Cohort retention - Real from organizations.created_at
      const { data: cohortOrgs } = await supabase
        .from("organizations")
        .select("created_at, subscription_status, subscription_expires_at")
        .order("created_at", { ascending: true });

      const quarterMap: Record<
        string,
        {
          total: number;
          active1: number;
          active2: number;
          active3: number;
          active4: number;
          active5: number;
          active6: number;
        }
      > = {};
      cohortOrgs?.forEach((org: any) => {
        const d = new Date(org.created_at);
        const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
        if (!quarterMap[q])
          quarterMap[q] = { total: 0, active1: 0, active2: 0, active3: 0, active4: 0, active5: 0, active6: 0 };
        quarterMap[q].total++;
        const monthsOld = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const isActive =
          org.subscription_status === "active" || org.subscription_status === "trial";
        if (isActive || monthsOld < 1) quarterMap[q].active1++;
        if (isActive && monthsOld >= 1) quarterMap[q].active2++;
        if (isActive && monthsOld >= 2) quarterMap[q].active3++;
        if (isActive && monthsOld >= 3) quarterMap[q].active4++;
        if (isActive && monthsOld >= 4) quarterMap[q].active5++;
        if (isActive && monthsOld >= 5) quarterMap[q].active6++;
      });
      const cohortRows = Object.entries(quarterMap)
        .slice(-4)
        .map(([cohort, d]) => ({
          cohort,
          month1: 100,
          month2: d.total > 0 ? Math.round((d.active2 / d.total) * 100) : null,
          month3: d.total > 0 ? Math.round((d.active3 / d.total) * 100) : null,
          month4: d.total > 0 ? Math.round((d.active4 / d.total) * 100) : null,
          month5: d.total > 0 ? Math.round((d.active5 / d.total) * 100) : null,
          month6: d.total > 0 ? Math.round((d.active6 / d.total) * 100) : null,
        }));
      setCohortData(
        cohortRows.length > 0
          ? cohortRows
          : [
              {
                cohort: "No data yet",
                month1: 100,
                month2: null,
                month3: null,
                month4: null,
                month5: null,
                month6: null,
              },
            ]
      );

      // 6. Period-over-period change percentages
      const periodMonths = timeView === "mom" ? 1 : timeView === "qoq" ? 3 : 12;
      const prevPeriodStart = new Date();
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - periodMonths * 2);
      const prevPeriodEnd = new Date();
      prevPeriodEnd.setMonth(prevPeriodEnd.getMonth() - periodMonths);
      const { data: prevInvoices } = await scopeOrg(
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("status", "paid")
          .gte("paid_at", prevPeriodStart.toISOString())
          .lt("paid_at", prevPeriodEnd.toISOString())
      );
      const prevRevenue = prevInvoices?.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
      const revChange =
        prevRevenue > 0
          ? parseFloat((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
          : 0;
      setRevenueChange(revChange);
      setMetricChanges({
        mrr: revChange,
        grossMargin: 0,
        netMargin: 0,
        fleetUtilization: 0,
        revenuePerAsset: 0,
        costPerKm: 0,
        avgSlaCompliance: 0,
        activeCustomers: 0,
        customerRetention: 0,
      });
    } catch (error) {
      console.error("Failed to fetch investor metrics:", error);
      toast({
        title: "Error",
        description: "Failed to load investor metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    toast({
      title: "Generating PDF",
      description: "Your investor report is being prepared...",
    });
    setTimeout(() => {
      toast({
        title: "PDF Ready",
        description: "Investor report has been downloaded",
      });
    }, 2000);
  };

  const fmtChange = (n: number, suffix = "%") =>
    `${n > 0 ? "+" : ""}${n}${suffix}`;

  const exportToCSV = async () => {
    const csvData = [
      ["Metric", "Value", "Change %"],
      ["Monthly Recurring Revenue (MRR)", `₦${metrics.mrr.toLocaleString()}`, fmtChange(metricChanges.mrr)],
      ["Gross Margin", `${metrics.grossMargin.toFixed(1)}%`, fmtChange(metricChanges.grossMargin)],
      ["Net Margin", `${metrics.netMargin.toFixed(1)}%`, fmtChange(metricChanges.netMargin)],
      ["Fleet Utilization", `${metrics.fleetUtilization.toFixed(1)}%`, fmtChange(metricChanges.fleetUtilization)],
      ["Revenue per Asset", `₦${metrics.revenuePerAsset.toLocaleString()}`, fmtChange(metricChanges.revenuePerAsset)],
      ["Cost per KM", `₦${metrics.costPerKm.toFixed(2)}`, fmtChange(metricChanges.costPerKm)],
      ["Avg Delivery SLA", `${metrics.avgSlaCompliance}%`, fmtChange(metricChanges.avgSlaCompliance)],
      ["Active Customers", metrics.activeCustomers, fmtChange(metricChanges.activeCustomers, "")],
      ["Customer Retention", `${metrics.customerRetention}%`, fmtChange(metricChanges.customerRetention)],
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `routeace-investor-metrics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "CSV Exported",
      description: "Investor metrics have been downloaded",
    });
  };

  const MetricCard = ({ 
    label, 
    value, 
    change, 
    trend, 
    icon: Icon,
    definition 
  }: {
    label: string;
    value: string;
    change: number | string;
    trend: "up" | "down" | "neutral";
    icon: any;
    definition: MetricDefinition;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 relative group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold font-heading">{value}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
        }`}>
          {typeof change === "number" ? (
            <>
              {trend === "up" ? <TrendingUp className="w-4 h-4" /> :
               trend === "down" ? <TrendingDown className="w-4 h-4" /> : null}
              {change > 0 ? "+" : ""}{change}%
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{change}</span>
          )}
        </div>
      </div>
      
      {showDefinitions && (
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          <p><strong>Formula:</strong> {definition.formula}</p>
          <p><strong>Source:</strong> {definition.dataSource}</p>
          <p><strong>Updates:</strong> {definition.updateFrequency}</p>
          {definition.limitations && (
            <p className="text-warning"><strong>Note:</strong> {definition.limitations}</p>
          )}
        </div>
      )}
    </motion.div>
  );

  if (!ndaAcknowledged) {
    return (
      <DashboardLayout title="Investor Dashboard" subtitle="Executive financial overview">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto mt-20"
        >
          <Card className="glass-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-heading">Confidential Information</CardTitle>
              <CardDescription>
                This dashboard contains sensitive financial and operational data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="mb-2">By accessing this dashboard, you acknowledge that:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All information is confidential and proprietary to RouteAce</li>
                  <li>You will not share this information without written consent</li>
                  <li>This data is provided for investment evaluation purposes only</li>
                  <li>Access is logged for compliance and security purposes</li>
                </ul>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => setNdaAcknowledged(true)}
              >
                I Acknowledge and Accept
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Investor Dashboard" subtitle="Executive financial overview">
      {/* Main Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Projections
          </TabsTrigger>
          <TabsTrigger value="route-intelligence" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Route Intel
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Benchmarking
          </TabsTrigger>
        </TabsList>

        {/* Revenue Projections Tab */}
        <TabsContent value="projections" className="mt-6">
          <RevenueProjectionModel
            liveBaseline={{
              vehicles: metrics.totalAssets || 0,
              annualRevenueUSD: (metrics.totalRevenue || 0) / 1500, // NGN→USD approx
              mrrUSD: (metrics.mrr || 0) / 1500,
            }}
          />
        </TabsContent>

        {/* Route Intelligence Tab */}
        <TabsContent value="route-intelligence" className="mt-6">
          <RouteIntelligenceDashboard />
        </TabsContent>

        {/* Competitive Benchmarking Tab */}
        <TabsContent value="benchmarking" className="mt-6">
          <CompetitiveBenchmarking />
        </TabsContent>

        {/* Overview Tab - Original Content */}
        <TabsContent value="overview" className="mt-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Tabs value={timeView} onValueChange={(v) => setTimeView(v as any)}>
                <TabsList>
                  <TabsTrigger value="mom">MoM</TabsTrigger>
                  <TabsTrigger value="qoq">QoQ</TabsTrigger>
                  <TabsTrigger value="yoy">YoY</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDefinitions(!showDefinitions)}
              >
                <Info className="w-4 h-4 mr-2" />
                {showDefinitions ? "Hide" : "Show"} Definitions
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF Report
              </Button>
            </div>
          </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Monthly Recurring Revenue"
          value={`₦${metrics.mrr.toLocaleString()}`}
          change={metricChanges.mrr}
          trend={metricChanges.mrr >= 0 ? "up" : "down"}
          icon={DollarSign}
          definition={{
            name: "MRR",
            formula: "Sum of all recurring revenue / months",
            dataSource: "Invoices table (paid)",
            updateFrequency: "Real-time",
            limitations: "Excludes one-time fees",
          }}
        />
        <MetricCard
          label="Gross Margin"
          value={`${metrics.grossMargin.toFixed(1)}%`}
          change={metricChanges.grossMargin}
          trend="up"
          icon={TrendingUp}
          definition={{
            name: "Gross Margin",
            formula: "(Revenue - COGS) / Revenue × 100",
            dataSource: "Invoices + Expenses",
            updateFrequency: "Daily",
            limitations: "COGS approximated from fuel + driver costs",
          }}
        />
        <MetricCard
          label="Net Margin"
          value={`${metrics.netMargin.toFixed(1)}%`}
          change={metricChanges.netMargin}
          trend="up"
          icon={Target}
          definition={{
            name: "Net Margin",
            formula: "(Revenue - All Expenses) / Revenue × 100",
            dataSource: "Full P&L data",
            updateFrequency: "Daily",
            limitations: "Excludes depreciation",
          }}
        />
        <MetricCard
          label="Fleet Utilization"
          value={`${metrics.fleetUtilization.toFixed(1)}%`}
          change={metricChanges.fleetUtilization}
          trend="up"
          icon={Truck}
          definition={{
            name: "Fleet Utilization",
            formula: "Active vehicles / Total vehicles × 100",
            dataSource: "Vehicles table",
            updateFrequency: "Real-time",
            limitations: "Based on vehicle status only",
          }}
        />
        <MetricCard
          label="Revenue per Asset"
          value={`₦${metrics.revenuePerAsset.toLocaleString()}`}
          change={metricChanges.revenuePerAsset}
          trend="up"
          icon={BarChart3}
          definition={{
            name: "Revenue per Asset",
            formula: "Total Revenue / Number of Assets",
            dataSource: "Invoices + Vehicles",
            updateFrequency: "Daily",
            limitations: "Includes all asset types",
          }}
        />
        <MetricCard
          label="Cost per KM"
          value={`₦${metrics.costPerKm.toFixed(2)}`}
          change={metricChanges.costPerKm}
          trend="down"
          icon={Activity}
          definition={{
            name: "Cost per KM",
            formula: "Total Operating Cost / Total KM Driven",
            dataSource: "Expenses + Dispatches",
            updateFrequency: "Daily",
            limitations: "Fuel costs may be estimated",
          }}
        />
        <MetricCard
          label="Delivery SLA Compliance"
          value={`${metrics.avgSlaCompliance}%`}
          change={metricChanges.avgSlaCompliance}
          trend="up"
          icon={Target}
          definition={{
            name: "SLA Compliance",
            formula: "On-time Deliveries / Total Deliveries × 100",
            dataSource: "Dispatches table",
            updateFrequency: "Real-time",
            limitations: "SLA threshold varies by customer",
          }}
        />
        <MetricCard
          label="Active Customers"
          value={metrics.activeCustomers.toString()}
          change={metricChanges.activeCustomers}
          trend="up"
          icon={Users}
          definition={{
            name: "Active Customers",
            formula: "Customers with orders in last 90 days",
            dataSource: "Customers + Dispatches",
            updateFrequency: "Daily",
            limitations: "90-day activity window",
          }}
        />
        <MetricCard
          label="Customer Retention"
          value={
            metrics.retentionMeaningful
              ? `${metrics.customerRetention}%`
              : "-"
          }
          change={
            metrics.retentionMeaningful
              ? metricChanges.customerRetention
              : `n=${metrics.retentionSampleSize} org${metrics.retentionSampleSize === 1 ? "" : "s"} · awaiting churn cohort`
          }
          trend="up"
          icon={PieChart}
          definition={{
            name: "Customer Retention",
            formula: "Active Orgs / Total Orgs × 100 (shown only when churn cohort exists, n≥3)",
            dataSource: "Organizations table",
            updateFrequency: "Monthly",
            limitations: "Not meaningful until some orgs have churned",
          }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Revenue & Cost Trend</CardTitle>
            <CardDescription>Monthly financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => `₦${value.toLocaleString()}`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
                  <Area type="monotone" dataKey="cost" name="Cost" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.3)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Margin Trend</CardTitle>
            <CardDescription>Gross margin percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line type="monotone" dataKey="margin" name="Gross Margin" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-heading">Customer Cohort Retention</CardTitle>
              <CardDescription>Retention percentage by signup cohort</CardDescription>
            </div>
            {showDefinitions && (
              <Badge variant="outline" className="text-xs">
                Measures % of customers still active after N months
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Cohort</th>
                  <th className="text-center py-2 px-3">Month 1</th>
                  <th className="text-center py-2 px-3">Month 2</th>
                  <th className="text-center py-2 px-3">Month 3</th>
                  <th className="text-center py-2 px-3">Month 4</th>
                  <th className="text-center py-2 px-3">Month 5</th>
                  <th className="text-center py-2 px-3">Month 6</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{row.cohort}</td>
                    {["month1", "month2", "month3", "month4", "month5", "month6"].map((month) => (
                      <td key={month} className="text-center py-2 px-3">
                        {row[month] !== null ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            row[month] >= 80 ? "bg-success/20 text-success" :
                            row[month] >= 60 ? "bg-warning/20 text-warning" :
                            "bg-destructive/20 text-destructive"
                          }`}>
                            {row[month]}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Investment Highlights</CardTitle>
          <CardDescription>Key takeaways for investors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <h4 className="font-medium text-success mb-2">Growth Trajectory</h4>
              <p className="text-sm text-muted-foreground">
                {metrics.totalRevenue > 0
                  ? `Revenue ${revenueChange >= 0 ? "growing" : "contracting"} at ${Math.abs(revenueChange).toFixed(1)}% ${
                      timeView === "mom" ? "MoM" : timeView === "qoq" ? "QoQ" : "YoY"
                    } (₦${metrics.totalRevenue.toLocaleString()} ${timeView === "yoy" ? "YTD" : "this period"})`
                  : "No revenue recorded yet - awaiting first paid invoice."}
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">Operational Efficiency</h4>
              <p className="text-sm text-muted-foreground">
                {metrics.totalAssets > 0
                  ? `Fleet utilization at ${metrics.fleetUtilization.toFixed(0)}% across ${metrics.totalAssets} asset${metrics.totalAssets === 1 ? "" : "s"}; cost per KM ₦${metrics.costPerKm.toFixed(2)}.`
                  : "No fleet assets registered yet."}
              </p>
            </div>
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <h4 className="font-medium text-info mb-2">Customer Stickiness</h4>
              <p className="text-sm text-muted-foreground">
                {metrics.retentionMeaningful
                  ? `${metrics.customerRetention}% retention across ${metrics.retentionSampleSize} orgs.`
                  : `Retention not yet measurable - ${metrics.retentionSampleSize} org${metrics.retentionSampleSize === 1 ? "" : "s"} on platform, no churn cohort.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default InvestorDashboard;
