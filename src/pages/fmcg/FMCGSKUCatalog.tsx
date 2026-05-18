import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

const skus = [
  { id: "SKU-001", name: "Peak Milk 400g", category: "Dairy", packSize: "Carton/24", distPrice: "₦8,400", retailPrice: "₦9,600", margin: "14.3%", stock: 4200, demand: "high", stockoutRisk: 8 },
  { id: "SKU-002", name: "Indomie Chicken 70g", category: "Noodles", packSize: "Carton/40", distPrice: "₦6,200", retailPrice: "₦7,200", margin: "16.1%", stock: 8900, demand: "high", stockoutRisk: 3 },
  { id: "SKU-003", name: "Coca-Cola 50cl PET", category: "Beverages", packSize: "Crate/24", distPrice: "₦4,800", retailPrice: "₦5,760", margin: "20.0%", stock: 1200, demand: "high", stockoutRisk: 42 },
  { id: "SKU-004", name: "Golden Penny Semovita 2kg", category: "Grains", packSize: "Bag/10", distPrice: "₦12,000", retailPrice: "₦13,800", margin: "15.0%", stock: 3400, demand: "medium", stockoutRisk: 12 },
  { id: "SKU-005", name: "Dettol Original 200ml", category: "Personal Care", packSize: "Pack/12", distPrice: "₦7,200", retailPrice: "₦8,640", margin: "20.0%", stock: 560, demand: "low", stockoutRisk: 68 },
  { id: "SKU-006", name: "Milo 400g Tin", category: "Beverages", packSize: "Carton/12", distPrice: "₦14,400", retailPrice: "₦16,800", margin: "16.7%", stock: 2100, demand: "medium", stockoutRisk: 15 },
];

const FMCGSKUCatalog = () => (
  <FMCGLayout title="SKU Catalog" subtitle="Product intelligence, pricing, margins & demand forecasting">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Total SKUs", value: "248", icon: Package, color: "text-blue-600" },
        { label: "Stockout Risk", value: "12 SKUs", icon: AlertTriangle, color: "text-red-600" },
        { label: "Slow Movers", value: "18 SKUs", icon: TrendingDown, color: "text-orange-600" },
        { label: "Avg Margin", value: "16.8%", icon: TrendingUp, color: "text-green-600" },
      ].map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader><CardTitle>Product Catalog</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {skus.map((sku) => (
            <div key={sku.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{sku.id}</span>
                  <span className="font-semibold">{sku.name}</span>
                  <Badge variant="secondary">{sku.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {sku.stockoutRisk > 30 && <Badge variant="destructive">Stockout Risk</Badge>}
                  <Badge variant={sku.demand === "high" ? "default" : "secondary"}>{sku.demand} demand</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div><span className="text-muted-foreground">Pack</span><p className="font-medium">{sku.packSize}</p></div>
                <div><span className="text-muted-foreground">Dist. Price</span><p className="font-medium">{sku.distPrice}</p></div>
                <div><span className="text-muted-foreground">Retail Price</span><p className="font-medium">{sku.retailPrice}</p></div>
                <div><span className="text-muted-foreground">Margin</span><p className="font-medium text-green-600">{sku.margin}</p></div>
                <div><span className="text-muted-foreground">Stock</span><p className="font-medium">{sku.stock.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Stockout Risk</span><p className={`font-medium ${sku.stockoutRisk > 30 ? "text-red-600" : "text-green-600"}`}>{sku.stockoutRisk}%</p></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </FMCGLayout>
);

export default FMCGSKUCatalog;
