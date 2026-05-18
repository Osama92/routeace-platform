import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Brain } from "lucide-react";

const autoPurchaseOrders = [
  { id: "PO-2024-089", sku: "Indomie Chicken 70g", supplier: "De United Foods", qty: 1200, unitCost: "₦180", total: "₦216K", leadTime: "3 days", confidence: 94, reason: "3-day stockout probability 89%", status: "pending_approval" },
  { id: "PO-2024-088", sku: "Dangote Sugar 500g", supplier: "Dangote Industries", qty: 1500, unitCost: "₦420", total: "₦630K", leadTime: "2 days", confidence: 97, reason: "Critical stock - 80 units remaining", status: "approved" },
  { id: "PO-2024-087", sku: "Golden Penny Flour 2kg", supplier: "Flour Mills Nig.", qty: 600, unitCost: "₦850", total: "₦510K", leadTime: "4 days", confidence: 82, reason: "Seasonal demand spike predicted", status: "pending_approval" },
  { id: "PO-2024-086", sku: "Peak Milk 400g", supplier: "FrieslandCampina", qty: 800, unitCost: "₦520", total: "₦416K", leadTime: "5 days", confidence: 78, reason: "Inventory below reorder point", status: "sent" },
  { id: "PO-2024-085", sku: "Milo 500g", supplier: "Nestle Nigeria", qty: 400, unitCost: "₦1,200", total: "₦480K", leadTime: "3 days", confidence: 71, reason: "Promotion uplift forecasted +28%", status: "delivered" },
];

const AutoPurchaseOrders = () => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> AI-Generated Purchase Orders</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {autoPurchaseOrders.map((po) => (
          <div key={po.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">{po.id}</span>
                <h3 className="font-semibold">{po.sku}</h3>
              </div>
              <Badge variant={po.status === "approved" ? "default" : po.status === "delivered" ? "secondary" : po.status === "sent" ? "outline" : "destructive"}>
                {po.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm mb-3">
              <div><p className="text-xs text-muted-foreground">Supplier</p><p className="font-medium">{po.supplier}</p></div>
              <div><p className="text-xs text-muted-foreground">Quantity</p><p className="font-medium">{po.qty.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Unit Cost</p><p className="font-medium">{po.unitCost}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{po.total}</p></div>
              <div><p className="text-xs text-muted-foreground">Lead Time</p><p className="font-medium">{po.leadTime}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">AI Confidence</p>
                <div className="flex items-center gap-1">
                  <Progress value={po.confidence} className="h-2 flex-1" />
                  <span className="text-xs font-bold">{po.confidence}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
              <Brain className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-primary">{po.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default AutoPurchaseOrders;
