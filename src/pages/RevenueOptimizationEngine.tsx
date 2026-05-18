import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRevenueOptimization } from "@/hooks/useRevenueOptimization";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2,
  BarChart3, Route, Users, Fuel, Target, ShieldAlert,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie, Legend,
} from "recharts";

const fmt = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const MarginBadge = ({ margin }: { margin: number }) => (
  <Badge variant={margin > 25 ? "default" : margin > 10 ? "secondary" : "destructive"}>
    {margin.toFixed(1)}%
  </Badge>
);

const ClassBadge = ({ cls }: { cls: string }) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    high_value: { label: "High Value", variant: "default" },
    standard: { label: "Standard", variant: "secondary" },
    low_margin: { label: "Low Margin", variant: "outline" },
    loss_making: { label: "Loss Making", variant: "destructive" },
  };
  const { label, variant } = map[cls] || { label: cls, variant: "outline" as const };
  return <Badge variant={variant}>{label}</Badge>;
};

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function RevenueOptimizationEngine() {
  const { kpis, routeProfitability, clientProfitability, marginTrend, fuelIndex, isLoading } = useRevenueOptimization();
  const [tab, setTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const underpricedRoutes = routeProfitability.filter(r => r.is_underpriced);
  const lossClients = clientProfitability.filter(c => c.classification === "loss_making" || c.classification === "low_margin");

  const exportCols = [
    { key: "route_key", label: "Route" },
    { key: "total_revenue", label: "Revenue" },
    { key: "total_cost", label: "Cost" },
    { key: "total_profit", label: "Profit" },
    { key: "avg_margin", label: "Margin %" },
    { key: "trip_count", label: "Trips" },
  ];

  return (
    <DashboardLayout title="Revenue Optimization Engine" subtitle="Dynamic pricing, margin intelligence & profitability analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Revenue Optimization Engine
          </h2>
          <p className="text-muted-foreground text-sm">Dynamic pricing, margin intelligence & profitability analytics</p>
        </div>
        <ExportDropdown
          options={{
            data: routeProfitability.map(r => ({ ...r, avg_margin: r.avg_margin.toFixed(1) })),
            columns: exportCols,
            filename: "revenue-optimization",
            title: "Revenue Optimization Report",
          }}
        />
      </div>

      {/* Alerts */}
      {underpricedRoutes.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠ {underpricedRoutes.length} route(s) underpriced</strong> - margin below 15% threshold. Review pricing adjustments.
          </AlertDescription>
        </Alert>
      )}
      {lossClients.length > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>{lossClients.length} client(s)</strong> have low or negative margins. Consider pricing review.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" /> Total Revenue
            </div>
            <p className="text-2xl font-bold mt-1">{fmt(kpis.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" /> Total Profit
            </div>
            <p className="text-2xl font-bold mt-1">{fmt(kpis.totalProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4" /> Avg Margin
            </div>
            <p className="text-2xl font-bold mt-1">{kpis.avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" /> Underpriced Routes
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{kpis.underpricedRoutes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Route className="w-4 h-4" /> Total Trips
            </div>
            <p className="text-2xl font-bold mt-1">{kpis.totalTrips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" /> Avg Revenue/Trip
            </div>
            <p className="text-2xl font-bold mt-1">{fmt(kpis.avgRevenuePerTrip)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="w-4 h-4" /> Avg Cost/Trip
            </div>
            <p className="text-2xl font-bold mt-1">{fmt(kpis.avgCostPerTrip)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" /> Low-Margin Clients
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{kpis.lowMarginClients}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Margin Trends</TabsTrigger>
          <TabsTrigger value="routes">Route Profitability</TabsTrigger>
          <TabsTrigger value="clients">Client Profitability</TabsTrigger>
          <TabsTrigger value="fuel">Fuel & Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Margin Trend by Month</CardTitle></CardHeader>
            <CardContent>
              {marginTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={marginTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(v: number, name: string) => name === "margin" ? `${v.toFixed(1)}%` : fmt(v)} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue" />
                    <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#ef4444" name="Cost" />
                    <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#10b981" name="Margin %" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No trend data yet - complete deliveries to build margin history.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Revenue vs Cost by Month</CardTitle></CardHeader>
              <CardContent>
                {marginTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={marginTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                      <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Client Classification</CardTitle></CardHeader>
              <CardContent>
                {clientProfitability.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "High Value", value: clientProfitability.filter(c => c.classification === "high_value").length },
                          { name: "Standard", value: clientProfitability.filter(c => c.classification === "standard").length },
                          { name: "Low Margin", value: clientProfitability.filter(c => c.classification === "low_margin").length },
                          { name: "Loss Making", value: clientProfitability.filter(c => c.classification === "loss_making").length },
                        ].filter(d => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={80}
                        label
                      >
                        {[0, 1, 2, 3].map(i => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-center py-8">No data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routes">
          <Card>
            <CardHeader><CardTitle>Route Profitability ({routeProfitability.length} routes)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeProfitability.slice(0, 30).map((r) => (
                    <TableRow key={r.route_key}>
                      <TableCell className="font-medium max-w-[200px] truncate">{r.route_key}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_revenue)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_cost)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_profit)}</TableCell>
                      <TableCell className="text-right"><MarginBadge margin={r.avg_margin} /></TableCell>
                      <TableCell className="text-right">{r.trip_count}</TableCell>
                      <TableCell>
                        {r.is_underpriced ? (
                          <Badge variant="destructive">Underpriced</Badge>
                        ) : (
                          <Badge variant="default">Healthy</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {routeProfitability.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No route data available. Complete deliveries to see profitability.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader><CardTitle>Client Profitability ({clientProfitability.length} clients)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead>Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientProfitability.slice(0, 30).map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell className="text-right">{fmt(c.total_revenue)}</TableCell>
                      <TableCell className="text-right">{fmt(c.total_cost)}</TableCell>
                      <TableCell className="text-right">{fmt(c.total_profit)}</TableCell>
                      <TableCell className="text-right"><MarginBadge margin={c.avg_margin} /></TableCell>
                      <TableCell className="text-right">{c.trip_count}</TableCell>
                      <TableCell><ClassBadge cls={c.classification} /></TableCell>
                    </TableRow>
                  ))}
                  {clientProfitability.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No client data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Fuel className="w-4 h-4" /> Fuel Price Index</CardTitle></CardHeader>
              <CardContent>
                {fuelIndex.length > 0 ? (
                  <div className="space-y-3">
                    {fuelIndex.map((f: any) => (
                      <div key={f.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium">{f.fuel_type} - {f.country_code}</p>
                          <p className="text-xs text-muted-foreground">{f.effective_date}</p>
                        </div>
                        <p className="text-lg font-bold">₦{Number(f.fuel_price_per_liter).toLocaleString()}/L</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No fuel price data. Add fuel index entries to enable margin protection.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Margin Protection</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <p className="font-medium">Minimum Margin Threshold</p>
                    <p className="text-3xl font-bold text-primary mt-1">15%</p>
                    <p className="text-xs text-muted-foreground mt-1">Routes below this threshold are flagged as underpriced</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="font-medium">Auto-Pricing Mode</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon - automatically set optimal prices based on demand and cost signals.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
