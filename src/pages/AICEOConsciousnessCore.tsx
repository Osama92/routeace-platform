// AI CEO Consciousness Core - read-only observatory.
// Aggregates signals from existing engines into a Unified Operational State (UOS).
// Does NOT execute decisions - orchestration runs through ACE / Autonomous Execution / AI Employees.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Brain, Activity, Truck, DollarSign, Shield, Users, Zap,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Eye,
  Network, Gauge, Radio, Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fmtN = (v: number | null | undefined) =>
  v == null ? "-" : v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₦${(v / 1e3).toFixed(0)}K` : `₦${Math.round(v).toLocaleString()}`;

const priorityClass = (p: string) =>
  p === "critical" ? "bg-destructive/15 text-destructive border-destructive/30"
  : p === "high" ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
  : p === "medium" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
  : "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";

interface UOSSnapshot {
  fleet: { total: number; active: number; healthScore: number };
  finance: { revenueMTD: number; outstandingAR: number; openInvoices: number };
  ops: { activeDispatches: number; deliveredToday: number; slaBreaches: number };
  risk: { highRiskDrivers: number; unsafeVehicles: number; openAlerts: number };
  workforce: { activeEmployees: number; tasksToday: number; pendingActions: number };
  decisions: { pending: number; approved24h: number; executed24h: number };
}

const useUOS = () =>
  useQuery({
    queryKey: ["ceo-core-uos"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<UOSSnapshot> => {
      const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        vehicles, dispatches, invoices, ar, riskScores,
        aiEmployees, aiActions, autonomousDecisions,
      ] = await Promise.all([
        supabase.from("vehicles").select("id,status,health_score", { count: "exact" }),
        supabase.from("dispatches").select("id,status,actual_delivery,sla_status,created_at"),
        supabase.from("invoices").select("total_amount,status,invoice_date").gte("invoice_date", monthStart.slice(0, 10)),
        supabase.from("accounts_receivable").select("balance,status"),
        supabase.from("accident_risk_scores").select("risk_level,driver_id").gte("created_at", since24),
        supabase.from("ai_employees").select("id,status,tasks_completed_today"),
        supabase.from("ai_employee_actions").select("id,status").gte("created_at", since24),
        supabase.from("autonomous_decisions").select("id,status,executed_at,approved_at").gte("created_at", since24),
      ]);

      const vList = vehicles.data ?? [];
      const fleetActive = vList.filter((v: any) => v.status === "active" || v.status === "in_use").length;
      const avgHealth = vList.length
        ? Math.round(vList.reduce((s: number, v: any) => s + (v.health_score ?? 80), 0) / vList.length)
        : 0;

      const dList = dispatches.data ?? [];
      const todayKey = new Date().toISOString().slice(0, 10);
      const deliveredToday = dList.filter(
        (d: any) => d.actual_delivery && d.actual_delivery.startsWith(todayKey)
      ).length;
      const activeDispatches = dList.filter((d: any) =>
        ["dispatched", "in_transit", "picked_up", "out_for_delivery"].includes(d.status)
      ).length;
      const slaBreaches = dList.filter((d: any) => d.sla_status === "breached").length;

      const iList = invoices.data ?? [];
      const revenueMTD = iList
        .filter((i: any) => i.status === "paid")
        .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
      const openInvoices = iList.filter((i: any) => ["pending", "overdue"].includes(i.status)).length;
      const outstandingAR = (ar.data ?? [])
        .filter((r: any) => r.status !== "paid")
        .reduce((s: number, r: any) => s + Number(r.balance ?? 0), 0);

      const rList = riskScores.data ?? [];
      const highRiskDriverSet = new Set(
        rList.filter((r: any) => r.risk_level === "high" || r.risk_level === "critical").map((r: any) => r.driver_id)
      );
      const unsafeVehicles = vList.filter((v: any) => (v.health_score ?? 100) < 60).length;

      const eList = aiEmployees.data ?? [];
      const aList = aiActions.data ?? [];
      const decList = autonomousDecisions.data ?? [];

      return {
        fleet: { total: vList.length, active: fleetActive, healthScore: avgHealth },
        finance: { revenueMTD, outstandingAR, openInvoices },
        ops: { activeDispatches, deliveredToday, slaBreaches },
        risk: {
          highRiskDrivers: highRiskDriverSet.size,
          unsafeVehicles,
          openAlerts: slaBreaches + unsafeVehicles + highRiskDriverSet.size,
        },
        workforce: {
          activeEmployees: eList.filter((e: any) => e.status === "active" || e.status === "running").length,
          tasksToday: eList.reduce((s: number, e: any) => s + (e.tasks_completed_today ?? 0), 0),
          pendingActions: aList.filter((a: any) => a.status === "pending_approval" || a.status === "pending").length,
        },
        decisions: {
          pending: decList.filter((d: any) => d.status === "pending" || d.status === "pending_approval").length,
          approved24h: decList.filter((d: any) => !!d.approved_at).length,
          executed24h: decList.filter((d: any) => !!d.executed_at).length,
        },
      };
    },
  });

const useDecisionFeed = () =>
  useQuery({
    queryKey: ["ceo-core-decision-feed"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("autonomous_decisions")
        .select("id,decision_type,impact_summary,status,confidence_score,created_at,trigger_source")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

const useAIWorkforce = () =>
  useQuery({
    queryKey: ["ceo-core-workforce"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id,display_name,role_key,status,current_task,confidence_score,tasks_completed_today,last_action_summary")
        .order("role_key");
      return data ?? [];
    },
  });

const classifyPriority = (uos?: UOSSnapshot) => {
  if (!uos) return [] as { level: string; label: string; detail: string }[];
  const events: { level: string; label: string; detail: string }[] = [];
  if (uos.risk.unsafeVehicles > 0)
    events.push({ level: "critical", label: "Unsafe vehicles in fleet", detail: `${uos.risk.unsafeVehicles} below health threshold` });
  if (uos.ops.slaBreaches > 0)
    events.push({ level: "critical", label: "SLA breaches", detail: `${uos.ops.slaBreaches} dispatches breached SLA` });
  if (uos.risk.highRiskDrivers > 0)
    events.push({ level: "high", label: "High-risk drivers active", detail: `${uos.risk.highRiskDrivers} drivers flagged` });
  if (uos.finance.outstandingAR > 1_000_000)
    events.push({ level: "high", label: "Outstanding AR elevated", detail: `${fmtN(uos.finance.outstandingAR)} unpaid` });
  if (uos.fleet.healthScore < 75)
    events.push({ level: "medium", label: "Fleet health declining", detail: `Avg health ${uos.fleet.healthScore}%` });
  if (uos.workforce.pendingActions > 0)
    events.push({ level: "medium", label: "AI actions awaiting approval", detail: `${uos.workforce.pendingActions} pending` });
  if (events.length === 0)
    events.push({ level: "low", label: "All systems nominal", detail: "No critical events detected" });
  return events;
};

export default function AICEOConsciousnessCore() {
  const { data: uos, isLoading: uosLoading } = useUOS();
  const { data: feed, isLoading: feedLoading } = useDecisionFeed();
  const { data: workforce, isLoading: wfLoading } = useAIWorkforce();
  const events = classifyPriority(uos);

  return (
    <DashboardLayout
      title="AI CEO Consciousness Core"
      subtitle="Read-only observatory aggregating signals across every operational engine"
    >
      <div className="space-y-6">
        {/* Banner */}
        <Alert className="border-primary/30 bg-primary/5">
          <Brain className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold">Consciousness Layer</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Observes Ops · Finance · Fuel · Risk · Workforce · Growth. Decisions are executed through{" "}
            <Link to="/ai-ceo" className="text-primary underline">ACE Strategic Brain</Link>,{" "}
            <Link to="/autonomous-execution" className="text-primary underline">Autonomous Execution</Link>, and{" "}
            <Link to="/ai-workforce" className="text-primary underline">AI Workforce</Link>.
          </AlertDescription>
        </Alert>

        {/* UOS scoreboard */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { icon: Truck, label: "Fleet active", value: uos ? `${uos.fleet.active}/${uos.fleet.total}` : "-", sub: uos ? `Health ${uos.fleet.healthScore}%` : "" },
            { icon: Activity, label: "Active dispatches", value: uos?.ops.activeDispatches ?? "-", sub: uos ? `${uos.ops.deliveredToday} delivered today` : "" },
            { icon: DollarSign, label: "Revenue MTD", value: uos ? fmtN(uos.finance.revenueMTD) : "-", sub: uos ? `${uos.finance.openInvoices} open invoices` : "" },
            { icon: Shield, label: "Open risk alerts", value: uos?.risk.openAlerts ?? "-", sub: uos ? `${uos.risk.highRiskDrivers} risky drivers` : "" },
            { icon: Users, label: "AI employees", value: uos?.workforce.activeEmployees ?? "-", sub: uos ? `${uos.workforce.tasksToday} tasks today` : "" },
            { icon: Zap, label: "Decisions 24h", value: uos?.decisions.executed24h ?? "-", sub: uos ? `${uos.decisions.pending} pending` : "" },
          ].map((m, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <m.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tracking-tight">{uosLoading ? "…" : m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                {m.sub && <p className="text-[11px] text-muted-foreground/80 mt-1">{m.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="priority" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="priority"><Target className="h-3.5 w-3.5 mr-1.5" />Priority</TabsTrigger>
            <TabsTrigger value="decisions"><Radio className="h-3.5 w-3.5 mr-1.5" />Decisions</TabsTrigger>
            <TabsTrigger value="workforce"><Network className="h-3.5 w-3.5 mr-1.5" />Workforce</TabsTrigger>
            <TabsTrigger value="brief"><Eye className="h-3.5 w-3.5 mr-1.5" />Daily brief</TabsTrigger>
          </TabsList>

          {/* Priority engine */}
          <TabsContent value="priority">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4" />
                  Event classification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/50">
                    <div className="flex items-center gap-3">
                      <Badge className={priorityClass(e.level)}>{e.level.toUpperCase()}</Badge>
                      <div>
                        <p className="text-sm font-medium">{e.label}</p>
                        <p className="text-xs text-muted-foreground">{e.detail}</p>
                      </div>
                    </div>
                    {e.level === "critical" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : e.level === "low" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decision feed */}
          <TabsContent value="decisions">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Recent autonomous decisions</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/autonomous-execution">Open executor</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {feedLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
                ) : (feed ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No decisions in the last 24h.</p>
                ) : (
                  <div className="space-y-2">
                    {feed!.map((d: any) => (
                      <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border border-border/60">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{d.decision_type}</Badge>
                            <span className="text-[11px] text-muted-foreground">via {d.trigger_source}</span>
                          </div>
                          <p className="text-sm">{d.impact_summary || "-"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-4">
                          <Badge variant={d.status === "executed" ? "default" : "secondary"} className="text-[10px]">
                            {d.status}
                          </Badge>
                          {d.confidence_score != null && (
                            <span className="text-[11px] text-muted-foreground">
                              {Math.round(Number(d.confidence_score) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workforce orchestration map */}
          <TabsContent value="workforce">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">AI workforce state</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/ai-workforce">Manage workforce</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {wfLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
                ) : (workforce ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No AI employees provisioned yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {workforce!.map((w: any) => (
                      <div key={w.id} className="p-3 rounded-lg border border-border/60">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold">{w.display_name}</p>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{w.role_key}</p>
                          </div>
                          <Badge variant={w.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {w.status}
                          </Badge>
                        </div>
                        {w.current_task && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{w.current_task}</p>
                        )}
                        {w.confidence_score != null && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Confidence</span>
                              <span>{Math.round(Number(w.confidence_score) * 100)}%</span>
                            </div>
                            <Progress value={Number(w.confidence_score) * 100} className="h-1.5" />
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {w.tasks_completed_today ?? 0} tasks today
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily brief preview */}
          <TabsContent value="brief">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  CEO daily brief - preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <section>
                  <h4 className="font-semibold mb-1">📊 Summary</h4>
                  <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                    <li>Revenue MTD: <span className="text-foreground">{fmtN(uos?.finance.revenueMTD)}</span></li>
                    <li>Outstanding AR: <span className="text-foreground">{fmtN(uos?.finance.outstandingAR)}</span></li>
                    <li>Active dispatches: <span className="text-foreground">{uos?.ops.activeDispatches ?? "-"}</span></li>
                    <li>Delivered today: <span className="text-foreground">{uos?.ops.deliveredToday ?? "-"}</span></li>
                  </ul>
                </section>
                <section>
                  <h4 className="font-semibold mb-1">⚠️ Risks</h4>
                  <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                    <li>{uos?.risk.unsafeVehicles ?? 0} vehicle(s) below health threshold</li>
                    <li>{uos?.risk.highRiskDrivers ?? 0} high-risk driver(s) active</li>
                    <li>{uos?.ops.slaBreaches ?? 0} SLA breach(es) detected</li>
                  </ul>
                </section>
                <section>
                  <h4 className="font-semibold mb-1">🤖 Workforce</h4>
                  <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                    <li>{uos?.workforce.activeEmployees ?? 0} AI employees active</li>
                    <li>{uos?.workforce.tasksToday ?? 0} task(s) completed today</li>
                    <li>{uos?.workforce.pendingActions ?? 0} action(s) awaiting approval</li>
                  </ul>
                </section>
                <section>
                  <h4 className="font-semibold mb-1">🔧 Autonomy 24h</h4>
                  <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                    <li>{uos?.decisions.executed24h ?? 0} decision(s) executed</li>
                    <li>{uos?.decisions.approved24h ?? 0} decision(s) approved</li>
                    <li>{uos?.decisions.pending ?? 0} decision(s) pending</li>
                  </ul>
                </section>
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs">
                    <span className="font-semibold">Pointer note:</span> Scheduled brief delivery (email/Slack) requires
                    a <code>ceo-daily-brief</code> edge function on a pg_cron schedule. Wire this when promoting the
                    Consciousness Core from observatory to active orchestrator.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
