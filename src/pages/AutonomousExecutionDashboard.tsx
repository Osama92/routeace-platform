import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Activity, Shield, TrendingUp, Clock, AlertTriangle,
  CheckCircle, XCircle, RotateCcw, Play, Brain, Target,
  ArrowLeft, RefreshCw,
} from "lucide-react";

interface Stats {
  actions_executed_today: number;
  success_rate: string;
  value_generated: number;
  time_saved_minutes: number;
  risks_prevented: number;
  failed_count: number;
  tasks_by_status: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
}

interface TaskRow {
  id: string;
  title: string;
  target_module: string;
  assigned_role: string;
  status: string;
  risk_level: string;
  priority_score: number;
  created_at: string;
  is_rollback_possible: boolean;
  decision_id: string | null;
}

interface DecisionRow {
  id: string;
  decision_type: string;
  trigger_source: string;
  status: string;
  confidence_score: number | null;
  impact_summary: string | null;
  created_at: string;
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-destructive/20 text-destructive",
  rolled_back: "bg-amber-500/20 text-amber-400",
};

export default function AutonomousExecutionDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats via edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (token) {
        const res = await supabase.functions.invoke("autonomous-execution-engine", {
          body: { action: "get_stats" },
        });
        if (res.data && !res.error) setStats(res.data);
      }

      // Load recent tasks
      const { data: tasksData } = await supabase
        .from("execution_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setTasks((tasksData as TaskRow[]) || []);

      // Load recent decisions
      const { data: decisionsData } = await supabase
        .from("autonomous_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      setDecisions((decisionsData as DecisionRow[]) || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const detectSignals = async () => {
    setDetecting(true);
    try {
      const res = await supabase.functions.invoke("autonomous-execution-engine", {
        body: { action: "detect_signals" },
      });
      if (res.error) throw new Error(res.error.message);
      const count = res.data?.count || 0;
      toast.success(`Detected ${count} actionable signal${count !== 1 ? "s" : ""}`);
      if (count > 0) {
        // Auto-process first signal
        for (const signal of res.data.signals) {
          await supabase.functions.invoke("autonomous-execution-engine", {
            body: { action: "process_signal", signal },
          });
        }
        toast.success("Signals processed → decisions created");
        loadData();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signal detection failed");
    }
    setDetecting(false);
  };

  const executeDecision = async (decisionId: string) => {
    try {
      const res = await supabase.functions.invoke("autonomous-execution-engine", {
        body: { action: "execute_decision", decision_id: decisionId },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`Executed: ${res.data?.tasks_created} tasks completed`);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Execution failed");
    }
  };

  const rollbackTask = async (taskId: string) => {
    try {
      const res = await supabase.functions.invoke("autonomous-execution-engine", {
        body: { action: "rollback_task", task_id: taskId },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Task rolled back successfully");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollback failed");
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

  return (
    <DashboardLayout title="Autonomous Execution Engine" subtitle="Self-operating logistics intelligence network">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Autonomous Execution Engine
              </h1>
              <p className="text-sm text-muted-foreground">Real-time signal detection → decision → execution → verification</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={detectSignals} disabled={detecting}>
              <Brain className={`w-4 h-4 mr-1 ${detecting ? "animate-pulse" : ""}`} />
              {detecting ? "Scanning..." : "Detect Signals"}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats?.actions_executed_today || 0}</p>
              <p className="text-xs text-muted-foreground">Actions Today</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <p className="text-2xl font-bold">{stats?.success_rate || "0"}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
          <Card className="border-chart-2/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-chart-2" />
              <p className="text-2xl font-bold">{formatCurrency(stats?.value_generated || 0)}</p>
              <p className="text-xs text-muted-foreground">Value Generated</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold">{stats?.time_saved_minutes || 0}m</p>
              <p className="text-xs text-muted-foreground">Time Saved</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardContent className="p-4 text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-amber-400" />
              <p className="text-2xl font-bold">{stats?.risks_prevented || 0}</p>
              <p className="text-xs text-muted-foreground">Risks Prevented</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="p-4 text-center">
              <XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold">{stats?.failed_count || 0}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Progress */}
        {stats?.tasks_by_status && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Execution Pipeline</span>
                <span className="text-xs text-muted-foreground">
                  {stats.tasks_by_status.completed + stats.tasks_by_status.failed} / {stats.actions_executed_today} processed
                </span>
              </div>
              <Progress
                value={stats.actions_executed_today > 0
                  ? ((stats.tasks_by_status.completed / stats.actions_executed_today) * 100)
                  : 0}
                className="h-2"
              />
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>⏳ Pending: {stats.tasks_by_status.pending}</span>
                <span>🔄 In Progress: {stats.tasks_by_status.in_progress}</span>
                <span>✅ Completed: {stats.tasks_by_status.completed}</span>
                <span>❌ Failed: {stats.tasks_by_status.failed}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="decisions">
          <TabsList>
            <TabsTrigger value="decisions">Decisions ({decisions.length})</TabsTrigger>
            <TabsTrigger value="tasks">Execution Tasks ({tasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions" className="space-y-3 mt-4">
            {decisions.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No decisions yet. Click "Detect Signals" to scan the system.</p>
              </CardContent></Card>
            ) : decisions.map(d => (
              <Card key={d.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{d.decision_type}</Badge>
                      <Badge variant="outline" className={`text-xs ${d.status === "executed" ? "bg-emerald-500/20 text-emerald-400" : d.status === "pending_approval" ? "bg-amber-500/20 text-amber-400" : "bg-muted"}`}>
                        {d.status.replace("_", " ")}
                      </Badge>
                      {d.confidence_score && (
                        <span className="text-xs text-muted-foreground">
                          {(d.confidence_score * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate">{d.impact_summary || `From: ${d.trigger_source}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  {d.status === "pending_approval" && (
                    <Button size="sm" onClick={() => executeDecision(d.id)}>
                      <Play className="w-3 h-3 mr-1" /> Execute
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3 mt-4">
            {tasks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No execution tasks yet.</p>
              </CardContent></Card>
            ) : tasks.map(t => (
              <Card key={t.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{t.target_module}</Badge>
                      <Badge variant="outline" className={`text-xs ${riskColors[t.risk_level] || ""}`}>
                        {t.risk_level}
                      </Badge>
                      <Badge className={`text-xs ${statusColors[t.status] || ""}`}>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Role: {t.assigned_role} • Priority: {t.priority_score} • {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  {t.status === "completed" && t.is_rollback_possible && (
                    <Button variant="outline" size="sm" onClick={() => rollbackTask(t.id)}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
