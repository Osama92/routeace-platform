import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { resolveTenantMode, blockIfLD } from "../_shared/tenant-mode.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;
    // LD tenant gate: finance score is LC-only
    const ctx = await resolveTenantMode(userId);
    const blocked = blockIfLD(ctx, "Finance score is not available for Logistics Department tenants");
    if (blocked) return blocked;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().split("T")[0];

    // Fetch all finance data in parallel
    const [invRes, arRes, expRes, billsRes, cashRes, tasksRes, transformRes] = await Promise.all([
      supabase.from("invoices").select("total_amount, status, created_at, is_posted").gte("created_at", monthStart),
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

    // ── Compute each dimension ──

    // 1. Workflow Efficiency (25%) - based on invoice posting rate + reconciliation coverage
    const totalInvoices = invoices.length;
    const postedInvoices = invoices.filter((i: any) => i.is_posted).length;
    const postingRate = totalInvoices > 0 ? (postedInvoices / totalInvoices) * 100 : 50;
    const paidInvoices = invoices.filter((i: any) => i.status === "paid").length;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 50;
    const workflowEfficiency = Math.min(100, Math.round((postingRate * 0.5 + collectionRate * 0.5)));

    // 2. Automation Level (20%) - based on auto-posted invoices + transformation progress
    const autoPosted = invoices.filter((i: any) => i.is_posted).length;
    const autoRate = totalInvoices > 0 ? (autoPosted / totalInvoices) * 100 : 30;
    const transformComplete = transformDays.filter((d: any) => d.completed).length;
    const transformRate = transformDays.length > 0 ? (transformComplete / transformDays.length) * 100 : 0;
    const automationLevel = Math.min(100, Math.round(autoRate * 0.6 + transformRate * 0.4));

    // 3. Decision Accuracy (20%) - based on overdue ratio + expense control
    const totalAR = ar.length;
    const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now).length;
    const overdueRatio = totalAR > 0 ? (overdueAR / totalAR) : 0;
    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
    const totalExpensed = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const expenseRatio = totalInvoiced > 0 ? Math.min(1, totalExpensed / totalInvoiced) : 0.5;
    const decisionAccuracy = Math.min(100, Math.round((1 - overdueRatio) * 60 + (1 - expenseRatio) * 40));

    // 4. Cash Flow Health (15%)
    const cashInflows = cashTxns.filter((t: any) => t.transaction_type === "inflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const cashOutflows = cashTxns.filter((t: any) => t.transaction_type === "outflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const monthlyObligations = totalExpensed + unpaidBills;
    const netCash = cashInflows - cashOutflows;
    const cashFlowHealth = monthlyObligations > 0
      ? Math.min(100, Math.max(0, Math.round((netCash > 0 ? netCash : cashInflows) / monthlyObligations * 100)))
      : cashInflows > 0 ? 100 : 50;

    // 5. Risk Score (10%) - based on resolved risks
    const risksDetected = (overdueAR > 0 ? 1 : 0) + (unpaidBills > netCash && unpaidBills > 0 ? 1 : 0) + (totalExpensed > totalInvoiced && totalInvoiced > 0 ? 1 : 0);
    const risksResolved = (overdueAR === 0 ? 1 : 0) + (unpaidBills <= netCash || unpaidBills === 0 ? 1 : 0) + (totalExpensed <= totalInvoiced || totalInvoiced === 0 ? 1 : 0);
    const riskScore = risksDetected > 0 ? Math.round((risksResolved / 3) * 100) : 100;

    // 6. Execution Score (10%) - based on task completion
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
    const executionScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 50;

    // Upsert score
    const { error: upsertError } = await supabase.from("fm_performance_scores").upsert({
      user_id: userId,
      score_date: today,
      workflow_efficiency: workflowEfficiency,
      automation_level: automationLevel,
      decision_accuracy: decisionAccuracy,
      cash_flow_health: cashFlowHealth,
      risk_score: riskScore,
      execution_score: executionScore,
    }, { onConflict: "user_id,score_date" });

    if (upsertError) throw upsertError;

    // Compute total for response
    const totalScore = Math.round(
      workflowEfficiency * 0.25 +
      automationLevel * 0.20 +
      decisionAccuracy * 0.20 +
      cashFlowHealth * 0.15 +
      riskScore * 0.10 +
      executionScore * 0.10
    );

    return new Response(JSON.stringify({
      total_score: totalScore,
      workflow_efficiency: workflowEfficiency,
      automation_level: automationLevel,
      decision_accuracy: decisionAccuracy,
      cash_flow_health: cashFlowHealth,
      risk_score: riskScore,
      execution_score: executionScore,
      computed_at: now.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Score computation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
