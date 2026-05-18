import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { MapPin, Store, Truck, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const regions = [
  { city: "Lagos", distributors: 842, retailers: "124K", coverage: 94, gap: "low", topProduct: "FMCG", growth: "+8%" },
  { city: "Abuja", distributors: 386, retailers: "48K", coverage: 88, gap: "low", topProduct: "Building Materials", growth: "+12%" },
  { city: "Kano", distributors: 248, retailers: "62K", coverage: 72, gap: "medium", topProduct: "Agri-Inputs", growth: "+18%" },
  { city: "Port Harcourt", distributors: 194, retailers: "32K", coverage: 81, gap: "low", topProduct: "Liquor", growth: "+14%" },
  { city: "Ibadan", distributors: 128, retailers: "58K", coverage: 54, gap: "high", topProduct: "Consumer Goods", growth: "+22%" },
  { city: "Enugu", distributors: 96, retailers: "28K", coverage: 62, gap: "medium", topProduct: "Pharma", growth: "+16%" },
  { city: "Kaduna", distributors: 112, retailers: "34K", coverage: 58, gap: "medium", topProduct: "FMCG", growth: "+20%" },
  { city: "Nairobi", distributors: 624, retailers: "86K", coverage: 91, gap: "low", topProduct: "FMCG", growth: "+10%" },
  { city: "Accra", distributors: 342, retailers: "42K", coverage: 78, gap: "medium", topProduct: "Consumer Goods", growth: "+24%" },
  { city: "Johannesburg", distributors: 518, retailers: "68K", coverage: 92, gap: "low", topProduct: "Auto Parts", growth: "+6%" },
];

const gapConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  low: { icon: CheckCircle, color: "text-emerald-500", label: "Well Covered" },
  medium: { icon: AlertTriangle, color: "text-amber-500", label: "Moderate Gap" },
  high: { icon: AlertTriangle, color: "text-destructive", label: "High Gap" },
};

const DistributionCoverage = () => (
  <DashboardLayout title="Distribution Coverage Map" subtitle="Distributor presence and retail coverage across African cities">
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">12,840</p><p className="text-xs text-muted-foreground">Total Distributors</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">482K</p><p className="text-xs text-muted-foreground">Total Retailers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">79%</p><p className="text-xs text-muted-foreground">Avg Coverage</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">14</p><p className="text-xs text-muted-foreground">High-Gap Cities</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Regional Coverage Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {regions.map((r, i) => {
              const gap = gapConfig[r.gap];
              const GapIcon = gap.icon;
              return (
                <motion.div key={r.city} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{r.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GapIcon className={`w-3.5 h-3.5 ${gap.color}`} />
                      <span className={`text-xs font-medium ${gap.color}`}>{gap.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-xs">
                    <div><span className="text-muted-foreground">Distributors</span><p className="font-semibold text-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> {r.distributors}</p></div>
                    <div><span className="text-muted-foreground">Retailers</span><p className="font-semibold text-foreground flex items-center gap-1"><Store className="w-3 h-3" /> {r.retailers}</p></div>
                    <div>
                      <span className="text-muted-foreground">Coverage</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.coverage >= 80 ? "bg-emerald-500" : r.coverage >= 60 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${r.coverage}%` }} />
                        </div>
                        <span className="font-semibold text-foreground">{r.coverage}%</span>
                      </div>
                    </div>
                    <div><span className="text-muted-foreground">Top Product</span><p className="font-semibold text-foreground">{r.topProduct}</p></div>
                    <div><span className="text-muted-foreground">Growth</span><p className="font-semibold text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {r.growth}</p></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default DistributionCoverage;
