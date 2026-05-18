import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Sparkles, RefreshCw, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIInsight {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  suggested_action: string;
}

interface FMCGAIInsightPanelProps {
  role: string;
  context?: Record<string, any>;
}

const AGENT_LABELS: Record<string, { label: string; icon: typeof Brain }> = {
  executive: { label: "Strategy Agent", icon: Brain },
  rsm: { label: "Regional Intelligence", icon: TrendingUp },
  asm: { label: "Area Advisor", icon: Lightbulb },
  supervisor: { label: "Field Command AI", icon: Sparkles },
  sales_rep: { label: "Field Sales Agent", icon: Sparkles },
  merchandiser: { label: "Shelf Intelligence", icon: Lightbulb },
  distributor: { label: "Operations Agent", icon: Brain },
  warehouse: { label: "Warehouse AI", icon: Lightbulb },
  finance: { label: "Credit Risk Agent", icon: AlertTriangle },
  logistics: { label: "Logistics Optimizer", icon: TrendingUp },
};

const severityConfig = {
  high: { variant: "destructive" as const, dot: "bg-destructive" },
  medium: { variant: "secondary" as const, dot: "bg-yellow-500" },
  low: { variant: "default" as const, dot: "bg-green-500" },
};

const FMCGAIInsightPanel = ({ role, context }: FMCGAIInsightPanelProps) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const agent = AGENT_LABELS[role] || AGENT_LABELS.executive;
  const AgentIcon = agent.icon;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fmcg-ai-insights", {
        body: { role, context },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Agent", description: data.error, variant: "destructive" });
        return;
      }

      setInsights(data?.insights || []);
      setHasLoaded(true);
    } catch (err: any) {
      toast({
        title: "AI Agent Unavailable",
        description: err?.message || "Could not fetch insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [role, context, toast]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <AgentIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block">{agent.label}</span>
              <span className="text-[10px] font-normal text-muted-foreground tracking-wider uppercase">Distribution AI Agent</span>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInsights}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {hasLoaded ? "Refresh" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const cfg = severityConfig[insight.severity] || severityConfig.low;
              return (
                <div key={i} className="p-3 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <span className="font-medium text-sm">{insight.title}</span>
                    </div>
                    <Badge variant={cfg.variant} className="text-[10px] flex-shrink-0">{insight.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">{insight.description}</p>
                  <p className="text-xs text-primary font-medium pl-4">→ {insight.suggested_action}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <AgentIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Click <strong>Generate</strong> for AI-powered insights</p>
            <p className="text-xs mt-1">Powered by RouteAce Distribution Intelligence</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FMCGAIInsightPanel;
