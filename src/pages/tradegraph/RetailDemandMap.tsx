import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Store, TrendingUp, ShoppingBag, MapPin, BarChart3 } from "lucide-react";

const demandClusters = [
  { cluster: "Lagos Island Premium", retailers: 4280, categories: "Spirits, Cosmetics, Premium FMCG", avgBasket: "₦420K", demand: "Very High", growth: "+18%", signal: "Luxury uptrend" },
  { cluster: "Lagos Mainland Mass", retailers: 18400, categories: "FMCG, Pharma, Building Materials", avgBasket: "₦85K", demand: "High", growth: "+12%", signal: "Volume expansion" },
  { cluster: "Abuja CBD Commercial", retailers: 6200, categories: "Office Supplies, FMCG, Beverages", avgBasket: "₦240K", demand: "High", growth: "+15%", signal: "New office developments" },
  { cluster: "Kano Industrial Belt", retailers: 8400, categories: "Agri-Inputs, Building Materials, Auto Parts", avgBasket: "₦180K", demand: "Medium", growth: "+22%", signal: "Agricultural season peak" },
  { cluster: "PH Waterfront", retailers: 3200, categories: "Liquor, FMCG, Cosmetics", avgBasket: "₦310K", demand: "High", growth: "+28%", signal: "Entertainment district growth" },
  { cluster: "Ibadan University Belt", retailers: 12800, categories: "FMCG, Pharma, Cosmetics", avgBasket: "₦45K", demand: "Very High", growth: "+14%", signal: "Student population density" },
  { cluster: "Nairobi Westlands", retailers: 5400, categories: "Premium FMCG, Cosmetics, Liquor", avgBasket: "KSh 28K", demand: "High", growth: "+16%", signal: "Middle-class expansion" },
  { cluster: "Accra Osu-Labadi", retailers: 3800, categories: "FMCG, Beverages, Personal Care", avgBasket: "GHS 1,200", demand: "Medium", growth: "+32%", signal: "Rapid urbanization" },
];

const demandLevels: Record<string, string> = {
  "Very High": "bg-emerald-500/15 text-emerald-600",
  "High": "bg-primary/15 text-primary",
  "Medium": "bg-amber-500/15 text-amber-600",
};

const RetailDemandMap = () => (
  <DashboardLayout title="Retail Demand Intelligence" subtitle="Product demand clusters and retailer purchase patterns across Africa">
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><ShoppingBag className="w-6 h-6 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold text-foreground">482K</p><p className="text-xs text-muted-foreground">Active Retailers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BarChart3 className="w-6 h-6 mx-auto mb-2 text-emerald-500" /><p className="text-2xl font-bold text-foreground">842K</p><p className="text-xs text-muted-foreground">Daily Orders</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><MapPin className="w-6 h-6 mx-auto mb-2 text-purple-500" /><p className="text-2xl font-bold text-foreground">248</p><p className="text-xs text-muted-foreground">Demand Clusters</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="w-6 h-6 mx-auto mb-2 text-amber-500" /><p className="text-2xl font-bold text-foreground">+16%</p><p className="text-xs text-muted-foreground">Avg Growth</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" /> Demand Cluster Intelligence</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demandClusters.map((c, i) => (
              <motion.div key={c.cluster} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">{c.cluster}</span>
                    <Badge className="text-[10px]" variant="outline">{c.retailers.toLocaleString()} retailers</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={demandLevels[c.demand]}>{c.demand}</Badge>
                    <span className="text-xs text-emerald-500 font-semibold">{c.growth}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Categories</span><p className="font-medium text-foreground">{c.categories}</p></div>
                  <div><span className="text-muted-foreground">Avg Basket</span><p className="font-semibold text-foreground">{c.avgBasket}</p></div>
                  <div><span className="text-muted-foreground">Signal</span><p className="font-medium text-info">{c.signal}</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default RetailDemandMap;
