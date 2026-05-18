import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Bell,
  Shield,
  Truck,
} from "lucide-react";

interface SLARiskPanelProps {
  dispatchId?: string;
  compact?: boolean;
}

const SLARiskPanel = ({ dispatchId, compact = false }: SLARiskPanelProps) => {
  // Fetch at-risk dispatches
  const { data: atRiskDispatches = [] } = useQuery({
    queryKey: ["sla-at-risk", dispatchId],
    queryFn: async () => {
      let query = supabase
        .from("dispatches")
        .select(`
          id,
          dispatch_number,
          status,
          sla_deadline,
          sla_status,
          sla_risk_score,
          estimated_delivery_days,
          total_drops,
          customers(company_name)
        `)
        .not("sla_deadline", "is", null)
        .in("status", ["pending", "approved", "in_transit", "picked_up"]);

      if (dispatchId) {
        query = query.eq("id", dispatchId);
      }

      const { data, error } = await query.order("sla_deadline", { ascending: true }).limit(10);
      if (error) throw error;

      // Calculate real-time risk scores
      return data.map((d: any) => {
        const hoursRemaining = d.sla_deadline 
          ? (new Date(d.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60)
          : null;
        
        let riskScore = 0;
        if (hoursRemaining !== null) {
          if (hoursRemaining < 0) riskScore = 100;
          else if (hoursRemaining < 6) riskScore = 85;
          else if (hoursRemaining < 12) riskScore = 70;
          else if (hoursRemaining < 24) riskScore = 50;
          else if (hoursRemaining < 48) riskScore = 30;
          else riskScore = 10;

          // Adjust for drops
          if (d.total_drops > 10) riskScore = Math.min(100, riskScore + 15);
          else if (d.total_drops > 5) riskScore = Math.min(100, riskScore + 8);

          // Adjust for status
          if (d.status === "in_transit") riskScore = Math.max(0, riskScore - 10);
          else if (["pending", "draft"].includes(d.status)) riskScore = Math.min(100, riskScore + 20);
        }

        return {
          ...d,
          calculated_risk_score: riskScore,
          hours_remaining: hoursRemaining,
          risk_level: riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low",
        };
      }).filter((d: any) => d.calculated_risk_score > 20);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getRiskBadge = (level: string, score: number) => {
    const config = {
      high: { variant: "destructive" as const, icon: AlertTriangle, color: "text-red-500" },
      medium: { variant: "secondary" as const, icon: Clock, color: "text-amber-500" },
      low: { variant: "outline" as const, icon: CheckCircle, color: "text-green-500" },
    };
    const { variant, icon: Icon, color } = config[level as keyof typeof config] || config.low;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        {score}%
      </Badge>
    );
  };

  const getAIRecommendation = (dispatch: any) => {
    const { calculated_risk_score, hours_remaining, total_drops, status } = dispatch;
    
    if (calculated_risk_score >= 80) {
      return "CRITICAL: This route requires immediate intervention. Consider expedited delivery or route splitting.";
    } else if (calculated_risk_score >= 60) {
      if (total_drops > 8) {
        return "High drop density increases delay risk. Consider reducing drops or adding buffer time.";
      }
      return "Route is at moderate risk. Monitor closely and prepare contingency plans.";
    } else if (calculated_risk_score >= 40) {
      return "Route is on track but has limited buffer. Ensure timely departure and minimize stops.";
    }
    return "Route is progressing well within SLA parameters.";
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              SLA Risk Monitor
            </CardTitle>
            <Badge variant="outline">{atRiskDispatches.length} at risk</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {atRiskDispatches.slice(0, 5).map((dispatch: any) => (
            <div key={dispatch.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{dispatch.dispatch_number}</span>
              </div>
              {getRiskBadge(dispatch.risk_level, dispatch.calculated_risk_score)}
            </div>
          ))}
          {atRiskDispatches.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              All routes within SLA
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              SLA Risk Prediction
            </CardTitle>
            <CardDescription>
              AI-powered risk assessment for active deliveries
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {atRiskDispatches.map((dispatch: any) => (
          <div
            key={dispatch.id}
            className={`p-4 border rounded-lg space-y-3 ${
              dispatch.risk_level === "high" ? "border-red-500/30 bg-red-500/5" :
              dispatch.risk_level === "medium" ? "border-amber-500/30 bg-amber-500/5" :
              "border-green-500/30 bg-green-500/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{dispatch.dispatch_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {dispatch.customers?.company_name || "Unknown Customer"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRiskBadge(dispatch.risk_level, dispatch.calculated_risk_score)}
                <Badge variant="outline">
                  {dispatch.hours_remaining !== null && dispatch.hours_remaining > 0
                    ? `${Math.floor(dispatch.hours_remaining)}h remaining`
                    : "Overdue"}
                </Badge>
              </div>
            </div>

            {/* Risk Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>SLA Risk Score</span>
                <span>{dispatch.calculated_risk_score}%</span>
              </div>
              <Progress
                value={dispatch.calculated_risk_score}
                className={`h-2 ${
                  dispatch.risk_level === "high" ? "[&>div]:bg-red-500" :
                  dispatch.risk_level === "medium" ? "[&>div]:bg-amber-500" :
                  "[&>div]:bg-green-500"
                }`}
              />
            </div>

            {/* AI Recommendation */}
            <div className="flex items-start gap-2 p-3 bg-background/50 rounded-md">
              <TrendingUp className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <p className="text-sm">{getAIRecommendation(dispatch)}</p>
            </div>

            {/* Risk Factors */}
            <div className="flex flex-wrap gap-2 text-xs">
              {dispatch.total_drops > 8 && (
                <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                  High drop density ({dispatch.total_drops} drops)
                </Badge>
              )}
              {dispatch.hours_remaining !== null && dispatch.hours_remaining < 12 && (
                <Badge variant="outline" className="text-red-500 border-red-500/30">
                  Low time buffer
                </Badge>
              )}
              {dispatch.status === "pending" && (
                <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                  Not yet dispatched
                </Badge>
              )}
            </div>
          </div>
        ))}

        {atRiskDispatches.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="font-medium mb-1">All Clear!</h3>
            <p className="text-muted-foreground text-sm">
              No routes are currently at risk of SLA breach
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SLARiskPanel;
