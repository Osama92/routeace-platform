import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, BarChart3, Target, MapPin, Users, Brain, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const IndustrySalesIntelligence = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");
  const Icon = config.icon;

  const territories = [
    { name: "Lagos Island", revenue: "₦3.2M", growth: 23, reps: 8, outlets: 245 },
    { name: "Lagos Mainland", revenue: "₦2.8M", growth: 12, reps: 6, outlets: 198 },
    { name: "Abuja Central", revenue: "₦2.1M", growth: -4, reps: 5, outlets: 156 },
    { name: "Kano Metro", revenue: "₦1.6M", growth: 18, reps: 4, outlets: 134 },
    { name: "Port Harcourt", revenue: "₦1.4M", growth: 7, reps: 4, outlets: 112 },
  ];

  const topProducts = [
    { name: `${config.terminology.product} A-001`, velocity: 94, revenue: "₦2.1M", trend: "up" },
    { name: `${config.terminology.product} B-045`, velocity: 87, revenue: "₦1.8M", trend: "up" },
    { name: `${config.terminology.product} C-012`, velocity: 71, revenue: "₦1.2M", trend: "down" },
    { name: `${config.terminology.product} D-089`, velocity: 65, revenue: "₦0.9M", trend: "up" },
    { name: `${config.terminology.product} E-033`, velocity: 42, revenue: "₦0.5M", trend: "down" },
  ];

  const aiRecommendations = [
    { action: "Upsell Opportunity", detail: `${config.terminology.outlet} cluster in VI showing 40% higher basket value potential`, priority: "high" },
    { action: "Reorder Prediction", detail: `23 ${config.terminology.outlet.toLowerCase()}s predicted to reorder within 48hrs`, priority: "medium" },
    { action: "Route Optimization", detail: `Ikeja territory: 15% efficiency gain by resequencing 3 ${config.terminology.agent.toLowerCase()} routes`, priority: "low" },
  ];

  const priorityColors = { high: "destructive", medium: "secondary", low: "outline" } as const;

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Sales Intelligence</h1>
            <p className="text-sm text-muted-foreground">{config.displayName}</p>
          </div>
        </div>

        <Tabs defaultValue="territory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="territory">Territory Heatmap</TabsTrigger>
            <TabsTrigger value="products">{config.terminology.product} Performance</TabsTrigger>
            <TabsTrigger value="reps">{config.terminology.agent} Productivity</TabsTrigger>
            <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="territory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₦11.1M</p>
                <p className="text-xs text-emerald-500 mt-1">+14.2% vs last period</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Market Penetration</p>
                <p className="text-2xl font-bold">68%</p>
                <Progress value={68} className="h-2 mt-2" />
              </CardContent></Card>
              <Card><CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{config.terminology.outlet} Growth</p>
                <p className="text-2xl font-bold">+34</p>
                <p className="text-xs text-emerald-500 mt-1">New this month</p>
              </CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Territory Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {territories.map((t) => (
                    <div key={t.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.reps} {config.terminology.agent.toLowerCase()}s · {t.outlets} {config.terminology.outlet.toLowerCase()}s</p>
                      </div>
                      <p className="text-sm font-semibold">{t.revenue}</p>
                      <Badge variant={t.growth > 0 ? "default" : "destructive"} className="text-xs">
                        {t.growth > 0 ? "+" : ""}{t.growth}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader><CardTitle>{config.terminology.product} Velocity Ranking</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={p.velocity} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{p.velocity}%</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{p.revenue}</p>
                    {p.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reps">
            <Card>
              <CardHeader><CardTitle>{config.terminology.agent} Productivity</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Adebayo O.", visits: 28, conversion: 82, value: "₦890K" },
                    { name: "Chioma N.", visits: 24, conversion: 78, value: "₦720K" },
                    { name: "Ibrahim M.", visits: 22, conversion: 75, value: "₦650K" },
                    { name: "Funke A.", visits: 19, conversion: 68, value: "₦480K" },
                  ].map((rep) => (
                    <div key={rep.name} className="p-4 rounded-xl border border-border/50 bg-muted/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium text-sm">{rep.name}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{rep.value}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Visits:</span> <span className="font-medium">{rep.visits}</span></div>
                        <div><span className="text-muted-foreground">Conversion:</span> <span className="font-medium">{rep.conversion}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4" /> AI Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {aiRecommendations.map((r) => (
                  <div key={r.action} className="p-4 rounded-xl border border-border/50 bg-muted/10">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{r.action}</p>
                      <Badge variant={priorityColors[r.priority as keyof typeof priorityColors]} className="text-xs capitalize">{r.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </IndustryLayout>
  );
};

export default IndustrySalesIntelligence;
