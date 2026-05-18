// Unified Finance Manager API - /fm-api?route=<path>&method=<GET|POST>
// REST-style routing via query params for all FM OS modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify({ success: status < 400, data, meta: { version: "v1", timestamp: new Date().toISOString() } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

const err = (msg: string, code: string, status = 400) =>
  new Response(
    JSON.stringify({ success: false, error: { code, message: msg }, meta: { version: "v1", timestamp: new Date().toISOString() } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const route = url.searchParams.get("route") || "/";
  const method = req.method;

  // ── Auth ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return err("Missing authorization", "UNAUTHORIZED", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("Invalid token", "UNAUTHORIZED", 401);

  const userId = user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const today = now.toISOString().split("T")[0];

  try {
    // ── ROUTE: /score ─────────────────────────────────────────────
    if (route === "/score" && method === "GET") {
      return await handleGetScore(supabase, userId, today, now, monthStart);
    }
    if (route === "/score/history" && method === "GET") {
      const limit = Number(url.searchParams.get("limit") || "30");
      const { data } = await supabase
        .from("fm_performance_scores")
        .select("*")
        .eq("user_id", userId)
        .order("score_date", { ascending: false })
        .limit(Math.min(limit, 100));
      return json(data || []);
    }

    // ── ROUTE: /finance/pnl ───────────────────────────────────────
    if (route === "/finance/pnl" && method === "GET") {
      const period = url.searchParams.get("period") || "monthly";
      return await handlePnL(supabase, period, now);
    }

    // ── ROUTE: /finance/cashflow ──────────────────────────────────
    if (route === "/finance/cashflow" && method === "GET") {
      const [cashRes, arRes, billsRes] = await Promise.all([
        supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("accounts_receivable").select("balance, status, due_date, amount_due"),
        supabase.from("bills").select("total_amount, payment_status, due_date"),
      ]);
      const cash = cashRes.data || [];
      const ar = arRes.data || [];
      const bills = billsRes.data || [];
      const inflows = cash.filter((t: any) => t.transaction_type === "inflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const outflows = cash.filter((t: any) => t.transaction_type === "outflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const outstandingAR = ar.filter((r: any) => r.status !== "paid").reduce((s: number, r: any) => s + (r.balance || 0), 0);
      const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
      return json({
        net_cash: inflows - outflows,
        total_inflows: inflows,
        total_outflows: outflows,
        outstanding_receivables: outstandingAR,
        unpaid_bills: unpaidBills,
        cash_health: unpaidBills > 0 ? Math.round(((inflows - outflows) / unpaidBills) * 100) : 100,
        recent_transactions: cash.slice(0, 20),
      });
    }

    // ── ROUTE: /finance/receivables ───────────────────────────────
    if (route === "/finance/receivables" && method === "GET") {
      const { data } = await supabase.from("accounts_receivable").select("*, customers(company_name)").order("created_at", { ascending: false }).limit(200);
      const ar = data || [];
      const overdue = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now);
      return json({
        items: ar,
        summary: {
          total: ar.reduce((s: number, r: any) => s + (r.amount_due || 0), 0),
          outstanding: ar.filter((r: any) => r.status !== "paid").reduce((s: number, r: any) => s + (r.balance || 0), 0),
          overdue_count: overdue.length,
          overdue_amount: overdue.reduce((s: number, r: any) => s + (r.balance || 0), 0),
        },
      });
    }

    // ── ROUTE: /finance/bills ─────────────────────────────────────
    if (route === "/finance/bills" && method === "GET") {
      const { data } = await supabase.from("bills").select("*").order("created_at", { ascending: false }).limit(200);
      const bills = data || [];
      return json({
        items: bills,
        summary: {
          total: bills.reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
          unpaid: bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
          paid: bills.filter((b: any) => b.payment_status === "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
        },
      });
    }

    // ── ROUTE: /tasks ─────────────────────────────────────────────
    if (route === "/tasks" && method === "GET") {
      const status = url.searchParams.get("status");
      let q = supabase.from("fm_ai_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
      if (status) q = q.eq("status", status);
      const { data } = await q;
      const tasks = data || [];
      const completed = tasks.filter((t: any) => t.status === "completed").length;
      return json({
        items: tasks,
        summary: { total: tasks.length, completed, pending: tasks.length - completed, execution_score: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0 },
      });
    }
    if (route.startsWith("/tasks/") && route.endsWith("/complete") && method === "POST") {
      const taskId = route.replace("/tasks/", "").replace("/complete", "");
      const { error: upErr } = await supabase
        .from("fm_ai_tasks")
        .update({ status: "completed", completed_at: now.toISOString() })
        .eq("id", taskId)
        .eq("user_id", userId);
      if (upErr) return err(upErr.message, "UPDATE_FAILED");
      return json({ id: taskId, status: "completed" });
    }

    // ── ROUTE: /risks ─────────────────────────────────────────────
    if (route === "/risks" && method === "GET") {
      return await handleRisks(supabase, now, monthStart);
    }
    if (route.startsWith("/risks/") && route.endsWith("/resolve") && method === "POST") {
      // Risks are computed dynamically - acknowledge resolution
      const body = await req.json().catch(() => ({}));
      await admin.from("audit_logs").insert({
        action: "risk_resolved",
        table_name: "fm_risks",
        record_id: route.replace("/risks/", "").replace("/resolve", ""),
        user_id: userId,
        user_email: user.email,
        new_data: body,
      });
      return json({ resolved: true });
    }

    // ── ROUTE: /transformation ────────────────────────────────────
    if (route === "/transformation" && method === "GET") {
      const { data } = await supabase.from("fm_transformation_days").select("*").eq("user_id", userId).order("day_number", { ascending: true });
      const days = data || [];
      const completed = days.filter((d: any) => d.completed).length;
      const currentStreak = computeStreak(days);
      return json({
        days,
        summary: { total: 28, completed, remaining: 28 - completed, streak: currentStreak, progress_pct: Math.round((completed / 28) * 100) },
      });
    }
    if (route.startsWith("/transformation/") && route.endsWith("/complete") && method === "POST") {
      const dayNum = parseInt(route.replace("/transformation/", "").replace("/complete", ""));
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 28) return err("Invalid day", "INVALID_DAY");
      const body = await req.json().catch(() => ({}));
      const { error: upErr } = await supabase
        .from("fm_transformation_days")
        .update({ completed: true, completed_at: now.toISOString(), time_spent_minutes: body.time_spent || 15 })
        .eq("user_id", userId)
        .eq("day_number", dayNum);
      if (upErr) return err(upErr.message, "UPDATE_FAILED");
      return json({ day: dayNum, completed: true });
    }

    // ── ROUTE: /ai/insights ───────────────────────────────────────
    if (route === "/ai/insights" && method === "GET") {
      return await handleInsights(supabase, now, monthStart);
    }
    if (route === "/ai/insights/generate" && method === "POST") {
      // Trigger co-pilot logic inline
      return await handleGenerateInsights(supabase, userId, now, monthStart);
    }

    // ── ROUTE: /ai/recommendations ────────────────────────────────
    if (route === "/ai/recommendations" && method === "GET") {
      const { data: tasks } = await supabase.from("fm_ai_tasks").select("*").eq("user_id", userId).eq("source", "ai").eq("status", "pending").order("created_at", { ascending: false }).limit(10);
      return json(tasks || []);
    }

    // ── ROUTE: /finance/workflows ─────────────────────────────────
    if (route === "/finance/workflows" && method === "GET") {
      return json(getWorkflowBenchmarks());
    }

    // ── ROUTE: /events (internal event bus) ───────────────────────
    if (route === "/events" && method === "POST") {
      const body = await req.json();
      if (!body.event_type) return err("event_type required", "MISSING_FIELD");
      await admin.from("audit_logs").insert({
        action: `fm_event:${body.event_type}`,
        table_name: "fm_events",
        record_id: body.entity_id || userId,
        user_id: userId,
        user_email: user.email,
        new_data: body,
      });
      return json({ acknowledged: true, event_type: body.event_type });
    }

    return err(`Unknown route: ${route}`, "NOT_FOUND", 404);
  } catch (e) {
    console.error("FM API Error:", e);
    return err(e instanceof Error ? e.message : "Internal error", "INTERNAL_ERROR", 500);
  }
});

// ── Handler: Score computation ──────────────────────────────────────
async function handleGetScore(supabase: any, userId: string, today: string, now: Date, monthStart: string) {
  const [invRes, arRes, expRes, billsRes, cashRes, tasksRes, transformRes] = await Promise.all([
    supabase.from("invoices").select("total_amount, status, is_posted").gte("created_at", monthStart),
    supabase.from("accounts_receivable").select("balance, status, due_date, amount_due"),
    supabase.from("expenses").select("amount").gte("created_at", monthStart),
    supabase.from("bills").select("total_amount, payment_status").gte("created_at", monthStart),
    supabase.from("cash_transactions").select("amount, transaction_type").gte("created_at", monthStart),
    supabase.from("fm_ai_tasks").select("status").eq("user_id", userId),
    supabase.from("fm_transformation_days").select("completed").eq("user_id", userId),
  ]);

  const invoices = invRes.data || [];
  const ar = arRes.data || [];
  const expenses = expRes.data || [];
  const bills = billsRes.data || [];
  const cashTxns = cashRes.data || [];
  const tasks = tasksRes.data || [];
  const transformDays = transformRes.data || [];

  const totalInv = invoices.length;
  const posted = invoices.filter((i: any) => i.is_posted).length;
  const paid = invoices.filter((i: any) => i.status === "paid").length;
  const postRate = totalInv > 0 ? (posted / totalInv) * 100 : 50;
  const collectRate = totalInv > 0 ? (paid / totalInv) * 100 : 50;
  const workflowEfficiency = Math.min(100, Math.round(postRate * 0.5 + collectRate * 0.5));

  const transformComplete = transformDays.filter((d: any) => d.completed).length;
  const transformRate = transformDays.length > 0 ? (transformComplete / transformDays.length) * 100 : 0;
  const automationLevel = Math.min(100, Math.round((totalInv > 0 ? (posted / totalInv) * 100 : 30) * 0.6 + transformRate * 0.4));

  const totalAR = ar.length;
  const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now).length;
  const overdueRatio = totalAR > 0 ? overdueAR / totalAR : 0;
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalExpensed = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const expenseRatio = totalInvoiced > 0 ? Math.min(1, totalExpensed / totalInvoiced) : 0.5;
  const decisionAccuracy = Math.min(100, Math.round((1 - overdueRatio) * 60 + (1 - expenseRatio) * 40));

  const cashIn = cashTxns.filter((t: any) => t.transaction_type === "inflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const cashOut = cashTxns.filter((t: any) => t.transaction_type === "outflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const monthlyOb = totalExpensed + unpaidBills;
  const netCash = cashIn - cashOut;
  const cashFlowHealth = monthlyOb > 0 ? Math.min(100, Math.max(0, Math.round((netCash > 0 ? netCash : cashIn) / monthlyOb * 100))) : cashIn > 0 ? 100 : 50;

  const risksDet = (overdueAR > 0 ? 1 : 0) + (unpaidBills > netCash && unpaidBills > 0 ? 1 : 0) + (totalExpensed > totalInvoiced && totalInvoiced > 0 ? 1 : 0);
  const risksRes = (overdueAR === 0 ? 1 : 0) + (unpaidBills <= netCash || unpaidBills === 0 ? 1 : 0) + (totalExpensed <= totalInvoiced || totalInvoiced === 0 ? 1 : 0);
  const riskScore = risksDet > 0 ? Math.round((risksRes / 3) * 100) : 100;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const executionScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 50;

  const totalScore = Math.round(
    workflowEfficiency * 0.25 + automationLevel * 0.20 + decisionAccuracy * 0.20 +
    cashFlowHealth * 0.15 + riskScore * 0.10 + executionScore * 0.10
  );

  const rankLevel = totalScore >= 90 ? "elite_operator" : totalScore >= 75 ? "advanced_operator" : totalScore >= 50 ? "operator" : "beginner";

  // Upsert score
  await supabase.from("fm_performance_scores").upsert({
    user_id: userId, score_date: today,
    workflow_efficiency: workflowEfficiency, automation_level: automationLevel,
    decision_accuracy: decisionAccuracy, cash_flow_health: cashFlowHealth,
    risk_score: riskScore, execution_score: executionScore,
    total_score: totalScore, rank_level: rankLevel,
  }, { onConflict: "user_id,score_date" });

  return json({
    total_score: totalScore,
    rank_level: rankLevel,
    breakdown: { workflow: workflowEfficiency, automation: automationLevel, decision: decisionAccuracy, cash: cashFlowHealth, risk: riskScore, execution: executionScore },
  });
}

// ── Handler: PnL ────────────────────────────────────────────────────
async function handlePnL(supabase: any, period: string, now: Date) {
  const ranges: Record<string, string> = {
    weekly: new Date(now.getTime() - 7 * 86400000).toISOString(),
    monthly: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    quarterly: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString(),
    yearly: new Date(now.getFullYear(), 0, 1).toISOString(),
  };
  const start = ranges[period] || ranges.monthly;

  const [invRes, expRes] = await Promise.all([
    supabase.from("invoices").select("total_amount, tax_amount, subtotal, status").gte("created_at", start),
    supabase.from("expenses").select("amount, category").gte("created_at", start),
  ]);

  const invoices = invRes.data || [];
  const expenses = expRes.data || [];
  const revenue = invoices.reduce((s: number, i: any) => s + (i.subtotal || i.total_amount || 0), 0);
  const tax = invoices.reduce((s: number, i: any) => s + (i.tax_amount || 0), 0);
  const totalExpense = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  expenses.forEach((e: any) => { byCategory[e.category || "uncategorized"] = (byCategory[e.category || "uncategorized"] || 0) + (e.amount || 0); });

  return json({
    period, revenue, tax, total_expense: totalExpense,
    gross_profit: revenue - totalExpense,
    net_profit: revenue - totalExpense - tax,
    margin_pct: revenue > 0 ? Math.round(((revenue - totalExpense) / revenue) * 100) : 0,
    expense_breakdown: byCategory,
    invoice_count: invoices.length,
  });
}

// ── Handler: Risks ──────────────────────────────────────────────────
async function handleRisks(supabase: any, now: Date, monthStart: string) {
  const [arRes, billsRes, cashRes, expRes, invRes] = await Promise.all([
    supabase.from("accounts_receivable").select("balance, status, due_date"),
    supabase.from("bills").select("total_amount, payment_status, due_date"),
    supabase.from("cash_transactions").select("amount, transaction_type").gte("created_at", monthStart),
    supabase.from("expenses").select("amount").gte("created_at", monthStart),
    supabase.from("invoices").select("total_amount").gte("created_at", monthStart),
  ]);

  const ar = arRes.data || [];
  const bills = billsRes.data || [];
  const cash = cashRes.data || [];
  const expenses = expRes.data || [];
  const invoices = invRes.data || [];

  const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now);
  const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid");
  const netCash = cash.reduce((s: number, t: any) => s + (t.transaction_type === "inflow" ? t.amount : -t.amount), 0);
  const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalRev = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalUnpaid = unpaidBills.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);

  const risks: any[] = [];
  if (overdueAR.length > 0)
    risks.push({ id: "overdue_ar", type: "cash_collection", severity: overdueAR.length > 5 ? "high" : "medium", message: `${overdueAR.length} overdue receivable(s) totaling ₦${(overdueAR.reduce((s: number, r: any) => s + (r.balance || 0), 0) / 1e6).toFixed(1)}M`, resolved: false });
  if (totalUnpaid > netCash && totalUnpaid > 0)
    risks.push({ id: "cash_gap", type: "liquidity", severity: "high", message: `Unpaid bills (₦${(totalUnpaid / 1e6).toFixed(1)}M) exceed net cash (₦${(netCash / 1e6).toFixed(1)}M)`, resolved: false });
  if (totalExp > totalRev && totalRev > 0)
    risks.push({ id: "expense_overshoot", type: "profitability", severity: "medium", message: `Expenses exceed revenue by ₦${((totalExp - totalRev) / 1e6).toFixed(1)}M`, resolved: false });

  const resolved = 3 - risks.length;
  return json({ risks, summary: { total: 3, detected: risks.length, resolved, risk_score: Math.round((resolved / 3) * 100) } });
}

// ── Handler: AI Insights ────────────────────────────────────────────
async function handleInsights(supabase: any, now: Date, monthStart: string) {
  const [invRes, arRes, expRes, cashRes] = await Promise.all([
    supabase.from("invoices").select("total_amount, status, subtotal").gte("created_at", monthStart),
    supabase.from("accounts_receivable").select("balance, status, due_date, amount_due"),
    supabase.from("expenses").select("amount, category").gte("created_at", monthStart),
    supabase.from("cash_transactions").select("amount, transaction_type").gte("created_at", monthStart),
  ]);

  const invoices = invRes.data || [];
  const ar = arRes.data || [];
  const expenses = expRes.data || [];
  const cash = cashRes.data || [];

  const totalRev = invoices.reduce((s: number, i: any) => s + (i.subtotal || i.total_amount || 0), 0);
  const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const netCash = cash.reduce((s: number, t: any) => s + (t.transaction_type === "inflow" ? t.amount : -t.amount), 0);
  const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now);
  const overdueAmt = overdueAR.reduce((s: number, r: any) => s + (r.balance || 0), 0);

  const insights: any[] = [];
  if (netCash > 0 && totalExp > 0) {
    const runway = Math.round(netCash / (totalExp / 30));
    insights.push({ type: "cash_runway", priority: runway < 30 ? "high" : "medium", message: `Cash runway: ${runway} days at current expense rate`, actionable: runway < 30 });
  }
  if (overdueAR.length > 0)
    insights.push({ type: "collection_risk", priority: "high", message: `₦${(overdueAmt / 1e6).toFixed(1)}M overdue across ${overdueAR.length} customer(s)`, actionable: true });
  if (totalRev > totalExp * 1.5)
    insights.push({ type: "growth_signal", priority: "low", message: `Healthy margin - revenue is ${((totalRev / totalExp) * 100).toFixed(0)}% of expenses. Consider expansion.`, actionable: true });
  if (totalExp > totalRev && totalRev > 0)
    insights.push({ type: "expense_alert", priority: "high", message: `Expenses exceed revenue by ${(((totalExp - totalRev) / totalRev) * 100).toFixed(0)}%. Review cost centers.`, actionable: true });

  return json({ insights, generated_at: now.toISOString() });
}

// ── Handler: Generate AI tasks ──────────────────────────────────────
async function handleGenerateInsights(supabase: any, userId: string, now: Date, monthStart: string) {
  const [invRes, arRes, expRes, billsRes, cashRes] = await Promise.all([
    supabase.from("invoices").select("total_amount, status").gte("created_at", monthStart),
    supabase.from("accounts_receivable").select("balance, status, due_date"),
    supabase.from("expenses").select("amount").gte("created_at", monthStart),
    supabase.from("bills").select("total_amount, payment_status").gte("created_at", monthStart),
    supabase.from("cash_transactions").select("amount, transaction_type").gte("created_at", monthStart),
  ]);

  const invoices = invRes.data || [];
  const ar = arRes.data || [];
  const expenses = expRes.data || [];
  const bills = billsRes.data || [];
  const cash = cashRes.data || [];

  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now);
  const overdueAmt = overdueAR.reduce((s: number, r: any) => s + (r.balance || 0), 0);
  const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const netCash = cash.reduce((s: number, t: any) => s + (t.transaction_type === "inflow" ? t.amount : -t.amount), 0);

  const newTasks: any[] = [];
  if (overdueAR.length > 0) newTasks.push({ user_id: userId, source: "ai", title: `Follow up ${overdueAR.length} overdue receivable(s)`, description: `₦${(overdueAmt / 1e6).toFixed(1)}M overdue`, priority: overdueAR.length > 5 ? "critical" : "high", category: "collections" });
  if (unpaidBills > netCash && unpaidBills > 0) newTasks.push({ user_id: userId, source: "ai", title: "Address cash gap", description: `Bills ₦${(unpaidBills / 1e6).toFixed(1)}M > cash ₦${(netCash / 1e6).toFixed(1)}M`, priority: "critical", category: "cash_flow" });
  if (totalExp > totalPaid && totalPaid > 0) newTasks.push({ user_id: userId, source: "ai", title: "Review expense overshoot", description: `Expenses exceed collections`, priority: "high", category: "expenses" });
  if (now.getDate() >= 25) newTasks.push({ user_id: userId, source: "ai", title: "Month-end closing prep", description: "Reconcile, verify taxes, close period", priority: "medium", category: "compliance" });

  let created = 0;
  for (const task of newTasks) {
    const { data: ex } = await supabase.from("fm_ai_tasks").select("id").eq("user_id", userId).eq("title", task.title).eq("status", "pending").limit(1);
    if (!ex || ex.length === 0) {
      await supabase.from("fm_ai_tasks").insert(task);
      created++;
    }
  }

  return json({ tasks_created: created, tasks_analyzed: newTasks.length });
}

// ── Utility: Workflow benchmarks ────────────────────────────────────
function getWorkflowBenchmarks() {
  return [
    { name: "Invoice Posting", manual_minutes: 25, optimized_minutes: 3, automation_pct: 88 },
    { name: "AR Follow-up", manual_minutes: 45, optimized_minutes: 10, automation_pct: 78 },
    { name: "Expense Classification", manual_minutes: 30, optimized_minutes: 5, automation_pct: 83 },
    { name: "Month-End Reconciliation", manual_minutes: 120, optimized_minutes: 20, automation_pct: 83 },
    { name: "Tax Computation", manual_minutes: 60, optimized_minutes: 8, automation_pct: 87 },
    { name: "Cash Flow Reporting", manual_minutes: 40, optimized_minutes: 5, automation_pct: 88 },
    { name: "PnL Generation", manual_minutes: 35, optimized_minutes: 2, automation_pct: 94 },
    { name: "Bill Payment Processing", manual_minutes: 20, optimized_minutes: 5, automation_pct: 75 },
  ];
}

// ── Utility: Streak computation ─────────────────────────────────────
function computeStreak(days: any[]) {
  const completed = days.filter((d: any) => d.completed).sort((a: any, b: any) => b.day_number - a.day_number);
  let streak = 0;
  for (let i = 0; i < completed.length; i++) {
    if (i === 0 || completed[i].day_number === completed[i - 1].day_number - 1) streak++;
    else break;
  }
  return streak;
}
