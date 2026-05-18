import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, BarChart3, AlertTriangle } from "lucide-react";

const promotions = [
  { name: "Indomie Ramadan Bundle", type: "Volume Discount", status: "active", roi: 2.4, uplift: 28, erosion: 5.2, strain: 34 },
  { name: "Peak Back-to-School", type: "BOGO", status: "active", roi: 1.8, uplift: 18, erosion: 8.1, strain: 56 },
  { name: "Dangote Sugar Festive", type: "Price Cut", status: "planned", roi: 3.1, uplift: 35, erosion: 3.4, strain: 22 },
  { name: "Milo Sports Promo", type: "Reward Points", status: "completed", roi: 1.2, uplift: 12, erosion: 9.5, strain: 18 },
];

const TradePromotions = () => {
  return (
    <FMCGLayout title="Trade Promotion AI" subtitle="Predict uplift, simulate discounts, protect margins">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Promos", value: "2", icon: Target },
          { label: "Avg ROI", value: "2.1x", icon: TrendingUp },
          { label: "Uplift Predicted", value: "+23%", icon: BarChart3 },
          { label: "Margin At Risk", value: "₦3.2M", icon: AlertTriangle },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Promotion Performance & AI Prediction</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promotions.map((p) => (
              <div key={p.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.type}</p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : p.status === "planned" ? "secondary" : "outline"}>{p.status}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Predicted ROI</p>
                    <p className={`text-lg font-bold ${p.roi >= 2 ? "text-green-600" : "text-orange-600"}`}>{p.roi}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Uplift</p>
                    <p className="text-lg font-bold text-blue-600">+{p.uplift}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margin Erosion</p>
                    <p className={`text-lg font-bold ${p.erosion > 7 ? "text-red-600" : "text-green-600"}`}>{p.erosion}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Inventory Strain</p>
                    <p className={`text-lg font-bold ${p.strain > 40 ? "text-orange-600" : "text-green-600"}`}>{p.strain}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FMCGLayout>
  );
};



const __InnerDemo_TradePromotions = TradePromotions;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_TradePromotions = () => (
  <__DemoPreviewGate title="FMCG Trade Promotions" description="Trade-promo planning & ROI.">
    <__InnerDemo_TradePromotions />
  </__DemoPreviewGate>
);
export default __WrappedDemo_TradePromotions;
