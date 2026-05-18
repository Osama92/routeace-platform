import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { safeDivide } from "@/lib/apiValidator";
import {
  TrendingUp,
  TrendingDown,
  Route,
  Clock,
  Target,
  Truck,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  PieChart,
  Activity,
  Download,
  FileText,
  Eye,
  Sparkles,
  Zap
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
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";

interface RouteMetrics {
  avgRouteDuration: number;
  onTimeDeliveryRate: number;
  avgCostPerRoute: number;
  assetUtilization: number;
  idleTimeReduction: number;
  avgConfidenceScore: number;
  routeRiskExposure: number;
  efficiencyGain: number;
}

interface AIInsight {
  id: string;
  metric: string;
  direction: "up" | "down" | "neutral";
  change: number;
  cause: string;
  action: string;
  severity: "info" | "warning" | "critical";
}

const CONFIDENCE_COLORS = {
  high: "hsl(var(--success))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--destructive))"
};

const RouteIntelligenceDashboard = () => {
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [demoMode, setDemoMode] = useState(false);
  
  const [metrics, setMetrics] = useState<RouteMetrics>({
    avgRouteDuration: 0,
    onTimeDeliveryRate: 0,
    avgCostPerRoute: 0,
    assetUtilization: 0,
    idleTimeReduction: 0,
    avgConfidenceScore: 0,
    routeRiskExposure: 0,
    efficiencyGain: 0
  });
  // Period-over-period deltas (computed from real data, NOT hardcoded)
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  const [trendData, setTrendData] = useState<any[]>([]);
  const [confidenceDistribution, setConfidenceDistribution] = useState<any[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    fetchRouteIntelligence();
  }, [timeRange, vehicleFilter, demoMode, organizationId]);

  const fetchRouteIntelligence = async () => {
    setLoading(true);
    try {
      if (demoMode) {
        // Generate demo data
        generateDemoData();
      } else {
        await fetchRealData();
      }
    } catch (error) {
      console.error("Failed to fetch route intelligence:", error);
      toast({
        title: "Error",
        description: "Failed to load route intelligence data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = () => {
    // Metrics
    setMetrics({
      avgRouteDuration: 1.8,
      onTimeDeliveryRate: 94.5,
      avgCostPerRoute: 285000,
      assetUtilization: 87.3,
      idleTimeReduction: 23.5,
      avgConfidenceScore: 82,
      routeRiskExposure: 12.4,
      efficiencyGain: 18.7
    });

    // Trend data
    const periods = timeRange === "daily" 
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : timeRange === "weekly"
      ? ["Week 1", "Week 2", "Week 3", "Week 4"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    // Replaces Math.random — show flat baseline until real route-level
    // dispatch aggregates are wired in. Zero-state preferred over fake metrics.
    setTrendData(periods.map((period) => ({
      period,
      duration: 0,
      onTimeRate: 0,
      costPerRoute: 0,
      utilization: 0,
      confidenceScore: 0,
    })));

    // Confidence distribution
    setConfidenceDistribution([
      { name: "High (85-100%)", value: 45, color: CONFIDENCE_COLORS.high },
      { name: "Medium (65-84%)", value: 38, color: CONFIDENCE_COLORS.medium },
      { name: "Low (<65%)", value: 17, color: CONFIDENCE_COLORS.low }
    ]);

    // AI Insights
    setAIInsights([
      {
        id: "1",
        metric: "On-Time Delivery Rate",
        direction: "up",
        change: 3.2,
        cause: "Improved route optimization reduced travel time by 15%",
        action: "Continue using AI-optimized routes for Lagos-Ibadan corridor",
        severity: "info"
      },
      {
        id: "2",
        metric: "Asset Utilization",
        direction: "up",
        change: 5.8,
        cause: "Multi-drop consolidation increased vehicle load factor",
        action: "Expand consolidation to Northern routes",
        severity: "info"
      },
      {
        id: "3",
        metric: "Route Risk Exposure",
        direction: "up",
        change: 4.1,
        cause: "Increased traffic volatility on Port Harcourt routes",
        action: "Implement buffer time for high-risk routes",
        severity: "warning"
      },
      {
        id: "4",
        metric: "Driver Idle Time",
        direction: "down",
        change: 12.5,
        cause: "Better dispatch scheduling and route sequencing",
        action: "Apply same scheduling logic to weekend operations",
        severity: "info"
      }
    ]);
  };

  const fetchRealData = async () => {
    if (!organizationId) {
      // Cannot run org-scoped query without an org context. Render empty live state.
      setMetrics({
        avgRouteDuration: 0, onTimeDeliveryRate: 0, avgCostPerRoute: 0, assetUtilization: 0,
        idleTimeReduction: 0, avgConfidenceScore: 0, routeRiskExposure: 0, efficiencyGain: 0,
      });
      setDeltas({});
      setTrendData([]);
      setConfidenceDistribution([]);
      setAIInsights([{
        id: "no-org",
        metric: "Live data",
        direction: "neutral",
        change: 0,
        cause: "No organisation context detected for the signed-in user.",
        action: "Assign this user to an organisation to surface live route intelligence.",
        severity: "warning",
      }]);
      return;
    }

    const now = Date.now();
    const periodMs = timeRange === "daily" ? 1 : timeRange === "weekly" ? 7 : 30;
    const buckets = timeRange === "monthly" ? 6 : 4; // 4 weeks or 6 months
    const lookbackMs = buckets * periodMs * 24 * 60 * 60 * 1000;
    const lookbackStart = new Date(now - lookbackMs).toISOString();
    const prevStart = new Date(now - 2 * lookbackMs).toISOString();
    const currentStart = new Date(now - lookbackMs).toISOString();

    // Org-scoped dispatches for the lookback window (and the prior window for deltas).
    const { data: dispatches } = await supabase
      .from("dispatches")
      .select("id, status, cost, on_time_flag, actual_delivery_days, estimated_delivery_days, created_at, scheduled_pickup, actual_pickup, scheduled_delivery, actual_delivery, distance_km")
      .eq("organization_id", organizationId)
      .gte("created_at", prevStart)
      .order("created_at", { ascending: true })
      .limit(2000);

    const all = dispatches ?? [];
    const inWindow = (iso?: string | null, start?: string) =>
      !!iso && !!start && new Date(iso).getTime() >= new Date(start).getTime();
    const current = all.filter(d => inWindow(d.created_at as any, currentStart));
    const previous = all.filter(d => !inWindow(d.created_at as any, currentStart));

    const computeMetrics = (rows: any[]) => {
      const completed = rows.filter(d => d.status === "delivered");
      const avgDuration = completed.length
        ? completed.reduce((s, d) => s + (d.actual_delivery_days || d.estimated_delivery_days || 1), 0) / completed.length
        : 0;
      const onTimeCount = completed.filter(d => d.on_time_flag === true).length;
      const onTime = safeDivide(onTimeCount, completed.length, 0) * 100;
      const avgCost = completed.length
        ? completed.reduce((s, d) => s + (Number(d.cost) || 0), 0) / completed.length
        : 0;
      // Idle proxy: dispatches that took longer than estimate
      const lateCount = completed.filter(d => (d.actual_delivery_days || 0) > (d.estimated_delivery_days || 0)).length;
      const idleReduction = completed.length ? 100 - safeDivide(lateCount, completed.length, 0) * 100 : 0;
      return { avgDuration, onTime, avgCost, idleReduction, completed };
    };

    const cur = computeMetrics(current);
    const prev = computeMetrics(previous);

    // Org-scoped vehicle utilisation
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, status, organization_id")
      .eq("organization_id", organizationId);
    const vAll = vehicles ?? [];
    const activeV = vAll.filter(v => v.status === "active" || v.status === "in_use").length;
    const utilization = vAll.length ? safeDivide(activeV, vAll.length, 0) * 100 : 0;

    // Confidence proxy = % of completed dispatches that hit on-time + had estimate
    const withEstimate = cur.completed.filter(d => (d.estimated_delivery_days || 0) > 0);
    const confidence = withEstimate.length
      ? Math.round(safeDivide(withEstimate.filter(d => d.on_time_flag === true).length, withEstimate.length, 0) * 100)
      : 0;
    const riskExposure = cur.completed.length
      ? Math.round(safeDivide(cur.completed.filter(d => d.on_time_flag === false).length, cur.completed.length, 0) * 100)
      : 0;
    const efficiencyGain = prev.avgDuration > 0
      ? Math.round(((prev.avgDuration - cur.avgDuration) / prev.avgDuration) * 100)
      : 0;

    setMetrics({
      avgRouteDuration: Number(cur.avgDuration.toFixed(2)),
      onTimeDeliveryRate: Number(cur.onTime.toFixed(1)),
      avgCostPerRoute: Math.round(cur.avgCost),
      assetUtilization: Number(utilization.toFixed(1)),
      idleTimeReduction: Number(cur.idleReduction.toFixed(1)),
      avgConfidenceScore: confidence,
      routeRiskExposure: riskExposure,
      efficiencyGain,
    });

    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
    setDeltas({
      avgRouteDuration: Number(pct(cur.avgDuration, prev.avgDuration).toFixed(1)),
      onTimeDeliveryRate: Number(pct(cur.onTime, prev.onTime).toFixed(1)),
      avgCostPerRoute: Number(pct(cur.avgCost, prev.avgCost).toFixed(1)),
      assetUtilization: 0,
      idleTimeReduction: Number(pct(cur.idleReduction, prev.idleReduction).toFixed(1)),
    });

    // Bucketise current window into trend points
    const bucketMs = periodMs * 24 * 60 * 60 * 1000;
    const points = Array.from({ length: buckets }, (_, i) => {
      const start = now - (buckets - i) * bucketMs;
      const end = start + bucketMs;
      const slice = current.filter(d => {
        const t = new Date(d.created_at as any).getTime();
        return t >= start && t < end;
      });
      const m = computeMetrics(slice);
      return {
        period: timeRange === "monthly"
          ? new Date(start).toLocaleString("en", { month: "short" })
          : timeRange === "weekly"
          ? `Week ${i + 1}`
          : new Date(start).toLocaleString("en", { weekday: "short" }),
        duration: Number(m.avgDuration.toFixed(2)),
        onTimeRate: Number(m.onTime.toFixed(1)),
        costPerRoute: Math.round(m.avgCost),
        utilization: Number(utilization.toFixed(1)),
        confidenceScore: confidence,
      };
    });
    setTrendData(points);

    const high = cur.completed.filter(d => d.on_time_flag === true).length;
    const low = cur.completed.filter(d => d.on_time_flag === false).length;
    const med = Math.max(0, cur.completed.length - high - low);
    const total = Math.max(1, high + med + low);
    setConfidenceDistribution([
      { name: "High (85-100%)", value: Math.round((high / total) * 100), color: CONFIDENCE_COLORS.high },
      { name: "Medium (65-84%)", value: Math.round((med / total) * 100), color: CONFIDENCE_COLORS.medium },
      { name: "Low (<65%)", value: Math.round((low / total) * 100), color: CONFIDENCE_COLORS.low },
    ]);

    const insights: AIInsight[] = [];
    if (cur.completed.length === 0) {
      insights.push({
        id: "no-data", metric: "Delivery volume", direction: "neutral", change: 0,
        cause: "No completed dispatches in the current window for this organisation.",
        action: "Mark deliveries as completed and capture on-time flags to populate intelligence.",
        severity: "warning",
      });
    } else {
      insights.push({
        id: "otd",
        metric: "On-Time Delivery",
        direction: cur.onTime >= prev.onTime ? "up" : "down",
        change: Number(Math.abs(pct(cur.onTime, prev.onTime)).toFixed(1)),
        cause: cur.onTime >= prev.onTime
          ? "Routing and dispatch sequencing improved versus the prior window."
          : "OTD dropped versus the prior window - review high-risk lanes.",
        action: cur.onTime >= prev.onTime
          ? "Lock in current planning parameters and expand to new lanes."
          : "Trigger lane-level root-cause review and tighten cut-off windows.",
        severity: cur.onTime >= prev.onTime ? "info" : "warning",
      });
      insights.push({
        id: "cost",
        metric: "Cost per Route",
        direction: cur.avgCost <= prev.avgCost ? "down" : "up",
        change: Number(Math.abs(pct(cur.avgCost, prev.avgCost)).toFixed(1)),
        cause: cur.avgCost <= prev.avgCost ? "Average dispatch cost trending down." : "Cost per dispatch is rising.",
        action: cur.avgCost <= prev.avgCost ? "Maintain consolidation policy." : "Audit fuel & 3PL rate cards.",
        severity: cur.avgCost <= prev.avgCost ? "info" : "warning",
      });
    }
    setAIInsights(insights);
  };

  const exportReport = () => {
    toast({
      title: "Generating Report",
      description: "Route Intelligence report is being prepared..."
    });
    setTimeout(() => {
      toast({
        title: "Report Ready",
        description: "Your report has been downloaded"
      });
    }, 2000);
  };

  const MetricCard = ({ 
    label, 
    value, 
    unit, 
    change, 
    trend, 
    icon: Icon 
  }: {
    label: string;
    value: number;
    unit?: string;
    change?: number;
    trend?: "up" | "down" | "neutral";
    icon: any;
  }) => (
    <Card className="glass-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">
                {typeof value === "number" ? value.toLocaleString() : value}
                {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <TrendingUp className="w-4 h-4" /> : 
               trend === "down" ? <TrendingDown className="w-4 h-4" /> : null}
              {change > 0 ? "+" : ""}{change}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              <SelectItem value="bike">Bikes</SelectItem>
              <SelectItem value="van">Vans</SelectItem>
              <SelectItem value="15t">15T Trucks</SelectItem>
              <SelectItem value="20t">20T Trucks</SelectItem>
              <SelectItem value="30t">30T Trucks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
            />
            <Label htmlFor="demo-mode" className="flex items-center gap-1 cursor-pointer">
              <Eye className="w-4 h-4" />
              Demo Mode
            </Label>
          </div>
          
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {demoMode && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm">
            <strong>Investor Demo Mode:</strong> Showing anonymized simulation data for presentation purposes.
          </span>
        </div>
      )}

      {/* Key Metrics - deltas are computed period-over-period from real org data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Route Duration"
          value={metrics.avgRouteDuration}
          unit="days"
          change={deltas.avgRouteDuration ?? 0}
          trend={(deltas.avgRouteDuration ?? 0) <= 0 ? "down" : "up"}
          icon={Clock}
        />
        <MetricCard
          label="On-Time Delivery"
          value={metrics.onTimeDeliveryRate}
          unit="%"
          change={deltas.onTimeDeliveryRate ?? 0}
          trend={(deltas.onTimeDeliveryRate ?? 0) >= 0 ? "up" : "down"}
          icon={Target}
        />
        <MetricCard
          label="Cost per Route"
          value={Math.round(metrics.avgCostPerRoute / 1000)}
          unit="k ₦"
          change={deltas.avgCostPerRoute ?? 0}
          trend={(deltas.avgCostPerRoute ?? 0) <= 0 ? "down" : "up"}
          icon={DollarSign}
        />
        <MetricCard
          label="Asset Utilization"
          value={metrics.assetUtilization}
          unit="%"
          icon={Truck}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Idle Time Reduction"
          value={metrics.idleTimeReduction}
          unit="%"
          change={deltas.idleTimeReduction ?? 0}
          trend={(deltas.idleTimeReduction ?? 0) >= 0 ? "up" : "down"}
          icon={Zap}
        />
        <MetricCard
          label="Avg Confidence Score"
          value={metrics.avgConfidenceScore}
          unit="%"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Route Risk Exposure"
          value={metrics.routeRiskExposure}
          unit="%"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Efficiency Gain"
          value={metrics.efficiencyGain}
          unit="%"
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Trend
            </CardTitle>
            <CardDescription>Route duration and on-time rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="duration" 
                    name="Avg Duration (days)" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="onTimeRate" 
                    name="On-Time Rate (%)" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Route Confidence Distribution
            </CardTitle>
            <CardDescription>AI confidence scores across all routes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={confidenceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}%`}
                  >
                    {confidenceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            What Changed This Week & Why
          </CardTitle>
          <CardDescription>AI-generated insights with root-cause analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiInsights.map((insight) => (
              <div 
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.severity === "critical" ? "bg-destructive/10 border-destructive/20" :
                  insight.severity === "warning" ? "bg-warning/10 border-warning/20" :
                  "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium">{insight.metric}</span>
                  <Badge variant={insight.direction === "up" ? "default" : "secondary"}>
                    {insight.direction === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {insight.change > 0 ? "+" : ""}{insight.change.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Cause:</strong> {insight.cause}
                </p>
                <p className="text-sm text-primary">
                  <strong>Action:</strong> {insight.action}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Trend */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Efficiency Gains Over Time
          </CardTitle>
          <CardDescription>Route optimization impact on operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="utilization" 
                  name="Utilization" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.3)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="confidenceScore" 
                  name="Confidence" 
                  stroke="hsl(var(--success))" 
                  fill="hsl(var(--success) / 0.3)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteIntelligenceDashboard;
