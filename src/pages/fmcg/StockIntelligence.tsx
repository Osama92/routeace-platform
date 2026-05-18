import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, TrendingDown, ArrowRight } from "lucide-react";

const stockAlerts = [
  { sku: "Indomie Chicken 70g", warehouse: "Lagos Hub", current: 120, reorder: 500, prob3d: 89, prob7d: 97, restock: 1200, urgency: 95 },
  { sku: "Peak Milk 400g", warehouse: "Abuja Depot", current: 340, reorder: 400, prob3d: 62, prob7d: 84, restock: 800, urgency: 72 },
  { sku: "Dangote Sugar 500g", warehouse: "Kano Store", current: 80, reorder: 300, prob3d: 94, prob7d: 99, restock: 1500, urgency: 98 },
  { sku: "Milo 500g", warehouse: "PH Depot", current: 560, reorder: 200, prob3d: 8, prob7d: 22, restock: 0, urgency: 15 },
  { sku: "Golden Penny Flour 2kg", warehouse: "Lagos Hub", current: 200, reorder: 350, prob3d: 71, prob7d: 88, restock: 600, urgency: 78 },
];

const StockIntelligence = () => {
  return (
    <FMCGLayout title="Stock Intelligence" subtitle="Predictive procurement & stockout prevention AI">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "SKUs Tracked", value: "487", icon: Package },
          { label: "Stockout Alerts", value: "23", icon: AlertTriangle },
          { label: "Auto-POs Drafted", value: "8", icon: ArrowRight },
          { label: "Avg Fill Rate", value: "94.2%", icon: TrendingDown },
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
        <CardHeader><CardTitle>Stockout Prediction & Auto-Restock</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">SKU</th>
                  <th className="pb-3 font-medium">Warehouse</th>
                  <th className="pb-3 font-medium">Current</th>
                  <th className="pb-3 font-medium">Reorder Pt</th>
                  <th className="pb-3 font-medium">3-Day Risk</th>
                  <th className="pb-3 font-medium">7-Day Risk</th>
                  <th className="pb-3 font-medium">Restock Qty</th>
                  <th className="pb-3 font-medium">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {stockAlerts.map((s) => (
                  <tr key={`${s.sku}-${s.warehouse}`} className="border-b last:border-0">
                    <td className="py-3 font-medium">{s.sku}</td>
                    <td className="py-3">{s.warehouse}</td>
                    <td className="py-3">{s.current}</td>
                    <td className="py-3">{s.reorder}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={s.prob3d} className="h-2 w-16" />
                        <span className={s.prob3d > 70 ? "text-red-600 font-bold" : ""}>{s.prob3d}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={s.prob7d} className="h-2 w-16" />
                        <span className={s.prob7d > 80 ? "text-red-600 font-bold" : ""}>{s.prob7d}%</span>
                      </div>
                    </td>
                    <td className="py-3 font-medium">{s.restock > 0 ? s.restock : "-"}</td>
                    <td className="py-3">
                      <Badge variant={s.urgency > 80 ? "destructive" : s.urgency > 50 ? "secondary" : "outline"}>
                        {s.urgency > 80 ? "Critical" : s.urgency > 50 ? "High" : "Normal"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </FMCGLayout>
  );
};



const __InnerDemo_StockIntelligence = StockIntelligence;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_StockIntelligence = () => (
  <__DemoPreviewGate title="FMCG Stock Intelligence" description="Multi-warehouse stock health.">
    <__InnerDemo_StockIntelligence />
  </__DemoPreviewGate>
);
export default __WrappedDemo_StockIntelligence;
