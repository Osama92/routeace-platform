import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { resolveTenantMode, blockIfLD } from "../_shared/tenant-mode.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

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

    // Phase 9: per-user rate limit (30 req/min - AI credits).
    const rl = rateLimit({ bucket: "fm-ai-copilot", identifier: userId, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) return rl.response!;
    // LD tenant gate: finance copilot is LC-only
    const ctx = await resolveTenantMode(userId);
    const blocked = blockIfLD(ctx, "Finance copilot is not available for Logistics Department tenants");
    if (blocked) return blocked;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Gather finance data
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
    const cashTxns = cashRes.data || [];

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
    const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
    const outstandingAR = ar.filter((r: any) => r.status !== "paid").reduce((s: number, r: any) => s + (r.balance || 0), 0);
    const overdueAR = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now).length;
    const overdueAmount = ar.filter((r: any) => r.due_date && r.status !== "paid" && new Date(r.due_date) < now)
      .reduce((s: number, r: any) => s + (r.balance || 0), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const unpaidBills = bills.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const cashInflows = cashTxns.filter((t: any) => t.transaction_type === "inflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const cashOutflows = cashTxns.filter((t: any) => t.transaction_type === "outflow").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const netCash = cashInflows - cashOutflows;

    // Build AI-driven tasks based on actual financial data
    const newTasks: { user_id: string; source: string; title: string; description: string; priority: string; category: string }[] = [];

    // Cash collection tasks
    if (overdueAR > 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: `Follow up on ${overdueAR} overdue receivable(s)`,
        description: `₦${(overdueAmount / 1e6).toFixed(1)}M is overdue. Contact customers to accelerate collection.`,
        priority: overdueAR > 5 ? "critical" : "high",
        category: "collections",
      });
    }

    // Cash gap warning
    if (unpaidBills > netCash && unpaidBills > 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: "Address cash gap - bills exceed available cash",
        description: `Unpaid bills (₦${(unpaidBills / 1e6).toFixed(1)}M) exceed net cash (₦${(netCash / 1e6).toFixed(1)}M). Prioritize collections or defer payments.`,
        priority: "critical",
        category: "cash_flow",
      });
    }

    // Expense control
    if (totalExpenses > totalPaid && totalPaid > 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: "Review expense overshoot",
        description: `Expenses (₦${(totalExpenses / 1e6).toFixed(1)}M) exceed collections (₦${(totalPaid / 1e6).toFixed(1)}M). Review non-essential spend.`,
        priority: "high",
        category: "expenses",
      });
    }

    // Outstanding AR concentration
    if (outstandingAR > totalInvoiced * 0.5 && totalInvoiced > 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: "High receivables concentration",
        description: `Outstanding AR (₦${(outstandingAR / 1e6).toFixed(1)}M) is over 50% of invoiced amount. Review customer payment terms.`,
        priority: "medium",
        category: "receivables",
      });
    }

    // Revenue growth check
    if (totalInvoiced === 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: "No invoices this month - create dispatches",
        description: "No revenue has been invoiced this period. Create dispatches and raise invoices to start revenue tracking.",
        priority: "high",
        category: "revenue",
      });
    }

    // Month-end task
    const dayOfMonth = now.getDate();
    if (dayOfMonth >= 25) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: "Prepare for month-end closing",
        description: "Month-end approaching. Reconcile accounts, verify tax computations, and prepare period closing.",
        priority: "medium",
        category: "compliance",
      });
    }

    // Bill payment timing
    if (unpaidBills > 0) {
      newTasks.push({
        user_id: userId,
        source: "ai",
        title: `Schedule payment for ₦${(unpaidBills / 1e6).toFixed(1)}M in unpaid bills`,
        description: "Review unpaid vendor bills and schedule payments to avoid late penalties.",
        priority: "medium",
        category: "payables",
      });
    }

    // Insert tasks (skip duplicates by checking title)
    let tasksCreated = 0;
    for (const task of newTasks) {
      // Check if similar task already exists and is pending
      const { data: existing } = await supabase
        .from("fm_ai_tasks")
        .select("id")
        .eq("user_id", userId)
        .eq("title", task.title)
        .eq("status", "pending")
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from("fm_ai_tasks").insert(task);
        if (!error) tasksCreated++;
      }
    }

    return new Response(JSON.stringify({
      tasksCreated,
      totalAnalyzed: newTasks.length,
      snapshot: {
        totalInvoiced: Math.round(totalInvoiced),
        totalPaid: Math.round(totalPaid),
        outstandingAR: Math.round(outstandingAR),
        overdueAR,
        totalExpenses: Math.round(totalExpenses),
        netCash: Math.round(netCash),
        unpaidBills: Math.round(unpaidBills),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI Co-Pilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
