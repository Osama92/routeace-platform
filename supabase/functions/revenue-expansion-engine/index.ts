import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Forbidden: no organization scope" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exclude LD tenants from revenue/expansion signals (LD has no revenue concept)
    const { data: org } = await supabase.from("organizations").select("tenant_mode").eq("id", orgId).maybeSingle();
    if ((org as any)?.tenant_mode === "LOGISTICS_DEPARTMENT") {
      return new Response(JSON.stringify({ created: 0, total_opportunity: 0, skipped: "LD tenant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, organization_id")
      .eq("organization_id", orgId)
      .limit(100);

    const signals: any[] = [];
    const now = Date.now();
    for (const c of customers || []) {
      // Look at recent dispatch volume
      const { count: recentCount } = await supabase
        .from("dispatches").select("id", { count: "exact", head: true })
        .eq("customer_id", c.id).gte("created_at", new Date(now - 30 * 86400000).toISOString());
      const { count: priorCount } = await supabase
        .from("dispatches").select("id", { count: "exact", head: true })
        .eq("customer_id", c.id)
        .gte("created_at", new Date(now - 60 * 86400000).toISOString())
        .lt("created_at", new Date(now - 30 * 86400000).toISOString());

      const recent = recentCount || 0;
      const prior = priorCount || 0;

      if (recent === 0 && prior > 0) {
        signals.push({
          organization_id: orgId,
          customer_id: c.id, signal_type: "churn_risk",
          opportunity_value: prior * 75000, confidence: 0.85,
          reasoning: `${c.name} had ${prior} dispatches last cycle, 0 this cycle - at risk.`,
          recommended_action: "Schedule retention call within 48h",
        });
      } else if (recent > prior * 1.4 && prior > 2) {
        signals.push({
          organization_id: orgId,
          customer_id: c.id, signal_type: "upsell",
          opportunity_value: (recent - prior) * 95000, confidence: 0.78,
          reasoning: `${c.name} volume up ${Math.round(((recent - prior) / Math.max(prior, 1)) * 100)}% - pitch volume contract.`,
          recommended_action: "Offer tier-2 contract with locked rates",
        });
      } else if (recent > 0 && prior === 0) {
        signals.push({
          organization_id: orgId,
          customer_id: c.id, signal_type: "new_account_growth",
          opportunity_value: recent * 60000, confidence: 0.7,
          reasoning: `${c.name} is a new active account - nurture.`,
          recommended_action: "Assign account manager and offer second-month discount",
        });
      }
    }

    if (signals.length > 0) await supabase.from("revenue_expansion_signals").insert(signals);
    return new Response(JSON.stringify({ created: signals.length, total_opportunity: signals.reduce((a, b) => a + b.opportunity_value, 0) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
