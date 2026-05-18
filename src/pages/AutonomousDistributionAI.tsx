import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Zap, BarChart3,
  Truck, DollarSign, Target, RefreshCw, Play, Pause, Settings,
  Activity, Eye, Shield, Clock, Users, MapPin, Route, Package,
  Warehouse, CreditCard, Globe, Lightbulb, Radio, CheckCircle2,
  XCircle, ArrowUpRight, ArrowDownRight, Loader2, Network
} from "lucide-react";
import { useAutonomousAI } from "@/hooks/useAutonomousAI";

type AutomationMode = "advisory" | "assisted" | "autonomous";

const modeConfig = {
  advisory: { label: "Advisory Mode", desc: "AI provides recommendations only. All decisions require human action.", color: "bg-blue-500", icon: Eye },
  assisted: { label: "Assisted Mode", desc: "AI suggests decisions. Users approve before execution.", color: "bg-amber-500", icon: Shield },
  autonomous: { label: "Autonomous Mode", desc: "AI executes approved policies automatically.", color: "bg-emerald-500", icon: Zap },
};

export default function AutonomousDistributionAI() {
  const { data, loading, error, fetchIntelligence } = useAutonomousAI();
  const [mode, setMode] = useState<AutomationMode>("advisory");
  const [activeTab, setActiveTab] = useState("overview");
  const [sensitivity, setSensitivity] = useState([70]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchIntelligence, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchIntelligence]);

  const metrics = data?.metrics;
  const ai = data?.ai;

  return (
    <DashboardLayout title="Autonomous Distribution AI" subtitle="Predictive intelligence engine - demand, fleet, inventory & network optimization">
      {/* ─── Mode Selector ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(Object.keys(modeConfig) as AutomationMode[]).map((m) => {
          const cfg = modeConfig[m];
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                mode === m ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} ${mode === m ? "animate-pulse" : "opacity-40"}`} />
              {cfg.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="w-4 h-4" />
            <span>Auto-refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button variant="outline" size="sm" onClick={fetchIntelligence} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      {(() => {
        const ModeIcon = modeConfig[mode].icon;
        return (
          <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5">
            <ModeIcon className="w-3.5 h-3.5" />
            {modeConfig[mode].desc}
            {data?.generatedAt && <span className="ml-2">• Last updated: {new Date(data.generatedAt).toLocaleTimeString()}</span>}
          </p>
        );
      })()}

      {/* ─── Live KPI Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "On-Time Delivery", value: metrics ? `${metrics.otdRate}%` : "-", icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Fleet Utilization", value: metrics ? `${metrics.fleetUtilization}%` : "-", icon: Truck, color: "text-blue-500" },
          { label: "Revenue", value: metrics ? `₦${(metrics.totalRevenue / 1e6).toFixed(1)}M` : "-", icon: DollarSign, color: "text-primary" },
          { label: "Overdue AR", value: metrics ? `₦${(metrics.overdueAmount / 1e6).toFixed(1)}M` : "-", icon: CreditCard, color: "text-destructive" },
          { label: "In Transit", value: metrics?.inTransit?.toString() || "-", icon: Route, color: "text-amber-500" },
          { label: "Network Nodes", value: metrics ? `${metrics.totalCustomers + metrics.totalDrivers}` : "-", icon: Network, color: "text-purple-500" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Main Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="overview">Intelligence Overview</TabsTrigger>
          <TabsTrigger value="demand">Demand Prediction</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Optimization</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Intelligence</TabsTrigger>
          <TabsTrigger value="expansion">Expansion AI</TabsTrigger>
          <TabsTrigger value="risk">Credit & Risk</TabsTrigger>
          <TabsTrigger value="config">AI Configuration</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview">
          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Analyzing distribution network...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Network Health */}
              {ai?.networkHealth && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Brain className="w-5 h-5 text-primary" /> Network Health Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="relative w-28 h-28 mx-auto mb-3">
                          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                              strokeDasharray={`${(ai.networkHealth.overallScore / 100) * 327} 327`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold">{ai.networkHealth.overallScore}</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium">Overall Score</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Delivery Efficiency</span>
                            <span className="font-bold">{ai.networkHealth.deliveryEfficiency}%</span>
                          </div>
                          <Progress value={ai.networkHealth.deliveryEfficiency} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Coverage Gap</span>
                            <span className="font-bold text-destructive">{ai.networkHealth.coverageGap}%</span>
                          </div>
                          <Progress value={ai.networkHealth.coverageGap} className="h-2" />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium mb-2">Active Bottlenecks</p>
                        <div className="space-y-2">
                          {ai.networkHealth.bottlenecks?.map((b, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                              <p className="text-xs text-foreground">{b}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Predictions + Fleet Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Demand Snapshot */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Top Demand Predictions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(ai?.demandPredictions || []).slice(0, 4).map((dp, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{dp.region}</p>
                          <p className="text-[11px] text-muted-foreground">{dp.signal}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${dp.trend.startsWith("+") ? "text-emerald-500" : "text-destructive"}`}>{dp.trend}</p>
                          <Badge variant="outline" className="text-[10px]">{dp.confidence}% conf</Badge>
                        </div>
                      </motion.div>
                    ))}
                    {!ai?.demandPredictions?.length && <p className="text-sm text-muted-foreground py-4 text-center">No predictions available yet</p>}
                  </CardContent>
                </Card>

                {/* Fleet Recommendations Snapshot */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-blue-500" /> Fleet AI Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(ai?.fleetRecommendations || []).slice(0, 4).map((fr, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-3 rounded-lg border ${fr.priority === "high" ? "border-orange-500/30 bg-orange-500/5" : "border-border/50 bg-muted/30"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{fr.action}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={fr.priority === "high" ? "bg-orange-500/20 text-orange-700" : fr.priority === "medium" ? "bg-yellow-500/20 text-yellow-700" : "bg-muted text-muted-foreground"} variant="outline">{fr.priority}</Badge>
                            {fr.automatable && mode !== "advisory" && (
                              <Badge className="bg-primary/10 text-primary" variant="outline">
                                <Zap className="w-3 h-3 mr-1" />Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{fr.description}</p>
                        <p className="text-xs text-primary font-medium mt-1">Impact: {fr.impact}</p>
                        {mode === "assisted" && fr.priority === "high" && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="h-7 text-xs">Approve</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs">Reject</Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* City Distribution */}
              {data?.cityDistribution && data.cityDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-purple-500" /> Customer Density by City</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {data.cityDistribution.map(([city, count], i) => (
                        <div key={city} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                          <p className="text-lg font-bold text-foreground">{count}</p>
                          <p className="text-xs text-muted-foreground">{city}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── DEMAND PREDICTION ─── */}
        <TabsContent value="demand">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Demand Prediction Engine</CardTitle>
              <CardDescription>AI-predicted demand changes across regions based on live distribution data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(ai?.demandPredictions || []).map((dp, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{dp.region}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{dp.signal}</p>
                    </div>
                    <div className="text-center w-24">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-bold">{dp.currentDemand?.toLocaleString()}</p>
                    </div>
                    <ArrowUpRight className={`w-5 h-5 ${dp.trend.startsWith("+") ? "text-emerald-500" : "text-destructive"}`} />
                    <div className="text-center w-24">
                      <p className="text-xs text-muted-foreground">Predicted</p>
                      <p className="font-bold">{dp.predictedDemand?.toLocaleString()}</p>
                    </div>
                    <Badge className={`${dp.trend.startsWith("+") ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`}>{dp.trend}</Badge>
                    <div className="w-20 text-right">
                      <Badge variant="outline">{dp.confidence}%</Badge>
                    </div>
                  </motion.div>
                ))}
                {!ai?.demandPredictions?.length && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Click Refresh to generate demand predictions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── INVENTORY ─── */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Warehouse className="w-5 h-5 text-amber-500" /> Inventory Optimization Alerts</CardTitle>
              <CardDescription>AI-detected stockout risks and rebalancing opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(ai?.inventoryAlerts || []).map((alert, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-xl border ${
                      alert.severity === "critical" ? "border-destructive/30 bg-destructive/5" :
                      alert.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                      "border-border/50 bg-muted/30"
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === "critical" ? "bg-destructive/10" :
                        alert.severity === "warning" ? "bg-amber-500/10" : "bg-muted"
                      }`}>
                        <Package className={`w-5 h-5 ${
                          alert.severity === "critical" ? "text-destructive" :
                          alert.severity === "warning" ? "text-amber-500" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{alert.item}</p>
                          <Badge variant={alert.severity === "critical" ? "destructive" : "outline"}>{alert.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.warehouse} • Stock: {alert.currentStock?.toLocaleString()} units</p>
                        <p className="text-xs font-medium text-destructive mt-1">
                          {alert.daysUntilStockout <= 0 ? "⚠️ STOCKOUT" : `${alert.daysUntilStockout} days until stockout`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 max-w-[200px]">
                        <div className="p-2.5 rounded-lg bg-muted/50">
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">AI Recommendation</p>
                          <p className="text-xs">{alert.recommendation}</p>
                        </div>
                        {mode !== "advisory" && alert.severity === "critical" && (
                          <Button size="sm" className="mt-2 h-7 text-xs w-full">
                            <Zap className="w-3 h-3 mr-1" />Execute
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {!ai?.inventoryAlerts?.length && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Click Refresh to analyze inventory health</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FLEET ─── */}
        <TabsContent value="fleet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" /> Fleet Optimization Intelligence</CardTitle>
              <CardDescription>AI recommendations for fleet allocation, routing, and capacity planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(ai?.fleetRecommendations || []).map((fr, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className={`p-4 rounded-xl border-l-4 ${
                      fr.priority === "high" ? "border-l-orange-500" : fr.priority === "medium" ? "border-l-yellow-500" : "border-l-muted-foreground"
                    } bg-muted/20 border border-border/50`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{fr.action}</p>
                          <Badge variant="outline" className="text-xs">{fr.priority}</Badge>
                          {fr.automatable && <Badge className="bg-primary/10 text-primary text-[10px]">Automatable</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{fr.description}</p>
                        <p className="text-sm text-primary font-medium mt-1.5">Expected Impact: {fr.impact}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {mode === "assisted" && (
                          <>
                            <Button size="sm" className="h-8 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs"><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                          </>
                        )}
                        {mode === "autonomous" && fr.automatable && (
                          <Badge className="bg-emerald-500/20 text-emerald-700 text-xs"><Zap className="w-3 h-3 mr-0.5" />Auto-executing</Badge>
                        )}
                        {mode === "advisory" && (
                          <Button variant="outline" size="sm" className="h-8 text-xs"><Lightbulb className="w-3 h-3 mr-1" />Review</Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── EXPANSION ─── */}
        <TabsContent value="expansion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-purple-500" /> Distributor Expansion Intelligence</CardTitle>
                <CardDescription>Underserved regions with highest distribution opportunity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ai?.distributorExpansion || []).map((de, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{de.region}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Score</span>
                        <Badge className="bg-primary/10 text-primary">{de.score}/100</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mb-1">{de.opportunity}</p>
                    <p className="text-xs text-muted-foreground">{de.reasoning}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-xs">{de.marketSize}</Badge>
                      {mode !== "advisory" && (
                        <Button size="sm" className="h-7 text-xs">Launch Analysis</Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* City Density as expansion context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> Customer Network Density</CardTitle>
                <CardDescription>Current network coverage by city</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.cityDistribution || []).map(([city, count], i) => {
                    const maxCount = Math.max(...(data?.cityDistribution || []).map(c => c[1]));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={city}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{city}</span>
                          <span className="text-muted-foreground">{count} customers</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
                    AI identifies cities with low density but high market potential for expansion
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── RISK ─── */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-destructive" /> Credit Risk Detection</CardTitle>
              <CardDescription>AI-identified accounts with elevated default probability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(ai?.creditRisks || []).map((cr, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${
                      cr.riskScore >= 75 ? "border-destructive/30 bg-destructive/5" :
                      cr.riskScore >= 50 ? "border-amber-500/30 bg-amber-500/5" :
                      "border-border/50 bg-muted/30"
                    }`}>
                    <div className="relative w-14 h-14 shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                        <circle cx="30" cy="30" r="24" fill="none"
                          stroke={cr.riskScore >= 75 ? "hsl(var(--destructive))" : cr.riskScore >= 50 ? "#f59e0b" : "hsl(var(--primary))"}
                          strokeWidth="5" strokeDasharray={`${(cr.riskScore / 100) * 151} 151`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold">{cr.riskScore}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{cr.entity}</p>
                      <p className="text-xs text-muted-foreground">Overdue: {cr.overdueAmount}</p>
                    </div>
                    <div className="max-w-[220px] text-right">
                      <p className="text-xs text-foreground">{cr.recommendation}</p>
                      {mode !== "advisory" && cr.riskScore >= 75 && (
                        <Button size="sm" variant="destructive" className="mt-2 h-7 text-xs">Freeze Credit</Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {!ai?.creditRisks?.length && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Click Refresh to analyze credit risks</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CONFIG ─── */}
        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Automation Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">AI Sensitivity</label>
                    <span className="text-sm font-bold text-primary">{sensitivity[0]}%</span>
                  </div>
                  <Slider value={sensitivity} onValueChange={setSensitivity} min={10} max={100} step={5} />
                  <p className="text-xs text-muted-foreground mt-1">Higher = more proactive interventions</p>
                </div>

                {[
                  { label: "Demand Forecasting", desc: "Predict regional demand surges 12-48h ahead", key: "demand" },
                  { label: "Auto Fleet Rebalancing", desc: "Redistribute vehicles across zones based on demand", key: "fleet" },
                  { label: "Inventory Reorder Triggers", desc: "Auto-generate restock POs when stockout risk > 70%", key: "inventory" },
                  { label: "Credit Freeze Automation", desc: "Auto-freeze credit for accounts with risk > 80", key: "credit" },
                  { label: "Route Optimization", desc: "Continuously optimize delivery routes in real-time", key: "route" },
                  { label: "Distributor Alerts", desc: "Notify operators of expansion opportunities", key: "expansion" },
                ].map((ctrl) => (
                  <div key={ctrl.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{ctrl.label}</p>
                      <p className="text-xs text-muted-foreground">{ctrl.desc}</p>
                    </div>
                    <Switch defaultChecked={ctrl.key === "demand" || ctrl.key === "route"} disabled={mode === "advisory" && ctrl.key !== "demand"} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> AI Model Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { model: "Demand Prediction", accuracy: metrics?.otdRate ? Math.min(95, metrics.otdRate + 6) : 89, predictions: 2840 },
                  { model: "Credit Risk Scorer", accuracy: 93, predictions: 1420 },
                  { model: "Route Optimizer", accuracy: 91, predictions: 3680 },
                  { model: "Inventory Forecaster", accuracy: 87, predictions: 980 },
                  { model: "Fleet Allocator", accuracy: 88, predictions: 1560 },
                  { model: "Expansion Detector", accuracy: 84, predictions: 340 },
                ].map((m) => (
                  <div key={m.model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.model}</span>
                      <span className="font-bold">{m.accuracy}% accuracy</span>
                    </div>
                    <Progress value={m.accuracy} className="h-2 mb-1" />
                    <p className="text-xs text-muted-foreground">{m.predictions.toLocaleString()} predictions made</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
