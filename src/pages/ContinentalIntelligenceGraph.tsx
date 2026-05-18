import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Globe, BarChart3, TrendingUp, Database, Map,
  Warehouse, Network, Activity, DollarSign, Layers, Zap
} from "lucide-react";
import { AnalyticsDateFilterBar, useAnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";

const INTELLIGENCE_STATS = [
  { label: "Deliveries Executed", value: "125K+", icon: Truck },
  { label: "Active Routes", value: "3,400", icon: Map },
  { label: "Fleet Utilization", value: "74%", icon: Activity },
  { label: "Regional Demand Spikes", value: "12", icon: TrendingUp },
];

const DEMAND_FORECASTS = [
  { region: "Lagos", demand: "High", trend: "+18%", confidence: 92 },
  { region: "Abuja", demand: "Medium", trend: "+7%", confidence: 85 },
  { region: "Port Harcourt", demand: "High", trend: "+24%", confidence: 88 },
  { region: "Kano", demand: "Low", trend: "-3%", confidence: 79 },
  { region: "Ibadan", demand: "Medium", trend: "+11%", confidence: 82 },
];

const ROUTE_PROFITABILITY = [
  { route: "Lagos → Abuja", revenue: "₦4.2M", cost: "₦2.8M", margin: "33%", volume: 145 },
  { route: "Lagos → PH", revenue: "₦3.1M", cost: "₦1.9M", margin: "39%", volume: 98 },
  { route: "Abuja → Kano", revenue: "₦2.5M", cost: "₦1.8M", margin: "28%", volume: 67 },
  { route: "Lagos → Ibadan", revenue: "₦1.8M", cost: "₦0.9M", margin: "50%", volume: 210 },
];

export default function ContinentalIntelligenceGraph() {
  const { range, periodType, offset, goBack, goForward, changePeriod } = useAnalyticsDateFilter("month");

  return (
    <DashboardLayout title="Continental Logistics Intelligence Graph" subtitle="Predictive data layer powering smarter supply chains">
      <AnalyticsDateFilterBar
        range={range}
        periodType={periodType}
        onPeriodChange={changePeriod}
        onBack={goBack}
        onForward={goForward}
        canGoForward={offset < 0}
      />
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {INTELLIGENCE_STATS.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><s.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="demand" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="demand">Demand Forecast</TabsTrigger>
          <TabsTrigger value="routes">Route Profitability</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Matching</TabsTrigger>
          <TabsTrigger value="graph">Intelligence Graph</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="demand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regional Demand Forecast</CardTitle>
              <CardDescription>AI-predicted delivery demand by region using historical data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMAND_FORECASTS.map(d => (
                  <div key={d.region} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{d.region}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={d.demand === "High" ? "default" : d.demand === "Medium" ? "secondary" : "outline"}>{d.demand}</Badge>
                      <span className={`text-sm font-medium ${d.trend.startsWith("+") ? "text-emerald-600" : "text-destructive"}`}>{d.trend}</span>
                      <span className="text-xs text-muted-foreground">{d.confidence}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route Profitability Analysis</CardTitle>
              <CardDescription>Revenue, cost, and margin per active trade corridor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ROUTE_PROFITABILITY.map(r => (
                  <div key={r.route} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Map className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{r.route}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>Rev: {r.revenue}</span>
                      <span className="text-muted-foreground">Cost: {r.cost}</span>
                      <Badge className="bg-emerald-500/15 text-emerald-600">{r.margin}</Badge>
                      <span className="text-xs text-muted-foreground">{r.volume} trips</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity">
          <Card>
            <CardHeader><CardTitle className="text-base">Capacity Matching Engine</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                <div className="text-center space-y-2">
                  <Zap className="w-10 h-10 mx-auto text-primary/40" />
                  <p className="text-muted-foreground text-sm">Auto-matches available fleet capacity with distribution demand</p>
                  <p className="text-xs text-muted-foreground">Powered by the Distribution Liquidity Engine</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph">
          <Card>
            <CardHeader><CardTitle className="text-base">Logistics Intelligence Graph</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80 rounded-lg bg-gradient-to-br from-primary/5 via-transparent to-primary/10 flex items-center justify-center border-2 border-dashed">
                <div className="text-center space-y-2">
                  <Network className="w-12 h-12 mx-auto text-primary/40" />
                  <p className="text-muted-foreground">Continental supply chain graph</p>
                  <p className="text-xs text-muted-foreground">Maps relationships between fleets, warehouses, retailers, distributors, and trade routes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enterprise">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enterprise Data Insights</CardTitle>
              <CardDescription>Advanced analytics for large-scale operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Delivery Cost Benchmarking", desc: "Compare your costs against industry averages", icon: DollarSign },
                  { title: "Regional Performance", desc: "Logistics KPIs by geography", icon: BarChart3 },
                  { title: "Bottleneck Analysis", desc: "Identify supply chain constraints", icon: Layers },
                ].map(e => (
                  <div key={e.title} className="p-4 rounded-lg border space-y-2 text-center">
                    <e.icon className="w-6 h-6 mx-auto text-primary" />
                    <p className="font-semibold text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
