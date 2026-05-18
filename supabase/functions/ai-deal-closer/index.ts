import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "/list";

    if (route === "/list") {
      const { data } = await supabase.from("enterprise_deals").select("*").order("estimated_value", { ascending: false }).limit(50);
      return json({ deals: data || [] });
    }

    if (route === "/scan" && req.method === "POST") {
      // Detect prospects from existing customer base (high fleet, high spend)
      const { data: customers } = await supabase.from("customers").select("id, customer_name, total_spent, total_invoices").order("total_spent", { ascending: false, nullsFirst: false }).limit(10);
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      const created: string[] = [];

      for (const c of customers || []) {
        const fleetSize = Math.max(20, Math.round((c.total_invoices || 1) * 3));
        const monthlyLoss = Math.round(fleetSize * 180000 * 0.22);
        let pitch = `${c.customer_name} operates an estimated ${fleetSize}-truck fleet. Industry benchmarks suggest ~22% logistics inefficiency, equating to ₦${monthlyLoss.toLocaleString()} monthly losses recoverable within 30 days.`;
        let objections: any[] = [
          { objection: "Too expensive", response: `Pilot delivers ROI in 30 days; ₦${(monthlyLoss * 0.6).toLocaleString()} recovered vs subscription cost.` },
          { objection: "We have a system", response: "Routeace adds AI intelligence layer (fuel fraud, predictive maintenance) competitors lack." },
          { objection: "Not a priority", response: "14-day pilot - proof, no commitment." },
        ];

        if (apiKey) {
          try {
            const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "You are a B2B logistics sales strategist. Reply with concise, data-backed pitches. JSON only." },
                  { role: "user", content: `Generate a personalized enterprise sales pitch for ${c.customer_name} (estimated ${fleetSize} trucks, ₦${monthlyLoss}/mo loss). Return JSON: {pitch:string, objections:[{objection,response}]}` },
                ],
              }),
            });
            if (r.ok) {
              const j = await r.json();
              const txt = j.choices?.[0]?.message?.content || "";
              const m = txt.match(/\{[\s\S]*\}/);
              if (m) {
                const parsed = JSON.parse(m[0]);
                if (parsed.pitch) pitch = parsed.pitch;
                if (Array.isArray(parsed.objections)) objections = parsed.objections;
              }
            }
          } catch (_) { /* fall back to heuristic */ }
        }

        const { data: ins } = await supabase.from("enterprise_deals").insert({
          user_id: user.id,
          company_name: c.customer_name,
          industry: "FMCG/Distribution",
          fleet_size: fleetSize,
          estimated_monthly_loss: monthlyLoss,
          deal_probability: monthlyLoss > 5000000 ? "high" : "medium",
          recommended_pitch: pitch,
          objection_responses: objections,
          recommended_structure: { pilot_trucks: Math.min(20, Math.round(fleetSize * 0.2)), price_per_truck: 20000, term_days: 30 },
          estimated_value: Math.round(monthlyLoss * 0.15 * 12),
          ai_confidence: 78,
        }).select("id").single();
        if (ins) created.push(ins.id);
      }
      return json({ success: true, created: created.length });
    }

    if (route === "/decide" && req.method === "POST") {
      const { id, decision } = await req.json();
      const status = decision === "approve" ? "approved" : "rejected";
      await supabase.from("enterprise_deals").update({ status, approved_by: user.id }).eq("id", id);
      return json({ success: true });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
