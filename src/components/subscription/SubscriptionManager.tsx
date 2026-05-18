import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, CheckCircle, Zap, Loader2, AlertTriangle } from "lucide-react";
import useTenantMode from "@/hooks/useTenantMode";
import { LC_PRICING_PLANS } from "@/config/lcPricingPlans";
import { usePricingConsistencyCheck } from "@/hooks/usePricingConsistencyCheck";

// LC plans are derived from the shared single source of truth so prices
// always match the public landing page.
const LC_PLANS = LC_PRICING_PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  period: p.period,
  sub: p.sub,
  features: p.features,
  popular: p.popular,
  pricingModel: p.billingModel,
  subscribable: p.subscribable,
}));

const LD_PLANS = [
  {
    id: "foundation",
    name: "Foundation",
    price: "₦150,000",
    period: "/month",
    sub: "Up to 5 users · ₦10,000/extra user",
    features: [
      "Core Transport Module",
      "Dispatch & Real-Time Tracking",
      "Fleet Management",
      "Basic 3PL Vendor Management",
      "SLA Tracking Dashboard",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "₦350,000",
    period: "/month",
    sub: "Up to 15 users · ₦7,500/extra user",
    features: [
      "Everything in Foundation",
      "AI Dispatch Optimization",
      "Vendor Rate Card Upload (Excel)",
      "3PL vs Internal Cost AI",
      "Automated Vendor Payouts",
      "Maintenance Intelligence",
    ],
    popular: true,
  },
  {
    id: "dept_enterprise",
    name: "Enterprise",
    price: "₦1,200,000",
    period: "/month",
    sub: "Up to 50 users · ₦5,000/extra user",
    features: [
      "Everything in Growth",
      "AI CFO (Cost & Margin Intelligence)",
      "Autonomous Dispatch Rebalancing",
      "Multi-Warehouse / Multi-Region",
      "ERP & WMS API Integrations",
      "Sales Department E2E Tracking Portal",
    ],
  },
];

const SubscriptionManager = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [vehicleCount, setVehicleCount] = useState(1);
  const { isDepartment } = useTenantMode();
  const plans = isDepartment ? LD_PLANS : LC_PLANS;
  const consistency = usePricingConsistencyCheck({ autoRun: !isDepartment });

  const showVehicleEstimator = useMemo(
    () =>
      !isDepartment &&
      LC_PLANS.some((p) => p.pricingModel === "per_vehicle" || p.pricingModel === "hybrid"),
    [isDepartment]
  );

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const body: Record<string, unknown> = { plan_name: planId, billing_cycle: "monthly" };
      if (!isDepartment) body.vehicle_count = vehicleCount;
      const { data, error } = await supabase.functions.invoke("initiate-subscription-payment", {
        body,
      });
      if (error || !data?.authorization_url) {
        toast.error(error?.message ?? "Failed to initiate payment. Please try again.");
        setLoading(null);
        return;
      }
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(e.message ?? "Payment initiation failed");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          {isDepartment ? "Department Plans" : "Subscription Plans"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isDepartment
            ? "Priced for operational control - not per seat"
            : "Pick the model that fits your fleet. Same pricing as our public plans."}
        </p>
      </div>

      {!isDepartment && consistency.checkedAt && !consistency.ok && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-destructive">Pricing drift detected for this tenant</p>
            <p className="text-muted-foreground mt-1">
              {consistency.findings.filter(f => f.mismatch).map(f => `${f.plan_id}: ${f.reason}`).join(" · ")}
            </p>
          </div>
        </div>
      )}
      {showVehicleEstimator && (
        <Card className="bg-muted/20">
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="vehicle-count">
              How many active vehicles? (for Heavy Fleet / Mixed Fleet estimate)
            </label>
            <input
              id="vehicle-count"
              type="number"
              min={1}
              max={500}
              value={vehicleCount}
              onChange={(e) =>
                setVehicleCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
              }
              className="w-32 px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Heavy Fleet estimate: ₦{(5000 * vehicleCount).toLocaleString()}/month for{" "}
              {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""} (excl. VAT). Mixed Fleet adds
              ₦50 per drop.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan: any) => (
          <Card key={plan.id} className={plan.popular ? "border-primary shadow-lg relative" : "relative"}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                {plan.sub && (
                  <span className="block text-xs text-muted-foreground mt-1">{plan.sub}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {(() => {
                const isFree = plan.pricingModel === "free";
                const isPerDrop = plan.pricingModel === "per_drop";
                const notSubscribable = (plan as any).subscribable === false;
                return (
                  <Button
                    className="w-full"
                    disabled={loading === plan.id || notSubscribable}
                    onClick={() => !notSubscribable && handleSubscribe(plan.id)}
                  >
                    {loading === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting…</>
                    ) : isFree ? (
                      <>Current - Free tier</>
                    ) : isPerDrop ? (
                      <>Billed per delivery</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" />Subscribe - {plan.price}{plan.period}</>
                    )}
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            Payments processed securely by Paystack. You'll be redirected to complete payment and returned automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManager;
