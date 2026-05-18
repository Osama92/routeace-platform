import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Truck, Warehouse, MapPin, AlertTriangle, TrendingUp, Fuel, Clock, Route } from "lucide-react";

const logisticsRoutes = [
  { route: "Lagos → Abuja (A2)", distance: "820km", avgTime: "14h", cost: "₦280/km", bottleneck: "Ore toll plaza", utilization: 94, fleet: 4200 },
  { route: "Lagos → Kano (A1)", distance: "1,080km", avgTime: "22h", cost: "₦310/km", bottleneck: "Lokoja bridge", utilization: 88, fleet: 3400 },
  { route: "Lagos → PH (A3)", distance: "590km", avgTime: "10h", cost: "₦240/km", bottleneck: "Benin-Ore road", utilization: 82, fleet: 2800 },
  { route: "Mombasa → Nairobi (A109)", distance: "480km", avgTime: "8h", cost: "KSh 42/km", bottleneck: "Mtito Andei", utilization: 86, fleet: 3200 },
  { route: "Joburg → Durban (N3)", distance: "580km", avgTime: "7h", cost: "ZAR 18/km", bottleneck: "Van Reenen Pass", utilization: 91, fleet: 5600 },
  { route: "Accra → Tema Port (N1)", distance: "30km", avgTime: "2h", cost: "GHS 8/km", bottleneck: "Port congestion", utilization: 78, fleet: 1200 },
];

const bottlenecks = [
  { location: "Ore Toll Plaza (Nigeria)", severity: "High", delay: "2-4 hours", impact: "18K vehicles/day", solution: "Digital toll collection" },
  { location: "Lokoja Bridge (Nigeria)", severity: "Critical", delay: "4-8 hours", impact: "12K vehicles/day", solution: "Alternative bypass route" },
  { location: "Lagos-Ibadan Expressway", severity: "Medium", delay: "1-2 hours", impact: "24K vehicles/day", solution: "Lane management AI" },
  { location: "Apapa Port Access (Nigeria)", severity: "Critical", delay: "12-48 hours", impact: "8K trucks/day", solution: "e-Call Up system" },
];

const severityColors: Record<string, string> = {
  Critical: "bg-destructive/15 text-destructive",
  High: "bg-amber-500/15 text-amber-600",
  Medium: "bg-info/15 text-info",
};

const LogisticsNetwork = () => (
  <DashboardLayout title="Logistics Network Analysis" subtitle="Transport routes, fleet movements, bottlenecks, and optimization opportunities">
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Truck className="w-6 h-6 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold text-foreground">128K</p><p className="text-xs text-muted-foreground">Daily Shipments</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Warehouse className="w-6 h-6 mx-auto mb-2 text-emerald-500" /><p className="text-2xl font-bold text-foreground">6,180</p><p className="text-xs text-muted-foreground">Warehouses</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Route className="w-6 h-6 mx-auto mb-2 text-purple-500" /><p className="text-2xl font-bold text-foreground">842</p><p className="text-xs text-muted-foreground">Active Routes</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" /><p className="text-2xl font-bold text-foreground">28</p><p className="text-xs text-muted-foreground">Bottleneck Zones</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Route className="w-4 h-4" /> Major Transport Routes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {logisticsRoutes.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">{r.route}</span>
                <Badge variant="outline">{r.distance}</Badge>
              </div>
              <div className="grid grid-cols-5 gap-3 text-xs">
                <div><span className="text-muted-foreground">Avg Time</span><p className="font-semibold text-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {r.avgTime}</p></div>
                <div><span className="text-muted-foreground">Cost</span><p className="font-semibold text-foreground flex items-center gap-1"><Fuel className="w-3 h-3" /> {r.cost}</p></div>
                <div><span className="text-muted-foreground">Fleet</span><p className="font-semibold text-foreground">{r.fleet.toLocaleString()} trucks</p></div>
                <div>
                  <span className="text-muted-foreground">Utilization</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${r.utilization}%` }} />
                    </div>
                    <span className="font-semibold">{r.utilization}%</span>
                  </div>
                </div>
                <div><span className="text-muted-foreground">Bottleneck</span><p className="font-medium text-amber-500">{r.bottleneck}</p></div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Bottleneck Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bottlenecks.map((b) => (
              <div key={b.location} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-foreground">{b.location}</span>
                  <Badge className={severityColors[b.severity]}>{b.severity}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                  <div><span className="text-muted-foreground">Delay</span><p className="font-semibold text-foreground">{b.delay}</p></div>
                  <div><span className="text-muted-foreground">Impact</span><p className="font-semibold text-foreground">{b.impact}</p></div>
                  <div><span className="text-muted-foreground">Solution</span><p className="font-medium text-info">{b.solution}</p></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default LogisticsNetwork;
