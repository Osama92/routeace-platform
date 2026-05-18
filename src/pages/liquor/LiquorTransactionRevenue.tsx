import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, ShoppingCart, Users, ArrowUpRight, Zap } from "lucide-react";

const gmvTrend = [
  { month: "Jan", gmv: 8200000, fees: 82000 }, { month: "Feb", gmv: 9100000, fees: 91000 },
  { month: "Mar", gmv: 10400000, fees: 104000 }, { month: "Apr", gmv: 11200000, fees: 112000 },
  { month: "May", gmv: 12500000, fees: 125000 }, { month: "Jun", gmv: 13800000, fees: 138000 },
];

const feeBreakdown = [
  { name: "Transaction Fees", value: 68000, color: "hsl(var(--primary))" },
  { name: "Payment Processing", value: 32000, color: "hsl(var(--accent))" },
  { name: "Marketplace Fees", value: 18000, color: "hsl(var(--secondary))" },
  { name: "Allocation Premiums", value: 7000, color: "hsl(var(--muted-foreground))" },
];

const topDistributors = [
  { name: "Metro Spirits Ltd", gmv: 2800000, fees: 28000, retailers: 420, growth: 18.2 },
  { name: "Prime Beverages Co", gmv: 2100000, fees: 21000, retailers: 310, growth: 12.5 },
  { name: "Atlas Drinks Group", gmv: 1900000, fees: 19000, retailers: 280, growth: 22.1 },
  { name: "Crown Distributors", gmv: 1650000, fees: 16500, retailers: 245, growth: 8.7 },
  { name: "Pacific Wine & Spirits", gmv: 1400000, fees: 14000, retailers: 190, growth: 15.3 },
];

const LiquorTransactionRevenue = () => (
  <DashboardLayout title="Transaction Revenue Engine" subtitle="Platform take-rate analytics across the Commerce Exchange">
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Network GMV", value: "$12.5M", change: "+14.2%", icon: DollarSign, sub: "Monthly" },
          { label: "Platform Revenue", value: "$125,000", change: "+11.8%", icon: TrendingUp, sub: "1% avg take-rate" },
          { label: "Active Retailers", value: "5,012", change: "+340", icon: ShoppingCart, sub: "Transacting this month" },
          { label: "Avg Order Value", value: "$2,490", change: "+$180", icon: Users, sub: "Per retailer/month" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-500 font-medium">{kpi.change}</span>
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">GMV Overview</TabsTrigger>
          <TabsTrigger value="distributors">Distributor Rankings</TabsTrigger>
          <TabsTrigger value="breakdown">Fee Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">GMV & Platform Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={gmvTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                    <Area type="monotone" dataKey="gmv" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="GMV" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Revenue Sources</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={feeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {feeBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {feeBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insight */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Revenue Intelligence</p>
                <p className="text-xs text-muted-foreground mt-1">Allocation premium fees surged 34% after the limited Macallan release. Recommend expanding premium allocation events to 2x per quarter - projected incremental revenue: $28K/quarter.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributors">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Distributors by GMV</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDistributors.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.retailers} retailers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">${(d.gmv / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-muted-foreground">Fees: ${(d.fees / 1000).toFixed(0)}K</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <ArrowUpRight className="w-3 h-3 mr-1" />+{d.growth}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader><CardTitle className="text-sm">Fee Revenue by Transaction Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { type: "Retailer Orders", fee: 68000 }, { type: "Marketplace", fee: 32000 },
                  { type: "Promo Funding", fee: 18000 }, { type: "Allocations", fee: 7000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="type" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="fee" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default LiquorTransactionRevenue;
