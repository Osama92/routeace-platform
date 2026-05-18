import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Wrench, TrendingUp, Activity, RefreshCw } from "lucide-react";

interface Prediction {
  id: string;
  vehicle_id: string;
  component: string;
  confidence_score: number;
  failure_probability: number;
  urgency: string;
  risk_factors: any;
  recommended_action: string;
  predicted_failure_date: string;
  created_at: string;
}

const URGENCY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export default function PredictiveMaintenance() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maintenance_predictions")
      .select("*")
      .is("resolved_at", null)
      .order("confidence_score", { ascending: false })
      .limit(50);
    if (error) toast.error("Failed to load predictions");
    else setPredictions(data as any);
    setLoading(false);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("predictive-maintenance-engine", {
        body: {},
        headers: {},
        method: "POST",
      } as any);
      if (error) throw error;
      toast.success(`Scan complete - ${data?.predictions?.length || 0} predictions generated`);
      await load();
    } catch (e: any) {
      toast.error(`Scan failed: ${e.message}`);
    } finally {
      setScanning(false);
    }
  };

  const schedule = async (p: Prediction) => {
    try {
      const { error } = await supabase.from("maintenance_schedules").insert({
        vehicle_id: p.vehicle_id,
        prediction_id: p.id,
        service_type: `Service ${p.component}`,
        component_type: p.component,
        scheduled_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        priority: p.urgency === "critical" ? "immediate" : "high",
        blocks_dispatch: p.urgency === "critical",
      });
      if (error) throw error;
      toast.success("Maintenance scheduled");
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const critical = predictions.filter((p) => p.urgency === "critical").length;
  const high = predictions.filter((p) => p.urgency === "high").length;

  return (
    <DashboardLayout title="Predictive Maintenance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Predictive Maintenance</h1>
            <p className="text-muted-foreground">AI-forecasted failures before they happen - no hardware required</p>
          </div>
          <Button onClick={runScan} disabled={scanning} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Run AI Scan"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{high}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{predictions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {predictions.length > 0
                  ? Math.round(predictions.reduce((s, p) => s + p.confidence_score, 0) / predictions.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Failure Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : predictions.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No active predictions. Run a scan to analyze fleet.</p>
                <Button onClick={runScan} variant="outline">Run First Scan</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.map((p) => {
                  const reasoning = p.risk_factors?.reasoning || [];
                  const issue = p.risk_factors?.predicted_issue || `${p.component} risk`;
                  return (
                    <div key={p.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={URGENCY_VARIANT[p.urgency] || "default"}>{p.urgency.toUpperCase()}</Badge>
                            <span className="font-semibold">{issue}</span>
                            <span className="text-sm text-muted-foreground">• {p.confidence_score}% confidence</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Vehicle: <span className="font-mono">{p.vehicle_id.slice(0, 8)}…</span></p>
                          {reasoning.length > 0 && (
                            <ul className="text-sm space-y-1 mb-2">
                              {reasoning.map((r: string, i: number) => (
                                <li key={i} className="text-foreground/80">→ {r}</li>
                              ))}
                            </ul>
                          )}
                          <p className="text-sm font-medium text-primary">{p.recommended_action}</p>
                        </div>
                        <Button size="sm" onClick={() => schedule(p)}>Schedule Service</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
