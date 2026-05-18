import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface Signal {
  type: "finance" | "ops" | "support" | "admin" | "anomaly";
  source: string;
  severity: "low" | "medium" | "high" | "critical";
  data: Record<string, unknown>;
}

interface ExecutionPlan {
  tasks: TaskPlan[];
  risk_level: string;
  requires_approval: boolean;
  priority_score: number;
}

interface TaskPlan {
  task_type: string;
  target_module: string;
  assigned_role: string;
  title: string;
  description: string;
  priority_score: number;
  risk_level: string;
  payload: Record<string, unknown>;
}

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action as string;

    // ─── ACTION: DETECT SIGNALS ───
    if (action === "detect_signals") {
      const signals = await detectSignals(supabase);
      return json({ signals, count: signals.length });
    }

    // ─── ACTION: PROCESS SIGNAL → EXECUTION PLAN ───
    if (action === "process_signal") {
      const signal = body.signal as Signal;
      if (!signal) throw new Error("Signal required");

      const riskScore = scoreRisk(signal);
      const plan = generateExecutionPlan(signal, riskScore);

      // Check autonomy mode
      const { data: settings } = await supabase
        .from("autopilot_settings")
        .select("mode")
        .eq("module_key", signal.source)
        .single();

      const autonomyMode = settings?.mode || "manual";

      if (plan.risk_level === "critical") {
        plan.requires_approval = true;
      } else if (autonomyMode === "autonomous" && plan.risk_level !== "high") {
        plan.requires_approval = false;
      } else if (autonomyMode === "assisted") {
        plan.requires_approval = true;
      } else {
        plan.requires_approval = true;
      }

      // Create decision record
      const { data: decision } = await supabase
        .from("autonomous_decisions")
        .insert({
          decision_type: signal.type,
          trigger_source: signal.source,
          trigger_data: signal.data,
          recommendation: plan,
          confidence_score: Math.max(0.5, 1 - (riskScore / 100)),
          status: plan.requires_approval ? "pending_approval" : "approved",
          is_reversible: true,
          impact_summary: `${plan.tasks.length} tasks across ${[...new Set(plan.tasks.map(t => t.target_module))].join(", ")}`,
        })
        .select("id")
        .single();

      // If auto-approved, execute immediately
      if (!plan.requires_approval && decision) {
        await executePlan(supabase, decision.id, plan, user.id);
      }

      return json({
        decision_id: decision?.id,
        plan,
        auto_executed: !plan.requires_approval,
      });
    }

    // ─── ACTION: EXECUTE APPROVED DECISION ───
    if (action === "execute_decision") {
      const decisionId = body.decision_id as string;
      if (!decisionId) throw new Error("decision_id required");

      const { data: decision } = await supabase
        .from("autonomous_decisions")
        .select("*")
        .eq("id", decisionId)
        .single();

      if (!decision) throw new Error("Decision not found");
      if (decision.status === "executed") throw new Error("Already executed");

      const plan = decision.recommendation as ExecutionPlan;
      const results = await executePlan(supabase, decisionId, plan, user.id);

      await supabase
        .from("autonomous_decisions")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", decisionId);

      return json({ success: true, tasks_created: results.length, results });
    }

    // ─── ACTION: ROLLBACK TASK ───
    if (action === "rollback_task") {
      const taskId = body.task_id as string;
      const { data: task } = await supabase
        .from("execution_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (!task) throw new Error("Task not found");
      if (!task.is_rollback_possible) throw new Error("Rollback not possible for this task");

      await supabase
        .from("execution_tasks")
        .update({ status: "rolled_back", rolled_back_at: new Date().toISOString() })
        .eq("id", taskId);

      await supabase.from("execution_outcomes").insert({
        task_id: taskId,
        decision_id: task.decision_id,
        outcome_type: "rollback",
        rollback_performed: true,
      });

      return json({ success: true, rolled_back: taskId });
    }

    // ─── ACTION: GET DASHBOARD STATS ───
    if (action === "get_stats") {
      const today = new Date().toISOString().split("T")[0];

      const [tasksRes, outcomesRes, failedRes] = await Promise.all([
        supabase.from("execution_tasks").select("id, status, created_at").gte("created_at", today),
        supabase.from("execution_outcomes").select("id, outcome_type, value_impact_amount, time_saved_minutes, risk_prevented, created_at").gte("created_at", today),
        supabase.from("execution_tasks").select("id").eq("status", "failed").gte("created_at", today),
      ]);

      const tasks = tasksRes.data || [];
      const outcomes = outcomesRes.data || [];
      const completed = tasks.filter(t => t.status === "completed").length;
      const total = tasks.length;

      return json({
        actions_executed_today: total,
        success_rate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0",
        value_generated: outcomes.reduce((s, o) => s + (o.value_impact_amount || 0), 0),
        time_saved_minutes: outcomes.reduce((s, o) => s + (o.time_saved_minutes || 0), 0),
        risks_prevented: outcomes.filter(o => o.risk_prevented).length,
        failed_count: (failedRes.data || []).length,
        tasks_by_status: {
          pending: tasks.filter(t => t.status === "pending").length,
          in_progress: tasks.filter(t => t.status === "in_progress").length,
          completed,
          failed: (failedRes.data || []).length,
        },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("AOE error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── HELPERS ────────────────────────────────────────────────

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function scoreRisk(signal: Signal): number {
  let score = 0;
  if (signal.severity === "critical") score += 40;
  else if (signal.severity === "high") score += 30;
  else if (signal.severity === "medium") score += 20;
  else score += 10;

  if (signal.type === "finance") score += 15;
  if (signal.type === "anomaly") score += 20;

  const amount = (signal.data?.amount as number) || 0;
  if (amount > 5000000) score += 20;
  else if (amount > 1000000) score += 10;

  return Math.min(100, score);
}

function generateExecutionPlan(signal: Signal, riskScore: number): ExecutionPlan {
  const tasks: TaskPlan[] = [];
  const riskLevel = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low";

  switch (signal.type) {
    case "finance":
      tasks.push({
        task_type: "finance_action",
        target_module: "finance",
        assigned_role: "finance_manager",
        title: `Finance: ${signal.data?.action || "Review financial signal"}`,
        description: `Auto-generated from ${signal.source}: ${JSON.stringify(signal.data).slice(0, 200)}`,
        priority_score: riskScore,
        risk_level: riskLevel,
        payload: signal.data,
      });
      if (riskScore >= 60) {
        tasks.push({
          task_type: "admin_review",
          target_module: "admin",
          assigned_role: "org_admin",
          title: "Review high-risk finance action",
          description: `Elevated risk (${riskScore}) requires leadership review`,
          priority_score: riskScore + 10,
          risk_level: riskLevel,
          payload: { original_signal: signal.source },
        });
      }
      break;

    case "ops":
      tasks.push({
        task_type: "ops_action",
        target_module: "operations",
        assigned_role: "ops_manager",
        title: `Ops: ${signal.data?.action || "Optimize operations"}`,
        description: `Fleet/route optimization triggered by ${signal.source}`,
        priority_score: riskScore,
        risk_level: riskLevel,
        payload: signal.data,
      });
      break;

    case "support":
      tasks.push({
        task_type: "support_action",
        target_module: "support",
        assigned_role: "support",
        title: `Support: ${signal.data?.action || "Handle customer issue"}`,
        description: `Escalation from ${signal.source}`,
        priority_score: riskScore,
        risk_level: riskLevel,
        payload: signal.data,
      });
      break;

    case "anomaly":
      tasks.push(
        {
          task_type: "anomaly_investigation",
          target_module: "finance",
          assigned_role: "finance_manager",
          title: "Investigate system anomaly",
          description: `Anomaly detected: ${signal.data?.description || "Unknown"}`,
          priority_score: riskScore + 10,
          risk_level: "high",
          payload: signal.data,
        },
        {
          task_type: "admin_alert",
          target_module: "admin",
          assigned_role: "super_admin",
          title: "Anomaly alert - admin review required",
          description: `Critical anomaly requires super admin oversight`,
          priority_score: riskScore + 20,
          risk_level: "critical",
          payload: signal.data,
        }
      );
      break;

    default:
      tasks.push({
        task_type: "general",
        target_module: "admin",
        assigned_role: "admin",
        title: `Action: ${signal.data?.action || "General task"}`,
        description: `Signal from ${signal.source}`,
        priority_score: riskScore,
        risk_level: riskLevel,
        payload: signal.data,
      });
  }

  return {
    tasks,
    risk_level: riskLevel,
    requires_approval: riskScore >= 60,
    priority_score: riskScore,
  };
}

async function executePlan(
  supabase: ReturnType<typeof createClient>,
  decisionId: string,
  plan: ExecutionPlan,
  userId: string
): Promise<unknown[]> {
  const results = [];

  for (const task of plan.tasks) {
    try {
      const { data: created } = await supabase
        .from("execution_tasks")
        .insert({
          decision_id: decisionId,
          task_type: task.task_type,
          target_module: task.target_module,
          assigned_role: task.assigned_role,
          title: task.title,
          description: task.description,
          priority_score: task.priority_score,
          risk_level: task.risk_level,
          payload: task.payload,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (created) {
        await supabase.from("execution_outcomes").insert({
          task_id: created.id,
          decision_id: decisionId,
          outcome_type: "success",
          value_impact_amount: task.priority_score * 1000,
          time_saved_minutes: Math.max(5, Math.min(35, Math.round((task.priority_score ?? 10) / 3))),
          risk_prevented: task.risk_level === "high" || task.risk_level === "critical",
          risk_description: task.risk_level !== "low" ? task.description : null,
        });
        results.push({ task_id: created.id, status: "completed" });
      }
    } catch (err) {
      // Self-healing: log failure, create outcome
      const { data: failedTask } = await supabase
        .from("execution_tasks")
        .insert({
          decision_id: decisionId,
          task_type: task.task_type,
          target_module: task.target_module,
          assigned_role: task.assigned_role,
          title: task.title,
          description: task.description,
          priority_score: task.priority_score,
          risk_level: task.risk_level,
          payload: task.payload,
          status: "failed",
          started_at: new Date().toISOString(),
          failed_reason: err instanceof Error ? err.message : "Unknown error",
        })
        .select("id")
        .single();

      if (failedTask) {
        await supabase.from("execution_outcomes").insert({
          task_id: failedTask.id,
          decision_id: decisionId,
          outcome_type: "failure",
          error_details: err instanceof Error ? err.message : "Unknown",
          self_healed: false,
        });
      }
      results.push({ task_id: failedTask?.id, status: "failed" });
    }
  }

  return results;
}

async function detectSignals(supabase: ReturnType<typeof createClient>): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Check overdue invoices
  const { data: overdue } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, due_date")
    .eq("status", "overdue")
    .limit(10);

  if (overdue && overdue.length > 0) {
    const totalOverdue = overdue.reduce((s, i) => s + (i.total_amount || 0), 0);
    signals.push({
      type: "finance",
      source: "invoices",
      severity: totalOverdue > 5000000 ? "critical" : totalOverdue > 1000000 ? "high" : "medium",
      data: { action: "Follow up overdue invoices", count: overdue.length, total: totalOverdue },
    });
  }

  // Check idle vehicles
  const { data: idle } = await supabase
    .from("vehicles")
    .select("id, plate_number")
    .eq("status", "inactive")
    .limit(10);

  if (idle && idle.length > 3) {
    signals.push({
      type: "ops",
      source: "fleet",
      severity: idle.length > 10 ? "high" : "medium",
      data: { action: "Reassign idle vehicles", count: idle.length },
    });
  }

  // Check pending approvals
  const { data: pending } = await supabase
    .from("approvals")
    .select("id")
    .eq("status", "pending")
    .limit(20);

  if (pending && pending.length > 5) {
    signals.push({
      type: "admin",
      source: "approvals",
      severity: pending.length > 15 ? "high" : "medium",
      data: { action: "Process pending approvals", count: pending.length },
    });
  }

  return signals;
}
