import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MARKETS = [
  { name: "Ghana", country: "GH", city: "Accra", demand: 78, ineff: 82, ease: 75, revenue: 70 },
  { name: "Kenya", country: "KE", city: "Nairobi", demand: 82, ineff: 80, ease: 70, revenue: 78 },
  { name: "South Africa", country: "ZA", city: "Johannesburg", demand: 85, ineff: 65, ease: 80, revenue: 88 },
  { name: "Egypt", country: "EG", city: "Cairo", demand: 80, ineff: 78, ease: 60, revenue: 82 },
  { name: "Côte d'Ivoire", country: "CI", city: "Abidjan", demand: 72, ineff: 85, ease: 68, revenue: 65 },
  { name: "Tanzania", country: "TZ", city: "Dar es Salaam", demand: 70, ineff: 84, ease: 72, revenue: 62 },
  { name: "Ethiopia", country: "ET", city: "Addis Ababa", demand: 68, ineff: 88, ease: 55, revenue: 60 },
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
      const { data } = await supabase.from("expansion_targets").select("*").order("composite_score", { ascending: false }).limit(50);
      return json({ targets: data || [] });
    }

    if (route === "/scan" && req.method === "POST") {
      const created: string[] = [];
      for (const m of MARKETS) {
        const composite = Math.round(m.demand * 0.3 + m.ineff * 0.25 + m.ease * 0.2 + m.revenue * 0.25);
        const { data: ins } = await supabase.from("expansion_targets").insert({
          user_id: user.id,
          market_name: m.name,
          country: m.country,
          city: m.city,
          demand_score: m.demand,
          inefficiency_score: m.ineff,
          ease_of_entry: m.ease,
          revenue_potential: m.revenue,
          composite_score: composite,
          recommended_segment: m.revenue > 75 ? "FMCG Enterprise" : "3PL & Mid-fleet",
          entry_strategy: {
            model: m.ease > 70 ? "direct" : "partnership",
            pricing: "localized usage-based",
            initial_fleet_targets: 20,
            timeline_months: 3,
          },
          roadmap: [
            { week: "1-2", action: `Identify 20 ${m.revenue > 75 ? "FMCG" : "3PL"} targets in ${m.city}` },
            { week: "3-4", action: "Launch pilot programs with 5 anchor clients" },
            { month: "2", action: "Expand operations, onboard local partners" },
            { month: "3", action: "Full market activation, recruit local team" },
          ],
        }).select("id").single();
        if (ins) created.push(ins.id);
      }
      return json({ success: true, created: created.length });
    }

    if (route === "/decide" && req.method === "POST") {
      const { id, decision } = await req.json();
      const status = decision === "approve" ? "approved" : "deferred";
      await supabase.from("expansion_targets").update({ status, approved_by: user.id }).eq("id", id);
      return json({ success: true });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
