import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Brain
} from "lucide-react";
import CoreTeamManagement from "@/components/core/CoreTeamManagement";
import AIInsightCards from "@/components/core/AIInsightCards";
import PlatformKPIs from "@/components/core/PlatformKPIs";
import ResellerNetworkGraph from "@/components/core/ResellerNetworkGraph";

type CoreRole = "core_founder" | "core_cofounder" | "core_builder" | "core_product" | "core_engineer" | "core_analyst" | "internal_team";

interface PlatformMetrics {
  totalTenants: number;
  activeUsers: number;
  totalDispatches: number;
  totalRevenue: number;
  apiCalls: number;
  errorRate: number;
  avgResponseTime: number;
  dispatchSuccessRate: number;
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
    totalTenants: 0,
    activeUsers: 0,
    totalDispatches: 0,
    totalRevenue: 0,
    apiCalls: 0,
    errorRate: 0,
    avgResponseTime: 0,
    dispatchSuccessRate: 0,
  });

  useEffect(() => {
    checkCoreAccess();
    loadMetrics();
  }, []);

  const checkCoreAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/core/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role as string;
      if (!role?.startsWith("core_") && role !== "internal_team") {
        toast({
          title: "Access Denied",
          description: "This area is restricted to RouteAce Core Team only.",
          variant: "destructive",
        });
        navigate("/core/login");
        return;
      }

      setCoreRole(role as CoreRole);
      setUserInfo({
        email: user.email || "",
        displayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Core User"
      });
      setLoading(false);
    } catch (error) {
      navigate("/core/login");
    }
  };

  const loadMetrics = async () => {
    try {
      // Load aggregated platform metrics
      const [tenantsRes, usersRes, dispatchesRes, invoicesRes, apiLogsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_sessions").select("id", { count: "exact", head: true }).gte("login_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("dispatches").select("id, status", { count: "exact" }),
        supabase.from("invoices").select("total_amount"),
        supabase.from("api_request_logs").select("id, status_code, response_time_ms"),
      ]);

      const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const errorCalls = apiLogsRes.data?.filter(l => l.status_code && l.status_code >= 400).length || 0;
      const totalCalls = apiLogsRes.data?.length || 1;
      const avgResponseTime = apiLogsRes.data?.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalCalls || 0;
      const deliveredDispatches = dispatchesRes.data?.filter(d => d.status === "delivered").length || 0;
      const totalDispatches = dispatchesRes.data?.length || 1;

      setMetrics({
        totalTenants: tenantsRes.count || 0,
        activeUsers: usersRes.count || 0,
        totalDispatches: dispatchesRes.count || 0,
        totalRevenue,
        apiCalls: totalCalls,
        errorRate: (errorCalls / totalCalls) * 100,
        avgResponseTime,
        dispatchSuccessRate: (deliveredDispatches / totalDispatches) * 100,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/5">
      {/* Header */}
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
        {/* Quick Actions for Intelligence Module */}
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
            {(coreRole === "core_founder") && (
              <TabsTrigger value="team">Team</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab - Visible to All Core Roles */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Users"
                value={metrics.totalTenants.toLocaleString()}
                icon={Users}
                trend="+12%"
                trendUp={true}
              />
              <MetricCard
                title="Active (30d)"
                value={metrics.activeUsers.toLocaleString()}
                icon={Activity}
                trend="+8%"
                trendUp={true}
              />
              <MetricCard
                title="Total Dispatches"
                value={metrics.totalDispatches.toLocaleString()}
                icon={Truck}
                trend="+15%"
                trendUp={true}
              />
              <MetricCard
                title="Success Rate"
                value={`${metrics.dispatchSuccessRate.toFixed(1)}%`}
                icon={CheckCircle}
                trend="+2%"
                trendUp={true}
              />
            </div>

            {/* AI Insights - For Founders, Product, and Analysts */}
            {(coreRole === "core_founder" || coreRole === "core_cofounder" || coreRole === "core_product" || coreRole === "core_analyst") && (
              <AIInsightCards />
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Response Time</span>
                    <span className="font-mono">{metrics.avgResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Error Rate</span>
                    <span className={`font-mono ${metrics.errorRate > 5 ? "text-red-400" : "text-green-400"}`}>
                      {metrics.errorRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Calls (Total)</span>
                    <span className="font-mono">{metrics.apiCalls.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "New tenant onboarded", time: "2 hours ago", icon: Building2 },
                      { action: "API key generated", time: "4 hours ago", icon: Zap },
                      { action: "Dispatch milestone: 10,000", time: "1 day ago", icon: Package },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <activity.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1">{activity.action}</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Platform KPIs Tab - Founder Only */}
          <TabsContent value="platform" className="space-y-6">
            <PlatformKPIs />
          </TabsContent>

          {/* Reseller Network Tab - Founder Only */}
          <TabsContent value="reseller" className="space-y-6">
            <ResellerNetworkGraph />
          </TabsContent>

          {/* Revenue Tab - Founder Only */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Revenue"
                value={`₦${(metrics.totalRevenue / 1000000).toFixed(2)}M`}
                icon={DollarSign}
                trend="+18%"
                trendUp={true}
              />
              <MetricCard
                title="MRR"
                value="₦2.5M"
                icon={TrendingUp}
                trend="+12%"
                trendUp={true}
              />
              <MetricCard
                title="Gross Margin"
                value="68%"
                icon={BarChart3}
                trend="+3%"
                trendUp={true}
              />
              <MetricCard
                title="Churn Rate"
                value="2.1%"
                icon={AlertTriangle}
                trend="-0.5%"
                trendUp={true}
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Revenue by Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { tier: "Enterprise", revenue: 1200000, color: "bg-amber-500" },
                    { tier: "Professional", revenue: 800000, color: "bg-blue-500" },
                    { tier: "Starter", revenue: 300000, color: "bg-green-500" },
                    { tier: "Reseller", revenue: 200000, color: "bg-purple-500" },
                  ].map((item) => (
                    <div key={item.tier} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.tier}</span>
                        <span className="font-mono">₦{(item.revenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${(item.revenue / 1200000) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Tab */}
          <TabsContent value="product" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="DAU"
                value="342"
                icon={Users}
                trend="+5%"
                trendUp={true}
              />
              <MetricCard
                title="MAU"
                value="1,247"
                icon={Activity}
                trend="+8%"
                trendUp={true}
              />
              <MetricCard
                title="Avg. Session"
                value="12m"
                icon={Clock}
                trend="+2m"
                trendUp={true}
              />
              <MetricCard
                title="NPS Score"
                value="72"
                icon={TrendingUp}
                trend="+4"
                trendUp={true}
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { feature: "Dispatch Creation", adoption: 95 },
                    { feature: "Route Optimization", adoption: 72 },
                    { feature: "Invoice Generation", adoption: 88 },
                    { feature: "Real-time Tracking", adoption: 65 },
                    { feature: "API Integration", adoption: 34 },
                  ].map((item) => (
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

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="API Calls/Day"
                value={Math.round(metrics.apiCalls / 30).toLocaleString()}
                icon={Zap}
                trend="+22%"
                trendUp={true}
              />
              <MetricCard
                title="Avg Latency"
                value={`${metrics.avgResponseTime.toFixed(0)}ms`}
                icon={Clock}
                trend="-15ms"
                trendUp={true}
              />
              <MetricCard
                title="Uptime"
                value="99.9%"
                icon={CheckCircle}
                trend="stable"
                trendUp={true}
              />
              <MetricCard
                title="Error Rate"
                value={`${metrics.errorRate.toFixed(2)}%`}
                icon={AlertTriangle}
                trend="-0.3%"
                trendUp={true}
              />
            </div>
          </TabsContent>

          {/* Engineering Tab */}
          <TabsContent value="engineering" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Failed Jobs"
                value="3"
                icon={AlertTriangle}
                trend="-2"
                trendUp={true}
              />
              <MetricCard
                title="Queue Backlog"
                value="12"
                icon={Clock}
                trend="normal"
                trendUp={true}
              />
              <MetricCard
                title="DB Connections"
                value="45/100"
                icon={Activity}
                trend="healthy"
                trendUp={true}
              />
              <MetricCard
                title="Memory Usage"
                value="62%"
                icon={BarChart3}
                trend="stable"
                trendUp={true}
              />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {metrics.errorRate > 0 ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="flex-1">API timeout on dispatch creation</span>
                        <span className="text-xs text-muted-foreground">2h ago</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="flex-1">Rate limit exceeded for tenant-xyz</span>
                        <span className="text-xs text-muted-foreground">5h ago</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>No errors in the last 24 hours</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management Tab - Founder Only */}
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

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
}

const MetricCard = ({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) => (
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className={`text-xs mt-1 ${trendUp ? "text-green-400" : "text-red-400"}`}>
            {trend}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-amber-500" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default CoreDashboard;
