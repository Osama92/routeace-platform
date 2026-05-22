import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Ecosystem-level cross-tenant matchmaking. Restricted to super admin /
// core founders / internal team — this is not a per-tenant LC feature.
const ECOSYSTEM_ROLES = new Set([
  "super_admin",
  "core_founder",
  "core_cofounder",
  "core_builder",
  "core_product",
  "core_engineer",
  "internal_team",
]);

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);
    if (!roles.some((r) => ECOSYSTEM_ROLES.has(r))) {
      return json({ error: "Forbidden: ecosystem matchmaking is restricted to platform operators." }, 403);
    }

    let body: any = {};
    if (req.method !== "GET") {
      try { body = await req.json(); } catch (_e) { body = {}; }
    }
    const action = body.action || new URL(req.url).searchParams.get("action") || "list";

    if (action === "list") {
      const { data, error } = await admin
        .from("partnership_opportunities")
        .select("*")
        .order("match_score", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);
      return json({ opportunities: data || [] });
    }

    if (action === "match") {
      const { data: nodes, error: nodesErr } = await admin
        .from("ecosystem_nodes")
        .select("*")
        .eq("is_active", true);
      if (nodesErr) return json({ error: nodesErr.message }, 500);

      const fmcg = (nodes || []).filter((n: any) => n.node_type === "fmcg" || n.category === "shipper");
      const fleets = (nodes || []).filter((n: any) => n.node_type === "3pl" || n.category === "fleet_partner");

      if (fmcg.length === 0 || fleets.length === 0) {
        return json({
          success: true,
          created: 0,
          message: "No active FMCG shippers or 3PL fleets registered in the ecosystem yet.",
        });
      }

      const created: string[] = [];
      for (const shipper of fmcg.slice(0, 5)) {
        for (const fleet of fleets.slice(0, 3)) {
          const score = Math.round(((shipper.trust_score ?? 0) + (fleet.trust_score ?? 0)) / 2);
          const { data: ins, error } = await admin
            .from("partnership_opportunities")
            .insert({
              user_id: user.id,
              partner_name: `${shipper.name} ↔ ${fleet.name}`,
              partner_type: "shipper_fleet_match",
              match_score: score,
              match_reason: `${shipper.name} (${shipper.region || "Nigeria"}) shipping demand aligns with ${fleet.name}'s ${(fleet.capabilities || []).join(", ")} capacity. Combined trust score ${score}/100.`,
              shipper_id: shipper.id,
              fleet_operator_id: fleet.id,
              route_context: `${shipper.region || "Lagos"} → distribution network`,
              estimated_revenue: Math.round(2000000 + score * 60000),
              cost_savings: Math.round(500000 + score * 15000),
              proposal_text: `Connect ${shipper.name}'s distribution demand with ${fleet.name}'s verified fleet on Routeace. Estimated 18% cost reduction and 25% faster delivery cycles.`,
            })
            .select("id")
            .single();
          if (!error && ins) created.push(ins.id);
        }
      }
      return json({ success: true, created: created.length });
    }

    if (action === "decide") {
      const { id, decision } = body;
      if (!id || !decision) return json({ error: "id and decision are required" }, 400);
      const status = decision === "approve" ? "accepted" : "rejected";
      const { error } = await admin
        .from("partnership_opportunities")
        .update({ status, approved_by: user.id })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partnerships-engine error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
