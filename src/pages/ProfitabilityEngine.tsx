import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfitabilityEngine } from "@/hooks/useProfitabilityEngine";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import TruckProfitabilityPanel from "@/components/profitability/TruckProfitabilityPanel";
import {
  TrendingUp, TrendingDown, DollarSign, Truck, Users, Building2,
  Route, AlertTriangle, Loader2, BarChart3, Wrench,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

const fmt = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const MarginBadge = ({ margin }: { margin: number }) => (
  <Badge variant={margin > 25 ? "default" : margin > 10 ? "secondary" : "destructive"}>
    {margin.toFixed(1)}%
  </Badge>
);

const ProfitabilityEngine = () => {
  const { summary, tripProfitability, routeProfitability, clientProfitability, driverProfitability, isLoading } = useProfitabilityEngine();
  const [tab, setTab] = useState("overview");
  const trips = tripProfitability.data || [];
  const routes = routeProfitability.data || [];
  const clients = clientProfitability.data || [];
  const drivers = driverProfitability.data || [];

  if (isLoading) {
    return (
      <DashboardLayout title="Profitability Engine" subtitle="Trip, route, driver & client margin intelligence">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const costBreakdown = (() => {
    const cats = { Fuel: 0, Driver: 0, Maintenance: 0, Tolls: 0, Loading: 0, "Third Party": 0, Other: 0 };
    trips.forEach((t) => {
      cats.Fuel += Number(t.fuel_cost);
      cats.Driver += Number(t.driver_cost);
      cats.Maintenance += Number(t.maintenance_cost);
      cats.Tolls += Number(t.toll_cost);
      cats.Loading += Number(t.loading_cost);
      cats["Third Party"] += Number(t.third_party_cost);
      cats.Other += Number(t.other_cost);
    });
    return Object.entries(cats).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  })();

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#6b7280"];

  const exportData = trips.map((t) => ({
    Route: t.route_key || "N/A",
    Revenue: Number(t.revenue),
    "Total Cost": Number(t.total_cost),
    Profit: Number(t.profit),
    "Margin %": Number(t.margin_percent).toFixed(1),
  }));

  const exportColumns = [
    { key: "Route", label: "Route" },
    { key: "Revenue", label: "Revenue" },
    { key: "Total Cost", label: "Total Cost" },
    { key: "Profit", label: "Profit" },
    { key: "Margin %", label: "Margin %" },
  ];

  return (
    <DashboardLayout title="Profitability Engine" subtitle="Trip, route, driver & client margin intelligence">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Profitability Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">Real-time margin analysis across trips, routes, drivers & clients</p>
        </div>
        <ExportDropdown options={{ data: exportData, columns: exportColumns, title: "Profitability Report", filename: "profitability-report" }} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Revenue</span></div>
            <p className="text-xl font-bold">{fmt(summary.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Total Cost</span></div>
            <p className="text-xl font-bold">{fmt(summary.totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-muted-foreground">Profit</span></div>
            <p className="text-xl font-bold">{fmt(summary.totalProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-accent" /><span className="text-xs text-muted-foreground">Avg Margin</span></div>
            <p className="text-xl font-bold">{summary.avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Trips</span></div>
            <p className="text-xl font-bold">{summary.totalTrips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Loss Trips</span></div>
            <p className="text-xl font-bold">{summary.lossTrips}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {summary.lossTrips > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Margin Alert</AlertTitle>
          <AlertDescription>
            {summary.lossTrips} trip{summary.lossTrips > 1 ? "s" : ""} are loss-making. Review cost structure or pricing for affected routes.
          </AlertDescription>
        </Alert>
      )}
      {summary.avgMargin < 15 && summary.totalTrips > 0 && (
        <Alert>
          <TrendingDown className="w-4 h-4" />
          <AlertTitle>Low Average Margin</AlertTitle>
          <AlertDescription>
            Platform average margin is {summary.avgMargin.toFixed(1)}%. Consider increasing base rates or reducing fuel/driver costs.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {summary.totalTrips === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No profitability data yet</h3>
            <p className="text-sm text-muted-foreground">Complete deliveries and record costs to see real profitability insights here.</p>
          </CardContent>
        </Card>
      )}

      {summary.totalTrips > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="trucks"><Wrench className="w-3 h-3 mr-1" />Per-Truck</TabsTrigger>
            <TabsTrigger value="routes"><Route className="w-3 h-3 mr-1" />Routes</TabsTrigger>
            <TabsTrigger value="clients"><Building2 className="w-3 h-3 mr-1" />Clients</TabsTrigger>
            <TabsTrigger value="drivers"><Users className="w-3 h-3 mr-1" />Drivers</TabsTrigger>
            <TabsTrigger value="trips"><Truck className="w-3 h-3 mr-1" />Trips</TabsTrigger>
          </TabsList>

          <TabsContent value="trucks">
            <TruckProfitabilityPanel trips={trips} />
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Cost Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue vs Cost by Route</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={routes.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="route_key" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="total_revenue" fill="hsl(var(--primary))" name="Revenue" />
                      <Bar dataKey="total_cost" fill="hsl(var(--destructive))" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="routes">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((r) => (
                      <TableRow key={r.route_key}>
                        <TableCell className="font-medium">{r.route_key}</TableCell>
                        <TableCell className="text-right">{r.trip_count}</TableCell>
                        <TableCell className="text-right">{fmt(r.total_revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(r.total_cost)}</TableCell>
                        <TableCell className={`text-right ${r.total_profit < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(r.total_profit)}</TableCell>
                        <TableCell className="text-right"><MarginBadge margin={r.avg_margin} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.customer_id}>
                        <TableCell className="font-medium">{c.customer_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">{c.trip_count}</TableCell>
                        <TableCell className="text-right">{fmt(c.total_revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(c.total_cost)}</TableCell>
                        <TableCell className={`text-right ${c.total_profit < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(c.total_profit)}</TableCell>
                        <TableCell className="text-right"><MarginBadge margin={c.avg_margin} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">₦/Trip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((d) => (
                      <TableRow key={d.driver_id}>
                        <TableCell className="font-medium">{d.driver_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">{d.trip_count}</TableCell>
                        <TableCell className="text-right">{fmt(d.total_revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(d.total_cost)}</TableCell>
                        <TableCell className={`text-right ${d.total_profit < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(d.total_profit)}</TableCell>
                        <TableCell className="text-right">{fmt(d.profit_per_trip)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trips">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Fuel</TableHead>
                      <TableHead className="text-right">Driver</TableHead>
                      <TableHead className="text-right">Other</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.slice(0, 50).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.route_key || "-"}</TableCell>
                        <TableCell className="text-right">{fmt(Number(t.revenue))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(t.fuel_cost))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(t.driver_cost))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(t.maintenance_cost) + Number(t.toll_cost) + Number(t.loading_cost) + Number(t.third_party_cost) + Number(t.other_cost))}</TableCell>
                        <TableCell className={`text-right ${Number(t.profit) < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(Number(t.profit))}</TableCell>
                        <TableCell className="text-right"><MarginBadge margin={Number(t.margin_percent)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      </div>
    </DashboardLayout>
  );
};

export default ProfitabilityEngine;
