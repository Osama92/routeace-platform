import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { IndustryPlanTier } from "@/lib/entitlements/engine";

interface Props {
  tier: IndustryPlanTier;
  label: string;
  priceNGN: number;
  tagline: string;
  features: string[];
  cta: string;
  popular?: boolean;
  onCTA: () => void;
}

const IndustryPricingTierCard = ({ tier, label, priceNGN, tagline, features, cta, popular, onCTA }: Props) => {
  const isCustom = tier === "custom";
  const isGrowth = tier === "growth";

  return (
    <Card
      className={`relative h-full flex flex-col ${
        popular ? "border-2 border-primary shadow-lg shadow-primary/8" : ""
      }`}
    >
      {popular && (
        <div className="bg-primary text-primary-foreground text-center py-1.5 text-xs font-semibold tracking-wide uppercase rounded-t-lg">
          Most Popular
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{label}</CardTitle>
        <p className="text-sm text-muted-foreground">{tagline}</p>
        <div className="pt-3">
          {isCustom ? (
            <span className="text-3xl font-bold">Custom</span>
          ) : (
            <>
              <span className="text-3xl font-bold">
                {priceNGN === 0 ? "₦0" : `₦${priceNGN.toLocaleString()}`}
              </span>
              <span className="text-sm text-muted-foreground"> / user / month</span>
            </>
          )}
        </div>
        {isGrowth && (
          <p className="text-xs text-muted-foreground mt-1">₦15,000 – ₦25,000 range based on volume</p>
        )}
        {tier === "enterprise" && (
          <p className="text-xs text-muted-foreground mt-1">₦35,000 – ₦60,000 range based on configuration</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full mt-6"
          variant={popular ? "default" : "outline"}
          onClick={onCTA}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IndustryPricingTierCard;
