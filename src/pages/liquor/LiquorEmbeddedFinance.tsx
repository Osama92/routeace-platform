import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, CreditCard, AlertTriangle, ShieldCheck, TrendingUp, Zap, ArrowUpRight } from "lucide-react";

const portfolioTrend = [
  { month: "Jan", financed: 32000000, revenue: 213000 }, { month: "Feb", financed: 36000000, revenue: 240000 },
  { month: "Mar", financed: 39000000, revenue: 260000 }, { month: "Apr", financed: 42000000, revenue: 280000 },
  { month: "May", financed: 46000000, revenue: 307000 }, { month: "Jun", financed: 50000000, revenue: 333000 },
];

const creditAccounts = [
  { name: "The Whiskey Lounge", type: "Bar", limit: 15000, used: 11200, score: 92, status: "current", daysOutstanding: 12 },
  { name: "Metro Wines & Spirits", type: "Store", limit: 25000, used: 18500, score: 88, status: "current", daysOutstanding: 8 },
  { name: "Sunset Cocktail Bar", type: "Bar", limit: 8000, used: 7800, score: 74, status: "watch", daysOutstanding: 28 },
  { name: "Crown Liquor Store", type: "Store", limit: 20000, used: 12000, score: 95, status: "current", daysOutstanding: 5 },
  { name: "Ember Restaurant", type: "Restaurant", limit: 10000, used: 9200, score: 65, status: "delinquent", daysOutstanding: 45 },
];

const riskDistribution = [
  { risk: "Low Risk (80+)", count: 3200, amount: 35000000 },
  { risk: "Medium (60-79)", count: 1100, amount: 11000000 },
  { risk: "High (<60)", count: 280, amount: 2800000 },
  { risk: "Watch List", count: 120, amount: 1200000 },
];

const LiquorEmbeddedFinance = () => (
  <DashboardLayout title="Embedded Finance Engine" subtitle="Credit, financing, and risk infrastructure for the liquor trade network">
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Credit Portfolio", value: "$50M", change: "+8.7%", icon: Wallet, sub: "Annualized" },
          { label: "Finance Revenue", value: "$4M", change: "+12.3%", icon: TrendingUp, sub: "8% interest margin" },
          { label: "Default Rate", value: "1.8%", change: "-0.3%", icon: ShieldCheck, sub: "Industry avg: 4.2%" },
          { label: "Active Credit Lines", value: "4,580", change: "+380", icon: CreditCard, sub: "Retailers" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-500">{kpi.change}</span>
                    <span className="text-xs text-muted-foreground ml-1">{kpi.sub}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="accounts">Credit Accounts</TabsTrigger>
          <TabsTrigger value="risk">Risk Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          <Card>
            <CardHeader><CardTitle className="text-sm">Financed Inventory & Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={portfolioTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                  <Area type="monotone" dataKey="financed" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} name="Financed" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader><CardTitle className="text-sm">Retailer Credit Accounts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditAccounts.map((a, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.type} · Score: {a.score}</p>
                      </div>
                      <Badge variant={a.status === "current" ? "secondary" : a.status === "watch" ? "outline" : "destructive"}>
                        {a.status === "delinquent" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {a.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={(a.used / a.limit) * 100} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ${(a.used / 1000).toFixed(1)}K / ${(a.limit / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.daysOutstanding} days outstanding</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="risk" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), ""]} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Accounts" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Credit Risk Alert</p>
            <p className="text-xs text-muted-foreground mt-1">12 accounts approaching 90% utilization with declining payment velocity. Auto-tightening credit limits for 3 watch-list retailers. Recommend proactive outreach to Ember Restaurant (45 days overdue, $9.2K exposure).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default LiquorEmbeddedFinance;
