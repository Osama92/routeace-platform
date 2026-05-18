import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, TrendingUp } from "lucide-react";
import {
  estimateLogisticsCost,
  predictAICredits,
} from "@/lib/pricing/estimator";

type LogisticsMode = "bikes" | "haulage" | "mixed";

const PricingSimulator = () => {
  const [logMode, setLogMode] = useState<LogisticsMode>("bikes");
  const [vehicles, setVehicles] = useState(5);
  const [deliveries, setDeliveries] = useState(500);

  const estimate = useMemo(
    () =>
      estimateLogisticsCost({
        model: logMode,
        vehicleCount: vehicles,
        monthlyDeliveries: deliveries,
        currency: "NGN",
      }),
    [logMode, vehicles, deliveries]
  );

  const aiPrediction = useMemo(
    () =>
      predictAICredits({
        os: "logistics",
        plan: estimate.recommendedPlan,
        userCount: 5,
        monthlyDeliveries: deliveries,
        currency: "NGN",
      }),
    [estimate.recommendedPlan, deliveries]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-border/40 bg-card/80 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Mode selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Operation type
            </label>
            <div className="flex gap-2">
              {(
                [
                  { key: "bikes", label: "Bikes / Vans" },
                  { key: "haulage", label: "Haulage" },
                  { key: "mixed", label: "Mixed Fleet" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setLogMode(m.key)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    logMode === m.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vehicles</span>
              <span className="font-semibold">{vehicles}</span>
            </div>
            <Slider
              value={[vehicles]}
              onValueChange={([v]) => setVehicles(v)}
              min={1}
              max={200}
              step={1}
            />
          </div>

          {/* Deliveries slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deliveries / month</span>
              <span className="font-semibold">{deliveries.toLocaleString()}</span>
            </div>
            <Slider
              value={[deliveries]}
              onValueChange={([v]) => setDeliveries(v)}
              min={10}
              max={10000}
              step={10}
            />
          </div>

          {/* Result */}
          <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Your estimated monthly cost
            </p>
            <p className="text-4xl font-bold text-primary" style={{ lineHeight: 1.1 }}>
              {estimate.currencySymbol}
              {estimate.totalMonthly.toLocaleString()}
            </p>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Recommended: {estimate.planLabel}
            </Badge>
          </div>

          {/* Breakdown */}
          {estimate.breakdown.length > 0 && (
            <div className="space-y-1.5">
              {estimate.breakdown.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs py-1.5 px-3 rounded-md bg-muted/40"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {estimate.currencySymbol}
                    {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* AI Credits */}
          {aiPrediction.included > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-xs">
                <span className="font-medium">
                  {aiPrediction.included} AI credits included
                </span>
                <span className="text-muted-foreground ml-1">
                  · ~{aiPrediction.predictedMonthly} predicted usage
                </span>
              </div>
            </div>
          )}

          {/* Nudge */}
          {estimate.nudge && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span>{estimate.nudge}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PricingSimulator;
