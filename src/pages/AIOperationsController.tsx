import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, TrendingDown, DollarSign, RefreshCw, Settings,
  Activity, Brain, Clock, AlertTriangle, Truck, Loader2
} from "lucide-react";
import { toast } from "sonner";

interface LiveData {
  organization_id: string;
  generated_at: string;
  kpis: Record<string, number>;
  predictions: Array<{
    metric: string;
    value: number;
    trend: string;
    recommendation: string;
    priority: string;
  }>;
  recent_breakdowns: any[];
  recent_sla_breaches: any[];
}

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export default function AIOperationsController() {
  const { tenantMode, organizationId } = useAuth();
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [automationMode, setAutomationMode] = useState(false);
  const [aiSensitivity, setAiSensitivity] = useState([70]);

  // Keys that must never reach the UI for Logistics Department tenants.
  const FINANCIAL_KEYS = [
    "total_revenue",
    "overdue_amount",
    "revenue_recovered",
    "cost_savings",
  ] as const;
  const FINANCIAL_PREDICTIONS = new Set(["Revenue at Risk", "Overdue AR"]);

  const fetchLive = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("ai-operations-live");
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      let payload = res as LiveData;
      // UI guard: defensively strip any financial fields if tenant is LD,
      // even if the backend mistakenly included them.
      if (tenantMode === "LOGISTICS_DEPARTMENT" && payload?.kpis) {
        const sanitized = { ...payload.kpis };
        for (const k of FINANCIAL_KEYS) delete sanitized[k];
        payload = {
          ...payload,
          kpis: sanitized,
          predictions: (payload.predictions || []).filter(
            (p) => !FINANCIAL_PREDICTIONS.has(p.metric),
          ),
        };
      }
      setData(payload);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load live AI data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLive(); /* eslint-disable-next-line */ }, [organizationId]);

  const subtitle = tenantMode === "LOGISTICS_DEPARTMENT"
    ? "Live operational intelligence - scoped to your Logistics Department"
    : "Live operational intelligence - scoped to your organization";

  return (
    <DashboardLayout title="AI Autonomous Operations Controller" subtitle={subtitle}>
      {/* Mode banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border mb-6 ${automationMode ? "bg-primary/10 border-primary" : "bg-muted border-border"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${automationMode ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
          <div>
            <p className="font-bold">{automationMode ? "🤖 Automation Mode ACTIVE" : "🧠 Advisory Mode"}</p>
            <p className="text-xs text-muted-foreground">
              {automationMode
                ? "AI will execute decisions automatically on this tenant's data."
                : "AI is recommending actions on your live data. You approve each decision."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={fetchLive} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <span className="text-sm font-medium">{automationMode ? "Disable Auto" : "Enable Auto"}</span>
          <Switch checked={automationMode} onCheckedChange={setAutomationMode} />
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <>
          {/* KPI Strip - LIVE */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "AI Interventions (24h)", value: String(data.kpis.interventions_today ?? 0), icon: Brain, color: "text-primary" },
              ...(tenantMode === "LOGISTICS_DEPARTMENT" ? [
                { label: "Dispatches (7d)", value: String(data.kpis.dispatches_7d ?? data.kpis.total_dispatches ?? 0), icon: Truck, color: "text-green-500" },
                { label: "SLA Breaches (7d)", value: String(data.kpis.sla_breaches_7d ?? (data.recent_sla_breaches?.length ?? 0)), icon: AlertTriangle, color: "text-orange-500" },
              ] : [
                { label: "Total Revenue (7d)", value: NGN(data.kpis.total_revenue ?? 0), icon: TrendingUp, color: "text-green-500" },
                { label: "Overdue AR", value: NGN(data.kpis.overdue_amount ?? 0), icon: DollarSign, color: "text-orange-500" },
              ]),
              { label: "Pending Dispatches", value: String(data.kpis.pending_approvals ?? 0), icon: Clock, color: "text-yellow-500" },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><k.icon className={`w-5 h-5 ${k.color}`} /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                    <p className="text-lg font-bold truncate">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Operational KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "OTD Rate", value: `${data.kpis.otd_rate ?? 0}%`, icon: Activity },
              { label: "Fleet Utilisation", value: `${data.kpis.fleet_utilisation ?? 0}%`, icon: Truck },
              { label: "Active Vehicles", value: `${data.kpis.active_vehicles ?? 0} / ${data.kpis.total_vehicles ?? 0}`, icon: Truck },
              { label: "Drivers", value: String(data.kpis.total_drivers ?? 0), icon: Activity },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-3 flex items-center gap-3">
                  <k.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="text-sm font-bold">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="predictions">
            <TabsList className="flex-wrap h-auto gap-1 mb-4">
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="alerts">Live Alerts</TabsTrigger>
              <TabsTrigger value="config">AI Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="predictions">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.predictions.map((p) => (
                  <Card key={p.metric} className={`border-l-4 ${
                    p.priority === "critical" ? "border-l-destructive" :
                    p.priority === "high" ? "border-l-orange-500" :
                    p.priority === "medium" ? "border-l-yellow-500" : "border-l-green-500"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-sm">{p.metric}</p>
                        <div className="flex items-center gap-2">
                          {p.trend === "up"
                            ? <TrendingUp className="w-4 h-4 text-destructive" />
                            : <TrendingDown className="w-4 h-4 text-green-500" />}
                          <Badge className={
                            p.priority === "critical" ? "bg-destructive/20 text-destructive" :
                            p.priority === "high" ? "bg-orange-500/20 text-orange-700" :
                            p.priority === "medium" ? "bg-yellow-500/20 text-yellow-700" :
                            "bg-green-500/20 text-green-700"
                          }>{p.priority}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Risk Score</span>
                          <span className="font-bold">{p.value}%</span>
                        </div>
                        <Progress value={p.value} className="h-2" />
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium flex items-center gap-1 mb-1">
                          <Brain className="w-3 h-3" />AI Recommendation
                        </p>
                        <p className="text-xs text-muted-foreground">{p.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alerts">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Recent SLA Breaches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.recent_sla_breaches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent breaches.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.recent_sla_breaches.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded border">
                            <span>Dispatch {String(b.dispatch_id).slice(0, 8)}…</span>
                            <Badge variant="outline">{b.severity ?? "alert"}</Badge>
                            <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4 text-destructive" />
                      Recent Breakdowns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.recent_breakdowns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent breakdowns.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.recent_breakdowns.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded border">
                            <span>{b.alert_type ?? "Breakdown"}</span>
                            <Badge variant="outline">{b.severity ?? "-"}</Badge>
                            <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />AI Sensitivity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Detection Sensitivity</label>
                    <span className="text-sm font-bold">{aiSensitivity[0]}%</span>
                  </div>
                  <Slider value={aiSensitivity} onValueChange={setAiSensitivity} min={10} max={100} step={5} />
                  <p className="text-xs text-muted-foreground">
                    Higher = more alerts. Live data scope: organization {data.organization_id.slice(0, 8)}… ·
                    last refreshed {new Date(data.generated_at).toLocaleTimeString()}.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}
