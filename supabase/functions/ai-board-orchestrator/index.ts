import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { question, context } = await req.json();
    if (!question) throw new Error("question required");

    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No organisation scope found for user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull lightweight company snapshot for grounding
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: invoices }, { data: expenses }, { data: vehicles }, { data: dispatches }, { data: ar }] =
      await Promise.all([
        supabase.from("invoices").select("total_amount,status,created_at").eq("organization_id", orgId).gte("created_at", ninetyDaysAgo),
        supabase.from("expenses").select("amount,expense_date").eq("organization_id", orgId).gte("expense_date", ninetyDaysAgo),
        supabase.from("vehicles").select("status").eq("organization_id", orgId),
        supabase.from("dispatches").select("status,cost,created_at").eq("organization_id", orgId).gte("created_at", ninetyDaysAgo),
        supabase.from("accounts_receivable").select("balance,status").eq("organization_id", orgId).eq("status", "unpaid"),
      ]);

    const revenue = (invoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
    const cost = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const fleetSize = (vehicles || []).length;
    const fleetActive = (vehicles || []).filter((v) => v.status === "active").length;
    const utilization = fleetSize > 0 ? (fleetActive / fleetSize) * 100 : 0;
    const overdueAR = (ar || []).reduce((s, a) => s + (a.balance || 0), 0);
    const dispatchCount = (dispatches || []).length;

    const snapshot = `90-day snapshot:
- Revenue: ₦${(revenue / 1e6).toFixed(1)}M
- Cost: ₦${(cost / 1e6).toFixed(1)}M
- Profit: ₦${(profit / 1e6).toFixed(1)}M (${margin.toFixed(1)}% margin)
- Fleet: ${fleetSize} vehicles, ${utilization.toFixed(0)}% utilization
- Dispatches: ${dispatchCount}
- Overdue AR: ₦${(overdueAR / 1e6).toFixed(1)}M`;

    const systemPrompt = `You are the Routeace AI Board of Directors. Six AI executives debate every major strategic decision:

- CEO (Chairman): synthesizes all perspectives, makes final call
- COO: operational readiness, fleet, dispatch, delivery
- CFO: profitability, cash flow, cost, pricing
- CRO (Growth): revenue, expansion, market opportunity
- Risk Director: safety, compliance, insurance, operational risk
- CTO: systems, automation quality, data integrity

For the question, return STRICT JSON only (no prose, no fences):
{
  "ceo_view": "1-2 sentences",
  "coo_view": "1-2 sentences with operational data",
  "cfo_view": "1-2 sentences with financial impact",
  "cro_growth_view": "1-2 sentences with growth potential",
  "risk_view": "1-2 sentences with risks",
  "cto_view": "1-2 sentences with system feasibility",
  "conflict_summary": "where executives disagree (1 sentence)",
  "final_decision": "concrete action recommendation (2-3 sentences)",
  "decision_score": 0-100,
  "confidence": 0-100,
  "scenario_best": "best case in 1 sentence",
  "scenario_worst": "worst case in 1 sentence",
  "scenario_expected": "expected outcome in 1 sentence"
}

Be specific with ₦ amounts. Survival > profit > scale.`;

    const userPrompt = `${snapshot}\n\nDecision Question: ${question}\n\n${context ? `Additional context: ${JSON.stringify(context)}` : ""}`;

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: mapModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const raw = aiData.content?.[0]?.text || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    // Persist
    const { data: saved, error: insErr } = await supabase
      .from("board_decisions")
      .insert({
        question,
        context: context || {},
        ceo_view: parsed.ceo_view,
        coo_view: parsed.coo_view,
        cfo_view: parsed.cfo_view,
        cro_growth_view: parsed.cro_growth_view,
        risk_view: parsed.risk_view,
        cto_view: parsed.cto_view,
        conflict_summary: parsed.conflict_summary,
        final_decision: parsed.final_decision,
        decision_score: parsed.decision_score,
        confidence: parsed.confidence,
        scenario_best: parsed.scenario_best,
        scenario_worst: parsed.scenario_worst,
        scenario_expected: parsed.scenario_expected,
        status: "recommended",
      })
      .select()
      .single();

    if (insErr) console.error("insert error", insErr);

    return new Response(JSON.stringify({ decision: saved || parsed, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("board orchestrator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
