import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, ShieldCheck, Route, Users, Package } from "lucide-react";

const demandForecasts = [
  { sku: "Peak Milk 400g", currentDemand: 12400, predicted: 14200, confidence: 89, trend: "+14.5%" },
  { sku: "Indomie Chicken 70g", currentDemand: 18200, predicted: 19800, confidence: 92, trend: "+8.8%" },
  { sku: "Coca-Cola 50cl PET", currentDemand: 9800, predicted: 11200, confidence: 85, trend: "+14.3%" },
  { sku: "Dettol Original 200ml", currentDemand: 4200, predicted: 3800, confidence: 78, trend: "-9.5%" },
];

const routeProfitability = [
  { route: "Lagos → Ibadan Express", revenue: "₦4.2M", cost: "₦2.8M", profit: "₦1.4M", margin: "33.3%", score: 88 },
  { route: "Abuja → Kano Corridor", revenue: "₦3.1M", cost: "₦2.4M", profit: "₦700K", margin: "22.6%", score: 72 },
  { route: "PH → Enugu Route", revenue: "₦2.8M", cost: "₦2.3M", profit: "₦500K", margin: "17.9%", score: 64 },
  { route: "Lagos Intra-City", revenue: "₦6.8M", cost: "₦3.9M", profit: "₦2.9M", margin: "42.6%", score: 94 },
];

const retailerValue = [
  { name: "ShopRite Group", ltvScore: 96, revenue: "₦18.4M", paymentReliability: 98, skuVariety: 142 },
  { name: "Spar Retail", ltvScore: 88, revenue: "₦12.1M", paymentReliability: 92, skuVariety: 98 },
  { name: "Game Stores", ltvScore: 82, revenue: "₦8.9M", paymentReliability: 85, skuVariety: 76 },
];

const FMCGIntelligence = () => (
  <FMCGLayout title="Intelligence Center" subtitle="AI-powered distribution intelligence - demand, routes, retailers & margins">
    {/* Demand Prediction */}
    <Card className="mb-6 border-primary/20">
      <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Demand Prediction Engine</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {demandForecasts.map((f) => (
            <div key={f.sku} className="flex items-center gap-4 py-3 border-b last:border-0">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{f.sku}</span>
              <span className="text-sm w-28">Current: {f.currentDemand.toLocaleString()}</span>
              <span className="text-sm font-semibold w-28">Predicted: {f.predicted.toLocaleString()}</span>
              <span className={`text-sm w-16 ${f.trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{f.trend}</span>
              <Badge variant={f.confidence >= 85 ? "default" : "secondary"}>{f.confidence}% conf</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Route Profitability */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Route className="w-5 h-5" /> Route Profitability Engine</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routeProfitability.map((r) => (
              <div key={r.route} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.route}</span>
                  <Badge variant={r.score >= 80 ? "default" : r.score >= 65 ? "secondary" : "destructive"}>{r.score}/100</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Revenue</span><p className="font-semibold">{r.revenue}</p></div>
                  <div><span className="text-muted-foreground">Cost</span><p className="font-semibold">{r.cost}</p></div>
                  <div><span className="text-muted-foreground">Profit</span><p className="font-semibold text-green-600">{r.profit}</p></div>
                  <div><span className="text-muted-foreground">Margin</span><p className="font-semibold">{r.margin}</p></div>
                </div>
                <Progress value={r.score} className="h-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retailer Value Index */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Retailer Lifetime Value Index</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {retailerValue.map((r) => (
              <div key={r.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.name}</span>
                  <Badge>{r.ltvScore}/100 LTV</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Revenue</span><p className="font-semibold">{r.revenue}</p></div>
                  <div><span className="text-muted-foreground">Payment</span><p className="font-semibold">{r.paymentReliability}%</p></div>
                  <div><span className="text-muted-foreground">SKU Variety</span><p className="font-semibold">{r.skuVariety}</p></div>
                </div>
                <Progress value={r.ltvScore} className="h-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </FMCGLayout>
);

export default FMCGIntelligence;
