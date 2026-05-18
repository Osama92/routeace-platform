import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MapPin, TrendingUp, TrendingDown, DollarSign, Truck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RouteCosting {
  route: string;
  origin: string;
  destination: string;
  tripCount: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  margin: number;
  avgDistanceKm: number;
  avgCostPerKm: number;
}

const RouteLevelCosting = () => {
  const [routes, setRoutes] = useState<RouteCosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, cogs: 0, profit: 0, trips: 0 });

  useEffect(() => {
    fetchRouteCosting();
  }, []);

  const fetchRouteCosting = async () => {
    try {
      // Fetch dispatches with financial data
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select(`
          id,
          pickup_address,
          delivery_address,
          distance_km,
          cost,
          status
        `)
        .eq("status", "delivered");

      // Fetch invoices for revenue
      const { data: invoices } = await supabase
        .from("invoices")
        .select("dispatch_id, total_amount")
        .eq("status", "paid");

      // Fetch COGS expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("dispatch_id, amount")
        .eq("is_cogs", true);

      if (!dispatches) {
        setLoading(false);
        return;
      }

      // Build invoice and expense maps
      const invoiceMap = new Map<string, number>();
      invoices?.forEach((inv) => {
        if (inv.dispatch_id) {
          invoiceMap.set(inv.dispatch_id, (invoiceMap.get(inv.dispatch_id) || 0) + Number(inv.total_amount || 0));
        }
      });

      const expenseMap = new Map<string, number>();
      expenses?.forEach((exp) => {
        if (exp.dispatch_id) {
          expenseMap.set(exp.dispatch_id, (expenseMap.get(exp.dispatch_id) || 0) + Number(exp.amount || 0));
        }
      });

      // Group by route (simplified origin → destination)
      const routeMap = new Map<string, {
        origin: string;
        destination: string;
        trips: { revenue: number; cogs: number; distance: number }[];
      }>();

      dispatches.forEach((d) => {
        const origin = d.pickup_address?.split(",")[0]?.trim() || "Unknown";
        const destination = d.delivery_address?.split(",")[0]?.trim() || "Unknown";
        const routeKey = `${origin} → ${destination}`;

        const existing = routeMap.get(routeKey) || {
          origin,
          destination,
          trips: [],
        };

        const revenue = invoiceMap.get(d.id) || Number(d.cost || 0);
        const cogs = expenseMap.get(d.id) || 0;

        existing.trips.push({
          revenue,
          cogs,
          distance: Number(d.distance_km || 0),
        });

        routeMap.set(routeKey, existing);
      });

      // Calculate route-level metrics
      const routeData: RouteCosting[] = [];
      let totalRevenue = 0;
      let totalCogs = 0;
      let totalTrips = 0;

      routeMap.forEach((data, route) => {
        const tripCount = data.trips.length;
        const sumRevenue = data.trips.reduce((s, t) => s + t.revenue, 0);
        const sumCogs = data.trips.reduce((s, t) => s + t.cogs, 0);
        const sumDistance = data.trips.reduce((s, t) => s + t.distance, 0);
        const grossProfit = sumRevenue - sumCogs;
        const margin = sumRevenue > 0 ? (grossProfit / sumRevenue) * 100 : 0;
        const avgDistance = tripCount > 0 ? sumDistance / tripCount : 0;
        const avgCostPerKm = sumDistance > 0 ? sumCogs / sumDistance : 0;

        totalRevenue += sumRevenue;
        totalCogs += sumCogs;
        totalTrips += tripCount;

        routeData.push({
          route,
          origin: data.origin,
          destination: data.destination,
          tripCount,
          totalRevenue: sumRevenue,
          totalCogs: sumCogs,
          grossProfit,
          margin,
          avgDistanceKm: avgDistance,
          avgCostPerKm,
        });
      });

      // Sort by gross profit descending
      routeData.sort((a, b) => b.grossProfit - a.grossProfit);

      setRoutes(routeData);
      setTotals({
        revenue: totalRevenue,
        cogs: totalCogs,
        profit: totalRevenue - totalCogs,
        trips: totalTrips,
      });
    } catch (error) {
      console.error("Error fetching route costing:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
    return `₦${amount.toFixed(0)}`;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Route-Level Costing Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

    const tableData = routes.slice(0, 20).map((r, i) => [
      i + 1,
      r.route,
      r.tripCount,
      formatCurrency(r.totalRevenue),
      formatCurrency(r.totalCogs),
      formatCurrency(r.grossProfit),
      `${r.margin.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["#", "Route", "Trips", "Revenue", "COGS", "Profit", "Margin"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    doc.save("route-level-costing.pdf");
  };

  if (loading) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const chartData = routes.slice(0, 8).map((r) => ({
    name: r.route.length > 20 ? r.route.slice(0, 20) + "..." : r.route,
    profit: r.grossProfit,
    margin: r.margin,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-heading font-semibold">Route-Level Costing</h3>
          <p className="text-sm text-muted-foreground">Profitability analysis by route corridor</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{routes.length}</p>
              <p className="text-xs text-muted-foreground">Active Routes</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.revenue)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totals.profit)}
              </p>
              <p className="text-xs text-muted-foreground">Gross Profit</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totals.trips}</p>
              <p className="text-xs text-muted-foreground">Total Trips</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-heading">Top Routes by Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Profit"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-heading">Route Costing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Route</TableHead>
                  <TableHead className="text-center">Trips</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Avg ₦/KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No route data available
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.slice(0, 15).map((route, index) => (
                    <TableRow key={route.route} className="border-border/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{route.route}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{route.tripCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(route.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(route.totalCogs)}</TableCell>
                      <TableCell className={`text-right font-medium ${route.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(route.grossProfit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={route.margin >= 20 ? "default" : route.margin >= 0 ? "secondary" : "destructive"}>
                          {route.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ₦{route.avgCostPerKm.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteLevelCosting;
