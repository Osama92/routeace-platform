import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Target, Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Snapshot {
  id: string;
  metric_key: string;
  actual_value: number;
  target_value: number;
  performance_pct: number;
  status: "green" | "yellow" | "red" | "on_track";
  period_start: string;
  period_end: string;
}

interface Definition {
  metric_key: string;
  label: string;
  description: string | null;
  unit: string;
  source_module: string;
}

interface RecoSignals {
  metric_label?: string;
  metric_key?: string;
  source_module?: string;
  unit?: string;
  period_start?: string;
  period_end?: string;
  actual_value?: number;
  target_value?: number;
  performance_pct?: number;
  gap_pct?: number;
  status?: string;
  reason?: string;
}

interface Recommendation {
  id: string;
  metric_key: string;
  severity: "critical" | "moderate" | "strong";
  performance_pct: number;
  recommendation: string;
  status: "pending" | "adopted" | "dismissed" | "improved" | "expired";
  created_at: string;
  signals?: RecoSignals | null;
}

const STATUS_COLOR: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-500/10 text-amber-700 border-amber-200",
  red: "bg-red-500/10 text-red-700 border-red-200",
  on_track: "bg-muted text-muted-foreground",
};

const SEV_COLOR: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-200",
  moderate: "bg-amber-500/10 text-amber-700 border-amber-200",
  strong: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export default function MyKPI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [defs, setDefs] = useState<Record<string, Definition>>({});
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coaching, setCoaching] = useState(false);

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    const [snapsRes, defsRes, recosRes] = await Promise.all([
      supabase
        .from("kpi_snapshots")
        .select("*")
        .eq("user_id", user!.id)
        .order("period_start", { ascending: false })
        .limit(100),
      supabase.from("kpi_definitions").select("metric_key,label,description,unit,source_module"),
      supabase
        .from("kpi_recommendations")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["pending", "adopted"])
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setSnapshots((snapsRes.data ?? []) as Snapshot[]);
    const map: Record<string, Definition> = {};
    (defsRes.data ?? []).forEach((d: any) => (map[d.metric_key] = d));
    setDefs(map);
    setRecos((recosRes.data ?? []) as Recommendation[]);
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    const { data, error } = await supabase.rpc("refresh_my_kpis");
    setRefreshing(false);
    if (error) {
      toast({ title: "Couldn't refresh KPIs", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { kpis_computed?: number; error?: string } | null;
    if (result?.error) {
      toast({ title: "Cannot compute KPIs", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "KPIs refreshed", description: `${result?.kpis_computed ?? 0} metric(s) updated.` });
    void load();
  }

  async function generateCoaching() {
    setCoaching(true);
    const { data, error } = await supabase.rpc("generate_recommendations", { p_user_id: user!.id });
    setCoaching(false);
    if (error) {
      toast({ title: "Coach unavailable", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { recommendations_created?: number } | null;
    toast({ title: "Coach updated", description: `${r?.recommendations_created ?? 0} action(s) for you.` });
    void load();
  }

  async function adopt(id: string) {
    const { error } = await supabase.rpc("adopt_recommendation", { p_id: id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setRecos((prev) => prev.map((r) => (r.id === id ? { ...r, status: "adopted" } : r)));
  }
  async function dismiss(id: string) {
    const { error } = await supabase.rpc("dismiss_recommendation", { p_id: id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setRecos((prev) => prev.filter((r) => r.id !== id));
  }

  // Latest snapshot per metric_key
  const latestByMetric = new Map<string, Snapshot>();
  for (const s of snapshots) {
    if (!latestByMetric.has(s.metric_key)) latestByMetric.set(s.metric_key, s);
  }
  const latest = Array.from(latestByMetric.values());

  const topActions = recos.filter((r) => r.status === "pending").slice(0, 3);

  return (
    <DashboardLayout title="My KPIs" subtitle="System-tracked performance for your role. No manual entries.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            KPIs are auto-computed from system data (dispatches, support, finance, fleet).
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateCoaching} disabled={coaching}>
              {coaching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Get coaching
            </Button>
            <Button onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh now
            </Button>
          </div>
        </div>

        {/* AI COACH PANEL */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What to do next - AI Coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {recos.length === 0
                  ? 'No coaching yet. Click "Get coaching" to generate role-specific actions from your latest KPIs.'
                  : "You're caught up - no pending actions right now."}
              </p>
            ) : (
              <ol className="space-y-3">
                {topActions.map((r, i) => {
                  const def = defs[r.metric_key];
                  return (
                    <li key={r.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="font-bold text-primary text-lg leading-none mt-0.5">{i + 1}.</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {def?.label ?? r.metric_key}
                          </span>
                          <Badge variant="outline" className={SEV_COLOR[r.severity]}>
                            {r.severity} · {r.performance_pct}%
                          </Badge>
                        </div>
                        <p className="text-sm">{r.recommendation}</p>
                        {r.signals && (r.signals.target_value !== undefined || r.signals.actual_value !== undefined) && (
                          <details className="mt-2 group">
                            <summary className="text-xs text-primary cursor-pointer select-none hover:underline">
                              Why this action?
                            </summary>
                            <div className="mt-2 p-2 rounded-md bg-muted/50 text-xs space-y-1">
                              <div className="text-muted-foreground italic">
                                {r.signals.reason}
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                                <div><span className="text-muted-foreground">Metric:</span> <strong>{r.signals.metric_label ?? r.signals.metric_key}</strong></div>
                                <div><span className="text-muted-foreground">Source:</span> <strong>{r.signals.source_module}</strong></div>
                                <div><span className="text-muted-foreground">Actual:</span> <strong>{r.signals.actual_value}</strong></div>
                                <div><span className="text-muted-foreground">Target:</span> <strong>{r.signals.target_value}</strong></div>
                                <div><span className="text-muted-foreground">Performance:</span> <strong>{r.signals.performance_pct}%</strong></div>
                                <div><span className="text-muted-foreground">Gap:</span> <strong>{r.signals.gap_pct}%</strong></div>
                                <div className="col-span-2"><span className="text-muted-foreground">Period:</span> <strong>{r.signals.period_start} → {r.signals.period_end}</strong></div>
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => adopt(r.id)} title="Mark adopted">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => dismiss(r.id)} title="Dismiss">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : latest.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>No KPIs computed yet for your role.</p>
                <p>Click <strong>Refresh now</strong> to generate the latest snapshot from system data.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {latest.map((s) => {
                  const def = defs[s.metric_key];
                  const pct = Math.min(100, Math.round(s.performance_pct));
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between items-start text-sm mb-1.5">
                        <div>
                          <div className="font-medium">{def?.label ?? s.metric_key}</div>
                          {def?.description && (
                            <div className="text-xs text-muted-foreground">{def.description}</div>
                          )}
                        </div>
                        <Badge variant="outline" className={STATUS_COLOR[s.status] ?? ""}>
                          {s.performance_pct}%
                        </Badge>
                      </div>
                      <Progress value={pct} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Actual: <strong>{s.actual_value}</strong></span>
                        <span>Target: {s.target_value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent snapshots</CardTitle></CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <div className="divide-y">
                {snapshots.slice(0, 30).map((s) => {
                  const def = defs[s.metric_key];
                  return (
                    <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{def?.label ?? s.metric_key}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.period_start} → {s.period_end}
                        </div>
                      </div>
                      <Badge variant="outline" className={STATUS_COLOR[s.status] ?? ""}>
                        {s.performance_pct}%
                      </Badge>
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
