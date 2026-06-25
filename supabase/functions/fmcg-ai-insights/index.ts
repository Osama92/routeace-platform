import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";
import { requireAuth } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { getCached, setCached } from "../_shared/ai-cache.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const ROLE_PROMPTS: Record<string, string> = {
  executive: `You are a C-suite distribution intelligence advisor for an FMCG manufacturer operating across Africa. Generate 3-4 concise, actionable AI insights about: market expansion opportunities, distributor performance anomalies, margin leakage alerts, and SKU demand shifts. Each insight must have a title (max 8 words), a description (1-2 sentences), a severity (high/medium/low), and a suggested_action (1 sentence). Format: JSON array.`,

  rsm: `You are a Regional Sales Manager AI advisor for FMCG distribution. Generate 3-4 concise insights about: territory coverage gaps, ASM performance issues, rep productivity trends, and outlet activation opportunities. Each insight: title (max 8 words), description (1-2 sentences), severity (high/medium/low), suggested_action. Format: JSON array.`,

  asm: `You are an Area Sales Manager AI advisor. Generate 3-4 insights about: supervisor effectiveness, retailer coverage optimization, daily target achievement risks, and competitive activity in the area. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  supervisor: `You are a Field Supervisor AI advisor. Generate 3-4 insights about: rep attendance and productivity, visit compliance issues, order value optimization per outlet, and route efficiency. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  sales_rep: `You are a Sales Rep field AI assistant. Generate 3-4 insights about: which outlets to prioritize today, upsell opportunities, promotion-eligible retailers, and restock urgency signals. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  merchandiser: `You are a Merchandiser AI assistant. Generate 3-4 insights about: planogram compliance risks, shelf-share optimization, competitor display alerts, and stock-facing improvement opportunities. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  distributor: `You are a Distributor Operations AI advisor. Generate 3-4 insights about: inventory reorder urgency, delivery route inefficiencies, retailer credit risk alerts, and sales trend anomalies. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  warehouse: `You are a Warehouse Operations AI advisor. Generate 3-4 insights about: dispatch queue optimization, storage utilization alerts, incoming shipment preparation, and SKU velocity-based zone reallocation. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  finance: `You are a Distribution Finance AI advisor. Generate 3-4 insights about: AR aging risks, collection priority recommendations, credit exposure alerts, and cash flow forecast signals. Each insight: title, description, severity, suggested_action. Format: JSON array.`,

  logistics: `You are a Logistics Coordination AI advisor. Generate 3-4 insights about: route delay predictions, fuel efficiency opportunities, vehicle maintenance alerts, and delivery SLA risks. Each insight: title, description, severity, suggested_action. Format: JSON array.`,
};

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Phase 3: require signed-in caller (any role) to stop anon AI-credit drain.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Phase 9: AI credit + flood protection (30 req/min/user).
  const rl = rateLimit({ bucket: "fmcg-ai", identifier: auth.user.id, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  try {
    const { role, context } = await req.json();

    // Cache key per role — context-free roles are shared platform-wide (2h TTL)
    const cacheKey = `fmcg-${role || "executive"}`;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only use cache when there's no dynamic context passed
    if (!context) {
      const cached = await getCached(supabase, cacheKey);
      if (cached) {
        return new Response(JSON.stringify({ ...cached.payload, fromCache: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.executive;
    const userPrompt = context
      ? `Given this operational context: ${JSON.stringify(context)}. Generate role-specific AI insights now.`
      : `Generate role-specific AI insights for today's operations. Use realistic African FMCG distribution scenarios.`;

    const jsonPrompt = userPrompt + `\n\nReturn ONLY a JSON object: {"insights": [{"title": string, "description": string, "severity": "high"|"medium"|"low", "suggested_action": string}]}`;

    const aiText = await callAnthropic({
      model: mapModel("google/gemini-3-flash-preview"),
      system: systemPrompt,
      messages: [
        { role: "user", content: jsonPrompt },
      ],
    });

    const match = aiText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const parsed = JSON.parse(match[0]);

    // Cache the result when no dynamic context (context-free = cacheable)
    if (!context) {
      await setCached(supabase, cacheKey, parsed, { ttlHours: 2, model: mapModel("google/gemini-3-flash-preview") });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fmcg-ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
