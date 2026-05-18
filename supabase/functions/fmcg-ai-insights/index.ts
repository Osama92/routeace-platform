import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.executive;
    const userPrompt = context
      ? `Given this operational context: ${JSON.stringify(context)}. Generate role-specific AI insights now.`
      : `Generate role-specific AI insights for today's operations. Use realistic African FMCG distribution scenarios.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_insights",
              description: "Return AI-generated distribution insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        suggested_action: { type: "string" },
                      },
                      required: ["title", "description", "severity", "suggested_action"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);
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
