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
      const { data } = await supabase.from("pricing_recommendations").select("*").order("created_at", { ascending: false }).limit(50);
      return json({ recommendations: data || [] });
    }

    if (route === "/scan" && req.method === "POST") {
      const { data: customers } = await supabase.from("customers").select("id, customer_name, total_spent, total_invoices").order("total_spent", { ascending: false, nullsFirst: false }).limit(15);
      const created: string[] = [];

      for (const c of customers || []) {
        const totalSpent = Number(c.total_spent || 0);
        const invoices = c.total_invoices || 1;
        const segment = totalSpent > 50_000_000 ? "Enterprise FMCG" : totalSpent > 10_000_000 ? "Mid-market 3PL" : "SME Fleet";

        // Heuristic value-based pricing
        const currentPrice = Math.max(50000, Math.round(totalSpent / Math.max(invoices, 1) * 0.05));
        const dependency = Math.min(100, invoices * 5);
        const churnRisk = dependency < 30 ? 65 : dependency < 60 ? 35 : 15;
        const savingsDelivered = Math.round(totalSpent * 0.18);

        let recommended = currentPrice;
        let reasoning = "";
        if (dependency > 60 && churnRisk < 30) {
          recommended = Math.round(currentPrice * 1.25);
          reasoning = `${c.customer_name} shows high dependency (${dependency}/100) and low churn risk. Routeace delivered ₦${savingsDelivered.toLocaleString()} in savings - recommend 25% price increase justified by ROI.`;
        } else if (churnRisk > 50) {
          recommended = Math.round(currentPrice * 0.9);
          reasoning = `${c.customer_name} has elevated churn risk (${churnRisk}/100). Recommend 10% retention discount + value-add modules to restore stickiness.`;
        } else {
          recommended = Math.round(currentPrice * 1.1);
          reasoning = `${c.customer_name} (${segment}) - moderate dependency. Standard 10% annual uplift aligned with delivered savings of ₦${savingsDelivered.toLocaleString()}.`;
        }

        const changePct = Math.round(((recommended - currentPrice) / currentPrice) * 100);

        const { data: ins } = await supabase.from("pricing_recommendations").insert({
          user_id: user.id,
          customer_segment: segment,
          customer_id: c.id,
          current_price: currentPrice,
          recommended_price: recommended,
          price_change_pct: changePct,
          cost_savings_delivered: savingsDelivered,
          dependency_score: dependency,
          churn_risk: churnRisk,
          reasoning,
          bundle_suggestions: dependency > 60 ? [
            { module: "Fuel Intelligence Pro", price: 50000 },
            { module: "Predictive Maintenance", price: 75000 },
            { module: "Insurance Risk Engine", price: 40000 },
          ] : [],
        }).select("id").single();
        if (ins) created.push(ins.id);
      }
      return json({ success: true, created: created.length });
    }

    if (route === "/decide" && req.method === "POST") {
      const { id, decision } = await req.json();
      const status = decision === "approve" ? "approved" : "rejected";
      await supabase.from("pricing_recommendations").update({ status, approved_by: user.id }).eq("id", id);
      return json({ success: true });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
