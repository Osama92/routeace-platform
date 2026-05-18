import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Brain, Database, FileText, Users, Download, Globe, Zap, Crown, TrendingUp } from "lucide-react";

const subscriptionTiers = [
  { tier: "Basic Analytics", price: "$1,500/mo", subscribers: 42, mrr: 63000, features: ["Market reports", "Category trends", "Regional demand"], color: "hsl(var(--muted-foreground))" },
  { tier: "Advanced Intelligence", price: "$5,000/mo", subscribers: 18, mrr: 90000, features: ["Retailer scoring", "Brand benchmarking", "Predictive demand"], color: "hsl(var(--primary))" },
  { tier: "Enterprise API", price: "$15,000+/mo", subscribers: 5, mrr: 95000, features: ["Raw data feeds", "Custom models", "White-label reports"], color: "hsl(var(--accent))" },
];

const dataProducts = [
  { name: "Premium Tequila Demand Growth by City", category: "Market Intelligence", downloads: 234, revenue: 8500 },
  { name: "Top 500 Cocktail Bars in West Africa", category: "Retail Network", downloads: 189, revenue: 12000 },
  { name: "Whiskey Brand Share: Nightclubs vs Restaurants", category: "Brand Analytics", downloads: 156, revenue: 7200 },
  { name: "Q4 Spirits Distribution Corridor Analysis", category: "Distributor Benchmark", downloads: 128, revenue: 9800 },
  { name: "Wine Consumption Patterns - Urban vs Suburban", category: "Consumer Insights", downloads: 112, revenue: 6400 },
];

const mrrTrend = [
  { month: "Jan", mrr: 180000 }, { month: "Feb", mrr: 195000 }, { month: "Mar", mrr: 210000 },
  { month: "Apr", mrr: 225000 }, { month: "May", mrr: 238000 }, { month: "Jun", mrr: 248000 },
];

const LiquorDataIntelligence = () => (
  <DashboardLayout title="Data Intelligence Engine" subtitle="Monetize the Liquor Network Intelligence Graph">
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Data MRR", value: "$248,000", icon: Database, change: "+8.2%" },
          { label: "Active Subscribers", value: "65", icon: Users, change: "+12" },
          { label: "Reports Generated", value: "1,284", icon: FileText, change: "This month" },
          { label: "Data Points Indexed", value: "14.2M", icon: Brain, change: "+1.8M" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <p className="text-xs text-emerald-500 mt-1">{kpi.change}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscription Tiers</TabsTrigger>
          <TabsTrigger value="products">Data Products</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {subscriptionTiers.map((tier, i) => (
              <Card key={i} className={i === 1 ? "border-primary ring-1 ring-primary/20" : ""}>
                <CardContent className="p-6">
                  {i === 1 && (
                    <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
                      <Crown className="w-3 h-3 mr-1" /> Most Popular
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold text-foreground">{tier.tier}</h3>
                  <p className="text-2xl font-bold text-primary mt-2">{tier.price}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-muted-foreground">{tier.subscribers} subscribers</p>
                    <p className="text-sm font-semibold text-foreground">MRR: ${tier.mrr.toLocaleString()}</p>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {tier.features.map((f, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Data Products</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">${p.revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.downloads} downloads</p>
                    </div>
                    <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle className="text-sm">Data Intelligence MRR Growth</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mrrTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]} />
                  <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Data Monetization Insight</p>
            <p className="text-xs text-muted-foreground mt-1">3 Enterprise API prospects in pipeline from global spirits conglomerates. Converting all 3 would add $45K+ MRR. "Premium Tequila Demand" report has 89% renewal rate - consider packaging as quarterly subscription.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default LiquorDataIntelligence;
