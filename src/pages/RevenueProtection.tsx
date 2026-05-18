import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, Truck, Clock, AlertTriangle, RefreshCw, Loader2, Fuel } from "lucide-react";

const lossTypeIcons: Record<string, any> = {
  idle_truck: Truck, fuel_waste: Fuel, route_inefficiency: TrendingDown,
  delay_penalty: Clock, missed_delivery: AlertTriangle, underutilized_asset: Truck,
  maintenance_downtime: AlertTriangle, driver_inefficiency: TrendingDown,
};

const severityColors: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400", medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400", critical: "bg-red-500/20 text-red-400",
};

export default function RevenueProtection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: losses = [], isLoading } = useQuery({
    queryKey: ["revenue-loss-events"],
    queryFn: async () => {
      const { data } = await supabase.from("revenue_loss_events").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["revenue-loss-analysis"],
    queryFn: async () => {
      const { data } = await supabase.from("revenue_loss_analysis").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: fraudEvents = [] } = useQuery({
    queryKey: ["fraud-detection-events"],
    queryFn: async () => {
      const { data } = await supabase.from("fraud_detection_events").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.functions.invoke("revenue-loss-engine", { body: { action: "detect_losses" } });
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Revenue scan complete", description: `Detected ${data?.detected || 0} loss events. Total: ₦${(data?.total_loss || 0).toLocaleString()}` });
      queryClient.invalidateQueries({ queryKey: ["revenue-loss-events"] });
    },
    onError: (e) => toast({ title: "Scan failed", description: e.message, variant: "destructive" }),
  });

  const totalLoss = losses.reduce((s: number, l: any) => s + (l.estimated_loss_amount || 0), 0);
  const unresolvedCount = losses.filter((l: any) => !l.resolved_at).length;
  const criticalCount = losses.filter((l: any) => l.severity === "critical").length;
  const fraudTotal = fraudEvents.reduce((s: number, f: any) => s + (f.financial_impact || 0), 0);

  return (
    <DashboardLayout title="Revenue Protection AI">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Revenue Protection AI</h1>
            <p className="text-muted-foreground">Revenue leakage detection, fraud monitoring, and loss prevention</p>
          </div>
          <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Detection
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">₦{(totalLoss / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Loss Detected</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold">{unresolvedCount}</p>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical Losses</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-orange-400 mb-1" />
            <p className="text-2xl font-bold text-orange-400">₦{(fraudTotal / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Fraud Impact</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="losses">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="losses">Revenue Losses</TabsTrigger>
            <TabsTrigger value="fraud">Fraud Alerts</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="losses" className="space-y-2 mt-4">
            {losses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No revenue losses detected. Run detection to scan for leakage.</CardContent></Card>
            ) : losses.map((l: any) => {
              const Icon = lossTypeIcons[l.loss_type] || AlertTriangle;
              return (
                <Card key={l.id}>
                  <CardContent className="py-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{l.loss_type?.replace(/_/g, " ")}</p>
                            <Badge className={severityColors[l.severity] || ""}>{l.severity}</Badge>
                          </div>
                          <p className="text-sm mt-1">{l.description}</p>
                          {l.recommended_action && <p className="text-xs text-primary mt-1">→ {l.recommended_action}</p>}
                        </div>
                      </div>
                      <p className="font-bold text-red-400 shrink-0">₦{(l.estimated_loss_amount || 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="fraud" className="space-y-2 mt-4">
            {fraudEvents.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No fraud events detected.</CardContent></Card>
            ) : fraudEvents.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{f.fraud_type?.replace(/_/g, " ")}</p>
                        <Badge className={severityColors[f.severity] || ""}>{f.severity}</Badge>
                        <Badge variant="outline">{f.status}</Badge>
                      </div>
                      <p className="text-sm mt-1">{f.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Confidence: {f.confidence_score}%</p>
                    </div>
                    <p className="font-bold text-orange-400 shrink-0">₦{(f.financial_impact || 0).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-3 mt-4">
            {analyses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No analysis reports yet.</CardContent></Card>
            ) : analyses.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <p className="font-medium">{a.analysis_period}: {a.period_start} → {a.period_end}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>Idle: ₦{(a.idle_loss || 0).toLocaleString()}</div>
                    <div>Fuel: ₦{(a.fuel_loss || 0).toLocaleString()}</div>
                    <div>Delay: ₦{(a.delay_loss || 0).toLocaleString()}</div>
                  </div>
                  <p className="font-bold mt-2">Total: ₦{(a.total_loss_amount || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
