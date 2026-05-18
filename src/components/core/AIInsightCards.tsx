import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  metric: string;
  direction: "up" | "down" | "stable";
  change: string;
  cause: string;
  action: string;
  severity: "positive" | "warning" | "critical" | "neutral";
}

interface InsightsResponse {
  success: boolean;
  insights: Insight[];
  metrics: any;
  generatedAt: string;
}

export function AIInsightCards() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("core-ai-insights", {
        body: { type: "weekly-insights" }
      });

      if (error) throw error;

      if (data?.success) {
        setInsights(data.insights || []);
        setLastUpdated(data.generatedAt);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Failed to fetch AI insights:", error);
      toast({
        title: "Insight Generation Failed",
        description: error.message || "Could not generate AI insights",
        variant: "destructive",
      });
      // Set fallback insights
      setInsights([
        {
          metric: "Data Loading",
          direction: "stable",
          change: "-",
          cause: "Insufficient data to generate insights",
          action: "Ensure platform has recent activity data",
          severity: "neutral"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "up": return <TrendingUp className="w-4 h-4" />;
      case "down": return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "positive": return "border-l-green-500 bg-green-500/5";
      case "warning": return "border-l-amber-500 bg-amber-500/5";
      case "critical": return "border-l-red-500 bg-red-500/5";
      default: return "border-l-blue-500 bg-blue-500/5";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "positive": return <Badge className="bg-green-500/15 text-green-500 border-0">Positive</Badge>;
      case "warning": return <Badge className="bg-amber-500/15 text-amber-500 border-0">Warning</Badge>;
      case "critical": return <Badge className="bg-red-500/15 text-red-500 border-0">Critical</Badge>;
      default: return <Badge className="bg-blue-500/15 text-blue-500 border-0">Info</Badge>;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-heading">What Changed This Week & Why</CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-powered insights • {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border/50">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No insights available yet</p>
            <p className="text-sm text-muted-foreground/70">Check back after more platform activity</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${getSeverityStyles(insight.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-sm font-medium ${
                      insight.direction === "up" ? "text-green-500" : 
                      insight.direction === "down" ? "text-red-500" : "text-muted-foreground"
                    }`}>
                      {getDirectionIcon(insight.direction)}
                      {insight.change}
                    </span>
                    <h4 className="font-medium text-foreground">{insight.metric}</h4>
                  </div>
                  {getSeverityBadge(insight.severity)}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  <strong className="text-foreground/80">Cause:</strong> {insight.cause}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{insight.action}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIInsightCards;
