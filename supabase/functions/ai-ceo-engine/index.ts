import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits } from "../_shared/ai-credits.ts";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAuth } from "../_shared/require-auth.ts";
import { resolveCallerOrgId } from "../_shared/resolve-org.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No organisation scope found for user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // ── 1. Finance Data ──────────────────────────────────
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();

    const [
      { data: recentInvoices },
      { data: recentExpenses },
      { data: cashTxns },
      { data: overdueAR },
      { data: vehicles },
      { data: activeDispatches },
      { data: recentDispatches },
      { data: capitalFunding },
      { data: supportTickets },
      { data: pendingApprovals },
    ] = await Promise.all([
      supabase.from("invoices").select("total_amount, status, created_at, due_date, balance_due").eq("organization_id", orgId).gte("created_at", sixtyDaysAgo),
      supabase.from("expenses").select("amount, category, expense_date").eq("organization_id", orgId).gte("expense_date", sixtyDaysAgo),
      supabase.from("cash_transactions").select("amount, transaction_type, category, transaction_date").eq("organization_id", orgId).gte("transaction_date", thirtyDaysAgo),
      supabase.from("accounts_receivable").select("balance, due_date, status").eq("organization_id", orgId).eq("status", "unpaid"),
      supabase.from("vehicles").select("id, status, truck_type, vehicle_name").eq("organization_id", orgId),
      supabase.from("dispatches").select("id, status, vehicle_id, cost, created_at").eq("organization_id", orgId).in("status", ["pending", "assigned", "in_transit", "picked_up"]),
      supabase.from("dispatches").select("id, status, cost, created_at, actual_delivery").eq("organization_id", orgId).gte("created_at", thirtyDaysAgo),
      supabase.from("capital_funding").select("amount, funding_type, status, interest_rate_annual, tenure_months, total_repaid").eq("organization_id", orgId).eq("status", "active"),
      supabase.from("support_tickets").select("id, status, priority, created_at").eq("organization_id", orgId).in("status", ["open", "in_progress"]),
      supabase.from("approvals").select("id, entity_type, status").eq("organization_id", orgId).eq("status", "pending"),
    ]);

    // ── 2. Compute Financial Metrics ─────────────────────
    const totalRevenue30d = (recentInvoices || [])
      .filter(i => new Date(i.created_at) >= new Date(thirtyDaysAgo))
      .reduce((s, i) => s + (i.total_amount || 0), 0);

    const totalRevenue60d = (recentInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
    const prevMonthRevenue = totalRevenue60d - totalRevenue30d;
    const revenueGrowth = prevMonthRevenue > 0 ? ((totalRevenue30d - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    const totalExpenses30d = (recentExpenses || [])
      .filter(e => new Date(e.expense_date) >= new Date(thirtyDaysAgo))
      .reduce((s, e) => s + (e.amount || 0), 0);

    const netProfit30d = totalRevenue30d - totalExpenses30d;
    const profitMargin = totalRevenue30d > 0 ? (netProfit30d / totalRevenue30d) * 100 : 0;

    const cashInflows = (cashTxns || []).filter(t => t.transaction_type === "inflow").reduce((s, t) => s + t.amount, 0);
    const cashOutflows = (cashTxns || []).filter(t => t.transaction_type === "outflow").reduce((s, t) => s + t.amount, 0);
    const netCashFlow = cashInflows - cashOutflows;

    const totalOverdueAR = (overdueAR || []).reduce((s, a) => s + (a.balance || 0), 0);
    const overdueCount = (overdueAR || []).length;

    // Cash runway (months)
    const monthlyBurn = totalExpenses30d || 1;
    const cashRunwayDays = netCashFlow > 0 ? Math.round((netCashFlow / (monthlyBurn / 30))) : Math.round((netCashFlow + cashInflows) / (monthlyBurn / 30));

    // ── 3. Fleet Metrics ─────────────────────────────────
    const totalVehicles = (vehicles || []).length;
    const activeVehicles = (vehicles || []).filter(v => v.status === "active").length;
    const idleVehicles = totalVehicles - activeVehicles;
    const fleetUtilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

    const vehiclesInUse = new Set((activeDispatches || []).map(d => d.vehicle_id).filter(Boolean));
    const deployedRate = totalVehicles > 0 ? Math.round((vehiclesInUse.size / totalVehicles) * 100) : 0;

    const completedDispatches = (recentDispatches || []).filter(d => ["delivered", "closed"].includes(d.status));
    const tripRevenue30d = completedDispatches.reduce((s, d) => s + (d.cost || 0), 0);
    const avgRevenuePerTrip = completedDispatches.length > 0 ? Math.round(tripRevenue30d / completedDispatches.length) : 0;

    // ── 4. Debt Metrics ──────────────────────────────────
    const totalDebt = (capitalFunding || []).reduce((s, f) => s + (f.amount || 0), 0);
    const totalRepaid = (capitalFunding || []).reduce((s, f) => s + (f.total_repaid || 0), 0);
    const outstandingDebt = totalDebt - totalRepaid;
    const debtToRevenueRatio = totalRevenue30d > 0 ? Math.round((outstandingDebt / (totalRevenue30d * 12)) * 100) : 0;

    // ── 5. Risk Scoring ──────────────────────────────────
    let riskScore = 0;
    const riskFactors: string[] = [];

    if (cashRunwayDays < 30) { riskScore += 30; riskFactors.push("Cash runway below 30 days"); }
    else if (cashRunwayDays < 60) { riskScore += 15; riskFactors.push("Cash runway below 60 days"); }

    if (totalOverdueAR > totalRevenue30d * 0.3) { riskScore += 20; riskFactors.push(`₦${(totalOverdueAR/1e6).toFixed(1)}M overdue receivables`); }
    if (fleetUtilization < 60) { riskScore += 15; riskFactors.push(`Fleet utilization at ${fleetUtilization}%`); }
    if (profitMargin < 10) { riskScore += 15; riskFactors.push(`Profit margin at ${profitMargin.toFixed(1)}%`); }
    if (debtToRevenueRatio > 40) { riskScore += 20; riskFactors.push(`Debt-to-revenue ratio at ${debtToRevenueRatio}%`); }

    const riskLevel = riskScore >= 70 ? "critical" : riskScore >= 45 ? "high" : riskScore >= 25 ? "medium" : "low";

    // ── 6. Business Health Score ─────────────────────────
    const profitScore = Math.min(30, Math.max(0, profitMargin * 2));
    const cashScore = Math.min(25, Math.max(0, Math.min(cashRunwayDays, 90) / 90 * 25));
    const fleetScore = Math.min(20, fleetUtilization / 5);
    const debtScore = Math.min(15, Math.max(0, (100 - debtToRevenueRatio) / 100 * 15));
    const growthScore = Math.min(10, Math.max(0, revenueGrowth > 0 ? Math.min(revenueGrowth, 30) / 3 : 0));
    const healthScore = Math.round(profitScore + cashScore + fleetScore + debtScore + growthScore);

    // ── 7. CEO Decisions ─────────────────────────────────
    const decisions: Array<{ type: string; priority: string; title: string; description: string; action: string; impact: string }> = [];

    // Capital allocation
    if (riskLevel === "critical" || riskLevel === "high") {
      decisions.push({
        type: "risk_mitigation", priority: "critical",
        title: "Freeze Non-Essential Spending",
        description: `Risk score is ${riskScore}/100. ${riskFactors.join(". ")}.`,
        action: "FREEZE", impact: "Preserve cash runway"
      });
    }

    if (fleetUtilization < 70 && idleVehicles > 2) {
      decisions.push({
        type: "fleet_optimization", priority: "high",
        title: `Redeploy ${idleVehicles} Idle Vehicles`,
        description: `${idleVehicles} vehicles idle. Fleet utilization at ${fleetUtilization}%. Optimize before acquiring new assets.`,
        action: "OPTIMIZE", impact: `+${Math.round(idleVehicles * avgRevenuePerTrip * 0.6)}₦ potential monthly revenue`
      });
    } else if (fleetUtilization > 85 && riskLevel !== "critical" && riskLevel !== "high") {
      decisions.push({
        type: "fleet_expansion", priority: "medium",
        title: "Fleet Expansion Opportunity",
        description: `Utilization at ${fleetUtilization}%. Demand supports expansion. Consider adding 1-2 vehicles.`,
        action: "EXPAND", impact: `+${Math.round(avgRevenuePerTrip * 20)}₦ projected monthly revenue`
      });
    }

    if (totalOverdueAR > 0) {
      decisions.push({
        type: "collections", priority: overdueCount > 5 ? "critical" : "high",
        title: `Recover ₦${(totalOverdueAR/1e6).toFixed(1)}M in Overdue Receivables`,
        description: `${overdueCount} overdue invoices totaling ₦${(totalOverdueAR/1e6).toFixed(1)}M. Accelerate collections.`,
        action: "COLLECT", impact: `₦${(totalOverdueAR/1e6).toFixed(1)}M cash recovery`
      });
    }

    if (profitMargin < 10 && totalRevenue30d > 0) {
      decisions.push({
        type: "pricing", priority: "high",
        title: "Review Pricing Strategy",
        description: `Profit margin at ${profitMargin.toFixed(1)}% (target: 15%+). Review route pricing and cost structure.`,
        action: "REPRICE", impact: `+${((15 - profitMargin) / 100 * totalRevenue30d / 1e6).toFixed(1)}M potential monthly profit`
      });
    }

    if ((pendingApprovals || []).length > 10) {
      decisions.push({
        type: "governance", priority: "medium",
        title: `Clear ${(pendingApprovals || []).length} Pending Approvals`,
        description: "Approval backlog slowing operations. Review and batch-process pending items.",
        action: "APPROVE", impact: "Unblock operational pipeline"
      });
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    decisions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    // ── 8. Growth Velocity ───────────────────────────────
    const growthMode = riskLevel === "critical" ? "SURVIVAL" : riskLevel === "high" ? "STABILIZE" : revenueGrowth > 10 ? "GROWTH" : "HOLD";

    // ── 9. AI Narrative ──────────────────────────────────
    let aiNarrative = "";

    if (ANTHROPIC_API_KEY) {
      try {
        const prompt = `You are the AI CEO of a logistics company. Based on these metrics, give a 3-sentence executive briefing:
- Revenue: ₦${(totalRevenue30d/1e6).toFixed(1)}M (${revenueGrowth > 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% MoM)
- Profit Margin: ${profitMargin.toFixed(1)}%
- Cash Runway: ${cashRunwayDays} days
- Fleet Utilization: ${fleetUtilization}% (${totalVehicles} vehicles)
- Overdue Receivables: ₦${(totalOverdueAR/1e6).toFixed(1)}M
- Outstanding Debt: ₦${(outstandingDebt/1e6).toFixed(1)}M
- Risk Level: ${riskLevel} (${riskScore}/100)
- Mode: ${growthMode}
- Open Support Tickets: ${(supportTickets || []).length}
Be direct, specific with ₦ amounts, and actionable. No fluff.`;

        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: mapModel("google/gemini-3-flash-preview"),
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiNarrative = aiData.content?.[0]?.text || "";
        }
      } catch (e) {
        console.error("AI narrative failed:", e);
      }
    }

    // ── 10. Response ─────────────────────────────────────
    const response = {
      timestamp: now.toISOString(),
      mode: growthMode,
      healthScore,
      riskLevel,
      riskScore,
      riskFactors,
      aiNarrative,
      finance: {
        revenue30d: totalRevenue30d,
        expenses30d: totalExpenses30d,
        netProfit30d,
        profitMargin: Math.round(profitMargin * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        cashInflows,
        cashOutflows,
        netCashFlow,
        cashRunwayDays,
        overdueReceivables: totalOverdueAR,
        overdueCount,
      },
      fleet: {
        totalVehicles,
        activeVehicles,
        idleVehicles,
        utilization: fleetUtilization,
        deployedRate,
        activeDispatches: (activeDispatches || []).length,
        completedTrips30d: completedDispatches.length,
        avgRevenuePerTrip,
      },
      debt: {
        totalDebt,
        outstandingDebt,
        totalRepaid,
        debtToRevenueRatio,
        activeFacilities: (capitalFunding || []).length,
      },
      operations: {
        openTickets: (supportTickets || []).length,
        criticalTickets: (supportTickets || []).filter(t => t.priority === "critical").length,
        pendingApprovals: (pendingApprovals || []).length,
      },
      decisions,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI CEO Engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
