import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { safeDivide } from "@/lib/apiValidator";
import {
  TrendingUp,
  TrendingDown,
  Truck,
  DollarSign,
  Clock,
  Gauge,
  Calendar,
  Download,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

interface AssetROI {
  id: string;
  registrationNumber: string;
  truckType: string;
  purchasePrice: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number;
  utilizationRate: number;
  costPerKm: number;
  revenuePerKm: number;
  tripCount: number;
  totalKm: number;
  paybackMonths: number;
}

type TimePeriod = "monthly" | "quarterly" | "annual";

/**
 * Fleet ROI Dashboard - Section D
 * Investor-grade fleet asset returns
 */
const FleetROIDashboard = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [selectedYear] = useState(new Date().getFullYear());

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case "monthly":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarterly":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "annual":
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const dateRange = getDateRange();

  // Fetch fleet ROI data
  const { data: roiData, isLoading } = useQuery({
    queryKey: ["fleet-roi", timePeriod],
    queryFn: async () => {
      // Get vehicles with purchase info
      const { data: vehicles, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, registration_number, truck_type, status");

      if (vehicleError) throw vehicleError;

      // Get dispatches for the period
      const { data: dispatches, error: dispatchError } = await supabase
        .from("dispatches")
        .select("id, vehicle_id, cost, distance_km, status")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .eq("status", "delivered");

      if (dispatchError) throw dispatchError;

      // Get expenses for the period
      const { data: expenses, error: expenseError } = await supabase
        .from("expenses")
        .select("vehicle_id, amount")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .eq("approval_status", "approved");

      if (expenseError) throw expenseError;

      // Get invoices for revenue
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("dispatch_id, total_amount")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (invoiceError) throw invoiceError;

      // Calculate ROI for each vehicle
      const roiList: AssetROI[] = [];

      for (const vehicle of vehicles || []) {
        const vehicleDispatches = dispatches?.filter(d => d.vehicle_id === vehicle.id) || [];
        const vehicleExpenses = expenses?.filter(e => e.vehicle_id === vehicle.id) || [];
        
        const tripCount = vehicleDispatches.length;
        const totalKm = vehicleDispatches.reduce((sum, d) => sum + (d.distance_km || 0), 0);
        const totalDispatchCost = vehicleDispatches.reduce((sum, d) => sum + (d.cost || 0), 0);
        const totalExpenseCost = vehicleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalCost = totalDispatchCost + totalExpenseCost;

        // Calculate revenue from invoices
        let totalRevenue = 0;
        for (const dispatch of vehicleDispatches) {
          const invoice = invoices?.find(i => i.dispatch_id === dispatch.id);
          if (invoice) totalRevenue += invoice.total_amount || 0;
        }

        const netProfit = totalRevenue - totalCost;
        const purchasePrice = 50000000; // Default 50M
        
        // ROI = (Net Profit / Investment) × 100
        const roi = safeDivide(netProfit, purchasePrice) * 100;
        
        // Utilization rate = days with trips / total days in period
        const periodDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
        const uniqueTripDays = new Set(vehicleDispatches.map(d => format(new Date(d.cost ? new Date() : new Date()), "yyyy-MM-dd"))).size;
        const utilizationRate = safeDivide(uniqueTripDays, periodDays) * 100;

        // Cost and revenue per km
        const costPerKm = safeDivide(totalCost, totalKm);
        const revenuePerKm = safeDivide(totalRevenue, totalKm);

        // Payback period in months (at current profit rate)
        const monthlyProfit = timePeriod === "monthly" ? netProfit : safeDivide(netProfit, timePeriod === "quarterly" ? 3 : 12);
        const paybackMonths = monthlyProfit > 0 ? safeDivide(purchasePrice, monthlyProfit) : 999;

        roiList.push({
          id: vehicle.id,
          registrationNumber: vehicle.registration_number || "",
          truckType: vehicle.truck_type || "N/A",
          purchasePrice,
          totalRevenue,
          totalCost,
          netProfit,
          roi,
          utilizationRate,
          costPerKm,
          revenuePerKm,
          tripCount,
          totalKm,
          paybackMonths: Math.min(paybackMonths, 999),
        });
      }

      return roiList.sort((a, b) => b.roi - a.roi);
    },
  });

  // Summary calculations
  const totalFleetValue = roiData?.reduce((sum, a) => sum + a.purchasePrice, 0) || 0;
  const totalRevenue = roiData?.reduce((sum, a) => sum + a.totalRevenue, 0) || 0;
  const totalCost = roiData?.reduce((sum, a) => sum + a.totalCost, 0) || 0;
  const totalProfit = totalRevenue - totalCost;
  const avgROI = roiData && roiData.length > 0
    ? roiData.reduce((sum, a) => sum + a.roi, 0) / roiData.length
    : 0;
  const avgUtilization = roiData && roiData.length > 0
    ? roiData.reduce((sum, a) => sum + a.utilizationRate, 0) / roiData.length
    : 0;

  const bestPerformer = roiData?.[0];
  const worstPerformer = roiData?.[roiData.length - 1];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Fleet ROI Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Investor-grade asset performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Fleet Value</span>
            </div>
            <p className="text-2xl font-bold">₦{(totalFleetValue / 1000000000).toFixed(1)}B</p>
          </CardContent>
        </Card>

        <Card className={totalProfit >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span className="text-sm text-muted-foreground">Net Profit</span>
            </div>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₦{(totalProfit / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Avg ROI</span>
            </div>
            <p className={`text-2xl font-bold ${avgROI >= 0 ? "text-green-600" : "text-red-600"}`}>
              {avgROI.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Utilization</span>
            </div>
            <p className="text-2xl font-bold">{avgUtilization.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Assets</span>
            </div>
            <p className="text-2xl font-bold">{roiData?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bestPerformer && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ArrowUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Performer</p>
                    <p className="font-bold">{bestPerformer.registrationNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{bestPerformer.roi.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {worstPerformer && roiData && roiData.length > 1 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <ArrowDown className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Attention</p>
                    <p className="font-bold">{worstPerformer.registrationNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{worstPerformer.roi.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Asset Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Performance Details</CardTitle>
          <CardDescription>
            {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} view - {format(dateRange.start, "MMM d")} to {format(dateRange.end, "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>₦/km</TableHead>
                <TableHead>Payback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roiData?.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{asset.registrationNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{asset.truckType}</TableCell>
                  <TableCell className="text-green-600">₦{(asset.totalRevenue / 1000).toFixed(0)}k</TableCell>
                  <TableCell className="text-red-600">₦{(asset.totalCost / 1000).toFixed(0)}k</TableCell>
                  <TableCell className={asset.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                    ₦{(asset.netProfit / 1000).toFixed(0)}k
                  </TableCell>
                  <TableCell>
                    <Badge variant={asset.roi > 10 ? "default" : asset.roi > 0 ? "secondary" : "destructive"}>
                      {asset.roi.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={asset.utilizationRate} className="w-16 h-2" />
                      <span className="text-sm">{asset.utilizationRate.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="text-green-600">+₦{asset.revenuePerKm.toFixed(0)}</p>
                      <p className="text-red-600">-₦{asset.costPerKm.toFixed(0)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {asset.paybackMonths < 999 ? (
                      <span className="text-sm">{asset.paybackMonths.toFixed(0)} mo</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetROIDashboard;
