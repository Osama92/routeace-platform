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

    // Resolve caller's organization scope (defence-in-depth on top of RLS)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const orgId = (membership as any)?.organization_id as string | undefined;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action = (body as any).action || url.searchParams.get("action") || (url.searchParams.get("route") || "/list").replace("/", "") || "list";

    if (action === "list") {
      const { data } = await supabase.from("monopoly_strategies").select("*").order("dominance_score", { ascending: false }).limit(20);
      return json({ strategies: data || [] });
    }

    if (action === "generate") {
      const region = (body as any).region || "Lagos";
      if (!orgId) return json({ error: "No organisation scope found for user" }, 403);
      const [{ count: customerCount }, { count: vehicleCount }] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);

      const dominance = Math.min(100, Math.round((customerCount || 0) * 2 + (vehicleCount || 0) * 0.5));

      const { data: ins, error: insErr } = await supabase.from("monopoly_strategies").insert({
        user_id: user.id,
        market_region: region,
        total_market_value: 420_000_000_000,
        market_players_count: 18400,
        priority_targets: [
          { tier: 1, segment: "FMCG Top 10", reason: "High dispatch volume, recurring demand", est_revenue: 50_000_000 },
          { tier: 2, segment: "3PL Mid-tier (20-50 trucks)", reason: "Operational pain, fast adoption", est_revenue: 18_000_000 },
          { tier: 3, segment: "Distributor networks", reason: "Network effect via downstream forcing", est_revenue: 12_000_000 },
        ],
        lock_in_strategies: [
          { tactic: "Workflow embedding", description: "Integrate dispatch + finance + insurance - high switching cost" },
          { tactic: "Data dependency", description: "Historical trip data, fuel baselines locked into Routeace ledger" },
          { tactic: "Vendor network lock", description: "Customer's vendors transact only via Routeace marketplace" },
        ],
        network_expansion: [
          { from: "Anchor FMCG", to: "32 distributors", method: "Forced downstream adoption via tracking links" },
          { from: "Top 3PL", to: "120 sub-contracted trucks", method: "Mandatory Routeace dispatch onboarding" },
        ],
        competitor_displacement: [
          { competitor: "FleetTrack", weakness: "No finance / fuel fraud intelligence", attack: "Lead with cost savings pitch, gradual replacement via 14-day pilot" },
          { competitor: "Generic GPS vendors", weakness: "Hardware-only, no AI layer", attack: "Bundle AI + telematics at lower TCO" },
        ],
        dominance_score: dominance,
      }).select("id").single();

      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, id: ins?.id, dominance });
    }

    if (action === "decide") {
      const { id, decision } = body as any;
      const status = decision === "approve" ? "active" : "rejected";
      await supabase.from("monopoly_strategies").update({ status, approved_by: user.id }).eq("id", id);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
