/**
 * UsageBillingDashboard - Shows real-time usage metrics,
 * AI credit consumption, and upgrade triggers.
 */
import { motion } from "framer-motion";
import { 
  Truck, Users, Zap, TrendingUp, AlertTriangle, 
  ArrowUpRight, Package, CreditCard 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsageMetering } from "@/hooks/useUsageMetering";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const UsageBillingDashboard = () => {
  const { metrics, upgradeTriggers, hasUpgradeRecommendation } = useUsageMetering();
  const { config } = useTenantConfig();

  const plan = config?.plan_tier || "free";
  const operatingModel = config?.operating_model || "haulage";

  const planLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    enterprise: "Enterprise",
  };

  if (metrics.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-bold">{planLabels[plan] || plan}</h2>
                  <Badge variant="outline" className="text-xs capitalize">
                    {operatingModel}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Usage Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Vehicles",
            value: metrics.vehicleCount,
            icon: Truck,
            limit: config?.max_vehicles || "∞",
          },
          {
            label: "Drivers",
            value: metrics.driverCount,
            icon: Users,
            limit: config?.max_users || "∞",
          },
          {
            label: "Dispatches (this month)",
            value: metrics.monthlyDispatches,
            icon: Package,
            limit: config?.max_monthly_dispatches || "∞",
          },
          {
            label: "AI Credits Used",
            value: metrics.aiCreditsUsed,
            icon: Zap,
            limit: metrics.aiCreditsTotal || 0,
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-xl font-bold">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {typeof item.limit === 'number' ? item.limit.toLocaleString() : item.limit}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Credits Bar */}
      {metrics.aiCreditsTotal > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              AI Credit Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {metrics.aiCreditsUsed} / {metrics.aiCreditsTotal} credits used
                </span>
                <span className={`font-medium ${
                  metrics.aiUsagePercent > 85 ? "text-destructive" : 
                  metrics.aiUsagePercent > 60 ? "text-amber-500" : "text-primary"
                }`}>
                  {metrics.aiUsagePercent}%
                </span>
              </div>
              <Progress 
                value={metrics.aiUsagePercent} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {metrics.aiCreditsRemaining} credits remaining this cycle
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Triggers */}
      {hasUpgradeRecommendation && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <TrendingUp className="w-4 h-4" />
              Upgrade Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upgradeTriggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{trigger.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Suggested: <span className="font-medium capitalize">{trigger.suggestedPlan}</span>
                    {trigger.savingsPercent > 0 && ` - Save ${trigger.savingsPercent}%`}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs shrink-0">
                  Upgrade
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Billing Model Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            Billing Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {operatingModel === "multidrop" ? (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Per-drop billing:</strong> ₦50 per completed delivery. No monthly base fee.
              </p>
            ) : operatingModel === "haulage" ? (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Monthly subscription:</strong> ₦5,000/month per vehicle. Unlimited dispatches per vehicle.
              </p>
            ) : (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Hybrid billing:</strong> ₦5,000/vehicle/month base + ₦50 per drop.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              AI credits consumed separately when using AI-powered features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageBillingDashboard;
