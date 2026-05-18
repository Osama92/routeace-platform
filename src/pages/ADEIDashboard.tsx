import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Globe, TrendingUp, TrendingDown, Minus, BarChart3, MapPin,
  Truck, Package, Users, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from "recharts";

const countryData = [
  { country: "Rwanda", flag: "🇷🇼", score: 82, change: 3, coverage: 88, delivery: 91, route: 78, cost: 76, retail: 84 },
  { country: "South Africa", flag: "🇿🇦", score: 79, change: 1, coverage: 82, delivery: 85, route: 80, cost: 72, retail: 76 },
  { country: "Kenya", flag: "🇰🇪", score: 74, change: 2, coverage: 76, delivery: 78, route: 72, cost: 68, retail: 76 },
  { country: "Nigeria", flag: "🇳🇬", score: 71, change: -1, coverage: 68, delivery: 72, route: 74, cost: 65, retail: 76 },
  { country: "Ghana", flag: "🇬🇭", score: 68, change: 4, coverage: 64, delivery: 70, route: 68, cost: 62, retail: 76 },
  { country: "Tanzania", flag: "🇹🇿", score: 65, change: 2, coverage: 60, delivery: 68, route: 64, cost: 60, retail: 73 },
  { country: "Ethiopia", flag: "🇪🇹", score: 61, change: 5, coverage: 55, delivery: 62, route: 60, cost: 58, retail: 70 },
  { country: "Egypt", flag: "🇪🇬", score: 76, change: 0, coverage: 78, delivery: 80, route: 76, cost: 70, retail: 76 },
];

const nigeriaCities = [
  { city: "Lagos", score: 78, change: 2 },
  { city: "Abuja", score: 74, change: 1 },
  { city: "Port Harcourt", score: 70, change: -2 },
  { city: "Kano", score: 66, change: 3 },
  { city: "Ibadan", score: 64, change: 1 },
  { city: "Enugu", score: 62, change: 4 },
  { city: "Kaduna", score: 60, change: 0 },
  { city: "Benin City", score: 58, change: 2 },
];

const radarData = [
  { metric: "Distribution Coverage", value: 68 },
  { metric: "Delivery Efficiency", value: 72 },
  { metric: "Route Optimization", value: 74 },
  { metric: "Cost Efficiency", value: 65 },
  { metric: "Retail Penetration", value: 76 },
];

const ScoreBar = ({ score, max = 100 }: { score: number; max?: number }) => {
  const pct = (score / max) * 100;
  const color = score >= 80 ? "bg-emerald-500" : score >= 70 ? "bg-blue-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-sm font-bold w-8 text-right">{score}</span>
    </div>
  );
};

const ADEIDashboard = () => {
  return (
    <DashboardLayout title="ADEI - African Distribution Efficiency Index" subtitle="Continental benchmark powering operator, investor & government intelligence">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Countries Indexed", value: "54", icon: Globe },
            { label: "Cities Tracked", value: "312", icon: MapPin },
            { label: "Routes Analyzed", value: "48,200", icon: Truck },
            { label: "Retail Outlets", value: "2.1M", icon: Package },
            { label: "Avg Continental Score", value: "69", icon: Target },
          ].map((s) => (
            <Card key={s.label} className="bg-card/80 border-border/50">
              <CardContent className="p-3 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="continental" className="space-y-4">
          <TabsList>
            <TabsTrigger value="continental">Continental Leaderboard</TabsTrigger>
            <TabsTrigger value="nigeria">Nigeria Deep Dive</TabsTrigger>
            <TabsTrigger value="metrics">Index Methodology</TabsTrigger>
          </TabsList>

          <TabsContent value="continental" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leaderboard */}
              <div className="lg:col-span-2 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Country Rankings</h3>
                {countryData.map((c, i) => (
                  <motion.div key={c.country} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="hover:border-primary/30 transition-all">
                      <CardContent className="p-3 flex items-center gap-4">
                        <span className="text-lg font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                        <span className="text-xl">{c.flag}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{c.country}</span>
                            <div className="flex items-center gap-1 text-xs">
                              {c.change > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : c.change < 0 ? <TrendingDown className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                              <span className={c.change > 0 ? "text-emerald-500" : c.change < 0 ? "text-rose-500" : "text-muted-foreground"}>{c.change > 0 ? "+" : ""}{c.change}</span>
                            </div>
                          </div>
                          <ScoreBar score={c.score} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Bar Chart */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Score Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={countryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="country" fontSize={10} stroke="hsl(var(--muted-foreground))" width={80} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="nigeria" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">🇳🇬 Nigeria City Rankings</h3>
                {nigeriaCities.map((c, i) => (
                  <motion.div key={c.city} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="hover:border-primary/30 transition-all">
                      <CardContent className="p-3 flex items-center gap-4">
                        <span className="text-lg font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{c.city}</span>
                            <div className="flex items-center gap-1 text-xs">
                              {c.change > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : c.change < 0 ? <TrendingDown className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                              <span>{c.change > 0 ? "+" : ""}{c.change}</span>
                            </div>
                          </div>
                          <ScoreBar score={c.score} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">Nigeria ADEI Radar - National Average</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                      <PolarRadiusAxis domain={[0, 100]} fontSize={9} stroke="hsl(var(--muted-foreground))" />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Distribution Coverage", desc: "% of retailers served, distributor reach, network density", weight: "20%" },
                { title: "Delivery Efficiency", desc: "On-time delivery rate, average delivery time, failed delivery rate", weight: "25%" },
                { title: "Route Optimization", desc: "Route efficiency score, fleet utilization, empty return trip rate", weight: "20%" },
                { title: "Logistics Cost Efficiency", desc: "Cost per delivery, cost per ton/km, route profitability", weight: "20%" },
                { title: "Retail Penetration", desc: "Active retail outlets, order frequency, distributor-retailer connectivity", weight: "15%" },
              ].map((m) => (
                <Card key={m.title}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{m.title}</h4>
                      <Badge variant="outline">{m.weight}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="py-8 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">The ADEI uses anonymized, aggregated data from RouteAce-powered operations across the continent. Individual company data is never exposed.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ADEIDashboard;
