import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Cpu, Truck, Package, Shield, AlertTriangle, Wrench, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

const decisionColors: Record<string, string> = {
  auto_approved: "bg-emerald-500/20 text-emerald-400",
  pending_approval: "bg-amber-500/20 text-amber-400",
  blocked: "bg-red-500/20 text-red-400",
  override_requested: "bg-purple-500/20 text-purple-400",
};

const urgencyColors: Record<string, string> = {
  emergency: "bg-red-500/20 text-red-400",
  urgent: "bg-orange-500/20 text-orange-400",
  routine: "bg-blue-500/20 text-blue-400",
  predictive: "bg-purple-500/20 text-purple-400",
};

export default function AutonomousFleetCommand() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: decisions = [] } = useQuery({
    queryKey: ["auto-dispatch-decisions"],
    queryFn: async () => {
      const { data } = await supabase.from("auto_dispatch_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: partsOrders = [] } = useQuery({
    queryKey: ["parts-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("parts_orders").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: partsInventory = [] } = useQuery({
    queryKey: ["parts-inventory"],
    queryFn: async () => {
      const { data } = await supabase.from("parts_inventory").select("*").order("part_name");
      return data || [];
    },
  });

  const { data: claimsPredictions = [] } = useQuery({
    queryKey: ["insurance-claims-predictions"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_claims_predictions").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const partsScanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.functions.invoke("autonomous-fleet-controller", { body: { action: "predict_parts" } });
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Parts prediction complete", description: `${data?.ordersCreated || 0} predictive orders generated` });
      queryClient.invalidateQueries({ queryKey: ["parts-orders"] });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const fraudScanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.functions.invoke("autonomous-fleet-controller", { body: { action: "detect_fraud" } });
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Fraud scan complete", description: `${data?.detected || 0} signals detected` });
      queryClient.invalidateQueries({ queryKey: ["fraud-detection-events"] });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const autoApproved = decisions.filter((d: any) => d.decision === "auto_approved").length;
  const blocked = decisions.filter((d: any) => d.decision === "blocked").length;
  const pendingParts = partsOrders.filter((p: any) => p.order_status === "pending").length;
  const emergencyParts = partsOrders.filter((p: any) => p.urgency === "emergency").length;

  return (
    <DashboardLayout title="Autonomous Fleet Command">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Cpu className="h-6 w-6 text-primary" /> Autonomous Fleet Command</h1>
            <p className="text-muted-foreground">Self-dispatching system, predictive parts ordering, fraud detection</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => partsScanMutation.mutate()} disabled={partsScanMutation.isPending} size="sm">
              {partsScanMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
              Predict Parts
            </Button>
            <Button variant="outline" onClick={() => fraudScanMutation.mutate()} disabled={fraudScanMutation.isPending} size="sm">
              {fraudScanMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
              Fraud Scan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold">{autoApproved}</p>
            <p className="text-xs text-muted-foreground">Auto-Approved</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{blocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Wrench className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold">{pendingParts}</p>
            <p className="text-xs text-muted-foreground">Pending Parts</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{emergencyParts}</p>
            <p className="text-xs text-muted-foreground">Emergency Orders</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="dispatch">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="dispatch">Dispatch AI</TabsTrigger>
            <TabsTrigger value="parts">Parts Orders</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="claims">Claims AI</TabsTrigger>
          </TabsList>

          <TabsContent value="dispatch" className="space-y-2 mt-4">
            {decisions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No autonomous dispatch decisions yet. The system evaluates dispatch requests automatically.</CardContent></Card>
            ) : decisions.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={decisionColors[d.decision] || ""}>{d.decision?.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-1">{d.reason}</p>
                      {d.route_description && <p className="text-xs text-muted-foreground mt-0.5">Route: {d.route_description}</p>}
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <p>Driver: {Math.round(d.driver_score || 0)}</p>
                      <p>Vehicle: {Math.round(d.vehicle_health_score || 0)}</p>
                      <p className="font-bold">Composite: {Math.round(d.composite_score || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="parts" className="space-y-2 mt-4">
            {partsOrders.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No parts orders yet. Click "Predict Parts" to generate AI-based orders.</CardContent></Card>
            ) : partsOrders.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{p.part_name}</p>
                      <Badge className={urgencyColors[p.urgency] || ""}>{p.urgency}</Badge>
                      <Badge variant="outline">{p.order_status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.part_category} • Qty: {p.quantity} • Need by: {p.predicted_need_date} • {p.triggered_by}
                    </p>
                  </div>
                  <p className="font-bold shrink-0">₦{(p.estimated_cost || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-2 mt-4">
            {partsInventory.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No parts inventory configured.</CardContent></Card>
            ) : partsInventory.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{p.part_name}</p>
                    <p className="text-xs text-muted-foreground">{p.part_category} • {p.warehouse_location}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className={p.quantity_in_stock <= p.reorder_level ? "text-red-400 font-bold" : ""}>
                      Stock: {p.quantity_in_stock} (min: {p.reorder_level})
                    </p>
                    <p>₦{(p.unit_cost || 0).toLocaleString()}/unit</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="claims" className="space-y-2 mt-4">
            {claimsPredictions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No claims predictions generated yet.</CardContent></Card>
            ) : claimsPredictions.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{c.entity_type} claim prediction</p>
                    <p className="text-xs text-muted-foreground">
                      Probability: {(c.claim_probability * 100).toFixed(1)}% • Horizon: {c.time_horizon_days} days
                    </p>
                    {c.recommendation && <p className="text-xs text-primary mt-0.5">→ {c.recommendation}</p>}
                  </div>
                  <p className="font-bold text-orange-400 shrink-0">₦{(c.predicted_claim_amount || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
