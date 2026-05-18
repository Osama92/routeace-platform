import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Sparkles, TrendingUp, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { estimateLogisticsCost, type LogisticsModel } from "@/lib/pricing/estimator";

interface Props {
  operationType: LogisticsModel;
  vehicleCount: string;
  monthlyDeliveries: string;
  currency: string;
}

const PricingEstimatorStep = ({ operationType, vehicleCount, monthlyDeliveries, currency }: Props) => {
  const estimate = useMemo(() => {
    return estimateLogisticsCost({
      model: operationType,
      vehicleCount: parseInt(vehicleCount) || 0,
      monthlyDeliveries: parseInt(monthlyDeliveries) || 0,
      currency: currency || "NGN",
    });
  }, [operationType, vehicleCount, monthlyDeliveries, currency]);

  if (!operationType) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Your Estimated Monthly Cost</h2>
        <p className="text-muted-foreground mt-2">
          Based on your fleet and delivery volume
        </p>
      </div>

      {/* Total */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">Estimated Monthly Cost</p>
          <p className="text-5xl font-bold text-primary mt-2" style={{ lineHeight: 1.1 }}>
            {estimate.currencySymbol}{estimate.totalMonthly.toLocaleString()}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Recommended: {estimate.planLabel}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      {estimate.breakdown.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cost Breakdown</h3>
          <div className="space-y-1.5">
            {estimate.breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-sm">{item.label}</span>
                <span className="font-semibold text-sm">
                  {estimate.currencySymbol}{item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Credits */}
      {estimate.aiCreditsIncluded > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{estimate.aiCreditsIncluded} AI credits included</p>
            <p className="text-xs text-muted-foreground">
              Used for route optimization, demand prediction, and smart dispatch
            </p>
          </div>
        </div>
      )}

      {/* Nudge */}
      {estimate.nudge && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{estimate.nudge}</p>
        </div>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { label: "No hidden fees", icon: "✓" },
          { label: "Cancel anytime", icon: "✓" },
          { label: "Real-time billing", icon: "✓" },
        ].map((item) => (
          <div key={item.label} className="text-center p-2 rounded-lg bg-muted/30">
            <span className="text-primary font-bold text-sm">{item.icon}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default PricingEstimatorStep;
