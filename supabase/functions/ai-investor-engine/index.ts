import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Forbidden: no organization scope" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const t30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const t60 = new Date(now.getTime() - 60 * 86400000).toISOString();
    const t90 = new Date(now.getTime() - 90 * 86400000).toISOString();
    const t365 = new Date(now.getTime() - 365 * 86400000).toISOString();

    const [{ data: inv90 }, { data: exp90 }, { data: invYear }, { data: cust }, { data: vehicles }, { data: cash }] =
      await Promise.all([
        supabase.from("invoices").select("total_amount,created_at").eq("organization_id", orgId).gte("created_at", t90),
        supabase.from("expenses").select("amount,expense_date").eq("organization_id", orgId).gte("expense_date", t90),
        supabase.from("invoices").select("total_amount,created_at").eq("organization_id", orgId).gte("created_at", t365),
        supabase.from("customers").select("id,created_at").eq("organization_id", orgId),
        supabase.from("vehicles").select("id,status").eq("organization_id", orgId),
        supabase.from("cash_transactions").select("amount,transaction_type,transaction_date").eq("organization_id", orgId).gte("transaction_date", t30),
      ]);

    const rev30 = (inv90 || []).filter((i) => new Date(i.created_at) >= new Date(t30)).reduce((s, i) => s + (i.total_amount || 0), 0);
    const rev3060 = (inv90 || []).filter((i) => {
      const d = new Date(i.created_at);
      return d >= new Date(t60) && d < new Date(t30);
    }).reduce((s, i) => s + (i.total_amount || 0), 0);
    const revGrowth = rev3060 > 0 ? ((rev30 - rev3060) / rev3060) * 100 : 0;
    const annualRev = (invYear || []).reduce((s, i) => s + (i.total_amount || 0), 0);
    const exp30 = (exp90 || []).filter((e) => new Date(e.expense_date) >= new Date(t30)).reduce((s, e) => s + (e.amount || 0), 0);
    const profit30 = rev30 - exp30;
    const margin = rev30 > 0 ? (profit30 / rev30) * 100 : 0;
    const inflow = (cash || []).filter((c) => c.transaction_type === "inflow").reduce((s, c) => s + (c.amount || 0), 0);
    const outflow = (cash || []).filter((c) => c.transaction_type === "outflow").reduce((s, c) => s + (c.amount || 0), 0);
    const netCash = inflow - outflow;
    const burnRate = exp30 || 1;
    const runwayMonths = netCash > 0 ? netCash / burnRate : 0;
    const customerCount = (cust || []).length;
    const fleetSize = (vehicles || []).length;

    // Readiness score (0-100)
    let readiness = 0;
    if (revGrowth > 20) readiness += 25;
    else if (revGrowth > 10) readiness += 15;
    else if (revGrowth > 0) readiness += 8;
    if (margin > 15) readiness += 20;
    else if (margin > 5) readiness += 12;
    else if (margin > 0) readiness += 5;
    if (annualRev > 100_000_000) readiness += 20;
    else if (annualRev > 50_000_000) readiness += 12;
    else if (annualRev > 10_000_000) readiness += 6;
    if (customerCount > 50) readiness += 15;
    else if (customerCount > 20) readiness += 8;
    if (fleetSize > 20) readiness += 10;
    else if (fleetSize > 5) readiness += 5;
    if (runwayMonths > 6) readiness += 10;
    readiness = Math.min(100, Math.round(readiness));

    // Stage
    const stage =
      annualRev > 500_000_000 ? "Growth" :
      annualRev > 100_000_000 ? "Early Growth" :
      annualRev > 20_000_000 ? "Seed+" :
      "Seed";

    // Valuation: revenue multiple based on growth
    const multiple = revGrowth > 30 ? 8 : revGrowth > 15 ? 6 : revGrowth > 5 ? 4 : 2.5;
    const valLow = Math.round(annualRev * multiple * 0.8);
    const valHigh = Math.round(annualRev * multiple * 1.2);

    // Recommended action
    let recommendedAction = "hold";
    if (runwayMonths < 6) recommendedAction = "raise_urgent";
    else if (revGrowth > 20 && readiness > 60) recommendedAction = "raise_growth";
    else if (margin > 20 && revGrowth > 10) recommendedAction = "self_fund_scale";
    else if (readiness < 40) recommendedAction = "improve_metrics";

    const recommendedRaise =
      recommendedAction === "raise_urgent" ? Math.round(burnRate * 12) :
      recommendedAction === "raise_growth" ? Math.round(annualRev * 0.5) :
      0;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (revGrowth > 15) strengths.push(`Revenue growing ${revGrowth.toFixed(1)}% MoM`);
    if (margin > 15) strengths.push(`Healthy ${margin.toFixed(1)}% profit margin`);
    if (customerCount > 30) strengths.push(`${customerCount} active customers`);
    if (fleetSize > 10) strengths.push(`${fleetSize}-vehicle operating fleet`);
    if (revGrowth < 5) weaknesses.push("Slow revenue growth");
    if (margin < 10) weaknesses.push(`Thin margin (${margin.toFixed(1)}%)`);
    if (runwayMonths < 6) weaknesses.push(`Only ${runwayMonths.toFixed(1)}mo runway`);
    if (customerCount < 20) weaknesses.push("Low customer concentration");

    const targetInvestors = [
      { name: "African Logistics Ventures", fit: "high", focus: "Logistics + AI in Africa" },
      { name: "Mobility Tech Fund", fit: "high", focus: "Fleet + mobility platforms" },
      { name: "Emerging Markets Growth", fit: "medium", focus: "Series A in emerging markets" },
    ];

    const useOfFunds = recommendedRaise > 0 ? {
      market_expansion: Math.round(recommendedRaise * 0.45),
      product_scaling: Math.round(recommendedRaise * 0.30),
      operations_buffer: Math.round(recommendedRaise * 0.25),
    } : {};

    // AI narrative
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let narrative = "";
    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `You are the AI Investor advisor. In 3 sentences, write an investor briefing.
- Stage: ${stage}, Readiness: ${readiness}/100
- Annual revenue: ₦${(annualRev / 1e6).toFixed(1)}M, MoM growth: ${revGrowth.toFixed(1)}%
- Margin: ${margin.toFixed(1)}%, Runway: ${runwayMonths.toFixed(1)}mo
- Recommended action: ${recommendedAction}, raise: ₦${(recommendedRaise / 1e6).toFixed(0)}M
- Valuation: ₦${(valLow / 1e6).toFixed(0)}M – ₦${(valHigh / 1e6).toFixed(0)}M
Be direct. No fluff.`,
            }],
          }),
        });
        if (r.ok) {
          const d = await r.json();
          narrative = d.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("narrative error", e);
      }
    }

    const { data: saved } = await supabase
      .from("investor_assessments")
      .insert({
        organization_id: orgId,
        readiness_score: readiness,
        stage,
        recommended_action: recommendedAction,
        recommended_raise_amount: recommendedRaise,
        valuation_low: valLow,
        valuation_high: valHigh,
        revenue_multiple: multiple,
        cash_runway_months: runwayMonths,
        growth_rate_pct: revGrowth,
        strengths,
        weaknesses,
        use_of_funds: useOfFunds,
        target_investors: targetInvestors,
        ai_narrative: narrative,
      })
      .select()
      .single();

    return new Response(JSON.stringify({ assessment: saved, metrics: { rev30, exp30, profit30, margin, revGrowth, annualRev, runwayMonths, customerCount, fleetSize } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("investor engine error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
