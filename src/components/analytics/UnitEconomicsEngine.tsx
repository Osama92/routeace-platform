import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeDivide } from "@/lib/apiValidator";
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
  Legend,
  Cell,
} from "recharts";
import {
  Truck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calculator,
  Clock,
} from "lucide-react";

interface AssetEconomics {
  id: string;
  name: string;
  type: "truck" | "trailer" | "leased";
  acquisitionCost: number;
  monthlyOperatingCost: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  paybackPeriodMonths: number;
  lifetimeValue: number;
  roi: number;
  status: "profitable" | "break-even" | "loss";
}

const UnitEconomicsEngine = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assetEconomics, setAssetEconomics] = useState<AssetEconomics[]>([]);
  const [selectedView, setSelectedView] = useState<"asset" | "fleet">("asset");

  // Fleet-level aggregates
  const [fleetSummary, setFleetSummary] = useState({
    totalAcquisitionCost: 0,
    totalMonthlyOpCost: 0,
    totalMonthlyRevenue: 0,
    totalMonthlyProfit: 0,
    avgPaybackPeriod: 0,
    totalLTV: 0,
    fleetROI: 0,
  });

  useEffect(() => {
    fetchAssetEconomics();
  }, []);

  const fetchAssetEconomics = async () => {
    setLoading(true);
    try {
      // Fetch vehicles
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, make, model, registration_number, status, truck_type");

      // Fetch dispatches per vehicle
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("vehicle_id, cost, distance_km, status, created_at")
        .in("status", ["delivered", "closed"]);

      // Fetch expenses per vehicle
      const { data: expenses } = await supabase
        .from("expenses")
        .select("vehicle_id, amount, category, expense_date");

      // Fetch profitability data if exists
      const { data: profitability } = await supabase
        .from("asset_profitability")
        .select("*");

      // Calculate economics for each vehicle
      const economics: AssetEconomics[] = (vehicles || []).map(vehicle => {
        const vehicleDispatches = dispatches?.filter(d => d.vehicle_id === vehicle.id) || [];
        const vehicleExpenses = expenses?.filter(e => e.vehicle_id === vehicle.id) || [];
        
        const monthlyRevenue = vehicleDispatches.reduce((sum, d) => sum + (d.cost || 0), 0) / 6; // 6 month avg
        const monthlyOperatingCost = vehicleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) / 6;
        const monthlyProfit = monthlyRevenue - monthlyOperatingCost;
        
        const acquisitionCost = 15000000; // Default estimated value
        const paybackPeriodMonths = monthlyProfit > 0 
          ? Math.ceil(acquisitionCost / monthlyProfit)
          : 999;
        
        // LTV assuming 5 year asset life
        const lifetimeValue = monthlyProfit * 60;
        
        // ROI calculation
        const roi = safeDivide(lifetimeValue - acquisitionCost, acquisitionCost, 0) * 100;
        
        return {
          id: vehicle.id,
          name: `${vehicle.make || "Vehicle"} ${vehicle.model || ""} - ${vehicle.registration_number || ""}`,
          type: vehicle.truck_type?.includes("Trailer") ? "trailer" : "truck",
          acquisitionCost,
          monthlyOperatingCost,
          monthlyRevenue,
          monthlyProfit,
          paybackPeriodMonths,
          lifetimeValue,
          roi,
          status: monthlyProfit > 0 ? "profitable" : monthlyProfit === 0 ? "break-even" : "loss",
        };
      });

      setAssetEconomics(economics);

      // Calculate fleet summary
      const summary = economics.reduce((acc, asset) => ({
        totalAcquisitionCost: acc.totalAcquisitionCost + asset.acquisitionCost,
        totalMonthlyOpCost: acc.totalMonthlyOpCost + asset.monthlyOperatingCost,
        totalMonthlyRevenue: acc.totalMonthlyRevenue + asset.monthlyRevenue,
        totalMonthlyProfit: acc.totalMonthlyProfit + asset.monthlyProfit,
        avgPaybackPeriod: 0, // Calculated below
        totalLTV: acc.totalLTV + asset.lifetimeValue,
        fleetROI: 0, // Calculated below
      }), {
        totalAcquisitionCost: 0,
        totalMonthlyOpCost: 0,
        totalMonthlyRevenue: 0,
        totalMonthlyProfit: 0,
        avgPaybackPeriod: 0,
        totalLTV: 0,
        fleetROI: 0,
      });

      summary.avgPaybackPeriod = economics.length > 0
        ? economics.reduce((sum, a) => sum + a.paybackPeriodMonths, 0) / economics.length
        : 0;
      summary.fleetROI = safeDivide(
        summary.totalLTV - summary.totalAcquisitionCost,
        summary.totalAcquisitionCost,
        0
      ) * 100;

      setFleetSummary(summary);
    } catch (error) {
      console.error("Error fetching asset economics:", error);
      toast({
        title: "Error",
        description: "Failed to load unit economics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData = assetEconomics.slice(0, 10).map(asset => ({
    name: asset.name.slice(0, 15) + "...",
    revenue: asset.monthlyRevenue,
    cost: asset.monthlyOperatingCost,
    profit: asset.monthlyProfit,
  }));

  const exportData = () => {
    const csvData = [
      ["Asset Name", "Type", "Acquisition Cost", "Monthly Op Cost", "Monthly Revenue", "Monthly Profit", "Payback Period (months)", "LTV", "ROI %", "Status"],
      ...assetEconomics.map(asset => [
        asset.name,
        asset.type,
        asset.acquisitionCost,
        asset.monthlyOperatingCost,
        asset.monthlyRevenue,
        asset.monthlyProfit,
        asset.paybackPeriodMonths,
        asset.lifetimeValue,
        asset.roi.toFixed(1),
        asset.status,
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unit-economics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Unit economics data has been downloaded",
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Unit Economics Engine
            </CardTitle>
            <CardDescription>Asset-level P&L and fleet rollup analysis</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
              <TabsList>
                <TabsTrigger value="asset">Per Asset</TabsTrigger>
                <TabsTrigger value="fleet">Fleet Rollup</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedView === "fleet" ? (
          <div className="space-y-6">
            {/* Fleet Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Fleet Investment</p>
                <p className="text-xl font-bold">₦{fleetSummary.totalAcquisitionCost.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Monthly Fleet Revenue</p>
                <p className="text-xl font-bold text-success">₦{fleetSummary.totalMonthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Monthly Fleet Profit</p>
                <p className={`text-xl font-bold ${fleetSummary.totalMonthlyProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  ₦{fleetSummary.totalMonthlyProfit.toLocaleString()}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Fleet ROI</p>
                <p className={`text-xl font-bold ${fleetSummary.fleetROI >= 0 ? "text-success" : "text-destructive"}`}>
                  {fleetSummary.fleetROI.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Avg Payback Period</p>
                <p className="text-xl font-bold">{Math.round(fleetSummary.avgPaybackPeriod)} months</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total LTV</p>
                <p className="text-xl font-bold">₦{fleetSummary.totalLTV.toLocaleString()}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Asset Count</p>
                <p className="text-xl font-bold">{assetEconomics.length}</p>
              </div>
            </div>

            {/* Fleet P&L Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => `₦${value.toLocaleString()}`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--success))" />
                  <Bar dataKey="cost" name="Cost" fill="hsl(var(--destructive))" />
                  <Bar dataKey="profit" name="Profit" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Acquisition</TableHead>
                  <TableHead className="text-right">Monthly Revenue</TableHead>
                  <TableHead className="text-right">Monthly Cost</TableHead>
                  <TableHead className="text-right">Monthly Profit</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetEconomics.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="max-w-[200px] truncate">{asset.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">₦{asset.acquisitionCost.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-success">₦{asset.monthlyRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">₦{asset.monthlyOperatingCost.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${asset.monthlyProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      ₦{asset.monthlyProfit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {asset.paybackPeriodMonths < 999 ? `${asset.paybackPeriodMonths}mo` : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right ${asset.roi >= 0 ? "text-success" : "text-destructive"}`}>
                      {asset.roi >= 0 ? <TrendingUp className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />}
                      {asset.roi.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        asset.status === "profitable" ? "default" :
                        asset.status === "break-even" ? "secondary" : "destructive"
                      }>
                        {asset.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnitEconomicsEngine;
