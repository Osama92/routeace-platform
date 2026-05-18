import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAuth } from "../_shared/require-auth.ts";
import { resolveCallerOrgId } from "../_shared/resolve-org.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
// Self-Expanding Network Engine - RECOMMEND-ONLY (no external sends)
// Generates: lead signals, referral triggers, product-led acquisition hooks
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
      return new Response(
        JSON.stringify({ error: "No organisation scope found for user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const t30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [{ data: customers }, { data: dispatches }, { data: invoices }] = await Promise.all([
      supabase.from("customers").select("id,name,company_name,created_at").eq("organization_id", orgId).limit(500),
      supabase.from("dispatches").select("id,customer_id,cost,status,created_at").eq("organization_id", orgId).gte("created_at", t30),
      supabase.from("invoices").select("customer_id,total_amount").eq("organization_id", orgId).gte("created_at", t30),
    ]);

    // 1. Detect high-performing customers eligible for referral prompt
    const dispatchByCust: Record<string, number> = {};
    (dispatches || []).forEach((d) => {
      if (!d.customer_id) return;
      dispatchByCust[d.customer_id] = (dispatchByCust[d.customer_id] || 0) + 1;
    });

    const referralCandidates: any[] = [];
    for (const [custId, count] of Object.entries(dispatchByCust)) {
      if (count >= 20) {
        const cust = (customers || []).find((c) => c.id === custId);
        referralCandidates.push({
          customer_id: custId,
          customer_name: cust?.company_name || cust?.name || "Customer",
          trigger_reason: `${count} successful dispatches in 30 days`,
          performance_metric: "dispatch_volume_30d",
          performance_value: count,
          recommended_reward: count >= 50 ? "₦50k credit + premium feature unlock" : "₦20k dispatch credit",
          status: "pending",
        });
      }
    }

    // Insert new referral triggers (skip existing for same customer in last 30d)
    const insertedReferrals: any[] = [];
    for (const r of referralCandidates) {
      const { data: existing } = await supabase
        .from("growth_referral_triggers")
        .select("id")
        .eq("customer_id", r.customer_id)
        .gte("created_at", t30)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data } = await supabase.from("growth_referral_triggers").insert(r).select().single();
        if (data) insertedReferrals.push(data);
      }
    }

    // 2. Generate lead signals from market patterns (recommend-only - synthetic prospects derived from existing customer segments)
    const segments = ["FMCG Distributor", "3PL Operator", "Fleet Aggregator", "E-commerce", "Manufacturer"];
    const regions = ["Lagos", "Ogun", "Ibadan", "Abuja", "Port Harcourt", "Kano"];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const newLeads: any[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Generate 5 realistic Nigerian B2B logistics prospect recommendations as JSON array. Each with:
{"target_name": "company name", "segment": "one of: FMCG Distributor / 3PL Operator / Fleet Aggregator / E-commerce / Manufacturer", "region": "Nigerian city", "opportunity_score": 60-95 number, "estimated_monthly_value": 500000-15000000 number, "pain_signals": ["short pain 1","short pain 2"], "recommended_pitch": "1-sentence data-backed pitch using estimated savings"}

Return ONLY a JSON object {"leads": [...]}. No prose.`,
            }],
            response_format: { type: "json_object" },
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(raw);
          const leads = parsed.leads || [];
          for (const lead of leads.slice(0, 5)) {
            const { data } = await supabase.from("growth_lead_signals").insert({
              target_name: lead.target_name,
              segment: lead.segment,
              region: lead.region,
              opportunity_score: lead.opportunity_score,
              estimated_monthly_value: lead.estimated_monthly_value,
              pain_signals: lead.pain_signals || [],
              recommended_pitch: lead.recommended_pitch,
              source: "ai_demand_engine",
              status: "new",
            }).select().single();
            if (data) newLeads.push(data);
          }
        }
      } catch (e) {
        console.error("lead gen error", e);
      }
    }

    // 3. Network growth metrics
    const totalLeads = await supabase.from("growth_lead_signals").select("id", { count: "exact", head: true });
    const convertedLeads = await supabase.from("growth_lead_signals").select("id", { count: "exact", head: true }).eq("status", "converted");
    const activeReferrals = await supabase.from("growth_referral_triggers").select("id", { count: "exact", head: true }).eq("status", "pending");

    const summary = {
      timestamp: new Date().toISOString(),
      new_referral_triggers: insertedReferrals.length,
      new_lead_signals: newLeads.length,
      total_leads: totalLeads.count || 0,
      converted_leads: convertedLeads.count || 0,
      conversion_rate: totalLeads.count ? Math.round(((convertedLeads.count || 0) / totalLeads.count) * 100) : 0,
      pending_referrals: activeReferrals.count || 0,
      active_customers: (customers || []).length,
      product_led_hook: "Embed 'Powered by Routeace - Reduce logistics cost 20%' in tracking links shared with customers' clients.",
    };

    return new Response(JSON.stringify({ summary, new_referrals: insertedReferrals, new_leads: newLeads }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("growth engine error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
