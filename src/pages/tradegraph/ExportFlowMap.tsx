import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Ship, Globe, ArrowRight, TrendingUp, Anchor, Package, DollarSign, MapPin } from "lucide-react";

const exportRoutes = [
  { origin: "Lagos (Apapa)", destination: "Rotterdam", commodity: "Cocoa, Cashew", volume: "$12.4M/mo", shipments: "42 vessels/mo", portUtil: 86, growth: "+22%" },
  { origin: "Lagos (Tin Can)", destination: "Hamburg", commodity: "Sesame, Shea Butter", volume: "$8.6M/mo", shipments: "28 vessels/mo", portUtil: 78, growth: "+18%" },
  { origin: "Mombasa", destination: "Mumbai", commodity: "Tea, Coffee", volume: "$6.2M/mo", shipments: "34 vessels/mo", portUtil: 82, growth: "+14%" },
  { origin: "Durban", destination: "Shanghai", commodity: "Minerals, Manganese", volume: "$18.4M/mo", shipments: "52 vessels/mo", portUtil: 91, growth: "+8%" },
  { origin: "Tema (Accra)", destination: "Antwerp", commodity: "Cocoa, Gold", volume: "$4.8M/mo", shipments: "18 vessels/mo", portUtil: 72, growth: "+28%" },
  { origin: "Dar es Salaam", destination: "Dubai", commodity: "Cashew, Spices", volume: "$3.2M/mo", shipments: "22 vessels/mo", portUtil: 68, growth: "+32%" },
];

const portStats = [
  { port: "Lagos (Apapa)", throughput: "42K TEUs/mo", utilization: 86, congestion: "Moderate" },
  { port: "Mombasa", throughput: "28K TEUs/mo", utilization: 82, congestion: "Low" },
  { port: "Durban", throughput: "68K TEUs/mo", utilization: 91, congestion: "High" },
  { port: "Tema", throughput: "18K TEUs/mo", utilization: 72, congestion: "Low" },
];

const ExportFlowMap = () => (
  <DashboardLayout title="Export Flow Intelligence" subtitle="Export routes, volumes, and port utilization across Africa">
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Ship className="w-6 h-6 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold text-foreground">3,620</p><p className="text-xs text-muted-foreground">Active Exporters</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Globe className="w-6 h-6 mx-auto mb-2 text-info" /><p className="text-2xl font-bold text-foreground">84</p><p className="text-xs text-muted-foreground">Destination Countries</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="w-6 h-6 mx-auto mb-2 text-emerald-500" /><p className="text-2xl font-bold text-foreground">$53.6M</p><p className="text-xs text-muted-foreground">Monthly Export Value</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Anchor className="w-6 h-6 mx-auto mb-2 text-purple-500" /><p className="text-2xl font-bold text-foreground">18</p><p className="text-xs text-muted-foreground">Active Ports</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" /> Export Trade Routes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {exportRoutes.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">{r.origin}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Globe className="w-4 h-4 text-info" />
                  <span className="font-semibold text-foreground text-sm">{r.destination}</span>
                </div>
                <Badge variant="outline" className="font-bold">{r.volume}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div><span className="text-muted-foreground">Commodity</span><p className="font-medium text-foreground">{r.commodity}</p></div>
                <div><span className="text-muted-foreground">Shipments</span><p className="font-semibold text-foreground">{r.shipments}</p></div>
                <div>
                  <span className="text-muted-foreground">Port Utilization</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${r.portUtil}%` }} />
                    </div>
                    <span className="font-semibold text-foreground">{r.portUtil}%</span>
                  </div>
                </div>
                <div><span className="text-muted-foreground">Growth</span><p className="font-semibold text-emerald-500">{r.growth}</p></div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Port Utilization Dashboard</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {portStats.map((p) => (
              <div key={p.port} className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
                <Anchor className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-sm text-foreground mb-1">{p.port}</p>
                <p className="text-lg font-bold text-foreground">{p.throughput}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${p.utilization}%` }} />
                  </div>
                  <span className="text-xs text-foreground">{p.utilization}%</span>
                </div>
                <Badge variant="outline" className="mt-2 text-[10px]">{p.congestion}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default ExportFlowMap;
