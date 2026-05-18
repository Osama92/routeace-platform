// Role-Based AI Performance API - /role-ai-api?route=<path>&role=<role>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, meta: { version: "v1", timestamp: new Date().toISOString() } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const err = (msg: string, code: string, status = 400) =>
  new Response(JSON.stringify({ success: false, error: { code, message: msg }, meta: { version: "v1", timestamp: new Date().toISOString() } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const VALID_ROLES = ["ops_manager", "support", "org_admin", "super_admin"];

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const route = url.searchParams.get("route") || "/";
  const role = url.searchParams.get("role") || "";
  const method = req.method;

  if (!VALID_ROLES.includes(role)) return err("Invalid role. Use: " + VALID_ROLES.join(", "), "INVALID_ROLE");

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return err("Unauthorized", "UNAUTHORIZED", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("Invalid token", "UNAUTHORIZED", 401);

  const userId = user.id;

  // Verify caller actually holds the requested role
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const userRoles = (roleRows || []).map((r: any) => r.role);
  const isSuper = userRoles.includes("super_admin") || userRoles.includes("admin");
  if (!isSuper && !userRoles.includes(role)) {
    return err("Insufficient permissions for requested role", "FORBIDDEN", 403);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const today = now.toISOString().split("T")[0];

  // Resolve caller's active organization (live-data scope for ALL roles, including super_admin).
  const { data: mem } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const orgId: string | null = mem?.organization_id ?? null;

  try {
    // ── /score ────────────────────────────────────────────────────
    if (route === "/score" && method === "GET") {
      const score = await computeRoleScore(supabase, admin, userId, role, now, monthStart, today, orgId);
      return json(score);
    }

    if (route === "/score/history" && method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || "30"), 100);
      const { data } = await supabase.from("role_performance_scores").select("*")
        .eq("user_id", userId).eq("role", role).order("score_date", { ascending: false }).limit(limit);
      return json(data || []);
    }

    // ── /tasks ────────────────────────────────────────────────────
    if (route === "/tasks" && method === "GET") {
      const status = url.searchParams.get("status");
      let q = supabase.from("role_ai_tasks").select("*").eq("user_id", userId).eq("role", role).order("created_at", { ascending: false }).limit(100);
      if (status) q = q.eq("status", status);
      const { data } = await q;
      const tasks = data || [];
      const completed = tasks.filter((t: any) => t.status === "completed").length;
      return json({ items: tasks, summary: { total: tasks.length, completed, pending: tasks.length - completed, execution_score: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0 } });
    }

    if (route.startsWith("/tasks/") && route.endsWith("/complete") && method === "POST") {
      const taskId = route.replace("/tasks/", "").replace("/complete", "");
      await supabase.from("role_ai_tasks").update({ status: "completed", completed_at: now.toISOString() }).eq("id", taskId).eq("user_id", userId);
      return json({ id: taskId, status: "completed" });
    }

    // ── /transformation ───────────────────────────────────────────
    if (route === "/transformation" && method === "GET") {
      const { data } = await supabase.from("role_transformation_days").select("*").eq("user_id", userId).eq("role", role).order("day_number");
      const days = data || [];
      // Auto-seed if empty
      if (days.length === 0) {
        const template = getTransformationTemplate(role);
        const rows = template.map(t => ({ user_id: userId, role, ...t }));
        await supabase.from("role_transformation_days").insert(rows);
        const { data: seeded } = await supabase.from("role_transformation_days").select("*").eq("user_id", userId).eq("role", role).order("day_number");
        const s = seeded || [];
        return json({ days: s, summary: { total: 28, completed: 0, remaining: 28, streak: 0, progress_pct: 0 } });
      }
      const completed = days.filter((d: any) => d.completed).length;
      return json({ days, summary: { total: 28, completed, remaining: 28 - completed, streak: computeStreak(days), progress_pct: Math.round((completed / 28) * 100) } });
    }

    if (route.startsWith("/transformation/") && route.endsWith("/complete") && method === "POST") {
      const dayNum = parseInt(route.replace("/transformation/", "").replace("/complete", ""));
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 28) return err("Invalid day", "INVALID_DAY");
      const body = await req.json().catch(() => ({}));
      await supabase.from("role_transformation_days").update({ completed: true, completed_at: now.toISOString(), time_spent_minutes: body.time_spent || 15 })
        .eq("user_id", userId).eq("role", role).eq("day_number", dayNum);
      return json({ day: dayNum, completed: true });
    }

    // ── /risks ────────────────────────────────────────────────────
    if (route === "/risks" && method === "GET") {
      const risks = await computeRoleRisks(supabase, admin, role, now, monthStart, orgId);
      return json(risks);
    }

    // ── /insights ─────────────────────────────────────────────────
    if (route === "/insights" && method === "GET") {
      const insights = await computeRoleInsights(supabase, admin, role, now, monthStart, orgId);
      return json(insights);
    }

    if (route === "/insights/generate" && method === "POST") {
      const count = await generateRoleTasks(supabase, userId, role, now, monthStart);
      return json({ tasks_created: count });
    }

    // ── /workflows ────────────────────────────────────────────────
    if (route === "/workflows" && method === "GET") {
      return json(getRoleWorkflows(role));
    }

    // ── /decisions ────────────────────────────────────────────────
    if (route === "/decisions" && method === "GET") {
      const { data } = await supabase.from("decision_engine_log").select("*")
        .or(`user_id.eq.${userId},affected_roles.cs.{${role}}`).order("created_at", { ascending: false }).limit(50);
      return json(data || []);
    }

    if (route === "/decisions/analyze" && method === "POST") {
      const body = await req.json();
      if (!body.decision_type || !body.title) return err("decision_type and title required", "MISSING_FIELDS");
      const analysis = await analyzeDecision(supabase, admin, userId, role, body, now, monthStart);
      return json(analysis);
    }

    if (route.startsWith("/decisions/") && route.endsWith("/execute") && method === "POST") {
      const decId = route.replace("/decisions/", "").replace("/execute", "");
      await supabase.from("decision_engine_log").update({ status: "executed", executed_at: now.toISOString() }).eq("id", decId).eq("user_id", userId);
      return json({ id: decId, status: "executed" });
    }

    // ── /cross-impacts ────────────────────────────────────────────
    if (route === "/cross-impacts" && method === "GET") {
      const { data } = await supabase.from("cross_role_impacts").select("*, decision_engine_log(title, decision_type, role)")
        .or(`source_role.eq.${role},target_role.eq.${role}`).order("created_at", { ascending: false }).limit(50);
      return json(data || []);
    }

    return err(`Unknown route: ${route}`, "NOT_FOUND", 404);
  } catch (e) {
    console.error("Role AI API Error:", e);
    return err(e instanceof Error ? e.message : "Internal error", "INTERNAL_ERROR", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════
async function computeRoleScore(supabase: any, admin: any, userId: string, role: string, now: Date, monthStart: string, today: string, orgId: string | null) {
  // Shared data
  const [tasksRes, transformRes] = await Promise.all([
    supabase.from("role_ai_tasks").select("status").eq("user_id", userId).eq("role", role),
    supabase.from("role_transformation_days").select("completed").eq("user_id", userId).eq("role", role),
  ]);

  const tasks = tasksRes.data || [];
  const transformDays = transformRes.data || [];

  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const executionScore = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 50;
  const transformComplete = transformDays.filter((d: any) => d.completed).length;
  const transformRate = transformDays.length > 0 ? (transformComplete / transformDays.length) * 100 : 0;

  // Role-specific KPI
  let roleKpiScore = 50;
  let kpiBreakdown: Record<string, number> = {};

  if (role === "ops_manager") {
    const [dispRes, vehRes] = await Promise.all([
      supabase.from("dispatches").select("status, on_time_flag, actual_delivery_days, estimated_delivery_days").gte("created_at", monthStart),
      supabase.from("vehicles").select("status"),
    ]);
    const dispatches = dispRes.data || [];
    const vehicles = vehRes.data || [];
    const delivered = dispatches.filter((d: any) => ["delivered", "closed"].includes(d.status)).length;
    const onTime = dispatches.filter((d: any) => d.on_time_flag === true).length;
    const activeVeh = vehicles.filter((v: any) => v.status === "active").length;
    const utilization = vehicles.length > 0 ? Math.round((activeVeh / vehicles.length) * 100) : 50;
    const otd = delivered > 0 ? Math.round((onTime / delivered) * 100) : 50;
    kpiBreakdown = { utilization, on_time_delivery: otd, route_efficiency: Math.min(100, otd + 10), downtime_reduction: utilization, resource_allocation: Math.round((utilization + otd) / 2) };
    roleKpiScore = Math.round(utilization * 0.3 + otd * 0.25 + kpiBreakdown.route_efficiency * 0.2 + kpiBreakdown.downtime_reduction * 0.15 + kpiBreakdown.resource_allocation * 0.1);
  } else if (role === "support") {
    const { data: tickets } = await admin.from("support_tickets").select("status, priority, created_at, resolved_at").gte("created_at", monthStart);
    const t = tickets || [];
    const closed = t.filter((tk: any) => tk.status === "resolved" || tk.status === "closed").length;
    const closureRate = t.length > 0 ? Math.round((closed / t.length) * 100) : 50;
    kpiBreakdown = { resolution_time: closureRate, ticket_closure_rate: closureRate, customer_satisfaction: Math.min(100, closureRate + 10), first_response_time: Math.min(100, closureRate + 5), escalation_rate: Math.max(0, 100 - (t.length - closed) * 5) };
    roleKpiScore = Math.round(kpiBreakdown.resolution_time * 0.3 + closureRate * 0.25 + kpiBreakdown.customer_satisfaction * 0.2 + kpiBreakdown.first_response_time * 0.15 + kpiBreakdown.escalation_rate * 0.1);
  } else if (role === "org_admin") {
    const [appRes, memRes] = await Promise.all([
      supabase.from("approvals").select("status").gte("created_at", monthStart),
      admin.from("organization_members").select("is_active"),
    ]);
    const approvals = appRes.data || [];
    const members = memRes.data || [];
    const approved = approvals.filter((a: any) => a.status === "approved").length;
    const approvalRate = approvals.length > 0 ? Math.round((approved / approvals.length) * 100) : 50;
    const activeMembers = members.filter((m: any) => m.is_active).length;
    const adoptionRate = members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 50;
    kpiBreakdown = { department_alignment: approvalRate, execution_speed: approvalRate, decision_implementation: approvalRate, system_adoption: adoptionRate, operational_efficiency: Math.round((approvalRate + adoptionRate) / 2) };
    roleKpiScore = Math.round(approvalRate * 0.25 + kpiBreakdown.execution_speed * 0.25 + kpiBreakdown.decision_implementation * 0.2 + adoptionRate * 0.15 + kpiBreakdown.operational_efficiency * 0.15);
  } else if (role === "super_admin") {
    // Live-data scope: a Super Admin sees their OWN organization's intelligence,
    // not the entire platform. This prevents cross-tenant leakage and matches
    // what every other tenant role sees.
    const orgFilter = orgId ? { organization_id: orgId } : null;
    const [orgRes, invRes, secRes] = await Promise.all([
      orgId
        ? admin.from("organizations").select("is_active, subscription_status").eq("id", orgId)
        : Promise.resolve({ data: [] }),
      orgId
        ? admin.from("invoices").select("total_amount, status").eq("organization_id", orgId).gte("created_at", monthStart)
        : Promise.resolve({ data: [] }),
      orgId
        ? admin.from("security_events").select("severity").eq("organization_id", orgId).gte("created_at", monthStart)
        : Promise.resolve({ data: [] }),
    ]);
    const orgs = orgRes.data || [];
    const invoices = invRes.data || [];
    const secEvents = secRes.data || [];
    const activeOrgs = orgs.filter((o: any) => o.is_active).length;
    const tenantHealth = orgs.length > 0 ? Math.round((activeOrgs / orgs.length) * 100) : 50;
    const revenue = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
    const criticalEvents = secEvents.filter((e: any) => e.severity === "critical").length;
    const platformEfficiency = Math.max(0, 100 - criticalEvents * 10);
    kpiBreakdown = { system_performance: platformEfficiency, tenant_health: tenantHealth, revenue_optimization: revenue > 0 ? 80 : 40, risk_exposure: platformEfficiency, platform_efficiency: platformEfficiency };
    roleKpiScore = Math.round(platformEfficiency * 0.25 + tenantHealth * 0.25 + kpiBreakdown.revenue_optimization * 0.2 + kpiBreakdown.risk_exposure * 0.15 + platformEfficiency * 0.15);
  }

  // Workflow & Automation (shared logic)
  const workflowEfficiency = Math.min(100, Math.round(roleKpiScore * 0.6 + transformRate * 0.4));
  const automationLevel = Math.min(100, Math.round(transformRate * 0.5 + roleKpiScore * 0.5));

  // Decision accuracy from decision log
  const { data: decisions } = await supabase.from("decision_engine_log").select("outcome_accuracy").eq("user_id", userId).eq("role", role).not("outcome_accuracy", "is", null);
  const decisionAccuracy = decisions && decisions.length > 0 ? Math.round(decisions.reduce((s: number, d: any) => s + (d.outcome_accuracy || 0), 0) / decisions.length) : 50;

  // Risk score
  const riskData = await computeRoleRisks(supabase, admin, role, now, monthStart, orgId);
  const riskScore = riskData.summary.risk_score;

  const totalScore = Math.round(
    workflowEfficiency * 0.25 + automationLevel * 0.20 + decisionAccuracy * 0.20 +
    roleKpiScore * 0.15 + riskScore * 0.10 + executionScore * 0.10
  );
  const rankLevel = totalScore >= 90 ? "elite_operator" : totalScore >= 75 ? "advanced_operator" : totalScore >= 50 ? "operator" : "beginner";

  await supabase.from("role_performance_scores").upsert({
    user_id: userId, role, score_date: today,
    workflow_efficiency: workflowEfficiency, automation_level: automationLevel,
    decision_accuracy: decisionAccuracy, role_kpi_score: roleKpiScore,
    risk_score: riskScore, execution_score: executionScore,
    total_score: totalScore, rank_level: rankLevel, kpi_breakdown: kpiBreakdown,
  }, { onConflict: "user_id,role,score_date" });

  return { total_score: totalScore, rank_level: rankLevel, breakdown: { workflow: workflowEfficiency, automation: automationLevel, decision: decisionAccuracy, role_kpi: roleKpiScore, risk: riskScore, execution: executionScore }, kpi_breakdown: kpiBreakdown };
}

// ═══════════════════════════════════════════════════════════════════
// RISK ENGINE
// ═══════════════════════════════════════════════════════════════════
async function computeRoleRisks(supabase: any, admin: any, role: string, now: Date, monthStart: string, orgId: string | null = null) {
  const risks: any[] = [];

  if (role === "ops_manager") {
    const [dispRes, vehRes] = await Promise.all([
      supabase.from("dispatches").select("status, sla_status").gte("created_at", monthStart),
      supabase.from("vehicles").select("status"),
    ]);
    const dispatches = dispRes.data || [];
    const vehicles = vehRes.data || [];
    const delayed = dispatches.filter((d: any) => d.sla_status === "breached" || d.status === "delayed").length;
    const idle = vehicles.filter((v: any) => v.status === "inactive" || v.status === "maintenance").length;
    if (delayed > 0) risks.push({ id: "delivery_delays", type: "operational", severity: delayed > 5 ? "high" : "medium", message: `${delayed} dispatch(es) with SLA breach/delay`, resolved: false });
    if (idle > 0) risks.push({ id: "idle_fleet", type: "utilization", severity: idle > 3 ? "high" : "medium", message: `${idle} vehicle(s) idle or in maintenance`, resolved: false });
  } else if (role === "support") {
    const { data: tickets } = await admin.from("support_tickets").select("status, priority").eq("status", "open").or("status.eq.in_progress");
    const t = tickets || [];
    const highPriority = t.filter((tk: any) => tk.priority === "high" || tk.priority === "urgent").length;
    if (t.length > 10) risks.push({ id: "ticket_backlog", type: "backlog", severity: "high", message: `${t.length} open tickets - backlog building`, resolved: false });
    if (highPriority > 0) risks.push({ id: "escalation_spike", type: "escalation", severity: "high", message: `${highPriority} high-priority ticket(s) need attention`, resolved: false });
  } else if (role === "org_admin") {
    const { data: approvals } = await supabase.from("approvals").select("status, created_at").eq("status", "pending");
    const pending = approvals || [];
    const stale = pending.filter((a: any) => (now.getTime() - new Date(a.created_at).getTime()) > 48 * 3600 * 1000).length;
    if (stale > 0) risks.push({ id: "approval_delays", type: "governance", severity: "high", message: `${stale} approval(s) pending over 48 hours`, resolved: false });
    if (pending.length > 20) risks.push({ id: "workflow_bottleneck", type: "bottleneck", severity: "medium", message: `${pending.length} pending approvals - bottleneck forming`, resolved: false });
  } else if (role === "super_admin") {
    // Live-data scope: caller's organization only.
    const [secRes, orgRes] = await Promise.all([
      orgId
        ? admin.from("security_events").select("severity").eq("organization_id", orgId).gte("created_at", monthStart)
        : Promise.resolve({ data: [] }),
      orgId
        ? admin.from("organizations").select("is_active, subscription_status").eq("id", orgId)
        : Promise.resolve({ data: [] }),
    ]);
    const sec = secRes.data || [];
    const orgs = orgRes.data || [];
    const critical = sec.filter((e: any) => e.severity === "critical").length;
    const churning = orgs.filter((o: any) => !o.is_active || o.subscription_status === "churned").length;
    if (critical > 0) risks.push({ id: "system_threats", type: "security", severity: "critical", message: `${critical} critical security event(s) detected in your organization`, resolved: false });
    if (churning > 0) risks.push({ id: "tenant_churn", type: "revenue", severity: "high", message: `Your tenant subscription is at churn risk`, resolved: false });
  }

  const maxRisks = 3;
  const resolved = maxRisks - risks.length;
  return { risks, summary: { total: maxRisks, detected: risks.length, resolved, risk_score: Math.round((resolved / maxRisks) * 100) } };
}

// ═══════════════════════════════════════════════════════════════════
// INSIGHTS ENGINE
// ═══════════════════════════════════════════════════════════════════
async function computeRoleInsights(supabase: any, admin: any, role: string, now: Date, monthStart: string, orgId: string | null = null) {
  const insights: any[] = [];

  if (role === "ops_manager") {
    const { data: dispatches } = await supabase.from("dispatches").select("status, on_time_flag").gte("created_at", monthStart);
    const d = dispatches || [];
    const total = d.length;
    const onTime = d.filter((x: any) => x.on_time_flag === true).length;
    if (total > 0 && onTime / total < 0.8) insights.push({ type: "otd_alert", priority: "high", message: `On-time delivery at ${Math.round((onTime / total) * 100)}% - below 80% target. Review routes.`, actionable: true });
    if (total === 0) insights.push({ type: "no_activity", priority: "medium", message: "No dispatches this month. Create and assign dispatches.", actionable: true });
  } else if (role === "support") {
    const { data: tickets } = await admin.from("support_tickets").select("status").gte("created_at", monthStart);
    const t = tickets || [];
    const open = t.filter((tk: any) => tk.status === "open").length;
    if (open > 5) insights.push({ type: "backlog_warning", priority: "high", message: `${open} open tickets. Prioritize resolution to improve score.`, actionable: true });
  } else if (role === "org_admin") {
    const { data: approvals } = await supabase.from("approvals").select("status").gte("created_at", monthStart);
    const a = approvals || [];
    const pending = a.filter((ap: any) => ap.status === "pending").length;
    if (pending > 5) insights.push({ type: "approval_lag", priority: "high", message: `${pending} approvals pending. Clear queue to unblock teams.`, actionable: true });
  } else if (role === "super_admin") {
    // Live-data scope: caller's organization only.
    if (orgId) {
      const { data: org } = await admin.from("organizations").select("is_active, subscription_status").eq("id", orgId).maybeSingle();
      if (org && !org.is_active) insights.push({ type: "tenant_risk", priority: "high", message: `Your organization is currently inactive. Review subscription status.`, actionable: true });
      if (org && org.subscription_status === "trial") insights.push({ type: "trial_status", priority: "medium", message: `Your organization is on trial. Upgrade to retain full intelligence access.`, actionable: true });
    }
  }

  return { insights, generated_at: now.toISOString() };
}

// ═══════════════════════════════════════════════════════════════════
// AI TASK GENERATION
// ═══════════════════════════════════════════════════════════════════
async function generateRoleTasks(supabase: any, userId: string, role: string, now: Date, monthStart: string) {
  const tasks: any[] = [];

  if (role === "ops_manager") {
    const { data: dispatches } = await supabase.from("dispatches").select("status, sla_status").gte("created_at", monthStart);
    const d = dispatches || [];
    const delayed = d.filter((x: any) => x.sla_status === "breached").length;
    if (delayed > 0) tasks.push({ user_id: userId, role, source: "ai", title: `Resolve ${delayed} SLA breach(es)`, description: "Review breached dispatches and take corrective action.", priority: "critical", category: "sla" });
    const pending = d.filter((x: any) => x.status === "pending").length;
    if (pending > 5) tasks.push({ user_id: userId, role, source: "ai", title: `Assign ${pending} pending dispatches`, description: "Unassigned dispatches are idle. Assign drivers and vehicles.", priority: "high", category: "dispatch" });
  } else if (role === "support") {
    tasks.push({ user_id: userId, role, source: "ai", title: "Review open ticket queue", description: "Check and prioritize unresolved support tickets.", priority: "high", category: "tickets" });
  } else if (role === "org_admin") {
    tasks.push({ user_id: userId, role, source: "ai", title: "Clear pending approvals", description: "Review and process pending approval requests.", priority: "high", category: "approvals" });
  } else if (role === "super_admin") {
    tasks.push({ user_id: userId, role, source: "ai", title: "Platform health check", description: "Review system performance, security events, and tenant status.", priority: "medium", category: "platform" });
  }

  let created = 0;
  for (const task of tasks) {
    const { data: ex } = await supabase.from("role_ai_tasks").select("id").eq("user_id", userId).eq("role", role).eq("title", task.title).eq("status", "pending").limit(1);
    if (!ex || ex.length === 0) { await supabase.from("role_ai_tasks").insert(task); created++; }
  }
  return created;
}

// ═══════════════════════════════════════════════════════════════════
// DECISION ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════
async function analyzeDecision(supabase: any, admin: any, userId: string, role: string, body: any, now: Date, monthStart: string) {
  const { decision_type, title, description } = body;

  // Compute impact scores based on decision type
  let impactOp = 30, impactFin = 20, impactCust = 20, impactSys = 10;
  const affectedRoles: string[] = [role];

  if (decision_type === "route_change" || decision_type === "fleet_reallocation") {
    impactOp = 80; impactCust = 50; impactFin = 40;
    affectedRoles.push("finance_manager", "support");
  } else if (decision_type === "expense_approval" || decision_type === "payment_delay") {
    impactFin = 90; impactOp = 30;
    affectedRoles.push("finance_manager");
  } else if (decision_type === "ticket_escalation") {
    impactCust = 80; impactOp = 40;
    affectedRoles.push("ops_manager");
  } else if (decision_type === "system_config") {
    impactSys = 90;
    affectedRoles.push("org_admin", "ops_manager", "finance_manager", "support");
  }

  const totalImpact = Math.round((impactOp + impactFin + impactCust + impactSys) / 4);
  const riskScore = Math.min(100, Math.round(totalImpact * 0.6 + (affectedRoles.length * 10)));
  const riskLevel = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low";
  const wasBlocked = riskScore >= 80;
  const recommendation = wasBlocked
    ? `High risk detected (${riskScore}). Review impact on ${affectedRoles.join(", ")} before proceeding.`
    : `Proceed with caution. Impact score: ${totalImpact}. Affected: ${affectedRoles.join(", ")}.`;

  // Log decision
  const { data: decision } = await supabase.from("decision_engine_log").insert({
    user_id: userId, role, decision_type, title, description,
    affected_roles: affectedRoles, impact_operational: impactOp, impact_financial: impactFin,
    impact_customer: impactCust, impact_system: impactSys, total_impact_score: totalImpact,
    risk_score: riskScore, risk_level: riskLevel, recommendation,
    status: wasBlocked ? "blocked" : "pending", was_blocked: wasBlocked,
    block_reason: wasBlocked ? `Risk score ${riskScore} exceeds threshold` : null,
    predicted_impact: { operational: impactOp, financial: impactFin, customer: impactCust, system: impactSys },
  }).select().single();

  // Create cross-role impacts
  if (decision) {
    const impacts = affectedRoles.filter(r => r !== role).map(targetRole => ({
      decision_id: decision.id, source_role: role, target_role: targetRole,
      impact_type: decision_type, severity: riskLevel, description: `Impact from ${role}: ${title}`,
    }));
    if (impacts.length > 0) await supabase.from("cross_role_impacts").insert(impacts);
  }

  return {
    decision_id: decision?.id, total_impact: totalImpact, risk_score: riskScore, risk_level: riskLevel,
    was_blocked: wasBlocked, recommendation, affected_roles: affectedRoles,
    impact: { operational: impactOp, financial: impactFin, customer: impactCust, system: impactSys },
  };
}

// ═══════════════════════════════════════════════════════════════════
// ROLE-SPECIFIC TRANSFORMATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════
function getTransformationTemplate(role: string) {
  const templates: Record<string, { day_number: number; week_number: number; task_title: string; task_description: string; category: string }[]> = {
    ops_manager: [
      { day_number: 1, week_number: 1, task_title: "Audit dispatch workflow", task_description: "Review current dispatch creation to delivery flow.", category: "optimization" },
      { day_number: 2, week_number: 1, task_title: "Fleet utilization review", task_description: "Check vehicle usage rates and idle time.", category: "optimization" },
      { day_number: 3, week_number: 1, task_title: "Route efficiency audit", task_description: "Compare planned vs actual routes.", category: "optimization" },
      { day_number: 4, week_number: 1, task_title: "SLA compliance check", task_description: "Review on-time delivery rates and SLA breaches.", category: "optimization" },
      { day_number: 5, week_number: 1, task_title: "Driver performance review", task_description: "Evaluate driver delivery metrics.", category: "optimization" },
      { day_number: 6, week_number: 1, task_title: "Downtime analysis", task_description: "Identify causes of vehicle downtime.", category: "optimization" },
      { day_number: 7, week_number: 1, task_title: "Week 1 score review", task_description: "Review optimization findings and set targets.", category: "optimization" },
      { day_number: 8, week_number: 2, task_title: "Benchmark dispatch speed", task_description: "Compare your dispatch times vs platform best.", category: "differentiation" },
      { day_number: 9, week_number: 2, task_title: "Optimize assignment flow", task_description: "Reduce time from order to driver assignment.", category: "differentiation" },
      { day_number: 10, week_number: 2, task_title: "Streamline tracking", task_description: "Improve real-time visibility workflows.", category: "differentiation" },
      { day_number: 11, week_number: 2, task_title: "Multi-drop optimization", task_description: "Optimize multi-stop delivery sequences.", category: "differentiation" },
      { day_number: 12, week_number: 2, task_title: "Communication workflows", task_description: "Set up automated customer notifications.", category: "differentiation" },
      { day_number: 13, week_number: 2, task_title: "Exception handling", task_description: "Create workflows for delays and failures.", category: "differentiation" },
      { day_number: 14, week_number: 2, task_title: "Week 2 score review", task_description: "Measure improvement vs Week 1.", category: "differentiation" },
      { day_number: 15, week_number: 3, task_title: "Enable auto-dispatch", task_description: "Configure AI-assisted driver assignment.", category: "automation" },
      { day_number: 16, week_number: 3, task_title: "Route optimization AI", task_description: "Activate AI route planning.", category: "automation" },
      { day_number: 17, week_number: 3, task_title: "Auto SLA monitoring", task_description: "Set up automated SLA breach detection.", category: "automation" },
      { day_number: 18, week_number: 3, task_title: "Fleet scheduling", task_description: "Automate vehicle maintenance scheduling.", category: "automation" },
      { day_number: 19, week_number: 3, task_title: "Performance alerts", task_description: "Configure real-time performance alerts.", category: "automation" },
      { day_number: 20, week_number: 3, task_title: "Reporting automation", task_description: "Set up automated daily/weekly reports.", category: "automation" },
      { day_number: 21, week_number: 3, task_title: "Week 3 score review", task_description: "Measure automation adoption.", category: "automation" },
      { day_number: 22, week_number: 4, task_title: "Measure time savings", task_description: "Calculate time saved through improvements.", category: "execution" },
      { day_number: 23, week_number: 4, task_title: "OTD improvement proof", task_description: "Show on-time delivery improvement.", category: "execution" },
      { day_number: 24, week_number: 4, task_title: "Utilization improvement", task_description: "Measure fleet utilization gains.", category: "execution" },
      { day_number: 25, week_number: 4, task_title: "Cost reduction proof", task_description: "Quantify operational cost savings.", category: "execution" },
      { day_number: 26, week_number: 4, task_title: "Team productivity", task_description: "Measure team output improvement.", category: "execution" },
      { day_number: 27, week_number: 4, task_title: "System adoption metrics", task_description: "Track feature adoption rates.", category: "execution" },
      { day_number: 28, week_number: 4, task_title: "Final transformation score", task_description: "Complete assessment and set ongoing goals.", category: "execution" },
    ],
    support: Array.from({ length: 28 }, (_, i) => {
      const day = i + 1; const week = Math.ceil(day / 7);
      const cats = ["optimization", "differentiation", "automation", "execution"];
      const titles = [
        "Audit ticket workflow", "Response time analysis", "Categorization review", "Escalation flow check", "Knowledge base audit", "Customer feedback review", "Week 1 score",
        "Benchmark response times", "Optimize routing rules", "Template optimization", "Priority matrix", "Self-service setup", "Cross-team coordination", "Week 2 score",
        "Auto-ticket routing", "AI response drafts", "Auto-categorization", "SLA auto-alerts", "Feedback automation", "Report automation", "Week 3 score",
        "Resolution time gains", "Satisfaction improvement", "Backlog reduction", "Escalation decrease", "Team efficiency", "Adoption metrics", "Final score",
      ];
      return { day_number: day, week_number: week, task_title: titles[i], task_description: `Day ${day} task for support transformation.`, category: cats[week - 1] };
    }),
    org_admin: Array.from({ length: 28 }, (_, i) => {
      const day = i + 1; const week = Math.ceil(day / 7);
      const cats = ["optimization", "differentiation", "automation", "execution"];
      const titles = [
        "Audit approval flows", "Team structure review", "Permission audit", "Workflow mapping", "Integration check", "Policy review", "Week 1 score",
        "Benchmark approvals", "Optimize hierarchies", "Streamline onboarding", "Cross-dept flows", "Communication setup", "Resource allocation", "Week 2 score",
        "Auto-approval rules", "Role automation", "Notification setup", "Report scheduling", "Compliance automation", "Audit trail setup", "Week 3 score",
        "Approval speed gains", "Team alignment proof", "Adoption metrics", "Efficiency gains", "Cost optimization", "Governance metrics", "Final score",
      ];
      return { day_number: day, week_number: week, task_title: titles[i], task_description: `Day ${day} task for admin transformation.`, category: cats[week - 1] };
    }),
    super_admin: Array.from({ length: 28 }, (_, i) => {
      const day = i + 1; const week = Math.ceil(day / 7);
      const cats = ["optimization", "differentiation", "automation", "execution"];
      const titles = [
        "Platform health audit", "Tenant review", "Security scan", "Performance baseline", "Revenue analysis", "API usage review", "Week 1 score",
        "Benchmark tenants", "Optimize infrastructure", "Pricing review", "Feature adoption", "Churn analysis", "Growth opportunities", "Week 2 score",
        "Auto-monitoring", "Alert automation", "Tenant automation", "Security automation", "Revenue automation", "Report automation", "Week 3 score",
        "Platform uptime gains", "Tenant satisfaction", "Revenue growth", "Security posture", "Scaling metrics", "System efficiency", "Final score",
      ];
      return { day_number: day, week_number: week, task_title: titles[i], task_description: `Day ${day} task for super admin transformation.`, category: cats[week - 1] };
    }),
  };
  return templates[role] || templates.ops_manager;
}

// ═══════════════════════════════════════════════════════════════════
// ROLE-SPECIFIC WORKFLOW BENCHMARKS
// ═══════════════════════════════════════════════════════════════════
function getRoleWorkflows(role: string) {
  const workflows: Record<string, any[]> = {
    ops_manager: [
      { name: "Dispatch Creation", manual_minutes: 15, optimized_minutes: 3, automation_pct: 80 },
      { name: "Driver Assignment", manual_minutes: 10, optimized_minutes: 1, automation_pct: 90 },
      { name: "Route Planning", manual_minutes: 30, optimized_minutes: 5, automation_pct: 83 },
      { name: "SLA Monitoring", manual_minutes: 20, optimized_minutes: 0, automation_pct: 100 },
      { name: "Fleet Scheduling", manual_minutes: 25, optimized_minutes: 5, automation_pct: 80 },
      { name: "Performance Reporting", manual_minutes: 40, optimized_minutes: 5, automation_pct: 88 },
    ],
    support: [
      { name: "Ticket Triage", manual_minutes: 10, optimized_minutes: 1, automation_pct: 90 },
      { name: "Customer Response", manual_minutes: 15, optimized_minutes: 3, automation_pct: 80 },
      { name: "Issue Escalation", manual_minutes: 8, optimized_minutes: 2, automation_pct: 75 },
      { name: "Resolution Tracking", manual_minutes: 20, optimized_minutes: 3, automation_pct: 85 },
      { name: "Feedback Collection", manual_minutes: 12, optimized_minutes: 0, automation_pct: 100 },
      { name: "Reporting", manual_minutes: 30, optimized_minutes: 5, automation_pct: 83 },
    ],
    org_admin: [
      { name: "Approval Processing", manual_minutes: 20, optimized_minutes: 3, automation_pct: 85 },
      { name: "User Management", manual_minutes: 15, optimized_minutes: 5, automation_pct: 67 },
      { name: "Policy Enforcement", manual_minutes: 25, optimized_minutes: 5, automation_pct: 80 },
      { name: "Team Coordination", manual_minutes: 30, optimized_minutes: 10, automation_pct: 67 },
      { name: "Compliance Checks", manual_minutes: 40, optimized_minutes: 8, automation_pct: 80 },
      { name: "Reporting", manual_minutes: 35, optimized_minutes: 5, automation_pct: 86 },
    ],
    super_admin: [
      { name: "Tenant Monitoring", manual_minutes: 30, optimized_minutes: 0, automation_pct: 100 },
      { name: "Security Review", manual_minutes: 45, optimized_minutes: 5, automation_pct: 89 },
      { name: "Revenue Reconciliation", manual_minutes: 60, optimized_minutes: 10, automation_pct: 83 },
      { name: "Platform Config", manual_minutes: 20, optimized_minutes: 5, automation_pct: 75 },
      { name: "API Management", manual_minutes: 25, optimized_minutes: 3, automation_pct: 88 },
      { name: "System Reporting", manual_minutes: 40, optimized_minutes: 5, automation_pct: 88 },
    ],
  };
  return workflows[role] || [];
}

function computeStreak(days: any[]) {
  const completed = days.filter((d: any) => d.completed).sort((a: any, b: any) => b.day_number - a.day_number);
  let streak = 0;
  for (let i = 0; i < completed.length; i++) {
    if (i === 0 || completed[i].day_number === completed[i - 1].day_number - 1) streak++;
    else break;
  }
  return streak;
}
