import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Brain,
  Zap,
  Target,
  PieChart,
  LineChart,
  AlertCircle,
  MessageSquare,
  GitBranch,
  Server,
  Truck,
  Receipt,
  Shield,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { CoreRole } from "@/hooks/useCoreAuth";
import AIInsightCards from "@/components/core/AIInsightCards";
import PredictiveKPIs from "@/components/core/PredictiveKPIs";

interface IntelligenceMetrics {
  // Users
  totalUsers: number;
  dau: number;
  mau: number;
  dauMauRatio: number;
  newUsersThisMonth: number;
  // Revenue
  mrr: number;
  arr: number;
  totalRevenue: number;
  outstandingAmount: number;
  invoicesGenerated: number;
  paidInvoices: number;
  // Operations
  totalDispatches: number;
  dispatchesThisMonth: number;
  deliveredDispatches: number;
  onTimeDispatches: number;
  lateDispatches: number;
  avgDeliveryHours: number;
  // API / Technical
  apiCalls: number;
  apiLatency: number;
  errorRate: number;
  successRate: number;
  activeApiKeys: number;
  // Engineering
  failedJobs: number;
  pendingJobs: number;
  // Growth
  newSignups30d: number;
  orgsCount: number;
  orgsByTier: { tier: string; count: number }[];
  // Errors from api logs
  recentErrors: { type: string; count: number; severity: string }[];
}

const EMPTY: IntelligenceMetrics = {
  totalUsers: 0, dau: 0, mau: 0, dauMauRatio: 0, newUsersThisMonth: 0,
  mrr: 0, arr: 0, totalRevenue: 0, outstandingAmount: 0,
  invoicesGenerated: 0, paidInvoices: 0,
  totalDispatches: 0, dispatchesThisMonth: 0, deliveredDispatches: 0,
  onTimeDispatches: 0, lateDispatches: 0, avgDeliveryHours: 0,
  apiCalls: 0, apiLatency: 0, errorRate: 0, successRate: 100, activeApiKeys: 0,
  failedJobs: 0, pendingJobs: 0,
  newSignups30d: 0, orgsCount: 0, orgsByTier: [],
  recentErrors: [],
};

const CoreIntelligence = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [coreRole, setCoreRole] = useState<CoreRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<IntelligenceMetrics>(EMPTY);

  useEffect(() => {
    checkAccess();
    loadMetrics();
    const path = location.pathname.split("/").pop();
    if (path && path !== "intelligence") setActiveTab(path);
  }, [location]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/core/login"); return; }

      const { data: rolesData } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);

      const roles = (rolesData ?? []).map((r: any) => r.role as string);
      const role = roles.find((r) => r.startsWith("core_") || r === "internal_team") ?? roles[0];
      const allowedRoles = ["core_founder", "core_cofounder", "core_product", "core_analyst"];

      if (!allowedRoles.includes(role)) {
        toast({ title: "Access Denied", description: "This intelligence module is restricted to authorized Core Team members.", variant: "destructive" });
        navigate("/core/dashboard");
        return;
      }

      setCoreRole(role as CoreRole);
      setLoading(false);
    } catch {
      navigate("/core/login");
    }
  };

  const loadMetrics = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        totalUsersRes,
        newUsersRes,
        dauRes,
        mauRes,
        allDispatchesRes,
        monthDispatchesRes,
        allInvoicesRes,
        mrrInvoicesRes,
        apiLogsRes,
        apiKeysRes,
        orgsRes,
        failedJobsRes,
        pendingJobsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        supabase.from("user_sessions").select("user_id").gte("login_at", oneDayAgo),
        supabase.from("user_sessions").select("user_id").gte("login_at", thirtyDaysAgo),
        supabase.from("dispatches").select("id, status, on_time_flag, actual_delivery, scheduled_delivery, created_at"),
        supabase.from("dispatches").select("id", { count: "exact", head: true }).gte("created_at", thisMonthStart),
        supabase.from("invoices").select("id, total_amount, status, created_at"),
        supabase.from("invoices").select("total_amount").eq("status", "paid").gte("created_at", thisMonthStart),
        supabase.from("api_request_logs").select("status_code, response_time_ms, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("organizations").select("id, subscription_tier").eq("is_active", true),
        supabase.from("api_request_logs").select("id", { count: "exact", head: true }).gte("status_code", 500).gte("created_at", oneDayAgo),
        supabase.from("api_request_logs").select("id", { count: "exact", head: true }).gte("status_code", 400).lt("status_code", 500).gte("created_at", oneDayAgo),
      ]);

      // Users
      const totalUsers = totalUsersRes.count || 0;
      const newUsersThisMonth = newUsersRes.count || 0;
      const dau = new Set((dauRes.data || []).map((s: any) => s.user_id)).size;
      const mau = new Set((mauRes.data || []).map((s: any) => s.user_id)).size;
      const dauMauRatio = mau > 0 ? (dau / mau) * 100 : 0;

      // Dispatches
      const dispatches = allDispatchesRes.data || [];
      const totalDispatches = dispatches.length;
      const dispatchesThisMonth = monthDispatchesRes.count || 0;
      const deliveredDispatches = dispatches.filter((d) => d.status === "delivered").length;
      const onTimeDispatches = dispatches.filter((d) => d.on_time_flag === true).length;
      const lateDispatches = dispatches.filter((d) => d.on_time_flag === false).length;

      // Avg delivery hours for delivered dispatches that have both timestamps
      const deliveredWithTimes = dispatches.filter(
        (d) => d.status === "delivered" && d.actual_delivery && d.scheduled_delivery
      );
      const avgDeliveryHours =
        deliveredWithTimes.length > 0
          ? deliveredWithTimes.reduce((sum, d) => {
              const diff = new Date(d.actual_delivery).getTime() - new Date(d.scheduled_delivery).getTime();
              return sum + Math.abs(diff) / 3_600_000;
            }, 0) / deliveredWithTimes.length
          : 0;

      // Revenue
      const allInvoices = allInvoicesRes.data || [];
      const totalRevenue = allInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
      const outstandingAmount = allInvoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + (i.total_amount || 0), 0);
      const mrr = (mrrInvoicesRes.data || []).reduce((s, i) => s + (i.total_amount || 0), 0);
      const arr = mrr * 12;
      const invoicesGenerated = allInvoices.length;
      const paidInvoices = allInvoices.filter((i) => i.status === "paid").length;

      // API
      const apiLogs = apiLogsRes.data || [];
      const apiCalls = apiLogs.length;
      const apiLatency = apiCalls > 0 ? apiLogs.reduce((s, l: any) => s + (l.response_time_ms || 0), 0) / apiCalls : 0;
      const errorCalls = apiLogs.filter((l: any) => l.status_code && l.status_code >= 400).length;
      const errorRate = apiCalls > 0 ? (errorCalls / apiCalls) * 100 : 0;
      const successRate = 100 - errorRate;
      const activeApiKeys = apiKeysRes.count || 0;

      // Orgs by tier
      const tierMap: Record<string, number> = {};
      (orgsRes.data || []).forEach((o: any) => {
        tierMap[o.subscription_tier] = (tierMap[o.subscription_tier] || 0) + 1;
      });
      const orgsByTier = Object.entries(tierMap).map(([tier, count]) => ({ tier, count }));
      const orgsCount = (orgsRes.data || []).length;

      // Engineering
      const failedJobs = failedJobsRes.count || 0;
      const pendingJobs = pendingJobsRes.count || 0;

      // Error breakdown from api logs
      const clientErrors = apiLogs.filter((l: any) => l.status_code >= 400 && l.status_code < 500).length;
      const serverErrors = apiLogs.filter((l: any) => l.status_code >= 500).length;
      const recentErrors = [];
      if (serverErrors > 0) recentErrors.push({ type: "Server Errors (5xx)", count: serverErrors, severity: "error" });
      if (clientErrors > 0) recentErrors.push({ type: "Client Errors (4xx)", count: clientErrors, severity: "warn" });
      if (failedJobs > 0) recentErrors.push({ type: "Failed Email Jobs", count: failedJobs, severity: "warn" });

      setMetrics({
        totalUsers, dau, mau, dauMauRatio, newUsersThisMonth,
        mrr, arr, totalRevenue, outstandingAmount, invoicesGenerated, paidInvoices,
        totalDispatches, dispatchesThisMonth, deliveredDispatches, onTimeDispatches, lateDispatches, avgDeliveryHours,
        apiCalls, apiLatency, errorRate, successRate, activeApiKeys,
        failedJobs, pendingJobs,
        newSignups30d: newUsersThisMonth, orgsCount, orgsByTier,
        recentErrors,
      });
    } catch (error) {
      console.error("Error loading intelligence metrics:", error);
    }
  };

  const getRoleBadgeColor = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "core_cofounder": return "bg-amber-400/20 text-amber-300 border-amber-400/30";
      case "core_product": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "core_analyst": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getRoleLabel = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "FOUNDER";
      case "core_cofounder": return "CO-FOUNDER";
      case "core_product": return "PRODUCT MANAGER";
      case "core_analyst": return "DATA ANALYST";
      default: return "CORE TEAM";
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/core/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Derived
  const onTimeRate = metrics.totalDispatches > 0
    ? (metrics.onTimeDispatches / metrics.totalDispatches) * 100 : 0;
  const deliveryRate = metrics.totalDispatches > 0
    ? (metrics.deliveredDispatches / metrics.totalDispatches) * 100 : 0;
  const collectionRate = (metrics.totalRevenue + metrics.outstandingAmount) > 0
    ? (metrics.totalRevenue / (metrics.totalRevenue + metrics.outstandingAmount)) * 100 : 0;
  const maxOrgTier = Math.max(...metrics.orgsByTier.map((t) => t.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/5">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/core/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">Product & Tech Intelligence</h1>
              <p className="text-xs text-muted-foreground">Core System Analytics Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={`${getRoleBadgeColor(coreRole)} border`}>{getRoleLabel(coreRole)}</Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-2"><PieChart className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="ai-insights" className="gap-2"><Sparkles className="w-4 h-4" />AI Insights</TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2"><Brain className="w-4 h-4" />Predictive KPIs</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
            {(coreRole === "core_founder" || coreRole === "core_cofounder") && (
              <TabsTrigger value="revenue" className="gap-2"><DollarSign className="w-4 h-4" />Revenue</TabsTrigger>
            )}
            <TabsTrigger value="growth" className="gap-2"><TrendingUp className="w-4 h-4" />Growth</TabsTrigger>
            <TabsTrigger value="operations" className="gap-2"><Truck className="w-4 h-4" />Operations</TabsTrigger>
            <TabsTrigger value="finance" className="gap-2"><Receipt className="w-4 h-4" />Finance</TabsTrigger>
            <TabsTrigger value="api" className="gap-2"><GitBranch className="w-4 h-4" />API</TabsTrigger>
            <TabsTrigger value="errors" className="gap-2"><AlertCircle className="w-4 h-4" />Errors</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Daily Active Users" value={metrics.dau.toLocaleString()} icon={Users} sub="Unique logins today" />
              <IntelCard title="Monthly Active Users" value={metrics.mau.toLocaleString()} icon={Activity} sub="Unique logins (30d)" />
              <IntelCard title="DAU/MAU Ratio" value={`${metrics.dauMauRatio.toFixed(1)}%`} icon={Target} sub="Stickiness" />
              <IntelCard title="Total Platform Users" value={metrics.totalUsers.toLocaleString()} icon={Shield} sub="All registered profiles" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-purple-400" />Key Metrics Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MetricRow label="Paid Revenue" value={`₦${(metrics.totalRevenue / 1_000_000).toFixed(2)}M`} progress={Math.min((metrics.totalRevenue / 5_000_000) * 100, 100)} />
                  <MetricRow label="Delivery Rate" value={`${deliveryRate.toFixed(1)}%`} progress={deliveryRate} />
                  <MetricRow label="API Success Rate" value={`${metrics.successRate.toFixed(2)}%`} progress={metrics.successRate} />
                  <MetricRow label="On-Time Rate" value={`${onTimeRate.toFixed(1)}%`} progress={onTimeRate} />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />Organisations by Tier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics.orgsByTier.length > 0 ? metrics.orgsByTier.map((t) => (
                    <div key={t.tier} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{t.tier}</span>
                        <span className="font-mono">{t.count} org{t.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${(t.count / maxOrgTier) * 100}%` }} />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No active organisations yet.</p>
                  )}
                  <div className="pt-2 border-t border-border/50 text-sm flex justify-between">
                    <span className="text-muted-foreground">Total Active Orgs</span>
                    <span className="font-bold">{metrics.orgsCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights */}
          <TabsContent value="ai-insights" className="space-y-6">
            <AIInsightCards />
          </TabsContent>

          {/* Predictive KPIs */}
          <TabsContent value="predictions" className="space-y-6">
            <PredictiveKPIs />
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Total Users" value={metrics.totalUsers.toLocaleString()} icon={Users} sub="All profiles" />
              <IntelCard title="Active Today" value={metrics.dau.toLocaleString()} icon={Activity} sub="Unique sessions (24h)" />
              <IntelCard title="Active This Month" value={metrics.mau.toLocaleString()} icon={Target} sub="Unique sessions (30d)" />
              <IntelCard title="New This Month" value={metrics.newUsersThisMonth.toLocaleString()} icon={TrendingUp} sub="Signups since month start" />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Computed from user_sessions table</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="DAU/MAU (Stickiness)" value={`${metrics.dauMauRatio.toFixed(1)}%`} progress={metrics.dauMauRatio} />
                <MetricRow
                  label="Monthly Activation Rate"
                  value={metrics.totalUsers > 0 ? `${Math.min(Math.round((metrics.mau / metrics.totalUsers) * 100), 100)}%` : "—"}
                  progress={metrics.totalUsers > 0 ? Math.min((metrics.mau / metrics.totalUsers) * 100, 100) : 0}
                />
                <MetricRow
                  label="New User Growth (30d)"
                  value={`${metrics.newUsersThisMonth} new users`}
                  progress={metrics.totalUsers > 0 ? Math.min((metrics.newUsersThisMonth / metrics.totalUsers) * 100 * 5, 100) : 0}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue — Founder / Co-founder only */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="MRR" value={`₦${(metrics.mrr / 1_000_000).toFixed(2)}M`} icon={DollarSign} sub="Paid invoices this month" />
              <IntelCard title="ARR (est.)" value={`₦${(metrics.arr / 1_000_000).toFixed(2)}M`} icon={TrendingUp} sub="MRR × 12" />
              <IntelCard title="Total Collected" value={`₦${(metrics.totalRevenue / 1_000_000).toFixed(2)}M`} icon={Target} sub="All-time paid invoices" />
              <IntelCard title="Outstanding" value={`₦${(metrics.outstandingAmount / 1_000_000).toFixed(2)}M`} icon={AlertTriangle} sub="Pending + overdue" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Organisations by Subscription Tier</CardTitle>
                  <CardDescription>Active organisations on each plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics.orgsByTier.length > 0 ? metrics.orgsByTier.map((t) => (
                    <div key={t.tier} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{t.tier}</span>
                        <span className="font-mono">{t.count} org{t.count !== 1 ? "s" : ""}</span>
                      </div>
                      <Progress value={(t.count / maxOrgTier) * 100} className="h-2" />
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No active organisations found.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Billing Summary</CardTitle>
                  <CardDescription>Derived from invoices table</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Total Invoices</span>
                    <span className="font-bold">{metrics.invoicesGenerated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Paid Invoices</span>
                    <span className="font-bold text-green-400">{metrics.paidInvoices.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Collection Rate</span>
                    <span className={`font-bold ${collectionRate >= 80 ? "text-green-400" : "text-amber-400"}`}>
                      {collectionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Outstanding Balance</span>
                    <span className={`font-bold ${metrics.outstandingAmount > 0 ? "text-amber-400" : "text-green-400"}`}>
                      ₦{(metrics.outstandingAmount / 1_000).toFixed(0)}K
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth */}
          <TabsContent value="growth" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="New Signups (30d)" value={metrics.newSignups30d.toLocaleString()} icon={Users} sub="Profiles created this month" />
              <IntelCard title="Active This Month" value={metrics.mau.toLocaleString()} icon={Activity} sub="MAU from sessions" />
              <IntelCard
                title="Activation Rate"
                value={metrics.newSignups30d > 0 ? `${Math.min(Math.round((metrics.mau / metrics.totalUsers) * 100), 100)}%` : "—"}
                icon={Zap}
                sub="MAU / total users"
              />
              <IntelCard title="Total Organisations" value={metrics.orgsCount.toLocaleString()} icon={TrendingUp} sub="Active tenants" />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Platform Funnel</CardTitle>
                <CardDescription>Derived from profiles, sessions, and invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { stage: "Registered Users", count: metrics.totalUsers, pct: 100 },
                  { stage: "Active This Month (MAU)", count: metrics.mau, pct: metrics.totalUsers > 0 ? (metrics.mau / metrics.totalUsers) * 100 : 0 },
                  { stage: "Active Organisations", count: metrics.orgsCount, pct: metrics.totalUsers > 0 ? (metrics.orgsCount / metrics.totalUsers) * 100 : 0 },
                  { stage: "Paying (Invoiced)", count: metrics.paidInvoices, pct: metrics.invoicesGenerated > 0 ? (metrics.paidInvoices / metrics.invoicesGenerated) * 100 : 0 },
                ].map((item, i) => (
                  <div key={item.stage} className="relative">
                    <div
                      className="h-12 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 flex items-center px-4"
                      style={{ width: `${Math.max(item.pct, 15)}%` }}
                    >
                      <span className="font-medium text-sm">{item.stage}</span>
                      <span className="ml-auto font-mono text-sm">{item.count.toLocaleString()}</span>
                    </div>
                    {i < 3 && (
                      <div className="text-xs text-muted-foreground ml-4 my-1">
                        ↓ {item.pct.toFixed(1)}% of registered users
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Total Dispatches" value={metrics.totalDispatches.toLocaleString()} icon={Truck} sub="All-time" />
              <IntelCard title="This Month" value={metrics.dispatchesThisMonth.toLocaleString()} icon={Activity} sub="Created since month start" />
              <IntelCard title="Delivered" value={metrics.deliveredDispatches.toLocaleString()} icon={CheckCircle} sub={`${deliveryRate.toFixed(1)}% rate`} />
              <IntelCard title="On-Time" value={metrics.onTimeDispatches.toLocaleString()} icon={Target} sub={`${onTimeRate.toFixed(1)}% rate`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                  <CardDescription>From dispatches table — on_time_flag + status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MetricRow label="Delivery Rate" value={`${deliveryRate.toFixed(1)}%`} progress={deliveryRate} />
                  <MetricRow label="On-Time Rate" value={`${onTimeRate.toFixed(1)}%`} progress={onTimeRate} />
                  <MetricRow
                    label="Late Deliveries"
                    value={`${metrics.lateDispatches.toLocaleString()} dispatches`}
                    progress={metrics.totalDispatches > 0 ? 100 - (metrics.lateDispatches / metrics.totalDispatches) * 100 : 100}
                  />
                  {metrics.avgDeliveryHours > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Avg Delivery Window</span>
                      <span className="font-mono">{metrics.avgDeliveryHours.toFixed(1)}h</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Dispatch Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Delivered", count: metrics.deliveredDispatches, color: "text-green-400" },
                    { label: "On-Time", count: metrics.onTimeDispatches, color: "text-blue-400" },
                    { label: "Late", count: metrics.lateDispatches, color: "text-amber-400" },
                    { label: "Other / In Progress", count: metrics.totalDispatches - metrics.deliveredDispatches, color: "text-muted-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-mono font-medium ${item.color}`}>{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Invoices Generated" value={metrics.invoicesGenerated.toLocaleString()} icon={Receipt} sub="All invoices" />
              <IntelCard title="Collections" value={`₦${(metrics.totalRevenue / 1_000_000).toFixed(2)}M`} icon={DollarSign} sub="All-time paid" />
              <IntelCard title="Outstanding" value={`₦${(metrics.outstandingAmount / 1_000_000).toFixed(2)}M`} icon={AlertTriangle} sub="Pending + overdue" />
              <IntelCard title="Collection Rate" value={`${collectionRate.toFixed(1)}%`} icon={CheckCircle} sub="Paid / total invoiced" />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Invoice Breakdown</CardTitle>
                <CardDescription>From invoices table</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="Paid Invoices" value={`${metrics.paidInvoices} / ${metrics.invoicesGenerated}`} progress={metrics.invoicesGenerated > 0 ? (metrics.paidInvoices / metrics.invoicesGenerated) * 100 : 0} />
                <MetricRow label="Collection Rate" value={`${collectionRate.toFixed(1)}%`} progress={collectionRate} />
                <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">MRR (this month)</span>
                  <span className="font-mono font-bold">₦{(metrics.mrr / 1_000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ARR Estimate</span>
                  <span className="font-mono font-bold">₦{(metrics.arr / 1_000_000).toFixed(2)}M</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API */}
          <TabsContent value="api" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="API Calls (Logged)" value={metrics.apiCalls.toLocaleString()} icon={GitBranch} sub="From api_request_logs" />
              <IntelCard title="Avg Latency" value={`${metrics.apiLatency.toFixed(0)}ms`} icon={Zap} sub="Mean response time" />
              <IntelCard title="Success Rate" value={`${metrics.successRate.toFixed(2)}%`} icon={CheckCircle} sub="Non-4xx/5xx responses" />
              <IntelCard title="Active API Keys" value={metrics.activeApiKeys.toLocaleString()} icon={Shield} sub="Issued and active" />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>API Health</CardTitle>
                <CardDescription>Last 500 logged requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="Success Rate" value={`${metrics.successRate.toFixed(2)}%`} progress={metrics.successRate} />
                <MetricRow label="Error Rate" value={`${metrics.errorRate.toFixed(2)}%`} progress={100 - metrics.errorRate} />
                <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Avg Latency</span>
                  <span className={`font-mono ${metrics.apiLatency > 500 ? "text-red-400" : metrics.apiLatency > 200 ? "text-amber-400" : "text-green-400"}`}>
                    {metrics.apiLatency.toFixed(0)}ms
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors */}
          <TabsContent value="errors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="API Error Rate" value={`${metrics.errorRate.toFixed(2)}%`} icon={AlertCircle} sub="4xx + 5xx in last 500 calls" />
              <IntelCard title="Failed Jobs" value={metrics.failedJobs.toLocaleString()} icon={AlertTriangle} sub="Email queue failures" />
              <IntelCard title="Queue Backlog" value={metrics.pendingJobs.toLocaleString()} icon={Activity} sub="Pending email jobs" />
              <IntelCard title="Uptime" value={metrics.errorRate < 1 ? "Healthy" : "Degraded"} icon={Server} sub={`${(100 - metrics.errorRate).toFixed(2)}% success`} />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Error Summary</CardTitle>
                <CardDescription>Computed from api_request_logs (last 500 requests)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.recentErrors.length > 0 ? (
                  metrics.recentErrors.map((err, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        err.severity === "error"
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 ${err.severity === "error" ? "text-red-400" : "text-amber-400"}`} />
                      <span className="flex-1">{err.type}</span>
                      <Badge variant="secondary">{err.count}x</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">No errors detected in current log window.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

interface IntelCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}

const IntelCard = ({ title, value, icon: Icon, sub }: IntelCardProps) => (
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-purple-400" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface MetricRowProps {
  label: string;
  value: string;
  progress: number;
}

const MetricRow = ({ label, value, progress }: MetricRowProps) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
    <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-2" />
  </div>
);

export default CoreIntelligence;
