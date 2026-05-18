import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Brain, Users, TrendingUp, Shield, Cpu, Zap, CheckCircle, XCircle,
  Clock, DollarSign, Activity, Target, Sparkles, UserPlus, Handshake, MapPin,
} from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/ai-workforce-engine`;

async function wfFetch(route: string, method = "GET", body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(`${BASE}?route=${encodeURIComponent(route)}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "API Error");
  return json.data || json;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  needs_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  action_required: "bg-red-500/20 text-red-400 border-red-500/30",
  paused: "bg-muted text-muted-foreground",
};

const roleIcons: Record<string, React.ReactNode> = {
  ops_manager: <Cpu className="h-5 w-5" />,
  finance_manager: <DollarSign className="h-5 w-5" />,
  support_agent: <Shield className="h-5 w-5" />,
  growth_agent: <TrendingUp className="h-5 w-5" />,
};

const autonomyLabels: Record<string, string> = {
  suggest_only: "Suggest Only",
  auto_with_approval: "Auto + Approval",
  full_autonomous: "AI-Assisted",
};

const performanceBadge: Record<string, string> = {
  junior: "bg-blue-500/20 text-blue-400",
  operator: "bg-purple-500/20 text-purple-400",
  elite: "bg-amber-500/20 text-amber-400",
};

export default function AIWorkforce() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Initialize employees on first visit
  const initMut = useMutation({
    mutationFn: () => wfFetch("/initialize", "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-wf"] }); toast.success("AI Workforce initialized"); },
  });

  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ["ai-wf", "employees"],
    queryFn: () => wfFetch("/employees"),
  });

  const { data: actions } = useQuery({
    queryKey: ["ai-wf", "actions"],
    queryFn: () => wfFetch("/actions"),
  });

  const { data: kpis } = useQuery({
    queryKey: ["ai-wf", "kpis"],
    queryFn: () => wfFetch("/kpis"),
  });

  const decideMut = useMutation({
    mutationFn: (p: { action_id: string; decision: string; reason?: string }) => wfFetch("/actions/decide", "POST", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-wf"] }); toast.success("Decision recorded"); },
  });

  const autonomyMut = useMutation({
    mutationFn: (p: { employee_id: string; mode: string }) => wfFetch("/autonomy", "POST", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-wf"] }); toast.success("Autonomy mode updated"); },
  });

  const simulateMut = useMutation({
    mutationFn: () => wfFetch("/simulate-ops", "POST"),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["ai-wf"] });
      const n = res?.actions_created ?? 0;
      if (n === 0) toast.info("No live signals detected — nothing to action right now");
      else toast.success(`${n} AI action(s) generated from live data`);
    },
  });

  useEffect(() => {
    if (!empLoading && (!employees || employees.length === 0)) {
      initMut.mutate();
    }
  }, [empLoading, employees]);

  const pendingActions = (actions || []).filter((a: any) => a.status === "pending");

  return (
    <DashboardLayout title="AI Workforce Command Center">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Workforce Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your digital employees - executing, deciding, and reporting</p>
        </div>
        <Button onClick={() => simulateMut.mutate()} disabled={simulateMut.isPending} size="sm">
          <Zap className="h-4 w-4 mr-1" /> Generate AI Actions
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "AI Actions Today", value: kpis?.decisions_today || 0, icon: Activity, color: "text-primary" },
          { label: "Pending Approval", value: kpis?.pending || 0, icon: Clock, color: "text-amber-400" },
          { label: "Executed", value: kpis?.executed || 0, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Revenue Impact", value: `₦${((kpis?.revenue_impact || 0) / 1e6).toFixed(1)}M`, icon: DollarSign, color: "text-emerald-400" },
          { label: "Cost Saved", value: `₦${((kpis?.cost_savings || 0) / 1e6).toFixed(1)}M`, icon: Target, color: "text-blue-400" },
        ].map((k) => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`h-8 w-8 ${k.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">AI Employees</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="approvals">
            Approval Queue {pendingActions.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{pendingActions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="hiring">AI Hiring</TabsTrigger>
          <TabsTrigger value="negotiation">AI Negotiation</TabsTrigger>
          <TabsTrigger value="expansion">AI Expansion</TabsTrigger>
        </TabsList>

        {/* ── AI EMPLOYEES ── */}
        <TabsContent value="employees">
          <div className="grid md:grid-cols-2 gap-4">
            {(employees || []).map((emp: any) => (
              <Card key={emp.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">{roleIcons[emp.role_key]}</div>
                      <div>
                        <CardTitle className="text-base">{emp.display_name}</CardTitle>
                        <Badge className={`text-[10px] mt-1 ${performanceBadge[emp.performance_level] || ""}`}>
                          {emp.performance_level?.toUpperCase()} AI
                        </Badge>
                      </div>
                    </div>
                    <Badge className={statusColors[emp.status]}>
                      {emp.status === "active" ? "🟢 Active" : emp.status === "needs_approval" ? "🟡 Needs Approval" : "🔴 Action Required"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Current Task:</span>
                    <p className="font-medium">{emp.current_task || "Idle"}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${emp.confidence_score}%` }} />
                    </div>
                    <span className="font-mono text-xs">{emp.confidence_score}%</span>
                  </div>
                  {emp.next_suggested_action && (
                    <div className="p-2 rounded bg-primary/5 border border-primary/10 text-xs">
                      <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                      <span className="font-medium">Next:</span> {emp.next_suggested_action}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="text-xs text-muted-foreground">
                      Tasks: {emp.tasks_completed_today} today / {emp.tasks_completed_total} total
                    </div>
                    <Select value={emp.autonomy_mode} onValueChange={(v) => autonomyMut.mutate({ employee_id: emp.id, mode: v })}>
                      <SelectTrigger className="w-[160px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suggest_only">Suggest Only</SelectItem>
                        <SelectItem value="auto_with_approval">Auto + Approval</SelectItem>
                        <SelectItem value="full_autonomous">AI-Assisted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── ACTIVITY FEED ── */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> AI Activity Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {(actions || []).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                      <div className="p-1.5 rounded bg-primary/10">{roleIcons[a.role_key]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{a.role_key.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                          <Badge variant={a.status === "executed" ? "default" : a.status === "pending" ? "secondary" : "outline"} className="text-[10px]">
                            {a.status}
                          </Badge>
                          {a.confidence_score && <span className="text-[10px] text-muted-foreground">{a.confidence_score}% confidence</span>}
                        </div>
                        <p className="text-sm mt-1">{a.description}</p>
                        {a.reasoning && <p className="text-xs text-muted-foreground mt-1 italic">{a.reasoning}</p>}
                        {a.revenue_impact > 0 && (
                          <span className="text-xs text-emerald-400 mt-1 inline-block">₦{(a.revenue_impact / 1e6).toFixed(1)}M impact</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(a.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {(!actions || actions.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No AI actions yet. Click "Generate AI Actions" to simulate.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── APPROVAL QUEUE ── */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" /> Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingActions.map((a: any) => (
                  <div key={a.id} className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {roleIcons[a.role_key]}
                          <span className="font-medium text-sm">{a.action_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                        </div>
                        <p className="text-sm">{a.description}</p>
                        {a.reasoning && <p className="text-xs text-muted-foreground mt-1">💡 {a.reasoning}</p>}
                        {a.impact_summary && <p className="text-xs text-primary mt-1">📊 {a.impact_summary}</p>}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="default" onClick={() => decideMut.mutate({ action_id: a.id, decision: "approve" })}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decideMut.mutate({ action_id: a.id, decision: "reject", reason: "Manual review" })}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingActions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No pending approvals. All clear! ✅</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI HIRING ── */}
        <TabsContent value="hiring">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> AI Hiring Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HiringPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI NEGOTIATION ── */}
        <TabsContent value="negotiation">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" /> AI Negotiation Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NegotiationPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI EXPANSION ── */}
        <TabsContent value="expansion">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> AI Market Expansion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExpansionPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}

// ─── Sub-panels ───

function HiringPanel() {
  const { data } = useQuery({ queryKey: ["ai-wf", "hiring"], queryFn: () => wfFetch("/hiring") });
  const items = data || [];
  if (items.length === 0) return (
    <div className="text-center py-12 space-y-3">
      <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/30" />
      <p className="text-muted-foreground">AI will recommend hiring when operational capacity is exceeded.</p>
      <p className="text-xs text-muted-foreground">Monitors dispatch volume, support load, and finance backlog continuously.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {items.map((h: any) => (
        <div key={h.id} className="p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{h.recommended_role}</span>
            <Badge variant={h.urgency === "critical" ? "destructive" : h.urgency === "high" ? "secondary" : "outline"}>{h.urgency}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{h.trigger_reason}</p>
          {h.cost_of_not_hiring && <p className="text-xs text-red-400 mt-1">Cost of not hiring: ₦{(h.cost_of_not_hiring / 1e6).toFixed(1)}M/month</p>}
        </div>
      ))}
    </div>
  );
}

function NegotiationPanel() {
  const { data } = useQuery({ queryKey: ["ai-wf", "negotiations"], queryFn: () => wfFetch("/negotiations") });
  const items = data || [];
  if (items.length === 0) return (
    <div className="text-center py-12 space-y-3">
      <Handshake className="h-12 w-12 mx-auto text-muted-foreground/30" />
      <p className="text-muted-foreground">AI Negotiation Engine monitors vendor rates and initiates cost optimization.</p>
      <p className="text-xs text-muted-foreground">Triggers when quotes exceed market benchmarks or contracts approach renewal.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {items.map((n: any) => (
        <div key={n.id} className="p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{n.counterparty_name}</span>
            <Badge>{n.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Market:</span> ₦{(n.market_benchmark || 0).toLocaleString()}</div>
            <div><span className="text-muted-foreground">Target:</span> ₦{(n.target_price || 0).toLocaleString()}</div>
            <div><span className="text-emerald-400">Saved:</span> ₦{(n.savings_amount || 0).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpansionPanel() {
  const { data } = useQuery({ queryKey: ["ai-wf", "expansion"], queryFn: () => wfFetch("/expansion") });
  const items = data || [];
  if (items.length === 0) return (
    <div className="text-center py-12 space-y-3">
      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30" />
      <p className="text-muted-foreground">AI scans for profitable expansion opportunities across routes and regions.</p>
      <p className="text-xs text-muted-foreground">Analyzes demand signals, missed orders, and route profitability continuously.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {items.map((e: any) => (
        <div key={e.id} className="p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{e.origin} → {e.destination}</span>
            <Badge variant={e.recommendation === "proceed" ? "default" : e.recommendation === "wait" ? "secondary" : "destructive"}>
              {e.recommendation?.toUpperCase()}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Revenue:</span> ₦{((e.estimated_monthly_revenue || 0) / 1e6).toFixed(1)}M/mo</div>
            <div><span className="text-muted-foreground">Margin:</span> {e.estimated_profit_margin || 0}%</div>
            <div><span className="text-muted-foreground">Risk:</span> {e.risk_level}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
