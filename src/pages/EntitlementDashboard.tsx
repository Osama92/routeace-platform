/**
 * EntitlementDashboard - Admin page showing plan status, AI credits, and feature matrix
 */
import { useEntitlementEngine } from "@/hooks/useEntitlementEngine";
import { AICreditsDashboard } from "@/components/entitlements/AICreditsDashboard";
import { PlanComparisonTable } from "@/components/entitlements/PlanComparisonTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Sparkles, BarChart3, Settings } from "lucide-react";
import { INDUSTRY_PLANS } from "@/lib/entitlements/engine";

const EntitlementDashboard = () => {
  const engine = useEntitlementEngine();

  if (engine.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const planConfig = engine.industryPlanConfig;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Entitlement Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan enforcement, AI credit governance, and feature access controls
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Logistics Plan</p>
                <p className="text-lg font-bold text-foreground capitalize">{engine.logisticsPlan}</p>
              </div>
              <Shield className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Industry Plan</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">{planConfig.label}</p>
                  {planConfig.tier !== "free" && (
                    <Badge variant="secondary" className="text-[10px]">
                      ₦{planConfig.pricePerUserNGN.toLocaleString()}/user
                    </Badge>
                  )}
                </div>
              </div>
              <Settings className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">AI Credits</p>
                <p className="text-lg font-bold text-foreground">{engine.aiCreditsRemaining.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">of {engine.aiCreditsTotal.toLocaleString()} remaining</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-400/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Usage Limits</p>
                <p className="text-lg font-bold text-foreground">{engine.logisticsLimits.maxVehicles}</p>
                <p className="text-[10px] text-muted-foreground">max vehicles</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ai_credits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai_credits" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Credits
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Plans
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Usage Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai_credits">
          <AICreditsDashboard />
        </TabsContent>

        <TabsContent value="plans">
          <PlanComparisonTable />
        </TabsContent>

        <TabsContent value="limits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Users", current: 0, max: engine.logisticsLimits.maxUsers },
              { label: "Vehicles", current: 0, max: engine.logisticsLimits.maxVehicles },
              { label: "Branches", current: 0, max: engine.logisticsLimits.maxBranches },
              { label: "Monthly Dispatches", current: 0, max: engine.logisticsLimits.maxDispatches },
              { label: "API Calls", current: 0, max: engine.logisticsLimits.maxApiCalls },
              { label: "Industry Users", current: 0, max: planConfig.maxUsers },
            ].map(item => {
              const pct = item.max > 0 ? (item.current / item.max) * 100 : 0;
              const level = engine.getUsageLevel(item.current, item.max);
              const barColor = level === "exceeded" ? "bg-destructive"
                : level === "critical" ? "bg-orange-500"
                : level === "warning" ? "bg-amber-500"
                : "bg-emerald-500";
              return (
                <Card key={item.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.current} / {item.max >= 9999 ? "∞" : item.max}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EntitlementDashboard;
