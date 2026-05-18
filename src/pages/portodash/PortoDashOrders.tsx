import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Search, Filter, Globe, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const orders = [
  { id: "PD-2026-0341", product: "Cashew Nuts (W320)", buyer: "TradeLink GmbH", dest: "Germany", qty: "120T", value: "$340,000", status: "confirmed", created: "2026-02-15" },
  { id: "PD-2026-0342", product: "Sesame Seeds (Natural)", buyer: "Pacific Foods Ltd", dest: "China", qty: "80T", value: "$210,000", status: "processing", created: "2026-02-20" },
  { id: "PD-2026-0343", product: "Shea Butter (Grade A)", buyer: "MediterraneanCo", dest: "Spain", qty: "45T", value: "$156,000", status: "documentation", created: "2026-02-22" },
  { id: "PD-2026-0344", product: "Hibiscus Flowers (Dried)", buyer: "Gulf Commodities", dest: "UAE", qty: "60T", value: "$180,000", status: "draft", created: "2026-02-28" },
  { id: "PD-2026-0345", product: "Ginger (Split)", buyer: "Spice World UK", dest: "UK", qty: "35T", value: "$98,000", status: "confirmed", created: "2026-03-01" },
];

const PortoDashOrders = () => (
  <PortoDashLayout title="Export Orders" subtitle="Manage export orders from sourcing to delivery">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 w-64" />
        </div>
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filter</Button>
      </div>
      <Button><Plus className="w-4 h-4 mr-2" /> New Export Order</Button>
    </div>

    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All Orders</TabsTrigger>
        <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        <TabsTrigger value="processing">Processing</TabsTrigger>
        <TabsTrigger value="draft">Drafts</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4 space-y-3">
        {orders.map(o => (
          <Card key={o.id} className="hover:border-primary/20 transition-colors cursor-pointer">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{o.product}</p>
                    <p className="text-xs text-muted-foreground">{o.id} · Created {o.created}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{o.buyer}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> {o.dest}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{o.qty}</p>
                    <p className="text-xs text-muted-foreground">{o.value}</p>
                  </div>
                  <Badge variant={o.status === "confirmed" ? "default" : o.status === "processing" ? "secondary" : "outline"} className="capitalize">
                    {o.status}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="confirmed" className="mt-4"><p className="text-sm text-muted-foreground p-4">Confirmed orders filtered view</p></TabsContent>
      <TabsContent value="processing" className="mt-4"><p className="text-sm text-muted-foreground p-4">Processing orders filtered view</p></TabsContent>
      <TabsContent value="draft" className="mt-4"><p className="text-sm text-muted-foreground p-4">Draft orders filtered view</p></TabsContent>
    </Tabs>
  </PortoDashLayout>
);



const __InnerDemo_PortoDashOrders = PortoDashOrders;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashOrders = () => (
  <__DemoPreviewGate title="PortoDash Orders" description="Export order pipeline across global buyers.">
    <__InnerDemo_PortoDashOrders />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashOrders;
