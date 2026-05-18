import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import DashboardExportButton from "@/components/shared/DashboardExportButton";
import {
  Truck, DollarSign, AlertTriangle, Play, History,
  TrendingUp, TrendingDown, ShieldAlert, CheckCircle, XCircle, Clock,
} from "lucide-react";

const riskColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
};

const riskIcons: Record<string, React.ReactNode> = {
  low: <CheckCircle className="h-5 w-5 text-green-500" />,
  medium: <Clock className="h-5 w-5 text-yellow-500" />,
  high: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  critical: <XCircle className="h-5 w-5 text-red-500" />,
};

export default function DecisionSimulation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("fleet");

  // Fleet params
  const [trucksToAdd, setTrucksToAdd] = useState(2);
  const [utilizationChange, setUtilizationChange] = useState(0);
  const [costPerTruck, setCostPerTruck] = useState(500000);

  // Finance params
  const [factoringPct, setFactoringPct] = useState(20);
  const [expenseChangePct, setExpenseChangePct] = useState(0);
  const [collectionDelay, setCollectionDelay] = useState(0);

  // Risk params
  const [paymentDelay, setPaymentDelay] = useState(30);
  const [costSpike, setCostSpike] = useState(10);
  const [revenueDecline, setRevenueDecline] = useState(10);

  const [currentResult, setCurrentResult] = useState<any>(null);

  const { data: history } = useQuery({
    queryKey: ["simulation-history"],
    queryFn: async () => {
      // Query directly from database
      const { data: sims } = await supabase
        .from("decision_simulations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return sims || [];
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (params: { simulation_type: string; scenario_name: string; input_params: any }) => {
      const { data, error } = await supabase.functions.invoke("decision-simulation", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentResult(data.data);
      queryClient.invalidateQueries({ queryKey: ["simulation-history"] });
      toast.success("Simulation complete");
    },
    onError: (err: any) => toast.error(err.message || "Simulation failed"),
  });

  const runSimulation = () => {
    const params = activeTab === "fleet"
      ? { simulation_type: "fleet", scenario_name: `Add ${trucksToAdd} trucks`, input_params: { trucks_to_add: trucksToAdd, utilization_change: utilizationChange, monthly_cost_per_truck: costPerTruck } }
      : activeTab === "finance"
      ? { simulation_type: "finance", scenario_name: "Cash flow scenario", input_params: { invoice_factoring_pct: factoringPct, expense_change_pct: expenseChangePct, collection_delay_days: collectionDelay } }
      : { simulation_type: "risk", scenario_name: "Stress test", input_params: { payment_delay_days: paymentDelay, cost_spike_pct: costSpike, revenue_decline_pct: revenueDecline } };
    simulateMutation.mutate(params);
  };

  const formatNaira = (val: number) => `₦${Math.abs(val).toLocaleString()}`;

  return (
    <DashboardLayout title="Decision Simulation Engine" subtitle="Simulate business decisions before executing them">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Decision Simulation Engine</h1>
            <p className="text-muted-foreground">Simulate business decisions before executing them</p>
          </div>
          <DashboardExportButton
            getExportData={() => ({
              title: "Decision Simulations",
              columns: [
                { key: "scenario_name", label: "Scenario" },
                { key: "simulation_type", label: "Type" },
                { key: "risk_level", label: "Risk" },
                { key: "profit_impact", label: "Profit Impact" },
                { key: "cash_impact", label: "Cash Impact" },
                { key: "recommendation", label: "Recommendation" },
              ],
              data: history || [],
              filename: "decision_simulations",
            })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scenario Builder</CardTitle>
                <CardDescription>Configure simulation parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="fleet"><Truck className="h-4 w-4 mr-1" /> Fleet</TabsTrigger>
                    <TabsTrigger value="finance"><DollarSign className="h-4 w-4 mr-1" /> Finance</TabsTrigger>
                    <TabsTrigger value="risk"><AlertTriangle className="h-4 w-4 mr-1" /> Risk</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fleet" className="space-y-4 mt-4">
                    <div>
                      <Label>Trucks to Add: {trucksToAdd}</Label>
                      <Slider value={[trucksToAdd]} onValueChange={([v]) => setTrucksToAdd(v)} min={1} max={20} step={1} className="mt-2" />
                    </div>
                    <div>
                      <Label>Utilization Change: {utilizationChange > 0 ? "+" : ""}{utilizationChange}%</Label>
                      <Slider value={[utilizationChange]} onValueChange={([v]) => setUtilizationChange(v)} min={-30} max={30} step={5} className="mt-2" />
                    </div>
                    <div>
                      <Label>Monthly Cost per Truck (₦)</Label>
                      <Input type="number" value={costPerTruck} onChange={(e) => setCostPerTruck(Number(e.target.value))} className="mt-1" />
                    </div>
                  </TabsContent>

                  <TabsContent value="finance" className="space-y-4 mt-4">
                    <div>
                      <Label>Invoice Factoring: {factoringPct}%</Label>
                      <Slider value={[factoringPct]} onValueChange={([v]) => setFactoringPct(v)} min={0} max={80} step={5} className="mt-2" />
                    </div>
                    <div>
                      <Label>Expense Change: {expenseChangePct > 0 ? "+" : ""}{expenseChangePct}%</Label>
                      <Slider value={[expenseChangePct]} onValueChange={([v]) => setExpenseChangePct(v)} min={-30} max={30} step={5} className="mt-2" />
                    </div>
                    <div>
                      <Label>Collection Delay: {collectionDelay} days</Label>
                      <Slider value={[collectionDelay]} onValueChange={([v]) => setCollectionDelay(v)} min={0} max={90} step={5} className="mt-2" />
                    </div>
                  </TabsContent>

                  <TabsContent value="risk" className="space-y-4 mt-4">
                    <div>
                      <Label>Payment Delay: {paymentDelay} days</Label>
                      <Slider value={[paymentDelay]} onValueChange={([v]) => setPaymentDelay(v)} min={0} max={90} step={15} className="mt-2" />
                    </div>
                    <div>
                      <Label>Cost Spike: +{costSpike}%</Label>
                      <Slider value={[costSpike]} onValueChange={([v]) => setCostSpike(v)} min={0} max={50} step={5} className="mt-2" />
                    </div>
                    <div>
                      <Label>Revenue Decline: -{revenueDecline}%</Label>
                      <Slider value={[revenueDecline]} onValueChange={([v]) => setRevenueDecline(v)} min={0} max={50} step={5} className="mt-2" />
                    </div>
                  </TabsContent>
                </Tabs>

                <Button className="w-full mt-4" onClick={runSimulation} disabled={simulateMutation.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {currentResult ? (
              <>
                {/* Risk + Recommendation */}
                <Card className={`border-2 ${riskColors[currentResult.risk_level] || ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{riskIcons[currentResult.risk_level]}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={riskColors[currentResult.risk_level]}>
                            {currentResult.risk_level?.toUpperCase()} RISK
                          </Badge>
                          <span className="text-sm text-muted-foreground">{currentResult.scenario_name}</span>
                        </div>
                        <p className="text-sm font-medium">{currentResult.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Impact Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Profit Impact / Month</p>
                      <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${currentResult.profit_impact >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {currentResult.profit_impact >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        {currentResult.profit_impact >= 0 ? "+" : "-"}{formatNaira(currentResult.profit_impact)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Cash Impact</p>
                      <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${currentResult.cash_impact >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {currentResult.cash_impact >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        {currentResult.cash_impact >= 0 ? "+" : "-"}{formatNaira(currentResult.cash_impact)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Details */}
                {currentResult.results && (
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Simulation Details</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(currentResult.results as Record<string, any>).map(([key, val]) => (
                          <div key={key} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                            <p className="text-sm font-semibold mt-1">
                              {typeof val === "number"
                                ? key.includes("pct") || key.includes("utilization") || key.includes("score")
                                  ? `${val}%`
                                  : key.includes("months") ? `${val} months` : formatNaira(val)
                                : String(val)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Configure a scenario and click "Run Simulation"</p>
                  <p className="text-xs text-muted-foreground mt-1">Results will appear here with risk analysis and recommendations</p>
                </div>
              </Card>
            )}

            {/* History */}
            {history && history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" /> Simulation History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {history.slice(0, 8).map((sim: any) => (
                      <div
                        key={sim.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setCurrentResult(sim)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={riskColors[sim.risk_level]}>
                            {sim.risk_level}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{sim.scenario_name}</p>
                            <p className="text-xs text-muted-foreground">{sim.simulation_type} · {new Date(sim.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${sim.profit_impact >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {sim.profit_impact >= 0 ? "+" : ""}{formatNaira(sim.profit_impact)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
