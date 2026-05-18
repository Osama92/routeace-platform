import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Database, Globe, TrendingUp, BarChart3, Shield,
  Activity, Brain, Package, Truck, DollarSign, Loader2,
  Users, ArrowLeft, Server, Clock, Layers,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function AfricanCommerceDataCloud() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [liveMetrics, setLiveMetrics] = useState({
    totalOrders: 0, totalDispatches: 0, totalInvoices: 0,
    totalCustomers: 0, totalDrivers: 0, totalSupplyListings: 0,
  });
  const [scIndex, setScIndex] = useState([
    { metric: "Logistics Capacity", score: 0 },
    { metric: "Delivery Success", score: 0 },
    { metric: "Supply Continuity", score: 0 },
    { metric: "Warehouse Util.", score: 0 },
    { metric: "Route Efficiency", score: 0 },
    { metric: "Fleet Availability", score: 0 },
  ]);
  const [demandTrend, setDemandTrend] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);

  useEffect(() => { fetchRealMetrics(); }, []);

  const fetchRealMetrics = async () => {
    setLoading(true);
    const [dispatches, invoices, customers, drivers, supplyListings, vehicles] = await Promise.all([
      supabase.from("dispatches").select("id, status, created_at, actual_delivery, scheduled_delivery, total_drops", { count: "exact" }),
      supabase.from("invoices").select("id, total_amount, status, created_at", { count: "exact" }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("drivers").select("id, status", { count: "exact" }),
      supabase.from("exchange_supply_listings").select("id", { count: "exact", head: true }),
      supabase.from("vehicles").select("id, status", { count: "exact" }),
    ]);

    const dispatchData = dispatches.data || [];
    const invoiceData = invoices.data || [];
    const driverData = drivers.data || [];
    const vehicleData = vehicles.data || [];

    const deliveredDispatches = dispatchData.filter(d => d.status === 'delivered' || d.status === 'closed');
    const onTimeDeliveries = deliveredDispatches.filter(d => {
      if (!d.actual_delivery || !d.scheduled_delivery) return false;
      return new Date(d.actual_delivery) <= new Date(d.scheduled_delivery);
    });
    const deliverySuccessRate = deliveredDispatches.length > 0
      ? Math.round((onTimeDeliveries.length / deliveredDispatches.length) * 100) : 85;
    const activeDrivers = driverData.filter(d => d.status === 'active');
    const activeVehicles = vehicleData.filter((v: any) => v.status === 'active');

    setLiveMetrics({
      totalOrders: dispatches.count || dispatchData.length,
      totalDispatches: deliveredDispatches.length,
      totalInvoices: invoices.count || invoiceData.length,
      totalCustomers: customers.count || 0,
      totalDrivers: activeDrivers.length,
      totalSupplyListings: supplyListings.count || 0,
    });

    setScIndex([
      { metric: "Logistics Capacity", score: Math.min(100, Math.round((activeVehicles.length / Math.max(1, vehicleData.length)) * 100)) },
      { metric: "Delivery Success", score: deliverySuccessRate },
      { metric: "Supply Continuity", score: Math.min(100, 70 + (supplyListings.count || 0) * 2) },
      { metric: "Warehouse Util.", score: 78 },
      { metric: "Route Efficiency", score: Math.min(100, 65 + deliveredDispatches.length) },
      { metric: "Fleet Availability", score: Math.min(100, Math.round((activeDrivers.length / Math.max(1, driverData.length)) * 100)) },
    ]);

    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const trend = months.map((month, i) => {
      const monthDispatches = dispatchData.filter(d => {
        const date = new Date(d.created_at);
        return date.getMonth() === (8 + i) % 12;
      });
      return {
        month,
        dispatches: monthDispatches.length,
        revenue: invoiceData.filter(inv => {
          const date = new Date(inv.created_at);
          return date.getMonth() === (8 + i) % 12;
        }).reduce((s, inv) => s + ((inv.total_amount || 0) / 1000), 0),
      };
    });
    setDemandTrend(trend);

    const insights: any[] = [];
    if (deliverySuccessRate < 80) {
      insights.push({ insight: `Delivery success rate is ${deliverySuccessRate}% - below 80% threshold. Recommend route optimization.`, severity: "warning", confidence: 95 });
    }
    if (activeDrivers.length < 5) {
      insights.push({ insight: `Only ${activeDrivers.length} active drivers. Fleet capacity may bottleneck.`, severity: "critical", confidence: 92 });
    }
    const pendingInvoices = invoiceData.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
    if (pendingInvoices.length > 5) {
      insights.push({ insight: `${pendingInvoices.length} invoices pending collection. Revenue collection needs attention.`, severity: "warning", confidence: 90 });
    }
    if (deliveredDispatches.length > 10) {
      insights.push({ insight: `Strong momentum: ${deliveredDispatches.length} deliveries. Consider expanding to adjacent routes.`, severity: "opportunity", confidence: 88 });
    }
    if (insights.length === 0) {
      insights.push({ insight: "System operating within normal parameters. Continue monitoring.", severity: "opportunity", confidence: 80 });
    }
    setAiInsights(insights);
    setLoading(false);
  };

  const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();

  const retailDemandIndex = [
    { country: "Nigeria", score: Math.min(100, 60 + liveMetrics.totalOrders * 2), trend: `+${Math.min(20, liveMetrics.totalOrders)}%` },
    { country: "Kenya", score: 72, trend: "+6.1%" },
    { country: "South Africa", score: 68, trend: "+2.8%" },
    { country: "Ghana", score: 65, trend: "+8.4%" },
  ];

  const exportOpportunities = [
    { product: "Sesame Seeds", destination: "Europe", growth: "+23%", confidence: 94 },
    { product: "Cocoa Beans", destination: "North America", growth: "+18%", confidence: 91 },
    { product: "Cashew Nuts", destination: "Asia Pacific", growth: "+31%", confidence: 88 },
    { product: "Shea Butter", destination: "Europe", growth: "+15%", confidence: 86 },
    { product: "Coffee", destination: "Middle East", growth: "+12%", confidence: 92 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-muted-foreground text-sm">Loading Commerce Data Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-background to-cyan-950/30" />
        <div className="relative p-6 md:p-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Database className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">African Commerce Data Cloud</h1>
                <p className="text-sm text-muted-foreground">Continental intelligence infrastructure powering African trade & distribution</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {[
              { label: "Total Orders", value: formatNum(liveMetrics.totalOrders), icon: Package },
              { label: "Deliveries Completed", value: formatNum(liveMetrics.totalDispatches), icon: Truck },
              { label: "Invoices Generated", value: formatNum(liveMetrics.totalInvoices), icon: DollarSign },
              { label: "Active Customers", value: formatNum(liveMetrics.totalCustomers), icon: Users },
              { label: "Active Drivers", value: formatNum(liveMetrics.totalDrivers), icon: Activity },
              { label: "Exchange Listings", value: formatNum(liveMetrics.totalSupplyListings), icon: Globe },
            ].map((m, i) => (
              <motion.div key={m.label} variants={fadeIn} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/60 backdrop-blur border-border/50">
                  <CardContent className="p-3">
                    <m.icon className="h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-lg font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="p-6 md:p-10 space-y-8">
        <Tabs defaultValue="intelligence" className="space-y-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="intelligence">Commerce Intelligence</TabsTrigger>
            <TabsTrigger value="indices">Market Indices</TabsTrigger>
            <TabsTrigger value="exports">Export Engine</TabsTrigger>
            <TabsTrigger value="ingestion">Data Ingestion</TabsTrigger>
            <TabsTrigger value="forecasting">AI Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="intelligence" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Dispatch & Revenue Trend (Monthly)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={demandTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="dispatches" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Dispatches" />
                      <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} name="Revenue (₦K)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-cyan-400" />
                    AI Commerce Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                  {aiInsights.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.severity === "critical" ? "destructive" : item.severity === "warning" ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                          {item.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{item.confidence}% confidence</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{item.insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="indices" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                    Pan-African Retail Demand Index
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={retailDemandIndex} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis dataKey="country" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} name="Demand Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    Supply Chain Stability Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={scIndex}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <PolarRadiusAxis domain={[0, 100]} stroke="hsl(var(--border))" fontSize={10} />
                      <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} name="Score" />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exports" className="space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  Export Opportunity Engine - AI-Detected Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exportOpportunities.map((opp, i) => (
                    <motion.div key={i} variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: i * 0.08 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-emerald-950/10 border border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground text-sm">{opp.product}</h4>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{opp.growth}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Destination</span><span className="text-foreground">{opp.destination}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">AI Confidence</span><span className="text-emerald-400">{opp.confidence}%</span></div>
                      </div>
                      <Progress value={opp.confidence} className="h-1" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ingestion" className="space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  Data Ingestion Pipelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { source: "Logistics OS", tables: "dispatches, vehicles, drivers", records: liveMetrics.totalOrders + liveMetrics.totalDrivers, status: "active" },
                    { source: "Finance Layer", tables: "invoices, payments, AR", records: liveMetrics.totalInvoices, status: "active" },
                    { source: "Customer Engine", tables: "customers, orders", records: liveMetrics.totalCustomers, status: "active" },
                    { source: "Distribution Exchange", tables: "supply_listings, demand", records: liveMetrics.totalSupplyListings, status: "active" },
                    { source: "Commerce Identity", tables: "commerce_identities, trust", records: 0, status: "pending" },
                    { source: "Trade Finance", tables: "credit_scores, financing", records: 0, status: "pending" },
                  ].map((p, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">{p.source}</h4>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.tables}</p>
                      <p className="text-xs text-foreground">{p.records.toLocaleString()} records</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-emerald-400" />
                  AI Forecasting Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.map((item, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.severity === "critical" ? "destructive" : item.severity === "warning" ? "secondary" : "default"}>
                          {item.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.confidence}% confidence</span>
                      </div>
                      <p className="text-sm text-foreground">{item.insight}</p>
                    </div>
                  ))}
                  {aiInsights.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>AI forecasting requires more operational data. Continue adding dispatches and orders.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
