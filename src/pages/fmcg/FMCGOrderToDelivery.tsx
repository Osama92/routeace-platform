import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart, ClipboardList, Package, Truck, MapPin,
  CheckCircle2, Clock, ArrowRight, ShieldCheck, BarChart3,
} from "lucide-react";

const pipelineStats = [
  { label: "Orders Received", value: "94", icon: ShoppingCart, color: "text-primary" },
  { label: "In Picking", value: "18", icon: ClipboardList, color: "text-orange-600" },
  { label: "In Transit", value: "32", icon: Truck, color: "text-blue-600" },
  { label: "Delivered Today", value: "44", icon: CheckCircle2, color: "text-emerald-600" },
];

const stages = [
  { key: "order_received", label: "Order Received", icon: ShoppingCart, count: 94 },
  { key: "picklist_created", label: "Picklist Created", icon: ClipboardList, count: 82 },
  { key: "picking", label: "Picking", icon: Package, count: 18 },
  { key: "staging", label: "Staging", icon: Package, count: 12 },
  { key: "loaded", label: "Loaded", icon: Truck, count: 8 },
  { key: "dispatched", label: "Dispatched", icon: Truck, count: 32 },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, count: 44 },
  { key: "pod_captured", label: "ePOD Captured", icon: ShieldCheck, count: 41 },
];

const liveOrders = [
  { ref: "ORD-9012", outlet: "ShopRite Ikeja", stage: "delivered", items: 24, value: "₦1.2M", driver: "Emeka O.", vehicle: "LAG-234-KJ", epod: true, slot: "AM" },
  { ref: "ORD-9011", outlet: "Spar Lekki", stage: "dispatched", items: 18, value: "₦840K", driver: "Adamu M.", vehicle: "LAG-891-AB", epod: false, slot: "AM" },
  { ref: "ORD-9010", outlet: "Justrite Surulere", stage: "picking", items: 32, value: "₦1.5M", driver: "-", vehicle: "-", epod: false, slot: "PM" },
  { ref: "ORD-9009", outlet: "Game VI", stage: "staging", items: 15, value: "₦620K", driver: "-", vehicle: "-", epod: false, slot: "PM" },
  { ref: "ORD-9008", outlet: "Market Square Ajah", stage: "loaded", items: 20, value: "₦950K", driver: "Chidi N.", vehicle: "LAG-567-CD", epod: false, slot: "PM" },
  { ref: "ORD-9007", outlet: "Prince Ebeano", stage: "order_received", items: 28, value: "₦1.1M", driver: "-", vehicle: "-", epod: false, slot: "PM" },
];

const stageColor = (s: string) => {
  switch (s) {
    case "delivered": return "default";
    case "dispatched": case "loaded": return "secondary";
    case "picking": case "staging": return "outline";
    default: return "outline";
  }
};

const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

const FMCGOrderToDelivery = () => (
  <FMCGLayout title="Order-to-Delivery Hub" subtitle="Real-time visibility from sales order to proof of delivery">
    {/* KPI Strip */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {pipelineStats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Pipeline Funnel */}
    <Card className="mb-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Order Pipeline Funnel</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
              <div className="text-center min-w-[90px]">
                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${i <= 6 ? "bg-primary/10" : "bg-muted"}`}>
                  <stage.icon className={`w-5 h-5 ${i <= 6 ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className="text-xs font-medium mt-1">{stage.label}</p>
                <p className="text-lg font-bold">{stage.count}</p>
              </div>
              {i < stages.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Live Orders Table */}
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Live Order Tracking</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Order</th>
                <th className="pb-2 pr-4">Outlet</th>
                <th className="pb-2 pr-4">Stage</th>
                <th className="pb-2 pr-4">Items</th>
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2 pr-4">Driver</th>
                <th className="pb-2 pr-4">Vehicle</th>
                <th className="pb-2 pr-4">Slot</th>
                <th className="pb-2">ePOD</th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.map((o) => (
                <tr key={o.ref} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs">{o.ref}</td>
                  <td className="py-3 pr-4 font-medium">{o.outlet}</td>
                  <td className="py-3 pr-4"><Badge variant={stageColor(o.stage)}>{stageLabel(o.stage)}</Badge></td>
                  <td className="py-3 pr-4">{o.items}</td>
                  <td className="py-3 pr-4 font-medium">{o.value}</td>
                  <td className="py-3 pr-4">{o.driver}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{o.vehicle}</td>
                  <td className="py-3 pr-4"><Badge variant="outline">{o.slot}</Badge></td>
                  <td className="py-3">{o.epod ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-muted-foreground" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </FMCGLayout>
);

export default FMCGOrderToDelivery;
