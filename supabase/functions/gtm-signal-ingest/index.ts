import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
// Intent classification (server-side)
const ACTIVE_BUY_KEYWORDS = [
  "need", "looking for", "searching for", "want", "require",
  "delivery company", "logistics provider", "distributor", "supplier",
  "courier service", "freight", "haulage", "dispatch", "shipping company",
  "who can deliver", "recommend a", "help me find",
];
const PROBLEM_AWARE_KEYWORDS = [
  "delayed", "late delivery", "complaints", "poor service", "unreliable",
  "missing packages", "broken", "damaged", "lost shipment", "frustrated",
  "inefficient", "manual", "whatsapp dispatch", "no tracking",
];
const URGENCY_KEYWORDS = ["urgent", "asap", "immediately", "today", "now", "emergency"];

function classifyIntent(content: string) {
  const lower = content.toLowerCase();
  const activeBuyHits = ACTIVE_BUY_KEYWORDS.filter(k => lower.includes(k));
  const problemHits = PROBLEM_AWARE_KEYWORDS.filter(k => lower.includes(k));
  const urgencyHits = URGENCY_KEYWORDS.filter(k => lower.includes(k));

  if (activeBuyHits.length >= 2 || (activeBuyHits.length >= 1 && urgencyHits.length >= 1)) {
    return {
      type: "active_buy",
      confidence: Math.min(0.95, 0.6 + activeBuyHits.length * 0.12 + urgencyHits.length * 0.1),
      reasoning: `Active buy: ${activeBuyHits.join(", ")}`,
    };
  }
  if (problemHits.length >= 1) {
    return {
      type: "problem_aware",
      confidence: Math.min(0.88, 0.5 + problemHits.length * 0.15),
      reasoning: `Problem: ${problemHits.join(", ")}`,
    };
  }
  if (activeBuyHits.length === 1) {
    return { type: "expansion", confidence: 0.55, reasoning: `Mild: ${activeBuyHits[0]}` };
  }
  return { type: "passive", confidence: 0.3, reasoning: "No strong signals" };
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { source_type, source_platform, content, geo_location, author_handle, industry_tag, os_context, raw_payload } = body;

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert signal
    const { data: signal, error: sigErr } = await supabase
      .from("gtm_signals")
      .insert({
        source_type: source_type || "manual",
        source_platform: source_platform || "unknown",
        content: content.trim(),
        geo_location: geo_location || null,
        author_handle: author_handle || null,
        industry_tag: industry_tag || null,
        os_context: os_context || "logistics",
        raw_payload: raw_payload || {},
        is_processed: false,
      })
      .select()
      .single();

    if (sigErr) throw sigErr;

    // Classify intent
    const intent = classifyIntent(content);
    await supabase.from("gtm_intent_classifications").insert({
      signal_id: signal.id,
      intent_type: intent.type,
      confidence_score: intent.confidence,
      reasoning: intent.reasoning,
    });

    // Auto-create entity + opportunity for high intent
    let entityId = null;
    let opportunityId: string | null = null;

    if (intent.type === "active_buy" || intent.type === "problem_aware") {
      const { data: entity } = await supabase.from("gtm_entities").insert({
        name: author_handle || `Signal ${signal.id.slice(0, 8)}`,
        entity_type: "company",
        location: geo_location || "",
        industry: industry_tag || "logistics",
        source_origin: source_platform || "api",
        os_context: os_context || "logistics",
      }).select().single();
      entityId = entity?.id;

      // Score
      const score = intent.confidence * 100;
      await supabase.from("gtm_intent_scores").insert({
        signal_id: signal.id,
        entity_id: entityId,
        score,
        tier: score >= 80 ? "tier1" : score >= 50 ? "tier2" : "tier3",
        factors: { intent_confidence: intent.confidence, source: source_platform },
      });
    }

    if (intent.type === "active_buy" && intent.confidence >= 0.7) {
      const { data: opp } = await supabase.from("gtm_opportunities").insert({
        entity_id: entityId,
        signal_id: signal.id,
        opportunity_type: (os_context || "logistics") === "logistics" ? "logistics" : "distribution",
        title: content.substring(0, 120),
        description: content,
        geo_location: geo_location || "",
        industry: industry_tag || "",
        stage: "new",
        priority: intent.confidence >= 0.85 ? "critical" : "high",
        os_context: os_context || "logistics",
      }).select().single();
      opportunityId = opp?.id;

      // Auto-match
      if (opportunityId) {
        const { data: nodes } = await supabase
          .from("gtm_supply_nodes")
          .select("*")
          .eq("is_active", true)
          .eq("os_context", os_context || "logistics")
          .limit(20);

        if (nodes && nodes.length > 0) {
          const oppLoc = (geo_location || "").toLowerCase();
          const matches = nodes.map((node: any) => {
            const nodeCity = (node.city || "").toLowerCase();
            const nodeState = (node.state || "").toLowerCase();
            let geo = 0.4;
            if (oppLoc && (oppLoc.includes(nodeCity) || nodeCity.includes(oppLoc))) geo = 1.0;
            else if (oppLoc && (oppLoc.includes(nodeState) || nodeState.includes(oppLoc))) geo = 0.7;

            const nodeType = node.node_type || "";
            let serviceFit = 0.5;
            if (nodeType === "logistics_operator") serviceFit = 1.0;
            else if (nodeType === "distributor") serviceFit = 0.7;

            const total = (0.30 * geo) + (0.25 * serviceFit) + (0.15 * 0.5) + (0.15 * (node.sla_compliance_rate || 0.5)) + (0.10 * 0.5) + (0.05 * (node.historical_conversion_rate || 0.3));

            return {
              opportunity_id: opportunityId,
              supply_node_id: node.id,
              match_score: Math.round(total * 100) / 100,
              geo_proximity_score: geo,
              service_fit_score: serviceFit,
              capacity_score: 0.5,
              performance_score: node.sla_compliance_rate || 0.5,
              response_speed_score: 0.5,
              historical_score: node.historical_conversion_rate || 0.3,
              match_reason: `Geo: ${Math.round(geo * 100)}%, Fit: ${Math.round(serviceFit * 100)}%`,
              status: "pending",
            };
          }).sort((a: any, b: any) => b.match_score - a.match_score).slice(0, 5);

          if (matches.length > 0) {
            await supabase.from("gtm_demand_supply_matches").insert(matches);
          }
        }
      }
    }

    // Mark processed
    await supabase.from("gtm_signals").update({ is_processed: true }).eq("id", signal.id);

    return new Response(JSON.stringify({
      signal_id: signal.id,
      intent: intent,
      entity_id: entityId,
      opportunity_id: opportunityId,
      status: "ingested",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
