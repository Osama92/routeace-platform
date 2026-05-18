import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  Truck,
  Timer,
  RefreshCw,
  ChevronRight,
  Target,
  Gauge,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChurnRisk {
  overall: "low" | "medium" | "high";
  score: number;
  atRiskCustomers: number;
  topRisks: string[];
  recommendation: string;
}

interface CashRunway {
  months: number;
  status: "healthy" | "warning" | "critical";
  currentCash: number;
  monthlyBurn: number;
  recommendation: string;
}

interface RevenueForecast {
  next3Months: number;
  next6Months: number;
  next12Months: number;
  growthRate: number;
  confidence: "low" | "medium" | "high";
  factors: string[];
}

interface OperationalRisk {
  overall: "low" | "medium" | "high";
  routeCongestion: number;
  assetDowntime: number;
  slaBreach: number;
  recommendations: string[];
}

interface PredictionsResponse {
  churnRisk: ChurnRisk;
  cashRunway: CashRunway;
  revenueForcast: RevenueForecast;
  operationalRisk: OperationalRisk;
}

export function PredictiveKPIs() {
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("core-ai-insights", {
        body: { type: "predictive-kpis" }
      });

      if (error) throw error;

      if (data?.success) {
        setPredictions(data.predictions);
        setLastUpdated(data.generatedAt);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Failed to fetch predictions:", error);
      toast({
        title: "Prediction Failed",
        description: error.message || "Could not generate predictive KPIs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-500";
      case "medium": return "text-amber-500";
      case "high": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBg = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-500/15";
      case "medium": return "bg-amber-500/15";
      case "high": return "bg-red-500/15";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-500";
      case "warning": return "text-amber-500";
      case "critical": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!predictions) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Unable to generate predictions</p>
          <Button variant="outline" className="mt-4" onClick={fetchPredictions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Predictive KPIs</h2>
          <p className="text-sm text-muted-foreground">
            AI-generated forecasts • Updated {lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPredictions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Churn Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${getRiskBg(predictions.churnRisk?.overall || "low")} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${getRiskColor(predictions.churnRisk?.overall || "low")}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">🔮 Churn Risk</CardTitle>
                <Badge className={`${getRiskBg(predictions.churnRisk?.overall || "low")} ${getRiskColor(predictions.churnRisk?.overall || "low")} border-0 mt-1`}>
                  {predictions.churnRisk?.overall?.toUpperCase() || "LOW"} RISK
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-medium">{predictions.churnRisk?.score || 0}/100</span>
                  </div>
                  <Progress value={predictions.churnRisk?.score || 0} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">At-Risk Customers</span>
                  <span className="text-lg font-bold text-foreground">{predictions.churnRisk?.atRiskCustomers || 0}</span>
                </div>

                {predictions.churnRisk?.topRisks?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Top Risks</span>
                    {predictions.churnRisk.topRisks.slice(0, 2).map((risk, i) => (
                      <p key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-1 text-amber-500 shrink-0" />
                        {risk}
                      </p>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                    {predictions.churnRisk?.recommendation || "Monitor customer engagement closely"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cash Runway */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${
                predictions.cashRunway?.status === "healthy" ? "bg-green-500/15" :
                predictions.cashRunway?.status === "warning" ? "bg-amber-500/15" : "bg-red-500/15"
              } flex items-center justify-center`}>
                <DollarSign className={`w-5 h-5 ${getStatusColor(predictions.cashRunway?.status || "healthy")}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">💰 Cash Runway</CardTitle>
                <Badge className={`${
                  predictions.cashRunway?.status === "healthy" ? "bg-green-500/15 text-green-500" :
                  predictions.cashRunway?.status === "warning" ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"
                } border-0 mt-1`}>
                  {predictions.cashRunway?.status?.toUpperCase() || "HEALTHY"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-foreground">
                    {predictions.cashRunway?.months || 12}
                  </p>
                  <p className="text-sm text-muted-foreground">months of runway</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Burn</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(predictions.cashRunway?.monthlyBurn || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Cash</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(predictions.cashRunway?.currentCash || 0)}
                    </p>
                  </div>
                </div>

                {predictions.cashRunway?.months && predictions.cashRunway.months < 6 && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-sm text-red-500 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      Cash runway below 6 months. Immediate action required.
                    </p>
                  </div>
                )}

                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                    {predictions.cashRunway?.recommendation || "Maintain healthy cash reserves"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">📉 Revenue Forecast</CardTitle>
                <Badge className={`${
                  predictions.revenueForcast?.confidence === "high" ? "bg-green-500/15 text-green-500" :
                  predictions.revenueForcast?.confidence === "medium" ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"
                } border-0 mt-1`}>
                  {predictions.revenueForcast?.confidence?.toUpperCase() || "MEDIUM"} CONFIDENCE
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">3 Months</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(predictions.revenueForcast?.next3Months || 0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">6 Months</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(predictions.revenueForcast?.next6Months || 0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">12 Months</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(predictions.revenueForcast?.next12Months || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Projected Growth</span>
                  <span className={`text-lg font-bold ${
                    (predictions.revenueForcast?.growthRate || 0) >= 0 ? "text-green-500" : "text-red-500"
                  }`}>
                    {(predictions.revenueForcast?.growthRate || 0) >= 0 ? "+" : ""}
                    {predictions.revenueForcast?.growthRate || 0}%
                  </span>
                </div>

                {predictions.revenueForcast?.factors?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Growth Factors</span>
                    {predictions.revenueForcast.factors.slice(0, 2).map((factor, i) => (
                      <p key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <Target className="w-3 h-3 mt-1 text-blue-500 shrink-0" />
                        {factor}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Operational Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${getRiskBg(predictions.operationalRisk?.overall || "low")} flex items-center justify-center`}>
                <Truck className={`w-5 h-5 ${getRiskColor(predictions.operationalRisk?.overall || "low")}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">⚠️ Operational Risk</CardTitle>
                <Badge className={`${getRiskBg(predictions.operationalRisk?.overall || "low")} ${getRiskColor(predictions.operationalRisk?.overall || "low")} border-0 mt-1`}>
                  {predictions.operationalRisk?.overall?.toUpperCase() || "LOW"} RISK
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Route Congestion</span>
                      <span className="font-medium">{predictions.operationalRisk?.routeCongestion || 0}%</span>
                    </div>
                    <Progress value={predictions.operationalRisk?.routeCongestion || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Asset Downtime</span>
                      <span className="font-medium">{predictions.operationalRisk?.assetDowntime || 0}%</span>
                    </div>
                    <Progress value={predictions.operationalRisk?.assetDowntime || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">SLA Breach Risk</span>
                      <span className="font-medium">{predictions.operationalRisk?.slaBreach || 0}%</span>
                    </div>
                    <Progress value={predictions.operationalRisk?.slaBreach || 0} className="h-2" />
                  </div>
                </div>

                {predictions.operationalRisk?.recommendations?.length > 0 && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                    {predictions.operationalRisk.recommendations.slice(0, 2).map((rec, i) => (
                      <p key={i} className="text-sm text-primary flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                        {rec}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default PredictiveKPIs;
