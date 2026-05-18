import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRevenueOptimization } from "@/hooks/useRevenueOptimization";
import { TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

interface Props {
  pickupAddress: string;
  deliveryAddress: string;
  currentPrice?: number;
}

export default function PricingRecommendation({ pickupAddress, deliveryAddress, currentPrice }: Props) {
  const { getRecommendation } = useRevenueOptimization();

  if (!pickupAddress || !deliveryAddress) return null;

  const rec = getRecommendation(pickupAddress, deliveryAddress);
  if (!rec) return null;

  const current = currentPrice || 0;
  const isBelowMin = current > 0 && current < rec.minimum_price;
  const isBelowRec = current > 0 && current < rec.recommended_price && !isBelowMin;

  return (
    <div className="space-y-2 mt-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Minimum</p>
          <p className="text-sm font-bold">₦{rec.minimum_price.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg border border-primary/40 bg-primary/5 text-center">
          <p className="text-[10px] text-primary">Recommended</p>
          <p className="text-sm font-bold text-primary">₦{rec.recommended_price.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Historical Avg</p>
          <p className="text-sm font-bold">₦{Math.round(rec.base_price).toLocaleString()}</p>
        </div>
      </div>

      {rec.demand_multiplier > 1 && (
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">
            High demand route ({((rec.demand_multiplier - 1) * 100).toFixed(0)}% premium)
          </span>
        </div>
      )}

      {rec.fuel_multiplier > 1 && (
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-warning" />
          <span className="text-xs text-muted-foreground">
            Fuel cost adjustment (+{((rec.fuel_multiplier - 1) * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      {isBelowMin && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Current price ₦{current.toLocaleString()} is below minimum - this delivery may generate a loss.
          </AlertDescription>
        </Alert>
      )}

      {isBelowRec && (
        <Alert className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Price is below recommended - margin may be below target ({rec.margin_target}%).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
