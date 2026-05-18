import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wrench,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Ban,
  Gauge,
} from "lucide-react";

type WorkshopOrder = {
  id: string;
  vehicle_plate: string | null;
  order_type: string | null;
  priority: string | null;
  status: string | null;
  workshop_state: string;
  description: string | null;
  failure_type: string | null;
  assigned_technician: string | null;
  started_at: string | null;
  sla_due_at: string | null;
  sla_breached_at: string | null;
  total_cost: number | null;
  created_at: string;
};

type Prediction = {
  id: string;
  vehicle_id: string;
  component: string;
  failure_probability: number;
  confidence_score: number;
  urgency: string;
  recommended_action: string | null;
  predicted_failure_date: string | null;
  auto_blocked: boolean | null;
  created_at: string;
};

type Decision = {
  id: string;
  vehicle_id: string;
  decision_type: string;
  confidence_score: number;
  reasoning: string | null;
  recommended_action: string | null;
  approval_status: string;
  rejected_reason: string | null;
  created_at: string;
};

type Grounding = {
  id: string;
  vehicle_id: string;
  is_active: boolean;
  ground_reason: string;
  severity: string;
  grounded_at: string;
  released_at: string | null;
};

type InjectorRow = {
  vehicle_id: string;
  component_type: string;
  is_injector_critical: boolean;
  last_injector_service_date: string | null;
  injector_inefficiency_factor: number;
  health_score: number | null;
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "-");

const urgencyTone: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const stateTone: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  in_repair: "bg-primary/10 text-primary border-primary/30",
  awaiting_parts: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  awaiting_qc: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground",
};

export default function MaintenanceIntelligence() {
  const [tab, setTab] = useState<"queue" | "predict" | "decisions" | "grounding" | "injectors">("decisions");

  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [groundings, setGroundings] = useState<Grounding[]>([]);
  const [injectors, setInjectors] = useState<InjectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: o }, { data: p }, { data: d }, { data: g }, { data: inj }] = await Promise.all([
      supabase
        .from("fleet_maintenance_orders")
        .select(
          "id, vehicle_plate, order_type, priority, status, workshop_state, description, failure_type, assigned_technician, started_at, sla_due_at, sla_breached_at, total_cost, created_at",
        )
        .neq("workshop_state", "completed")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("maintenance_predictions")
        .select(
          "id, vehicle_id, component, failure_probability, confidence_score, urgency, recommended_action, predicted_failure_date, auto_blocked, created_at",
        )
        .is("resolved_at", null)
        .order("failure_probability", { ascending: false })
        .limit(50),
      supabase
        .from("maintenance_decisions")
        .select("id, vehicle_id, decision_type, confidence_score, reasoning, recommended_action, approval_status, rejected_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("vehicle_grounding")
        .select("id, vehicle_id, is_active, ground_reason, severity, grounded_at, released_at")
        .order("grounded_at", { ascending: false })
        .limit(50),
      supabase
        .from("vehicle_health_components")
        .select("vehicle_id, component_type, is_injector_critical, last_injector_service_date, injector_inefficiency_factor, health_score")
        .or("component_type.ilike.%injector%,is_injector_critical.eq.true")
        .order("injector_inefficiency_factor", { ascending: false })
        .limit(50),
    ]);
    setOrders((o || []) as WorkshopOrder[]);
    setPredictions((p || []) as Prediction[]);
    setDecisions((d || []) as Decision[]);
    setGroundings((g || []) as Grounding[]);
    setInjectors((inj || []) as InjectorRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Predictive engine: derives decisions from current predictions + injector signals.
  // If no predictions are loaded yet, first invokes the backend engine to generate
  // them from inspections / maintenance history / dispatch patterns, then proposes
  // approval-gated decisions from whatever comes back.
  const proposeDecisionsFromPredictions = useCallback(async () => {
    setBusy(true);
    try {
      // Step 1 - if we have no predictions cached, run the backend engine first.
      let workingPredictions = predictions;
      if (workingPredictions.length === 0) {
        const { data: engineRes, error: engineErr } = await supabase.functions.invoke(
          "predictive-maintenance-engine",
          { body: {}, method: "POST" as any },
        );
        if (engineErr) {
          toast.error(`Predictive engine failed: ${engineErr.message}`);
          setBusy(false);
          return;
        }
        const analyzed = (engineRes as any)?.vehicles_analyzed ?? 0;
        const saved = (engineRes as any)?.saved ?? 0;
        if (analyzed === 0) {
          toast.info("No vehicles found yet — add vehicles and inspections to enable predictions.");
          setBusy(false);
          return;
        }
        if (saved === 0) {
          toast.info(`Engine ran across ${analyzed} vehicle${analyzed === 1 ? "" : "s"} — no failure signals detected. Fleet looks healthy.`);
          setBusy(false);
          return;
        }
        // Reload so the proposal step sees the freshly generated predictions.
        const { data: p } = await supabase
          .from("maintenance_predictions")
          .select("*")
          .is("resolved_at", null)
          .order("confidence_score", { ascending: false })
          .limit(50);
        workingPredictions = (p || []) as Prediction[];
        setPredictions(workingPredictions);
      }

      // Step 2 - derive decision proposals from the working prediction set.
      const injectorByVehicle = new Map<string, InjectorRow>();
      for (const i of injectors) injectorByVehicle.set(i.vehicle_id, i);

      const proposals: Array<{
        vehicle_id: string;
        decision_type: string;
        confidence_score: number;
        reasoning: string;
        recommended_action: string;
        related_prediction_id: string;
      }> = [];

      for (const p of workingPredictions) {
        const inj = injectorByVehicle.get(p.vehicle_id);
        let injBoost = 0;
        let injNote = "";
        if (inj?.last_injector_service_date) {
          const months =
            (Date.now() - new Date(inj.last_injector_service_date).getTime()) /
            (1000 * 60 * 60 * 24 * 30);
          if (months > 6) {
            injBoost = Math.min(20, Math.round((months - 6) * 3));
            injNote = ` Injector last serviced ${months.toFixed(1)} months ago - +${injBoost}% inefficiency weight.`;
          } else {
            injNote = " Injector marked healthy (≤ 6 months since service).";
          }
        }
        const adjustedProb = Math.min(100, (p.failure_probability || 0) + injBoost);

        let decisionType = "inspect";
        let action = "Schedule inspection within 7 days";
        if (adjustedProb >= 85) {
          decisionType = "ground";
          action = "Ground vehicle immediately and dispatch technician";
        } else if (adjustedProb >= 65) {
          decisionType = "schedule_repair";
          action = "Schedule repair during next idle window";
        } else if (adjustedProb >= 45) {
          decisionType = "order_parts";
          action = "Pre-order parts for upcoming service";
        }

        proposals.push({
          vehicle_id: p.vehicle_id,
          decision_type: decisionType,
          confidence_score: Math.min(100, p.confidence_score + Math.round(injBoost / 2)),
          reasoning: `Failure probability ${p.failure_probability}% on ${p.component}.${injNote}`,
          recommended_action: action,
          related_prediction_id: p.id,
        });
      }

      // Skip vehicles that already have a pending decision of the same type.
      const pending = new Set(
        decisions.filter((d) => d.approval_status === "pending_approval").map((d) => d.vehicle_id + ":" + d.decision_type),
      );
      const fresh = proposals.filter((x) => !pending.has(x.vehicle_id + ":" + x.decision_type));

      if (fresh.length === 0) {
        toast.info("All current predictions already have pending decisions awaiting approval.");
        setBusy(false);
        return;
      }

      const { error } = await supabase.from("maintenance_decisions").insert(fresh);
      if (error) throw error;
      toast.success(`Proposed ${fresh.length} maintenance decision${fresh.length === 1 ? "" : "s"} for approval`);
      setTab("decisions");
      await load();
    } catch (e: any) {
      toast.error(`Failed to propose decisions: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, [predictions, injectors, decisions, load]);

  const dispatchAlert = useCallback(
    async (kind: string, subject: string, message: string, entityId?: string) => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const me = userRes?.user;
        if (!me) return;
        await supabase.functions.invoke("maintenance-alert-dispatch", {
          body: {
            alert_kind: kind,
            subject,
            message,
            related_entity_type: "maintenance_decision",
            related_entity_id: entityId,
            recipients: [
              {
                user_id: me.id,
                email: me.email,
                channels: ["email", "in_app"],
              },
            ],
          },
        });
      } catch {
        // alert failures should not block workflow
      }
    },
    [],
  );

  const approve = useCallback(
    async (d: Decision) => {
      setBusy(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;

      const { error } = await supabase
        .from("maintenance_decisions")
        .update({ approval_status: "approved", approved_by: uid, approved_at: new Date().toISOString(), executed_at: new Date().toISOString() })
        .eq("id", d.id);

      if (error) {
        toast.error(`Approval failed: ${error.message}`);
        setBusy(false);
        return;
      }

      // Side-effect: ground vehicle if decision is to ground
      if (d.decision_type === "ground") {
        await supabase.from("vehicle_grounding").insert({
          vehicle_id: d.vehicle_id,
          ground_reason: d.recommended_action || d.reasoning || "Approved AI grounding decision",
          severity: d.confidence_score >= 85 ? "critical" : "warning",
          grounded_by: uid,
          triggered_by_decision_id: d.id,
        });
      }
      // Auto-create work order if scheduling repair
      if (d.decision_type === "schedule_repair") {
        const slaDue = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
        await supabase.from("fleet_maintenance_orders").insert({
          vehicle_id: d.vehicle_id,
          vehicle_plate: d.vehicle_id.slice(0, 8).toUpperCase(),
          order_type: "scheduled_repair",
          priority: d.confidence_score >= 75 ? "high" : "medium",
          status: "open",
          workshop_state: "queued",
          description: d.recommended_action || "Auto-scheduled by AI",
          sla_due_at: slaDue,
          created_by: uid,
        });
      }

      await dispatchAlert(
        d.decision_type === "ground" ? "vehicle_grounded" : "maintenance_scheduled",
        `Maintenance decision approved: ${d.decision_type}`,
        `Vehicle ${d.vehicle_id.slice(0, 8)} - ${d.recommended_action || d.reasoning || ""}`,
        d.id,
      );

      toast.success("Decision approved and executed");
      await load();
      setBusy(false);
    },
    [dispatchAlert, load],
  );

  const reject = useCallback(
    async (d: Decision) => {
      const reason = (rejectReason[d.id] || "").trim();
      if (!reason) {
        toast.error("Provide a rejection reason");
        return;
      }
      setBusy(true);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_decisions")
        .update({
          approval_status: "rejected",
          approved_by: userRes?.user?.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        })
        .eq("id", d.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Decision rejected");
        await load();
      }
      setBusy(false);
    },
    [rejectReason, load],
  );

  const releaseGrounding = useCallback(
    async (g: Grounding) => {
      setBusy(true);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("vehicle_grounding")
        .update({
          is_active: false,
          released_at: new Date().toISOString(),
          released_by: userRes?.user?.id,
          release_notes: "Manually released by operator",
        })
        .eq("id", g.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Vehicle released for service");
        await load();
      }
      setBusy(false);
    },
    [load],
  );

  const stats = useMemo(() => {
    const pending = decisions.filter((d) => d.approval_status === "pending_approval").length;
    const grounded = groundings.filter((g) => g.is_active).length;
    const slaBreaches = orders.filter((o) => o.sla_due_at && new Date(o.sla_due_at) < new Date() && o.workshop_state !== "completed").length;
    const criticalPredictions = predictions.filter((p) => p.failure_probability >= 80).length;
    return { pending, grounded, slaBreaches, criticalPredictions };
  }, [decisions, groundings, orders, predictions]);

  return (
    <DashboardLayout title="Maintenance Intelligence">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="w-6 h-6 text-primary" /> Maintenance Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">
              Workshop queue · Predictive engine · Approval-gated AI decisions · Grounding control
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button size="sm" onClick={proposeDecisionsFromPredictions} disabled={busy} className="gap-1">
              <Activity className="w-3 h-3" /> Run predictive engine
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Pending approvals</CardDescription>
              <CardTitle className="text-2xl">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-destructive">Grounded vehicles</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.grounded}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-amber-600">SLA breaches in queue</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{stats.slaBreaches}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-primary">Critical predictions (≥80%)</CardDescription>
              <CardTitle className="text-2xl text-primary">{stats.criticalPredictions}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="decisions" className="gap-1">
              <ShieldAlert className="w-3 h-3" /> Decision queue
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-1">
              <Wrench className="w-3 h-3" /> Workshop queue
            </TabsTrigger>
            <TabsTrigger value="predict" className="gap-1">
              <Activity className="w-3 h-3" /> Predictions
            </TabsTrigger>
            <TabsTrigger value="grounding" className="gap-1">
              <Ban className="w-3 h-3" /> Grounded fleet
            </TabsTrigger>
            <TabsTrigger value="injectors" className="gap-1">
              <Gauge className="w-3 h-3" /> Injector watch
            </TabsTrigger>
          </TabsList>

          {/* DECISION QUEUE */}
          <TabsContent value="decisions" className="space-y-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approval-gated AI decisions</CardTitle>
                <CardDescription>
                  Every action requires an approver before execution. No autonomous side-effects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : decisions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No AI decisions yet. Click "Run predictive engine" to generate proposals from current predictions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {decisions.map((d) => (
                      <div key={d.id} className="border border-border/50 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {d.decision_type.replace("_", " ")}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                d.approval_status === "pending_approval"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : d.approval_status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {d.approval_status.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Confidence {d.confidence_score}% · vehicle {d.vehicle_id.slice(0, 8)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{fmtDate(d.created_at)}</span>
                        </div>
                        {d.reasoning && <div className="text-sm">{d.reasoning}</div>}
                        {d.recommended_action && (
                          <div className="text-xs text-muted-foreground">→ {d.recommended_action}</div>
                        )}
                        {d.rejected_reason && (
                          <div className="text-xs text-destructive">Rejected: {d.rejected_reason}</div>
                        )}
                        {d.approval_status === "pending_approval" && (
                          <div className="flex items-end gap-2 pt-1">
                            <Textarea
                              placeholder="Rejection reason (required if rejecting)"
                              className="min-h-[36px] text-xs"
                              value={rejectReason[d.id] || ""}
                              onChange={(e) => setRejectReason((s) => ({ ...s, [d.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="outline" onClick={() => reject(d)} disabled={busy} className="gap-1 shrink-0">
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                            <Button size="sm" onClick={() => approve(d)} disabled={busy} className="gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Approve & execute
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WORKSHOP QUEUE */}
          <TabsContent value="queue" className="space-y-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live workshop queue</CardTitle>
                <CardDescription>States: queued → in repair → awaiting parts → awaiting QC → completed</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : orders.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No open work orders.</div>
                ) : (
                  <div className="space-y-2">
                    {orders.map((o) => {
                      const overdue = o.sla_due_at && new Date(o.sla_due_at) < new Date();
                      return (
                        <div
                          key={o.id}
                          className={`border rounded-md p-3 ${overdue ? "border-destructive/40 bg-destructive/5" : "border-border/50"}`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-sm truncate">{o.vehicle_plate || "-"}</span>
                              <Badge variant="outline" className={`text-[10px] ${stateTone[o.workshop_state] || ""}`}>
                                {o.workshop_state.replace("_", " ")}
                              </Badge>
                              {o.priority && (
                                <Badge variant="outline" className="text-[10px]">
                                  {o.priority}
                                </Badge>
                              )}
                              {overdue && (
                                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                  <Clock className="w-3 h-3 mr-1" /> SLA breached
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
                          </div>
                          {o.description && <div className="text-xs text-muted-foreground mt-1">{o.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREDICTIONS */}
          <TabsContent value="predict" className="space-y-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failure predictions</CardTitle>
                <CardDescription>Active predictions sorted by failure probability</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : predictions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No active predictions.</div>
                ) : (
                  <div className="space-y-2">
                    {predictions.map((p) => (
                      <div key={p.id} className="border border-border/50 rounded-md p-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{p.component}</span>
                            <Badge variant="outline" className={`text-[10px] ${urgencyTone[p.urgency] || ""}`}>
                              {p.urgency}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {p.failure_probability}% prob · vehicle {p.vehicle_id.slice(0, 8)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{fmtDate(p.predicted_failure_date)}</span>
                        </div>
                        {p.recommended_action && (
                          <div className="text-xs text-muted-foreground mt-1">→ {p.recommended_action}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GROUNDING */}
          <TabsContent value="grounding" className="space-y-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grounded fleet</CardTitle>
                <CardDescription>Vehicles blocked from dispatch - release requires explicit operator action</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : groundings.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No grounded vehicles.</div>
                ) : (
                  <div className="space-y-2">
                    {groundings.map((g) => (
                      <div
                        key={g.id}
                        className={`border rounded-md p-3 ${g.is_active ? "border-destructive/40 bg-destructive/5" : "border-border/50 opacity-70"}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Ban className="w-3 h-3 text-destructive" />
                            <span className="font-medium text-sm">vehicle {g.vehicle_id.slice(0, 8)}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {g.severity}
                            </Badge>
                            {!g.is_active && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                released
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{fmtDate(g.grounded_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{g.ground_reason}</div>
                        {g.is_active && (
                          <div className="pt-2">
                            <Button size="sm" variant="outline" onClick={() => releaseGrounding(g)} disabled={busy}>
                              Release for service
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INJECTORS */}
          <TabsContent value="injectors" className="space-y-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Injector watch</CardTitle>
                <CardDescription>
                  Injectors not serviced in &gt; 6 months increase failure probability and fuel inefficiency. ≤ 6 months = healthy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : injectors.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No injector data captured yet.</div>
                ) : (
                  <div className="space-y-2">
                    {injectors.map((i) => {
                      const months = i.last_injector_service_date
                        ? (Date.now() - new Date(i.last_injector_service_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
                        : null;
                      const stale = months !== null && months > 6;
                      return (
                        <div
                          key={i.vehicle_id + i.component_type}
                          className={`border rounded-md p-3 ${stale ? "border-amber-500/40 bg-amber-500/5" : "border-border/50"}`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Gauge className="w-3 h-3 text-primary" />
                              <span className="font-medium text-sm">vehicle {i.vehicle_id.slice(0, 8)}</span>
                              <Badge variant="outline" className="text-[10px]">{i.component_type}</Badge>
                              {stale ? (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> stale ({months!.toFixed(1)} mo)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                  healthy
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ineff factor {i.injector_inefficiency_factor.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last serviced: {fmtDate(i.last_injector_service_date)} · health {i.health_score ?? "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
