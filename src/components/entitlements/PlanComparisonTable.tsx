/**
 * PlanComparisonTable - Displays Industry OS pricing tiers with Naira pricing
 */
import { Check, X, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_PLANS, INDUSTRY_FEATURE_MATRIX, type IndustryPlanTier } from "@/lib/entitlements/engine";
import { useEntitlementEngine } from "@/hooks/useEntitlementEngine";

const TIERS: IndustryPlanTier[] = ["free", "growth", "enterprise", "custom"];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
  );
}

export function PlanComparisonTable() {
  const { industryPlan } = useEntitlementEngine();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Industry OS Plans</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pricing designed for African commerce. All plans include core SFA embedded in Industry OS.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Plan headers */}
        <div className="grid grid-cols-5 border-b">
          <div className="p-4 text-sm font-medium text-muted-foreground">Feature</div>
          {TIERS.map(tier => {
            const plan = INDUSTRY_PLANS[tier];
            const isCurrent = tier === industryPlan;
            return (
              <div key={tier} className={`p-4 text-center border-l ${isCurrent ? "bg-primary/5" : ""}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="text-sm font-semibold text-foreground">{plan.label}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Current</Badge>
                  )}
                </div>
                {tier !== "custom" ? (
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      ₦{plan.pricePerUserNGN.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground"> /user/mo</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ~${plan.pricePerUserUSD}/user/mo
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Contact Sales</p>
                )}
                {!isCurrent && tier !== "free" && (
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs w-full">
                    {tier === "custom" ? "Contact Us" : "Upgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature rows */}
        {INDUSTRY_FEATURE_MATRIX.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-5 ${i % 2 === 0 ? "bg-muted/20" : ""}`}
          >
            <div className="p-3 text-sm text-foreground">{row.feature}</div>
            {TIERS.map(tier => (
              <div
                key={tier}
                className={`p-3 text-center border-l ${tier === industryPlan ? "bg-primary/5" : ""}`}
              >
                <FeatureCell value={row[tier]} />
              </div>
            ))}
          </div>
        ))}

        {/* Max users row */}
        <div className="grid grid-cols-5 border-t bg-muted/30">
          <div className="p-3 text-sm font-medium text-foreground">Max Users</div>
          {TIERS.map(tier => (
            <div key={tier} className="p-3 text-center border-l text-sm font-medium text-foreground">
              {INDUSTRY_PLANS[tier].maxUsers >= 9999 ? "Unlimited" : INDUSTRY_PLANS[tier].maxUsers}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanComparisonTable;
