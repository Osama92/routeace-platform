/**
 * AICreditsDashboard - Shows AI credit usage, balance, and consumption history
 */
import { Sparkles, TrendingDown, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEntitlementEngine } from "@/hooks/useEntitlementEngine";
import { AI_CREDIT_COSTS } from "@/lib/entitlements/engine";
import { getUsageLevel } from "@/lib/entitlements/engine";

export function AICreditsDashboard() {
  const {
    aiCreditsRemaining,
    aiCreditsTotal,
    aiCreditsUsed,
    industryPlan,
    logisticsPlan,
    industryPlanConfig,
  } = useEntitlementEngine();

  const usagePercent = aiCreditsTotal > 0 ? (aiCreditsUsed / aiCreditsTotal) * 100 : 0;
  const level = getUsageLevel(aiCreditsUsed, aiCreditsTotal);

  const progressColor = level === "exceeded" ? "bg-red-500"
    : level === "critical" ? "bg-orange-500"
    : level === "warning" ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credits Remaining</p>
                <p className="text-2xl font-bold text-foreground">{aiCreditsRemaining.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold text-foreground">{aiCreditsUsed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Allocation</p>
                <p className="text-2xl font-bold text-foreground">{aiCreditsTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Credit Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{aiCreditsUsed} used</span>
              <span>{aiCreditsTotal} total</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {level === "critical" && (
              <p className="text-xs text-orange-600 mt-1">
                Credits running low. Consider purchasing additional credits.
              </p>
            )}
            {level === "exceeded" && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-red-600">Credits exhausted. AI features are paused.</p>
                <Button variant="default" size="sm" className="gap-1.5 text-xs h-7">
                  Purchase Credits <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Cost Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">AI Action Credit Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {AI_CREDIT_COSTS.map(action => (
              <div
                key={action.actionId}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm text-foreground">{action.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                    {action.os.replace("_os", "")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{action.minPlan}+</span>
                  <span className="text-sm font-medium text-foreground">
                    {action.credits} {action.credits === 1 ? "credit" : "credits"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AICreditsDashboard;
