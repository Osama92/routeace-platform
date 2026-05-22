import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit } from "../_shared/rate-limit.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);
  const userId = user.id;

  // Phase 9: per-user rate limit (30 req/min - AI credits).
  const rl = rateLimit({ bucket: "decision-sim", identifier: userId, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "simulate";

  try {
    if (req.method === "POST" && action === "simulate") {
      let body: any;
      try { body = await req.json(); } catch (_e) { return json({ error: "Invalid request body" }, 400); }
      const { simulation_type, scenario_name, input_params } = body;

      if (!simulation_type || !scenario_name || !input_params) {
        return json({ error: "Missing required fields" }, 400);
      }

      const results = await runSimulation(supabase, simulation_type, input_params);

      const { data: sim, error: simErr } = await supabase
        .from("decision_simulations")
        .insert({
          user_id: userId,
          simulation_type,
          scenario_name,
          input_params,
          results: results.details,
          risk_level: results.risk_level,
          recommendation: results.recommendation,
          profit_impact: results.profit_impact,
          cash_impact: results.cash_impact,
          status: "completed",
        })
        .select()
        .single();

      if (simErr) return json({ error: simErr.message }, 500);
      return json({ success: true, data: sim });
    }

    if (req.method === "GET" || action === "history") {
      const { data, error } = await supabase
        .from("decision_simulations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});

async function runSimulation(supabase: any, type: string, params: any) {
  switch (type) {
    case "fleet":
      return simulateFleet(supabase, params);
    case "finance":
      return simulateFinance(supabase, params);
    case "risk":
      return simulateRisk(supabase, params);
    default:
      return { details: {}, risk_level: "low", recommendation: "No simulation available", profit_impact: 0, cash_impact: 0 };
  }
}

async function simulateFleet(supabase: any, params: any) {
  const { trucks_to_add = 0, utilization_change = 0, monthly_cost_per_truck = 500000 } = params;

  // Get current fleet data
  const { data: vehicles } = await supabase.from("vehicles").select("id, status").limit(1000);
  const currentFleet = vehicles?.length || 0;
  const activeVehicles = vehicles?.filter((v: any) => v.status === "active")?.length || 0;
  const currentUtilization = currentFleet > 0 ? (activeVehicles / currentFleet) * 100 : 0;

  // Get recent revenue data
  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select("total_amount")
    .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString())
    .eq("status", "paid");

  const quarterlyRevenue = recentInvoices?.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) || 0;
  const monthlyRevenue = quarterlyRevenue / 3;
  const revenuePerTruck = currentFleet > 0 ? monthlyRevenue / currentFleet : 0;

  const newFleetSize = currentFleet + trucks_to_add;
  const projectedUtilization = Math.max(0, Math.min(100, currentUtilization + utilization_change));
  const additionalRevenue = trucks_to_add * revenuePerTruck * (projectedUtilization / 100);
  const additionalCost = trucks_to_add * monthly_cost_per_truck;
  const profitImpact = additionalRevenue - additionalCost;
  const cashImpact = -additionalCost; // Immediate cash outflow

  const breakEvenMonths = additionalCost > 0 && additionalRevenue > additionalCost
    ? Math.ceil(additionalCost / (additionalRevenue - additionalCost))
    : additionalRevenue <= additionalCost ? -1 : 0;

  let riskLevel = "low";
  let recommendation = "";

  if (profitImpact < 0) {
    riskLevel = breakEvenMonths === -1 ? "critical" : "high";
    recommendation = breakEvenMonths === -1
      ? `DO NOT EXECUTE: Adding ${trucks_to_add} trucks will generate a net loss. Revenue per truck (₦${Math.round(revenuePerTruck).toLocaleString()}) cannot cover costs (₦${monthly_cost_per_truck.toLocaleString()}).`
      : `CAUTION: Break-even in ${breakEvenMonths} months. Consider leasing instead of purchasing.`;
  } else if (projectedUtilization < 60) {
    riskLevel = "medium";
    recommendation = `Fleet utilization at ${projectedUtilization.toFixed(0)}% is below optimal. Improve utilization before expanding fleet.`;
  } else {
    riskLevel = "low";
    recommendation = `PROCEED: Adding ${trucks_to_add} trucks projects ₦${Math.round(profitImpact).toLocaleString()}/month profit. Break-even in ${breakEvenMonths} months.`;
  }

  return {
    details: {
      current_fleet: currentFleet,
      new_fleet_size: newFleetSize,
      current_utilization: Math.round(currentUtilization),
      projected_utilization: Math.round(projectedUtilization),
      monthly_revenue_per_truck: Math.round(revenuePerTruck),
      additional_monthly_revenue: Math.round(additionalRevenue),
      additional_monthly_cost: additionalCost,
      monthly_profit_impact: Math.round(profitImpact),
      break_even_months: breakEvenMonths,
    },
    risk_level: riskLevel,
    recommendation,
    profit_impact: Math.round(profitImpact),
    cash_impact: cashImpact,
  };
}

async function simulateFinance(supabase: any, params: any) {
  const { invoice_factoring_pct = 0, expense_change_pct = 0, collection_delay_days = 0 } = params;

  // Get current financial snapshot
  const { data: arData } = await supabase.from("accounts_receivable").select("balance, status").eq("status", "unpaid");
  const totalAR = arData?.reduce((s: number, a: any) => s + (a.balance || 0), 0) || 0;

  const { data: cashData } = await supabase
    .from("cash_transactions")
    .select("amount, type")
    .gte("transaction_date", new Date(Date.now() - 30 * 86400000).toISOString());

  const monthlyInflow = cashData?.filter((c: any) => c.type === "inflow").reduce((s: number, c: any) => s + (c.amount || 0), 0) || 0;
  const monthlyOutflow = cashData?.filter((c: any) => c.type === "outflow").reduce((s: number, c: any) => s + Math.abs(c.amount || 0), 0) || 0;

  const factoringCash = totalAR * (invoice_factoring_pct / 100) * 0.95; // 5% factoring fee
  const expenseChange = monthlyOutflow * (expense_change_pct / 100);
  const delayedCollections = (monthlyInflow / 30) * collection_delay_days;

  const netCashImpact = factoringCash - expenseChange - delayedCollections;
  const currentNetFlow = monthlyInflow - monthlyOutflow;
  const projectedNetFlow = currentNetFlow + netCashImpact;

  let riskLevel = "low";
  let recommendation = "";

  if (projectedNetFlow < 0) {
    riskLevel = "critical";
    recommendation = `CASH NEGATIVE: Projected monthly deficit of ₦${Math.abs(Math.round(projectedNetFlow)).toLocaleString()}. Reduce expenses or accelerate collections immediately.`;
  } else if (projectedNetFlow < currentNetFlow * 0.5) {
    riskLevel = "high";
    recommendation = `WARNING: Cash flow drops by ${Math.round(((currentNetFlow - projectedNetFlow) / currentNetFlow) * 100)}%. Consider factoring ${Math.min(30, invoice_factoring_pct + 10)}% of receivables.`;
  } else {
    recommendation = `STABLE: Projected net cash flow ₦${Math.round(projectedNetFlow).toLocaleString()}/month. ${factoringCash > 0 ? `Factoring unlocks ₦${Math.round(factoringCash).toLocaleString()} immediately.` : ""}`;
  }

  return {
    details: {
      total_receivables: Math.round(totalAR),
      monthly_inflow: Math.round(monthlyInflow),
      monthly_outflow: Math.round(monthlyOutflow),
      current_net_flow: Math.round(currentNetFlow),
      factoring_cash_unlocked: Math.round(factoringCash),
      expense_impact: Math.round(expenseChange),
      collection_delay_impact: Math.round(delayedCollections),
      projected_net_flow: Math.round(projectedNetFlow),
    },
    risk_level: riskLevel,
    recommendation,
    profit_impact: Math.round(netCashImpact),
    cash_impact: Math.round(netCashImpact),
  };
}

async function simulateRisk(supabase: any, params: any) {
  const { payment_delay_days = 30, cost_spike_pct = 0, revenue_decline_pct = 0 } = params;

  const { data: cashData } = await supabase
    .from("cash_transactions")
    .select("amount, type")
    .gte("transaction_date", new Date(Date.now() - 30 * 86400000).toISOString());

  const monthlyInflow = cashData?.filter((c: any) => c.type === "inflow").reduce((s: number, c: any) => s + (c.amount || 0), 0) || 0;
  const monthlyOutflow = cashData?.filter((c: any) => c.type === "outflow").reduce((s: number, c: any) => s + Math.abs(c.amount || 0), 0) || 0;

  const { data: balData } = await supabase
    .from("cash_balance_daily")
    .select("closing_balance")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  const currentBalance = balData?.[0]?.closing_balance || 0;

  const delayedInflow = (monthlyInflow / 30) * payment_delay_days;
  const costIncrease = monthlyOutflow * (cost_spike_pct / 100);
  const revenueDecline = monthlyInflow * (revenue_decline_pct / 100);

  const stressedInflow = monthlyInflow - delayedInflow - revenueDecline;
  const stressedOutflow = monthlyOutflow + costIncrease;
  const stressedNetFlow = stressedInflow - stressedOutflow;

  const cashRunwayMonths = stressedNetFlow < 0
    ? Math.max(0, Math.floor(currentBalance / Math.abs(stressedNetFlow)))
    : 99;

  const cashSurvivalScore = Math.min(100, Math.max(0,
    cashRunwayMonths >= 6 ? 90 :
    cashRunwayMonths >= 3 ? 70 :
    cashRunwayMonths >= 1 ? 40 : 10
  ));

  let riskLevel = "low";
  let recommendation = "";

  if (cashRunwayMonths <= 1) {
    riskLevel = "critical";
    recommendation = `SURVIVAL MODE: Cash runs out in ${cashRunwayMonths} months. Freeze all non-essential spending. Accelerate ALL collections. Consider emergency credit line.`;
  } else if (cashRunwayMonths <= 3) {
    riskLevel = "high";
    recommendation = `HIGH RISK: ${cashRunwayMonths}-month runway under stress. Build 2-month cash buffer. Reduce non-critical expenses by 20%.`;
  } else if (cashRunwayMonths <= 6) {
    riskLevel = "medium";
    recommendation = `MODERATE RISK: ${cashRunwayMonths}-month runway. Diversify revenue sources and negotiate longer payment terms with suppliers.`;
  } else {
    recommendation = `RESILIENT: ${cashRunwayMonths}+ month runway under stress scenario. Business can withstand these conditions.`;
  }

  return {
    details: {
      current_balance: Math.round(currentBalance),
      normal_monthly_inflow: Math.round(monthlyInflow),
      normal_monthly_outflow: Math.round(monthlyOutflow),
      stressed_monthly_inflow: Math.round(stressedInflow),
      stressed_monthly_outflow: Math.round(stressedOutflow),
      stressed_net_flow: Math.round(stressedNetFlow),
      cash_runway_months: cashRunwayMonths,
      cash_survival_score: cashSurvivalScore,
    },
    risk_level: riskLevel,
    recommendation,
    profit_impact: Math.round(stressedNetFlow),
    cash_impact: Math.round(stressedNetFlow),
  };
}
