import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    const route = url.searchParams.get("route") || "/graph";

    if (route === "/graph") {
      const { data: nodes } = await supabase.from("ecosystem_nodes").select("*").eq("is_active", true).limit(200);
      const { data: connections } = await supabase.from("ecosystem_connections").select("*").eq("user_id", user.id);
      return json({ nodes: nodes || [], connections: connections || [] });
    }

    if (route === "/seed-catalog" && req.method === "POST") {
      const seed = [
        { node_type: "vendor", name: "FleetCare Auto Services", category: "maintenance", region: "Lagos", capabilities: ["injector_service","brake_service","oil_change"], trust_score: 88 },
        { node_type: "vendor", name: "QuickFuel Stations", category: "fuel", region: "Lagos-Ibadan corridor", capabilities: ["bulk_fuel","credit_terms"], trust_score: 82 },
        { node_type: "insurer", name: "SafeRoute Insurance", category: "fleet_insurance", region: "Nigeria", capabilities: ["fleet","cargo","SLA_breach"], trust_score: 91 },
        { node_type: "fmcg", name: "Continental FMCG Ltd", category: "shipper", region: "Lagos", capabilities: ["ambient","cold_chain"], trust_score: 85 },
        { node_type: "3pl", name: "PanAfrica Logistics 3PL", category: "fleet_partner", region: "West Africa", capabilities: ["haulage","last_mile"], trust_score: 79 },
      ];
      for (const n of seed) await supabase.from("ecosystem_nodes").upsert(n as any, { onConflict: "name" } as any);
      return json({ success: true, seeded: seed.length });
    }

    if (route === "/suggest-connections" && req.method === "POST") {
      // Generate top-3 connection suggestions for the user
      const { data: nodes } = await supabase.from("ecosystem_nodes").select("*").eq("is_active", true).order("trust_score", { ascending: false }).limit(10);
      const picks = (nodes || []).slice(0, 5).map((n) => ({
        user_id: user.id,
        node_id: n.id,
        connection_type: n.node_type,
        status: "suggested",
        ai_reasoning: `${n.name} ranks ${n.trust_score}/100 in ${n.region || "your region"} and offers ${(n.capabilities || []).slice(0, 2).join(", ")}, matching your operational profile.`,
        match_score: n.trust_score,
        estimated_value: Math.round(500000 + (n.trust_score ?? 50) * 40000),
      }));
      for (const p of picks) await supabase.from("ecosystem_connections").insert(p);
      return json({ success: true, created: picks.length });
    }

    if (route === "/decide" && req.method === "POST") {
      const { connection_id, decision } = await req.json();
      const status = decision === "accept" ? "accepted" : "rejected";
      await supabase.from("ecosystem_connections").update({ status, updated_at: new Date().toISOString() }).eq("id", connection_id).eq("user_id", user.id);
      return json({ success: true });
    }

    if (route === "/vendor-rankings") {
      const { data } = await supabase.from("ecosystem_vendor_rankings").select("*, ecosystem_nodes(name, region, capabilities)").order("composite_score", { ascending: false }).limit(50);
      return json({ data: data || [] });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
