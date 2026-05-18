/**
 * RevenueExpansionEngine - Automated upgrade triggers,
 * usage alerts, and intelligent upsell prompts.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, AlertTriangle, ArrowUpRight, Zap, Crown,
  Users, Truck, Package, Shield, BarChart3, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUsageMetering } from "@/hooks/useUsageMetering";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useState } from "react";

interface UpgradeNudge {
  id: string;
  trigger: string;
  message: string;
  cta: string;
  targetPlan: string;
  savings?: string;
  icon: React.ElementType;
  severity: "info" | "warning" | "critical";
}

const RevenueExpansionEngine = () => {
  const { metrics, upgradeTriggers, hasUpgradeRecommendation } = useUsageMetering();
  const { config } = useTenantConfig();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const plan = config?.plan_tier || "free";
  const model = config?.operating_model || "haulage";

  // Generate contextual nudges based on real usage
  const nudges: UpgradeNudge[] = [];

  // Vehicle capacity nudge
  if (metrics.vehicleCount > (config?.max_vehicles || 1) * 0.8) {
    nudges.push({
      id: "vehicle-cap",
      trigger: "vehicle_capacity",
      message: `You're using ${metrics.vehicleCount} of ${config?.max_vehicles || 1} vehicles. Upgrade to add more.`,
      cta: "Upgrade Fleet Capacity",
      targetPlan: plan === "free" ? "starter" : plan === "starter" ? "growth" : "enterprise",
      icon: Truck,
      severity: metrics.vehicleCount >= (config?.max_vehicles || 1) ? "critical" : "warning",
    });
  }

  // Dispatch volume nudge
  if (metrics.monthlyDispatches > (config?.max_monthly_dispatches || 10) * 0.75) {
    nudges.push({
      id: "dispatch-vol",
      trigger: "dispatch_volume",
      message: `${metrics.monthlyDispatches} dispatches this month - approaching your ${config?.max_monthly_dispatches || 10} limit.`,
      cta: "Increase Dispatch Limit",
      targetPlan: plan === "free" ? "starter" : "growth",
      savings: model === "multidrop" ? "Save ₦8/drop with Growth" : undefined,
      icon: Package,
      severity: "warning",
    });
  }

  // AI credit depletion
  if (metrics.aiUsagePercent > 80) {
    nudges.push({
      id: "ai-credits",
      trigger: "ai_depletion",
      message: `${metrics.aiCreditsRemaining} AI credits remaining (${100 - metrics.aiUsagePercent}% left). Replenish to keep AI features active.`,
      cta: "Buy AI Credits",
      targetPlan: plan,
      icon: Zap,
      severity: metrics.aiUsagePercent > 95 ? "critical" : "warning",
    });
  }

  // Plan tier nudge
  if (plan === "free") {
    nudges.push({
      id: "plan-upgrade",
      trigger: "plan_tier",
      message: "Most businesses like yours choose Growth. Unlock full fleet management, SLA tracking, and 500 AI credits.",
      cta: "Start Growth Plan",
      targetPlan: "growth",
      savings: "Save 20% with annual billing",
      icon: Crown,
      severity: "info",
    });
  }

  // Usage-based cost savings
  if (model === "hybrid" && plan !== "enterprise") {
    nudges.push({
      id: "hybrid-savings",
      trigger: "hybrid_optimization",
      message: "Your hybrid fleet could save up to ₦45,000/month on Enterprise with optimized per-drop + subscription pricing.",
      cta: "See Enterprise Pricing",
      targetPlan: "enterprise",
      savings: "Est. ₦45,000/mo savings",
      icon: BarChart3,
      severity: "info",
    });
  }

  const visibleNudges = nudges.filter(n => !dismissed.includes(n.id));

  const severityColors = {
    info: "border-primary/20 bg-primary/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    critical: "border-destructive/20 bg-destructive/5",
  };

  const severityBadge = {
    info: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600",
    critical: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      {/* Expansion Score */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Expansion Score</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-2xl font-bold">{Math.min(100, 35 + visibleNudges.length * 15)}/100</p>
                  <Badge className={`text-[10px] ${hasUpgradeRecommendation ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}`}>
                    {hasUpgradeRecommendation ? "Expansion Ready" : "Optimized"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {visibleNudges.length} actionable upgrade{visibleNudges.length !== 1 ? "s" : ""} available
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-40" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Nudges */}
      <AnimatePresence>
        {visibleNudges.map((nudge, i) => (
          <motion.div
            key={nudge.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={severityColors[nudge.severity]}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <nudge.icon className="h-5 w-5 text-foreground/60 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${severityBadge[nudge.severity]}`}>
                        {nudge.severity === "critical" ? "Action Required" : nudge.severity === "warning" ? "Approaching Limit" : "Recommendation"}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">{nudge.message}</p>
                    {nudge.savings && (
                      <p className="text-xs text-green-600 mt-1 font-medium">{nudge.savings}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" className="text-xs">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {nudge.cta}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
                        onClick={() => setDismissed(prev => [...prev, nudge.id])}>
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {visibleNudges.length === 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4 pb-4 text-center">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold">All optimized</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your plan and usage are well-matched. We'll notify you when there's an expansion opportunity.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage vs Plan Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Usage vs Plan Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Vehicles", current: metrics.vehicleCount, max: config?.max_vehicles || 1 },
            { label: "Drivers", current: metrics.driverCount, max: 999 },
            { label: "Dispatches/mo", current: metrics.monthlyDispatches, max: config?.max_monthly_dispatches || 10 },
            { label: "AI Credits", current: metrics.aiCreditsUsed, max: metrics.aiCreditsTotal || 1 },
          ].map((item, i) => {
            const pct = Math.min(100, (item.current / item.max) * 100);
            const isNearLimit = pct > 80;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{item.label}</span>
                  <span className={isNearLimit ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                    {item.current} / {item.max === 999 ? "∞" : item.max}
                  </span>
                </div>
                <Progress value={pct} className={`h-2 ${isNearLimit ? "[&>div]:bg-amber-500" : ""}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueExpansionEngine;
