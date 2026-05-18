import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Users, Search, MessageSquare, FileText, CheckCircle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";

const buyers = [
  { name: "TradeLink GmbH", country: "Germany", products: "Cashew, Sesame", volume: "200T/yr", status: "verified", score: 94, orders: 12 },
  { name: "Pacific Foods Ltd", country: "China", products: "Sesame, Ginger", volume: "150T/yr", status: "verified", score: 88, orders: 8 },
  { name: "Gulf Commodities FZE", country: "UAE", products: "Ginger, Hibiscus", volume: "300T/yr", status: "verified", score: 91, orders: 15 },
  { name: "Spice World UK", country: "United Kingdom", products: "Ginger, Moringa", volume: "80T/yr", status: "pending", score: 76, orders: 3 },
  { name: "MediterraneanCo S.L.", country: "Spain", products: "Shea Butter", volume: "60T/yr", status: "verified", score: 85, orders: 6 },
];

const rfqs = [
  { id: "RFQ-4521", product: "Cashew W320", buyer: "Delhaize Belgium", qty: "50T", deadline: "2026-03-20", status: "open" },
  { id: "RFQ-4522", product: "Organic Moringa Powder", buyer: "Whole Foods (via agent)", qty: "20T", deadline: "2026-03-25", status: "open" },
  { id: "RFQ-4523", product: "Sesame Seeds Natural", buyer: "SunOpta Inc.", qty: "100T", deadline: "2026-04-01", status: "negotiating" },
];

const PortoDashMarketplace = () => (
  <PortoDashLayout title="Buyer Marketplace" subtitle="Connect with verified international buyers and manage RFQs">
    <Tabs defaultValue="buyers">
      <TabsList className="mb-6">
        <TabsTrigger value="buyers">Verified Buyers</TabsTrigger>
        <TabsTrigger value="rfqs">RFQ Board</TabsTrigger>
        <TabsTrigger value="listings">My Listings</TabsTrigger>
      </TabsList>

      <TabsContent value="buyers" className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search buyers by name, country, product..." className="pl-9" />
          </div>
        </div>
        {buyers.map(b => (
          <Card key={b.name} className="hover:border-primary/20 transition-colors">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-info" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{b.name}</p>
                    {b.status === "verified" && <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{b.country} · {b.products}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-medium">{b.volume}</p>
                  <p className="text-[10px] text-muted-foreground">Annual Volume</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{b.orders}</p>
                  <p className="text-[10px] text-muted-foreground">Orders</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[hsl(var(--warning))] fill-[hsl(var(--warning))]" />
                    <span className="font-medium">{b.score}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Trust Score</p>
                </div>
                <Button variant="outline" size="sm"><MessageSquare className="w-3 h-3 mr-1" /> Contact</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="rfqs" className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active RFQs</h3>
          <Button size="sm"><FileText className="w-4 h-4 mr-1" /> Submit Quote</Button>
        </div>
        {rfqs.map(r => (
          <Card key={r.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{r.product}</p>
                <p className="text-xs text-muted-foreground">{r.id} · {r.buyer} · {r.qty}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-muted-foreground">Deadline: {r.deadline}</p>
                <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                <Button size="sm" variant="outline">Respond</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="listings">
        <div className="text-center py-12 text-muted-foreground text-sm">
          Your product listings visible to international buyers will appear here.
        </div>
      </TabsContent>
    </Tabs>
  </PortoDashLayout>
);



const __InnerDemo_PortoDashMarketplace = PortoDashMarketplace;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashMarketplace = () => (
  <__DemoPreviewGate title="PortoDash Marketplace" description="Cross-border buyer-seller marketplace.">
    <__InnerDemo_PortoDashMarketplace />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashMarketplace;
