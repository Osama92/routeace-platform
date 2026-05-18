import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Clock, Truck, DollarSign, Target } from "lucide-react";
import { motion } from "framer-motion";

export interface GoalDeviation {
  id: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  severity: "warning" | "critical";
  recommendation: string;
  category: "revenue" | "sla" | "margin" | "fleet" | "cash";
}

interface GoalDeviationAlertsProps {
  deviations: GoalDeviation[];
}

const categoryConfig = {
  revenue: { icon: DollarSign, label: "Revenue", color: "text-green-500" },
  sla: { icon: Clock, label: "SLA", color: "text-blue-500" },
  margin: { icon: TrendingDown, label: "Margin", color: "text-purple-500" },
  fleet: { icon: Truck, label: "Fleet", color: "text-amber-500" },
  cash: { icon: Target, label: "Cash Flow", color: "text-rose-500" },
};

export function evaluateGoalDeviations(metrics: {
  revenueTarget: number;
  revenueCurrent: number;
  slaBreachRate: number;
  profitMargin: number;
  profitMarginTarget: number;
  fleetIdleRate: number;
  cashRunwayMonths: number;
}): GoalDeviation[] {
  const deviations: GoalDeviation[] = [];

  // Revenue trajectory
  const revenueGap = ((metrics.revenueTarget - metrics.revenueCurrent) / metrics.revenueTarget) * 100;
  if (revenueGap > 10) {
    deviations.push({
      id: "rev-gap",
      metric: "Revenue vs Target",
      target: metrics.revenueTarget,
      current: metrics.revenueCurrent,
      unit: "₦",
      severity: revenueGap > 25 ? "critical" : "warning",
      recommendation: revenueGap > 25
        ? "Activate new customer acquisition campaigns and review pricing strategy immediately."
        : "Consider upselling existing customers or expanding delivery zones.",
      category: "revenue",
    });
  }

  // SLA breach rate
  if (metrics.slaBreachRate > 5) {
    deviations.push({
      id: "sla-breach",
      metric: "SLA Breach Rate",
      target: 5,
      current: metrics.slaBreachRate,
      unit: "%",
      severity: metrics.slaBreachRate > 10 ? "critical" : "warning",
      recommendation: metrics.slaBreachRate > 10
        ? "Immediate dispatch review needed. Add buffer time to high-breach routes and escalate to ops manager."
        : "Review top 3 breach routes and adjust ETAs or add staging points.",
      category: "sla",
    });
  }

  // Margin drop
  const marginGap = metrics.profitMarginTarget - metrics.profitMargin;
  if (marginGap > 3) {
    deviations.push({
      id: "margin-drop",
      metric: "Profit Margin",
      target: metrics.profitMarginTarget,
      current: metrics.profitMargin,
      unit: "%",
      severity: marginGap > 8 ? "critical" : "warning",
      recommendation: "Audit vendor costs on top 5 routes. Consider renegotiating fuel agreements or switching underperforming vendors.",
      category: "margin",
    });
  }

  // Fleet idle
  if (metrics.fleetIdleRate > 20) {
    deviations.push({
      id: "fleet-idle",
      metric: "Fleet Idle Rate",
      target: 20,
      current: metrics.fleetIdleRate,
      unit: "%",
      severity: metrics.fleetIdleRate > 35 ? "critical" : "warning",
      recommendation: "Explore side-hustle monetization for idle assets. Consider temporary leasing or backhaul optimization.",
      category: "fleet",
    });
  }

  // Cash runway
  if (metrics.cashRunwayMonths < 3) {
    deviations.push({
      id: "cash-runway",
      metric: "Cash Runway",
      target: 6,
      current: metrics.cashRunwayMonths,
      unit: "months",
      severity: metrics.cashRunwayMonths < 1.5 ? "critical" : "warning",
      recommendation: "Accelerate receivables collection. Review payment terms and consider invoice factoring.",
      category: "cash",
    });
  }

  return deviations;
}

const GoalDeviationAlerts = ({ deviations }: GoalDeviationAlertsProps) => {
  if (deviations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <p className="font-medium text-green-700 dark:text-green-400">All metrics on track</p>
          <p className="text-sm text-muted-foreground">No goal deviations detected.</p>
        </CardContent>
      </Card>
    );
  }

  const critical = deviations.filter(d => d.severity === "critical");
  const warnings = deviations.filter(d => d.severity === "warning");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Goal Deviation Alerts
          {critical.length > 0 && (
            <Badge variant="destructive">{critical.length} Critical</Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="text-amber-600">{warnings.length} Warning</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deviations.map((dev, i) => {
          const config = categoryConfig[dev.category];
          const Icon = config.icon;

          return (
            <motion.div
              key={dev.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Alert variant={dev.severity === "critical" ? "destructive" : "default"}>
                <Icon className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  {dev.metric}
                  <Badge variant="outline" className="text-[10px]">
                    {config.label}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-1 space-y-1">
                  <p className="text-sm">
                    Current: <strong>{dev.current}{dev.unit === "₦" ? "" : dev.unit}</strong>
                    {" → "}Target: <strong>{dev.target}{dev.unit === "₦" ? "" : dev.unit}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    💡 {dev.recommendation}
                  </p>
                </AlertDescription>
              </Alert>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default GoalDeviationAlerts;
