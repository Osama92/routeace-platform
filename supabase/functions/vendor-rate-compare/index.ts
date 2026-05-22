// AI-powered vendor rate comparison for Logistics Department
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { route_from, route_to, vehicle_type, organization_id, dispatch_id } = body;
    if (!route_from || !route_to || !vehicle_type || !organization_id) {
      return json({ error: "Missing required fields" }, 400);
    }

    const { data: cards, error: cardsErr } = await supabase
      .from("vendor_rate_cards")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("status", "active")
      .ilike("route_from", route_from)
      .ilike("route_to", route_to)
      .eq("vehicle_type", vehicle_type)
      .order("rate_ngn", { ascending: true });

    if (cardsErr) return json({ error: cardsErr.message }, 500);
    if (!cards || cards.length === 0) {
      return json({ message: "No matching rate cards found", alternatives: [] });
    }

    const cheapest = cards[0];
    const alternatives = cards.slice(0, 5).map((c) => ({
      vendor_name: c.vendor_name,
      rate_ngn: c.rate_ngn,
      sla_days: c.sla_days,
    }));

    // AI recommendation via Lovable AI
    let aiRecommendation = `${cheapest.vendor_name} offers the lowest rate (₦${cheapest.rate_ngn.toLocaleString()}) with ${cheapest.sla_days}-day SLA.`;
    const lovableKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (lovableKey && cards.length > 1) {
      try {
        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: mapModel("google/gemini-2.5-flash"),
            messages: [
              { role: "system", content: "You are a logistics procurement analyst. Recommend the best vendor balancing cost and SLA. Reply in 2 sentences max." },
              { role: "user", content: `Route ${route_from}→${route_to}, vehicle ${vehicle_type}. Options: ${JSON.stringify(alternatives)}. Recommend the best.` },
            ],
          }),
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiRecommendation = aiData.content?.[0]?.text ?? aiRecommendation;
        }
      } catch (e) {
        console.error("AI call failed:", e);
      }
    }

    await supabase.from("vendor_rate_comparisons").insert({
      organization_id,
      dispatch_id: dispatch_id ?? null,
      route_from, route_to, vehicle_type,
      cheapest_vendor_id: cheapest.id,
      cheapest_rate_ngn: cheapest.rate_ngn,
      alternatives,
      ai_recommendation: aiRecommendation,
      ai_model: mapModel("google/gemini-2.5-flash"),
      created_by: userData.user.id,
    });

    return json({
      cheapest: { id: cheapest.id, vendor_name: cheapest.vendor_name, rate_ngn: cheapest.rate_ngn, sla_days: cheapest.sla_days },
      alternatives,
      ai_recommendation: aiRecommendation,
    });
  } catch (e) {
    console.error("vendor-rate-compare error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
