import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, Package, MapPin, BarChart3, Zap, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import FMCGLayout from "@/components/fmcg/FMCGLayout";

interface Forecast {
  id: string;
  sku_name: string;
  territory: string;
  forecast_period: string;
  predicted_demand: number;
  confidence_score: number;
  actual_demand: number | null;
  variance_percent: number | null;
  seasonality_factor: number;
  growth_trend: number;
  restock_recommendation: string | null;
}


const FMCGDemandForecasting = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from("demand_forecasts").select("*").order("confidence_score", { ascending: false });
      setForecasts((data as Forecast[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const avgConfidence = forecasts.length > 0 ? (forecasts.reduce((s, f) => s + f.confidence_score, 0) / forecasts.length).toFixed(0) : "0";
  const highGrowth = forecasts.filter(f => f.growth_trend > 5).length;
  const urgentRestock = forecasts.filter(f => f.restock_recommendation?.includes("Urgent")).length;

  if (!loading && forecasts.length === 0) {
    return (
      <FMCGLayout>
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3 mb-2">
            <Brain className="w-7 h-7 text-primary" />
            AI Demand Forecasting Network
          </h1>
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-6">
              <Brain className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No forecast data yet</h3>
            <p className="text-sm text-muted-foreground">Demand forecasts will appear here once your distribution operations generate enough order and delivery data for AI analysis.</p>
          </div>
        </div>
      </FMCGLayout>
    );
  }

  return (
    <FMCGLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
              <Brain className="w-7 h-7 text-blue-400" />
              AI Demand Forecasting Network
            </h1>
            <p className="text-muted-foreground mt-1">Predictive SKU demand intelligence across African territories - the largest demand engine in distribution</p>
          </div>
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-sm px-3 py-1">
            ENGINE 6 - Intelligence Superpower
          </Badge>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "SKUs Forecasted", value: forecasts.length, icon: Package, color: "text-primary" },
            { label: "Avg Confidence", value: `${avgConfidence}%`, icon: Brain, color: "text-emerald-400" },
            { label: "High Growth SKUs", value: highGrowth, icon: TrendingUp, color: "text-blue-400" },
            { label: "Urgent Restocks", value: urgentRestock, icon: Zap, color: "text-amber-400" },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  </div>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="forecasts">
          <TabsList>
            <TabsTrigger value="forecasts">SKU Forecasts</TabsTrigger>
            <TabsTrigger value="territories">Territory Insights</TabsTrigger>
            <TabsTrigger value="flywheel">Intelligence Flywheel</TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts">
            <div className="space-y-3">
              {forecasts.map(f => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{f.sku_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {f.territory} · {f.forecast_period}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{f.predicted_demand.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">predicted units</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                      <Progress value={f.confidence_score} className="h-2" />
                      <p className="text-xs text-foreground mt-0.5">{f.confidence_score}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Seasonality</p>
                      <p className="font-medium text-foreground">{f.seasonality_factor}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Growth Trend</p>
                      <p className={`font-medium flex items-center gap-1 ${f.growth_trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {f.growth_trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(f.growth_trend)}%
                      </p>
                    </div>
                  </div>

                  {f.restock_recommendation && (
                    <div className={`p-2 rounded-lg text-xs ${f.restock_recommendation.includes("Urgent") ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-secondary/30 text-muted-foreground"}`}>
                      <Zap className="w-3 h-3 inline mr-1" />
                      {f.restock_recommendation}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="territories">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...new Set(forecasts.map(f => f.territory))].map(territory => {
                const territoryForecasts = forecasts.filter(f => f.territory === territory);
                const totalDemand = territoryForecasts.reduce((s, f) => s + f.predicted_demand, 0);
                const avgGrowth = (territoryForecasts.reduce((s, f) => s + f.growth_trend, 0) / territoryForecasts.length).toFixed(1);
                return (
                  <Card key={territory} className="bg-card border-border">
                    <CardContent className="pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-foreground">{territory}</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">SKUs</p>
                          <p className="font-bold text-foreground">{territoryForecasts.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Demand</p>
                          <p className="font-bold text-foreground">{(totalDemand / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Growth</p>
                          <p className={`font-bold ${Number(avgGrowth) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{avgGrowth}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="flywheel">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  <h3 className="text-xl font-heading font-bold text-foreground">Intelligence Flywheel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                    {[
                      { step: "1", title: "Retail Orders", desc: "Transaction data flows in" },
                      { step: "2", title: "Graph Data", desc: "Retail Network Graph enriches" },
                      { step: "3", title: "AI Forecasts", desc: "Demand predictions generated" },
                      { step: "4", title: "Better Placement", desc: "Optimized inventory decisions" },
                      { step: "5", title: "Higher Sales", desc: "Retailer revenue increases" },
                    ].map(s => (
                      <div key={s.step} className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/30">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                          <span className="font-bold text-blue-400">{s.step}</span>
                        </div>
                        <p className="font-medium text-foreground text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg text-center">
                    The flywheel strengthens itself: more retail orders → better data → more accurate forecasts → better inventory → higher sales → more orders.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FMCGLayout>
  );
};



const __InnerDemo_FMCGDemandForecasting = FMCGDemandForecasting;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_FMCGDemandForecasting = () => (
  <__DemoPreviewGate title="FMCG Demand Forecasting" description="AI demand forecast by SKU/region.">
    <__InnerDemo_FMCGDemandForecasting />
  </__DemoPreviewGate>
);
export default __WrappedDemo_FMCGDemandForecasting;
