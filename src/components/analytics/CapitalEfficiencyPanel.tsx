import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { safeDivide } from "@/lib/apiValidator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Calculator,
  Gauge,
  AlertTriangle,
  Play,
} from "lucide-react";

interface Scenario {
  name: string;
  fuelPriceChange: number;
  demandChange: number;
  downtimeDays: number;
  revenueImpact: number;
  costImpact: number;
  marginImpact: number;
}

const CapitalEfficiencyPanel = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    capitalDeployed: 0,
    revenuePerNairaInvested: 0,
    assetROI: 0,
    irr: 0,
  });

  // Scenario simulation state
  const [scenario, setScenario] = useState<Scenario>({
    name: "Custom Scenario",
    fuelPriceChange: 0,
    demandChange: 0,
    downtimeDays: 0,
    revenueImpact: 0,
    costImpact: 0,
    marginImpact: 0,
  });

  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [baselineMetrics, setBaselineMetrics] = useState({
    monthlyRevenue: 0,
    monthlyCost: 0,
    margin: 0,
  });

  useEffect(() => {
    fetchCapitalMetrics();
  }, []);

  const fetchCapitalMetrics = async () => {
    setLoading(true);
    try {
      // Fetch vehicles for capital deployed
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, status");

      // Fetch invoices for revenue
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("status", "paid");

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount");

      // Estimate capital deployed based on fleet size (15M per vehicle average)
      const capitalDeployed = (vehicles?.length || 0) * 15000000;
      const totalRevenue = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const totalCost = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const revenuePerNairaInvested = safeDivide(totalRevenue, capitalDeployed, 0);
      const assetROI = safeDivide(totalRevenue - totalCost, capitalDeployed, 0) * 100;
      
      // Simplified IRR calculation (annualized)
      const monthlyProfit = (totalRevenue - totalCost) / 6;
      const annualProfit = monthlyProfit * 12;
      const irr = safeDivide(annualProfit, capitalDeployed, 0) * 100;

      setMetrics({
        capitalDeployed,
        revenuePerNairaInvested,
        assetROI,
        irr,
      });

      setBaselineMetrics({
        monthlyRevenue: totalRevenue / 6,
        monthlyCost: totalCost / 6,
        margin: safeDivide(totalRevenue - totalCost, totalRevenue, 0) * 100,
      });

    } catch (error) {
      console.error("Error fetching capital metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = () => {
    const { fuelPriceChange, demandChange, downtimeDays } = scenario;
    
    // Calculate impacts
    const fuelCostImpact = baselineMetrics.monthlyCost * 0.4 * (fuelPriceChange / 100);
    const demandRevenueImpact = baselineMetrics.monthlyRevenue * (demandChange / 100);
    const downtimeCostImpact = (baselineMetrics.monthlyRevenue / 30) * downtimeDays; // Lost revenue per day

    const newRevenue = baselineMetrics.monthlyRevenue + demandRevenueImpact - downtimeCostImpact;
    const newCost = baselineMetrics.monthlyCost + fuelCostImpact;
    const newMargin = safeDivide(newRevenue - newCost, newRevenue, 0) * 100;

    setScenario(prev => ({
      ...prev,
      revenueImpact: ((newRevenue - baselineMetrics.monthlyRevenue) / baselineMetrics.monthlyRevenue) * 100,
      costImpact: ((newCost - baselineMetrics.monthlyCost) / baselineMetrics.monthlyCost) * 100,
      marginImpact: newMargin - baselineMetrics.margin,
    }));

    // Generate 12-month projection
    const projectionData = [];
    for (let month = 1; month <= 12; month++) {
      projectionData.push({
        month: `M${month}`,
        baseline: baselineMetrics.monthlyRevenue - baselineMetrics.monthlyCost,
        simulated: newRevenue - newCost,
        difference: (newRevenue - newCost) - (baselineMetrics.monthlyRevenue - baselineMetrics.monthlyCost),
      });
    }
    setSimulationResults(projectionData);
  };

  const presetScenarios = [
    { name: "Fuel +20%", fuelPriceChange: 20, demandChange: 0, downtimeDays: 0 },
    { name: "Demand Spike +30%", fuelPriceChange: 0, demandChange: 30, downtimeDays: 0 },
    { name: "Fleet Downtime 5 days", fuelPriceChange: 0, demandChange: 0, downtimeDays: 5 },
    { name: "Worst Case", fuelPriceChange: 30, demandChange: -20, downtimeDays: 10 },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          Capital Efficiency & ROI
        </CardTitle>
        <CardDescription>Track capital deployment and run scenario simulations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Capital Deployed</p>
            </div>
            <p className="text-xl font-bold">₦{metrics.capitalDeployed.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-success" />
              <p className="text-sm text-muted-foreground">Revenue per ₦1 Invested</p>
            </div>
            <p className="text-xl font-bold text-success">₦{metrics.revenuePerNairaInvested.toFixed(2)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Asset ROI</p>
            </div>
            <p className={`text-xl font-bold ${metrics.assetROI >= 0 ? "text-success" : "text-destructive"}`}>
              {metrics.assetROI.toFixed(1)}%
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4 text-warning" />
              <p className="text-sm text-muted-foreground">IRR (Annualized)</p>
            </div>
            <p className={`text-xl font-bold ${metrics.irr >= 0 ? "text-success" : "text-destructive"}`}>
              {metrics.irr.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Scenario Simulator */}
        <div className="border border-border rounded-lg p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Scenario Simulation
          </h4>

          {/* Preset Scenarios */}
          <div className="flex flex-wrap gap-2 mb-4">
            {presetScenarios.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => {
                  setScenario(prev => ({
                    ...prev,
                    ...preset,
                    name: preset.name,
                  }));
                }}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          {/* Custom Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="space-y-2">
              <Label className="text-sm">Fuel Price Change: {scenario.fuelPriceChange}%</Label>
              <Slider
                value={[scenario.fuelPriceChange]}
                min={-30}
                max={50}
                step={5}
                onValueChange={([v]) => setScenario(prev => ({ ...prev, fuelPriceChange: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Demand Change: {scenario.demandChange}%</Label>
              <Slider
                value={[scenario.demandChange]}
                min={-50}
                max={50}
                step={5}
                onValueChange={([v]) => setScenario(prev => ({ ...prev, demandChange: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Asset Downtime: {scenario.downtimeDays} days</Label>
              <Slider
                value={[scenario.downtimeDays]}
                min={0}
                max={30}
                step={1}
                onValueChange={([v]) => setScenario(prev => ({ ...prev, downtimeDays: v }))}
              />
            </div>
          </div>

          <Button onClick={runSimulation} className="w-full md:w-auto">
            <Play className="w-4 h-4 mr-2" />
            Run Simulation
          </Button>

          {/* Simulation Results */}
          {simulationResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className={`rounded-lg p-3 ${scenario.revenueImpact >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground">Revenue Impact</p>
                  <p className={`text-lg font-bold ${scenario.revenueImpact >= 0 ? "text-success" : "text-destructive"}`}>
                    {scenario.revenueImpact >= 0 ? "+" : ""}{scenario.revenueImpact.toFixed(1)}%
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${scenario.costImpact <= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground">Cost Impact</p>
                  <p className={`text-lg font-bold ${scenario.costImpact <= 0 ? "text-success" : "text-destructive"}`}>
                    {scenario.costImpact >= 0 ? "+" : ""}{scenario.costImpact.toFixed(1)}%
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${scenario.marginImpact >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <p className="text-sm text-muted-foreground">Margin Impact</p>
                  <p className={`text-lg font-bold ${scenario.marginImpact >= 0 ? "text-success" : "text-destructive"}`}>
                    {scenario.marginImpact >= 0 ? "+" : ""}{scenario.marginImpact.toFixed(1)}pp
                  </p>
                </div>
              </div>

              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationResults}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => `₦${value.toLocaleString()}`}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="baseline" name="Baseline Profit" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="simulated" name="Simulated Profit" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CapitalEfficiencyPanel;
