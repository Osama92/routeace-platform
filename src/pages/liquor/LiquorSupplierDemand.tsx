import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Megaphone, Target, DollarSign, Eye, TrendingUp, Zap, ArrowUpRight, Play, Pause } from "lucide-react";

const activeCampaigns = [
  { brand: "Hennessy VS", budget: 45000, spent: 28000, impressions: 124000, orders: 890, roi: 3.2, status: "active" },
  { brand: "Johnnie Walker Black", budget: 30000, spent: 22000, impressions: 98000, orders: 620, roi: 2.8, status: "active" },
  { brand: "Grey Goose", budget: 20000, spent: 20000, impressions: 76000, orders: 410, roi: 2.1, status: "completed" },
  { brand: "Patrón Silver", budget: 25000, spent: 12000, impressions: 54000, orders: 340, roi: 2.9, status: "active" },
  { brand: "Moët & Chandon", budget: 35000, spent: 8000, impressions: 32000, orders: 180, roi: 2.3, status: "active" },
];

const channelPerformance = [
  { channel: "Retailer App", orders: 1200, revenue: 180000 },
  { channel: "Sales Rep Tablets", orders: 840, revenue: 126000 },
  { channel: "Exchange Listings", orders: 620, revenue: 93000 },
  { channel: "Push Notifications", orders: 380, revenue: 57000 },
];

const brandReach = [
  { metric: "Bar Reach", A: 85, B: 72 },
  { metric: "Store Reach", A: 78, B: 88 },
  { metric: "Restaurant Reach", A: 65, B: 55 },
  { metric: "Nightclub Reach", A: 92, B: 40 },
  { metric: "Hotel Reach", A: 45, B: 62 },
];

const LiquorSupplierDemand = () => (
  <DashboardLayout title="Supplier Demand Engine" subtitle="Brand-funded demand generation across the retail network">
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Campaign Spend", value: "$155K", change: "+22%", icon: Megaphone },
          { label: "Platform Ad Revenue", value: "$31K", change: "+18%", icon: DollarSign },
          { label: "Campaigns Active", value: "14", change: "+3", icon: Target },
          { label: "Avg Campaign ROI", value: "2.8x", change: "+0.3x", icon: TrendingUp },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />{kpi.change}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
          <TabsTrigger value="channels">Channel Performance</TabsTrigger>
          <TabsTrigger value="reach">Brand Reach Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader><CardTitle className="text-sm">Sponsored Campaigns</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeCampaigns.map((c, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.brand}</p>
                          <p className="text-xs text-muted-foreground">{c.impressions.toLocaleString()} impressions · {c.orders} orders</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "active" ? "secondary" : "outline"}>{c.status}</Badge>
                        <Button size="sm" variant="ghost">
                          {c.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-semibold text-foreground">${(c.budget / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="text-sm font-semibold text-foreground">${(c.spent / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-sm font-semibold text-primary">{c.roi}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                        <p className="text-sm font-semibold text-foreground">{Math.round((c.spent / c.budget) * 100)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader><CardTitle className="text-sm">Campaign Orders by Channel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="channel" type="category" className="text-xs" width={120} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), ""]} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reach">
          <Card>
            <CardHeader><CardTitle className="text-sm">Brand Reach Comparison (Hennessy vs Johnnie Walker)</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={brandReach}>
                  <PolarGrid className="stroke-border/30" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                  <Radar name="Hennessy" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Radar name="JW Black" dataKey="B" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Demand Engine Insight</p>
            <p className="text-xs text-muted-foreground mt-1">Hennessy VS campaign shows 3.2x ROI with strongest performance in nightclub channels. Recommend shifting 15% of budget from push notifications to retailer app placements for optimal conversion. Patrón campaign on track to exceed targets by 18%.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default LiquorSupplierDemand;
