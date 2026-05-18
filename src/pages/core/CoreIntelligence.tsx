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
  Sparkles
} from "lucide-react";
import type { CoreRole } from "@/hooks/useCoreAuth";
import AIInsightCards from "@/components/core/AIInsightCards";
import PredictiveKPIs from "@/components/core/PredictiveKPIs";

interface IntelligenceMetrics {
  // User metrics
  dau: number;
  mau: number;
  dauMauRatio: number;
  avgSessionDuration: number;
  
  // Revenue metrics
  mrr: number;
  arr: number;
  revenueGrowth: number;
  ltv: number;
  cac: number;
  
  // Operations metrics
  dispatchesPerDay: number;
  avgDeliveryTime: number;
  routeEfficiency: number;
  
  // Finance metrics
  invoicesGenerated: number;
  paymentCollection: number;
  outstandingAmount: number;
  
  // Technical metrics
  apiLatency: number;
  errorRate: number;
  uptime: number;
}

const CoreIntelligence = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [coreRole, setCoreRole] = useState<CoreRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<IntelligenceMetrics>({
    dau: 0,
    mau: 0,
    dauMauRatio: 0,
    avgSessionDuration: 0,
    mrr: 0,
    arr: 0,
    revenueGrowth: 0,
    ltv: 0,
    cac: 0,
    dispatchesPerDay: 0,
    avgDeliveryTime: 0,
    routeEfficiency: 0,
    invoicesGenerated: 0,
    paymentCollection: 0,
    outstandingAmount: 0,
    apiLatency: 0,
    errorRate: 0,
    uptime: 99.9,
  });

  useEffect(() => {
    checkAccess();
    loadMetrics();
    
    // Set active tab from URL
    const path = location.pathname.split("/").pop();
    if (path && path !== "intelligence") {
      setActiveTab(path);
    }
  }, [location]);

  const checkAccess = async () => {
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
      const allowedRoles = ["core_founder", "core_cofounder", "core_product", "core_analyst"];
      
      if (!allowedRoles.includes(role)) {
        toast({
          title: "Access Denied",
          description: "This intelligence module is restricted to authorized Core Team members.",
          variant: "destructive",
        });
        navigate("/core/dashboard");
        return;
      }

      setCoreRole(role as CoreRole);
      setLoading(false);
    } catch (error) {
      navigate("/core/login");
    }
  };

  const loadMetrics = async () => {
    try {
      const [usersRes, sessionsRes, dispatchesRes, invoicesRes, apiLogsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("user_sessions").select("*").gte("login_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("dispatches").select("id, status, created_at, actual_delivery, scheduled_delivery"),
        supabase.from("invoices").select("total_amount, status"),
        supabase.from("api_request_logs").select("response_time_ms, status_code"),
      ]);

      const totalRevenue = invoicesRes.data?.filter(i => i.status === "paid").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const outstandingAmount = invoicesRes.data?.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const avgLatency = apiLogsRes.data?.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / (apiLogsRes.data?.length || 1) || 0;
      const errorCount = apiLogsRes.data?.filter(l => l.status_code && l.status_code >= 400).length || 0;
      const totalCalls = apiLogsRes.data?.length || 1;
      
      // Calculate DAU (unique sessions in last 24h)
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dauSessions = sessionsRes.data?.filter(s => s.login_at >= last24h) || [];
      const uniqueDauUsers = new Set(dauSessions.map(s => s.user_id)).size;
      
      // Calculate MAU
      const uniqueMauUsers = new Set(sessionsRes.data?.map(s => s.user_id) || []).size;

      setMetrics({
        dau: uniqueDauUsers,
        mau: uniqueMauUsers,
        dauMauRatio: uniqueMauUsers > 0 ? (uniqueDauUsers / uniqueMauUsers) * 100 : 0,
        avgSessionDuration: 12, // Placeholder
        mrr: totalRevenue * 0.1, // Estimate
        arr: totalRevenue * 1.2,
        revenueGrowth: 18,
        ltv: 450000,
        cac: 85000,
        dispatchesPerDay: Math.round((dispatchesRes.data?.length || 0) / 30),
        avgDeliveryTime: 4.2,
        routeEfficiency: 87,
        invoicesGenerated: invoicesRes.data?.length || 0,
        paymentCollection: totalRevenue,
        outstandingAmount,
        apiLatency: avgLatency,
        errorRate: (errorCount / totalCalls) * 100,
        uptime: 99.9,
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/5">
      {/* Header */}
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
            <Badge className={`${getRoleBadgeColor(coreRole)} border`}>
              {getRoleLabel(coreRole)}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <PieChart className="w-4 h-4" />Overview
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="gap-2">
              <Sparkles className="w-4 h-4" />AI Insights
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2">
              <Brain className="w-4 h-4" />Predictive KPIs
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />Users
            </TabsTrigger>
            {(coreRole === "core_founder" || coreRole === "core_cofounder") && (
              <TabsTrigger value="revenue" className="gap-2">
                <DollarSign className="w-4 h-4" />Revenue
              </TabsTrigger>
            )}
            <TabsTrigger value="growth" className="gap-2">
              <TrendingUp className="w-4 h-4" />Growth
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <Truck className="w-4 h-4" />Operations
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2">
              <Receipt className="w-4 h-4" />Finance
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <GitBranch className="w-4 h-4" />API
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <AlertCircle className="w-4 h-4" />Errors
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />Feedback
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Daily Active Users" value={metrics.dau.toString()} icon={Users} trend="+8%" positive />
              <IntelCard title="Monthly Active Users" value={metrics.mau.toString()} icon={Activity} trend="+12%" positive />
              <IntelCard title="DAU/MAU Ratio" value={`${metrics.dauMauRatio.toFixed(1)}%`} icon={Target} trend="+2%" positive />
              <IntelCard title="Avg Session" value={`${metrics.avgSessionDuration}m`} icon={Zap} trend="+1m" positive />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-purple-400" />
                    Key Metrics Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MetricRow label="Platform Revenue" value={`₦${(metrics.paymentCollection / 1000000).toFixed(2)}M`} progress={75} />
                  <MetricRow label="Route Efficiency" value={`${metrics.routeEfficiency}%`} progress={metrics.routeEfficiency} />
                  <MetricRow label="API Uptime" value={`${metrics.uptime}%`} progress={metrics.uptime} />
                  <MetricRow label="Error Rate" value={`${metrics.errorRate.toFixed(2)}%`} progress={100 - metrics.errorRate} />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Platform Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-40 h-40">
                      <div className="absolute inset-0 rounded-full border-8 border-secondary"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent transform -rotate-45"></div>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-4xl font-bold">92</span>
                        <span className="text-sm text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-8 text-sm">
                    <div className="text-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <span className="text-muted-foreground">All Systems</span>
                    </div>
                    <div className="text-center">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <span className="text-muted-foreground">2 Warnings</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            <AIInsightCards />
          </TabsContent>

          {/* Predictive KPIs Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <PredictiveKPIs />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Total Users" value="1,247" icon={Users} trend="+156 this month" positive />
              <IntelCard title="Active Today" value={metrics.dau.toString()} icon={Activity} trend="+8%" positive />
              <IntelCard title="Retention (30d)" value="78%" icon={Target} trend="+3%" positive />
              <IntelCard title="Churn Rate" value="2.1%" icon={AlertTriangle} trend="-0.5%" positive />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>User Cohort Analysis</CardTitle>
                <CardDescription>Monthly retention by signup cohort</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { cohort: "Jan 2026", m1: 100, m2: 82, m3: 71, m4: 65 },
                    { cohort: "Dec 2025", m1: 100, m2: 79, m3: 68, m4: 61 },
                    { cohort: "Nov 2025", m1: 100, m2: 85, m3: 74, m4: 67 },
                    { cohort: "Oct 2025", m1: 100, m2: 81, m3: 69, m4: 63 },
                  ].map((row) => (
                    <div key={row.cohort} className="flex items-center gap-4">
                      <span className="w-24 text-sm text-muted-foreground">{row.cohort}</span>
                      {[row.m1, row.m2, row.m3, row.m4].map((val, i) => (
                        <div 
                          key={i} 
                          className={`w-16 h-8 rounded flex items-center justify-center text-xs font-mono ${
                            val >= 80 ? "bg-green-500/20 text-green-400" :
                            val >= 60 ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {val}%
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <span className="w-24"></span>
                    <span className="w-16 text-center">Month 1</span>
                    <span className="w-16 text-center">Month 2</span>
                    <span className="w-16 text-center">Month 3</span>
                    <span className="w-16 text-center">Month 4</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab - Founder/Cofounder Only */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="MRR" value={`₦${(metrics.mrr / 1000000).toFixed(2)}M`} icon={DollarSign} trend="+12%" positive />
              <IntelCard title="ARR" value={`₦${(metrics.arr / 1000000).toFixed(2)}M`} icon={TrendingUp} trend="+18%" positive />
              <IntelCard title="LTV" value={`₦${(metrics.ltv / 1000).toFixed(0)}K`} icon={Target} trend="+8%" positive />
              <IntelCard title="CAC" value={`₦${(metrics.cac / 1000).toFixed(0)}K`} icon={BarChart3} trend="-5%" positive />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Revenue by Segment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { segment: "Enterprise", revenue: 1800000, pct: 45, color: "bg-amber-500" },
                    { segment: "Mid-Market", revenue: 1200000, pct: 30, color: "bg-blue-500" },
                    { segment: "SMB", revenue: 600000, pct: 15, color: "bg-green-500" },
                    { segment: "Resellers", revenue: 400000, pct: 10, color: "bg-purple-500" },
                  ].map((item) => (
                    <div key={item.segment} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.segment}</span>
                        <span className="font-mono">₦{(item.revenue / 1000000).toFixed(2)}M ({item.pct}%)</span>
                      </div>
                      <Progress value={item.pct * 2} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Unit Economics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">LTV:CAC Ratio</span>
                    <span className="font-bold text-green-400">5.3:1</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Payback Period</span>
                    <span className="font-bold">4.2 months</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Gross Margin</span>
                    <span className="font-bold text-green-400">68%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Net Revenue Retention</span>
                    <span className="font-bold text-green-400">112%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="New Signups (30d)" value="156" icon={Users} trend="+23%" positive />
              <IntelCard title="Activation Rate" value="72%" icon={Zap} trend="+5%" positive />
              <IntelCard title="Conversion Rate" value="18%" icon={Target} trend="+2%" positive />
              <IntelCard title="Viral Coefficient" value="1.2" icon={TrendingUp} trend="+0.1" positive />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Acquisition Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { stage: "Visitors", count: 8500, pct: 100 },
                  { stage: "Signups", count: 1530, pct: 18 },
                  { stage: "Activated", count: 1100, pct: 72 },
                  { stage: "Paying", count: 198, pct: 18 },
                ].map((item, i) => (
                  <div key={item.stage} className="relative">
                    <div 
                      className="h-12 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 flex items-center px-4"
                      style={{ width: `${Math.max(item.pct, 20)}%` }}
                    >
                      <span className="font-medium">{item.stage}</span>
                      <span className="ml-auto font-mono">{item.count.toLocaleString()}</span>
                    </div>
                    {i < 3 && (
                      <div className="text-xs text-muted-foreground ml-4 my-1">
                        ↓ {[18, 72, 18][i]}% conversion
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Dispatches/Day" value={metrics.dispatchesPerDay.toString()} icon={Truck} trend="+15%" positive />
              <IntelCard title="Avg Delivery Time" value={`${metrics.avgDeliveryTime}h`} icon={Activity} trend="-0.5h" positive />
              <IntelCard title="Route Efficiency" value={`${metrics.routeEfficiency}%`} icon={Target} trend="+3%" positive />
              <IntelCard title="On-Time Rate" value="94%" icon={CheckCircle} trend="+2%" positive />
            </div>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Invoices Generated" value={metrics.invoicesGenerated.toString()} icon={Receipt} trend="+45 this week" positive />
              <IntelCard title="Collections" value={`₦${(metrics.paymentCollection / 1000000).toFixed(2)}M`} icon={DollarSign} trend="+18%" positive />
              <IntelCard title="Outstanding" value={`₦${(metrics.outstandingAmount / 1000000).toFixed(2)}M`} icon={AlertTriangle} trend="-8%" positive />
              <IntelCard title="DSO" value="32 days" icon={Activity} trend="-3 days" positive />
            </div>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="API Calls/Day" value="12,450" icon={GitBranch} trend="+22%" positive />
              <IntelCard title="Avg Latency" value={`${metrics.apiLatency.toFixed(0)}ms`} icon={Zap} trend="-15ms" positive />
              <IntelCard title="Success Rate" value={`${(100 - metrics.errorRate).toFixed(2)}%`} icon={CheckCircle} trend="+0.3%" positive />
              <IntelCard title="Active Keys" value="18" icon={Shield} trend="+3" positive />
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="Error Rate" value={`${metrics.errorRate.toFixed(2)}%`} icon={AlertCircle} trend="-0.3%" positive />
              <IntelCard title="Failed Jobs (24h)" value="3" icon={AlertTriangle} trend="-2" positive />
              <IntelCard title="P95 Latency" value="245ms" icon={Activity} trend="-20ms" positive />
              <IntelCard title="Uptime" value={`${metrics.uptime}%`} icon={Server} trend="stable" positive />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "API Timeout", count: 3, severity: "warn", time: "2h ago" },
                  { type: "Rate Limit Exceeded", count: 12, severity: "info", time: "5h ago" },
                  { type: "Auth Failure", count: 1, severity: "error", time: "1d ago" },
                ].map((error, i) => (
                  <div 
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      error.severity === "error" ? "bg-red-500/10 border-red-500/20" :
                      error.severity === "warn" ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 ${
                      error.severity === "error" ? "text-red-400" :
                      error.severity === "warn" ? "text-amber-400" :
                      "text-blue-400"
                    }`} />
                    <span className="flex-1">{error.type}</span>
                    <Badge variant="secondary">{error.count}x</Badge>
                    <span className="text-xs text-muted-foreground">{error.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IntelCard title="NPS Score" value="72" icon={Target} trend="+4" positive />
              <IntelCard title="CSAT" value="4.6/5" icon={CheckCircle} trend="+0.2" positive />
              <IntelCard title="Feedback Items" value="156" icon={MessageSquare} trend="+23 this week" positive />
              <IntelCard title="Response Rate" value="89%" icon={Activity} trend="+5%" positive />
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Feature Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { feature: "Multi-stop route optimization", votes: 45, status: "planned" },
                  { feature: "WhatsApp notifications", votes: 38, status: "in-progress" },
                  { feature: "Driver mobile app", votes: 32, status: "planned" },
                  { feature: "Bulk invoice generation", votes: 28, status: "shipped" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <span className="flex-1">{item.feature}</span>
                    <Badge variant="outline">{item.votes} votes</Badge>
                    <Badge className={
                      item.status === "shipped" ? "bg-green-500/20 text-green-400" :
                      item.status === "in-progress" ? "bg-amber-500/20 text-amber-400" :
                      "bg-blue-500/20 text-blue-400"
                    }>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Intelligence Card Component
interface IntelCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  positive: boolean;
}

const IntelCard = ({ title, value, icon: Icon, trend, positive }: IntelCardProps) => (
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className={`text-xs mt-1 ${positive ? "text-green-400" : "text-red-400"}`}>
            {trend}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-purple-400" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Metric Row Component
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
    <Progress value={progress} className="h-2" />
  </div>
);

export default CoreIntelligence;
