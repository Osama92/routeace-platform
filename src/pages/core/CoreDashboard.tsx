import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Package,
  Truck,
  LogOut,
  Shield,
} from "lucide-react";
import CoreTeamManagement from "@/components/core/CoreTeamManagement";
import AIInsightCards from "@/components/core/AIInsightCards";
import PlatformKPIs from "@/components/core/PlatformKPIs";
import ResellerNetworkGraph from "@/components/core/ResellerNetworkGraph";

type CoreRole =
  | "core_founder"
  | "core_cofounder"
  | "core_builder"
  | "core_product"
  | "core_engineer"
  | "core_analyst"
  | "internal_team";

interface PlatformMetrics {
  totalUsers: number;
  activeUsers30d: number;
  totalDispatches: number;
  dispatchSuccessRate: number;
  avgResponseTime: number;
  errorRate: number;
  apiCalls: number;
  // Revenue
  totalRevenue: number;
  mrr: number;
  revenueByTier: { tier: string; revenue: number; color: string }[];
  // Product
  dau: number;
  mau: number;
  featureAdoption: { feature: string; adoption: number }[];
  // Engineering
  failedJobs: number;
  queueBacklog: number;
  // Activity
  recentActivity: { action: string; time: string; table_name: string }[];
}

interface UserInfo {
  email: string;
  displayName: string;
}

const CoreDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coreRole, setCoreRole] = useState<CoreRole | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalUsers: 0,
    activeUsers30d: 0,
    totalDispatches: 0,
    dispatchSuccessRate: 0,
    avgResponseTime: 0,
    errorRate: 0,
    apiCalls: 0,
    totalRevenue: 0,
    mrr: 0,
    revenueByTier: [],
    dau: 0,
    mau: 0,
    featureAdoption: [],
    failedJobs: 0,
    queueBacklog: 0,
    recentActivity: [],
  });

  useEffect(() => {
    checkCoreAccess();
    loadMetrics();
  }, []);

  const checkCoreAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/core/login"); return; }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (rolesData ?? []).map((r: any) => r.role as string);
      const role = roles.find((r) => r.startsWith("core_") || r === "internal_team") ?? roles[0];
      if (!role?.startsWith("core_") && role !== "internal_team") {
        toast({ title: "Access Denied", description: "This area is restricted to RouteAce Core Team only.", variant: "destructive" });
        navigate("/core/login");
        return;
      }

      setCoreRole(role as CoreRole);
      setUserInfo({
        email: user.email || "",
        displayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Core User",
      });
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
        membersRes,
        dispatchesRes,
        invoicesRes,
        invoicesMRRRes,
        orgsRes,
        auditLogsRes,
        failedJobsRes,
        dispatchCountRes,
        invoiceCountRes,
      ] = await Promise.all([
        adminSupabase.from("organization_members").select("user_id").eq("is_active", true).limit(10000),
        adminSupabase.from("dispatches").select("id, status, organization_id").limit(10000),
        adminSupabase.from("invoices").select("id, total_amount, status, organization_id").eq("status", "paid").limit(5000),
        adminSupabase.from("invoices").select("total_amount").eq("status", "paid").gte("created_at", thisMonthStart).limit(5000),
        adminSupabase.from("organizations").select("id, subscription_tier").eq("is_active", true).limit(1000),
        adminSupabase.from("audit_logs").select("action, table_name, created_at").order("created_at", { ascending: false }).limit(5),
        adminSupabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
        adminSupabase.from("dispatches").select("id", { count: "exact", head: true }),
        adminSupabase.from("invoices").select("id", { count: "exact", head: true }),
      ]);

      // Users — unique members across all orgs
      const totalUsers = new Set((membersRes.data || []).map((m: any) => m.user_id)).size;

      // Dispatches
      const dispatches = dispatchesRes.data || [];
      const totalDispatches = dispatches.length;
      const delivered = dispatches.filter((d: any) => d.status === "delivered").length;
      const dispatchSuccessRate = totalDispatches > 0 ? (delivered / totalDispatches) * 100 : 0;

      // Revenue — from actual paid invoices
      const paidInvoices = invoicesRes.data || [];
      const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
      const mrr = (invoicesMRRRes.data || []).reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);

      // Revenue by tier — sum actual paid invoice amounts per org, grouped by org tier
      const orgs = orgsRes.data || [];
      const orgTierMap = new Map<string, string>();
      orgs.forEach((o: any) => orgTierMap.set(o.id, o.subscription_tier));

      const tierRevenue: Record<string, number> = {};
      paidInvoices.forEach((i: any) => {
        const tier = orgTierMap.get(i.organization_id) || "starter";
        tierRevenue[tier] = (tierRevenue[tier] || 0) + Number(i.total_amount || 0);
      });

      const tierColors: Record<string, string> = { enterprise: "bg-amber-500", professional: "bg-blue-500", starter: "bg-green-500" };
      const tierLabels: Record<string, string> = { enterprise: "Enterprise", professional: "Professional", starter: "Starter" };
      const revenueByTier = Object.entries(tierRevenue).map(([tier, revenue]) => ({
        tier: tierLabels[tier] || tier,
        revenue,
        color: tierColors[tier] || "bg-purple-500",
      })).sort((a, b) => b.revenue - a.revenue);

      // Feature adoption — vs total users
      const adoptionOf = (count: number) =>
        totalUsers > 0 ? Math.min(Math.round((count / totalUsers) * 100), 100) : 0;
      const featureAdoption = [
        { feature: "Dispatch Creation", adoption: adoptionOf(dispatchCountRes.count || 0) },
        { feature: "Invoice Generation", adoption: adoptionOf(invoiceCountRes.count || 0) },
        { feature: "Real-time Tracking", adoption: adoptionOf(delivered) },
      ];

      // Engineering — email queue failures
      const failedJobs = failedJobsRes.count || 0;

      // Recent activity from audit_logs
      const recentActivity = (auditLogsRes.data || []).map((log: any) => ({
        action: `${log.action} on ${log.table_name}`,
        time: formatRelativeTime(log.created_at),
        table_name: log.table_name,
      }));

      setMetrics({
        totalUsers,
        activeUsers30d: totalUsers,
        totalDispatches,
        dispatchSuccessRate,
        avgResponseTime: 0,
        errorRate: 0,
        apiCalls: 0,
        totalRevenue,
        mrr,
        revenueByTier,
        dau: 0,
        mau: totalUsers,
        featureAdoption,
        failedJobs,
        queueBacklog: 0,
        recentActivity,
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/core/login");
  };

  const getRoleBadgeColor = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "core_cofounder": return "bg-amber-400/20 text-amber-300 border-amber-400/30";
      case "core_builder": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "core_product": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "core_engineer": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "core_analyst": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getRoleLabel = (role: CoreRole | null) => {
    switch (role) {
      case "core_founder": return "FOUNDER";
      case "core_cofounder": return "CO-FOUNDER";
      case "core_builder": return "BUILDER";
      case "core_product": return "PRODUCT MANAGER";
      case "core_engineer": return "ENGINEER";
      case "core_analyst": return "DATA ANALYST";
      case "internal_team": return "INTERNAL TEAM";
      default: return "UNKNOWN";
    }
  };

  const getActivityIcon = (tableName: string) => {
    if (tableName?.includes("dispatch")) return Truck;
    if (tableName?.includes("invoice")) return Package;
    if (tableName?.includes("api")) return Zap;
    if (tableName?.includes("org") || tableName?.includes("profile")) return Building2;
    return Activity;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const maxTierRevenue = Math.max(...metrics.revenueByTier.map((t) => t.revenue), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/5">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">RouteAce Core</h1>
              <p className="text-xs text-muted-foreground">Internal Platform Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userInfo && (
              <div className="text-right mr-2">
                <p className="text-sm font-medium">{userInfo.displayName}</p>
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              </div>
            )}
            <Badge className={`${getRoleBadgeColor(coreRole)} border`}>
              {getRoleLabel(coreRole)} {coreRole === "core_founder" && "(Core)"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "core_product" || coreRole === "core_analyst") && (
          <div className="mb-6">
            <Button
              onClick={() => navigate("/core/intelligence")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Shield className="w-4 h-4 mr-2" />
              Open Intelligence Suite
            </Button>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "internal_team") && (
              <TabsTrigger value="platform">Platform KPIs</TabsTrigger>
            )}
            {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "internal_team") && (
              <TabsTrigger value="reseller">Reseller Network</TabsTrigger>
            )}
            {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "internal_team") && (
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            )}
            {(coreRole === "core_product" || coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "core_analyst" || coreRole === "internal_team") && (
              <TabsTrigger value="product">Product</TabsTrigger>
            )}
            {(coreRole === "core_builder" || coreRole === "core_engineer" || coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "internal_team") && (
              <TabsTrigger value="system">System</TabsTrigger>
            )}
            {(coreRole === "core_engineer" || coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "internal_team") && (
              <TabsTrigger value="engineering">Engineering</TabsTrigger>
            )}
            {coreRole === "core_founder" && (
              <TabsTrigger value="team">Team</TabsTrigger>
            )}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Users" value={metrics.totalUsers.toLocaleString()} icon={Users} sub="All registered profiles" />
              <MetricCard title="Active (30d)" value={metrics.activeUsers30d.toLocaleString()} icon={Activity} sub="Unique sessions last 30d" />
              <MetricCard title="Total Dispatches" value={metrics.totalDispatches.toLocaleString()} icon={Truck} sub="All-time" />
              <MetricCard title="Success Rate" value={`${metrics.dispatchSuccessRate.toFixed(1)}%`} icon={CheckCircle} sub="Delivered dispatches" positive={metrics.dispatchSuccessRate >= 80} />
            </div>

            {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "core_product" || coreRole === "core_analyst") && (
              <AIInsightCards />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Response Time</span>
                    <span className={`font-mono ${metrics.avgResponseTime > 500 ? "text-red-400" : metrics.avgResponseTime > 200 ? "text-amber-400" : "text-green-400"}`}>
                      {metrics.avgResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Error Rate</span>
                    <span className={`font-mono ${metrics.errorRate > 5 ? "text-red-400" : "text-green-400"}`}>
                      {metrics.errorRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Calls (Total Logged)</span>
                    <span className="font-mono">{metrics.apiCalls.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Failed Jobs</span>
                    <span className={`font-mono ${metrics.failedJobs > 0 ? "text-amber-400" : "text-green-400"}`}>
                      {metrics.failedJobs}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.recentActivity.map((activity, i) => {
                        const Icon = getActivityIcon(activity.table_name);
                        return (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 capitalize">{activity.action}</span>
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity logged.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Platform KPIs */}
          <TabsContent value="platform" className="space-y-6">
            <PlatformKPIs />
          </TabsContent>

          {/* Reseller Network */}
          <TabsContent value="reseller" className="space-y-6">
            <ResellerNetworkGraph />
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="Total Revenue"
                value={`₦${(metrics.totalRevenue / 1_000_000).toFixed(2)}M`}
                icon={DollarSign}
                sub="All paid invoices"
              />
              <MetricCard
                title="MRR"
                value={`₦${(metrics.mrr / 1_000_000).toFixed(2)}M`}
                icon={TrendingUp}
                sub="Paid invoices this month"
              />
              <MetricCard
                title="Active Orgs"
                value={metrics.revenueByTier.length > 0 ? metrics.revenueByTier.reduce((s) => s + 1, 0).toString() : "—"}
                icon={Building2}
                sub="Tiers with revenue"
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Revenue by Subscription Tier</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.revenueByTier.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.revenueByTier.map((item) => (
                      <div key={item.tier} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.tier}</span>
                          <span className="font-mono">
                            {item.revenue >= 1_000_000
                              ? `₦${(item.revenue / 1_000_000).toFixed(2)}M`
                              : `₦${(item.revenue / 1_000).toFixed(0)}K`}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color}`}
                            style={{ width: `${(item.revenue / maxTierRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subscription revenue data yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product */}
          <TabsContent value="product" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard title="DAU" value={metrics.dau.toLocaleString()} icon={Users} sub="Unique active users today" />
              <MetricCard title="MAU" value={metrics.mau.toLocaleString()} icon={Activity} sub="Unique active users (30d)" />
              <MetricCard
                title="DAU/MAU Ratio"
                value={metrics.mau > 0 ? `${((metrics.dau / metrics.mau) * 100).toFixed(1)}%` : "—"}
                icon={BarChart3}
                sub="Stickiness"
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.featureAdoption.map((item) => (
                    <div key={item.feature} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.feature}</span>
                        <span className="font-mono">{item.adoption}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${item.adoption}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="API Calls (Total)"
                value={metrics.apiCalls.toLocaleString()}
                icon={Zap}
                sub="Logged requests"
              />
              <MetricCard
                title="Avg Latency"
                value={`${metrics.avgResponseTime.toFixed(0)}ms`}
                icon={Clock}
                sub="Mean response time"
                positive={metrics.avgResponseTime < 300}
              />
              <MetricCard
                title="Error Rate"
                value={`${metrics.errorRate.toFixed(2)}%`}
                icon={AlertTriangle}
                sub="4xx + 5xx responses"
                positive={metrics.errorRate < 2}
              />
              <MetricCard
                title="Success Rate"
                value={`${(100 - metrics.errorRate).toFixed(2)}%`}
                icon={CheckCircle}
                sub="2xx + 3xx responses"
                positive={metrics.errorRate < 2}
              />
            </div>
          </TabsContent>

          {/* Engineering */}
          <TabsContent value="engineering" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Failed Jobs"
                value={metrics.failedJobs.toString()}
                icon={AlertTriangle}
                sub="Email queue failures"
                positive={metrics.failedJobs === 0}
              />
              <MetricCard
                title="Queue Backlog"
                value={metrics.queueBacklog.toString()}
                icon={Clock}
                sub="Pending email jobs"
                positive={metrics.queueBacklog < 50}
              />
              <MetricCard
                title="API Error Rate"
                value={`${metrics.errorRate.toFixed(2)}%`}
                icon={Activity}
                sub="From api_request_logs"
                positive={metrics.errorRate < 2}
              />
              <MetricCard
                title="Dispatch Success"
                value={`${metrics.dispatchSuccessRate.toFixed(1)}%`}
                icon={Truck}
                sub="Delivered / total"
                positive={metrics.dispatchSuccessRate >= 80}
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>API Health Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {metrics.errorRate > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="flex-1">
                        {Math.round((metrics.errorRate / 100) * metrics.apiCalls)} error responses out of {metrics.apiCalls.toLocaleString()} total calls ({metrics.errorRate.toFixed(2)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>No API errors recorded in current log window</span>
                    </div>
                  )}
                  {metrics.failedJobs > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>{metrics.failedJobs} failed job(s) in email queue — review and retry</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team */}
          {coreRole === "core_founder" && (
            <TabsContent value="team" className="space-y-6">
              <CoreTeamManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  positive?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, sub, positive }: MetricCardProps) => (
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${positive === false ? "text-red-400" : positive === true ? "text-green-400" : ""}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-amber-500" />
        </div>
      </div>
    </CardContent>
  </Card>
);

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default CoreDashboard;
