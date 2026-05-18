import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SEED = [
  { name: "FleetTrack", price: 12000, strengths: ["GPS tracking", "Mature brand"], weaknesses: ["No AI layer", "No finance engine", "No fuel fraud detection"], threat: "medium" },
  { name: "Cartrack Africa", price: 18000, strengths: ["Hardware integration", "Insurance partnerships"], weaknesses: ["Hardware lock-in", "Slow innovation", "No cost-recovery proof"], threat: "high" },
  { name: "Lori Systems", price: 15000, strengths: ["Marketplace", "Funded"], weaknesses: ["No predictive maintenance", "No AI CEO layer", "Limited Nigerian presence"], threat: "medium" },
  { name: "Kobo360", price: 14000, strengths: ["Brand recognition", "Wide network"], weaknesses: ["Cash-burn model", "Operational gaps", "No tenant-level intelligence"], threat: "medium" },
];

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
      const { data } = await supabase.from("competitor_profiles").select("*").order("last_observed_at", { ascending: false });
      return json({ competitors: data || [] });
    }

    if (route === "/seed" && req.method === "POST") {
      const created: string[] = [];
      for (const c of SEED) {
        const { data: ins } = await supabase.from("competitor_profiles").insert({
          user_id: user.id,
          competitor_name: c.name,
          pricing_model: "per_truck_monthly",
          price_per_unit: c.price,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
          threat_level: c.threat,
          feature_gaps: c.weaknesses.map((w) => ({ gap: w, routeace_advantage: true })),
          win_strategy: {
            talking_points: [
              `${c.name} charges ₦${c.price}/truck for tracking only - Routeace delivers 20% cost savings on top.`,
              "Routeace includes fuel fraud detection, predictive maintenance, AI CEO - features they lack.",
              "14-day proof pilot vs their long contracts.",
            ],
            objection_responses: {
              "competitor_cheaper": `Competitor tracks trucks. Routeace cuts your cost by 20% - savings exceed price difference 5x.`,
              "existing_contract": "Run Routeace alongside for 30 days. Switch when value is proven.",
            },
            positioning: "Intelligence-first vs hardware-first",
          },
        }).select("id").single();
        if (ins) created.push(ins.id);
      }
      return json({ success: true, created: created.length });
    }

    if (route === "/win-rate") {
      const { data: deals } = await supabase.from("enterprise_deals").select("status");
      const total = deals?.length || 0;
      const won = deals?.filter((d) => d.status === "approved").length || 0;
      const lost = deals?.filter((d) => d.status === "rejected").length || 0;
      const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
      return json({ total, won, lost, winRate });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
