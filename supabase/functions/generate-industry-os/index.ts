import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const { industryName, industryDescription, products } = await req.json();
    
    const systemPrompt = `You are an enterprise architecture AI for RouteAce, Africa's multi-industry distribution intelligence platform. You generate complete Industry Operating System blueprints.

Given an industry, you MUST return a JSON object with this exact structure (no markdown, no code fences, pure JSON):

{
  "industryOS": {
    "name": "string - OS name e.g. 'Fisheries OS'",
    "code": "string - short code e.g. 'fisheries'",
    "tagline": "string - one-line description",
    "supplyChainAnalysis": {
      "structure": "string - describe the supply chain",
      "primaryParticipants": ["string"],
      "demandCycles": "string",
      "complianceRequirements": ["string"],
      "logisticsRequirements": ["string"]
    },
    "userHierarchy": [
      {
        "role": "string - role code e.g. 'regional_manager'",
        "label": "string - display name",
        "description": "string",
        "level": "number - 1=top, higher=lower",
        "permissions": ["string"],
        "dashboardFocus": "string",
        "kpis": ["string"]
      }
    ],
    "modules": [
      {
        "id": "string",
        "name": "string",
        "icon": "string - lucide icon name",
        "description": "string",
        "features": ["string"],
        "roles": ["string - which roles access this"]
      }
    ],
    "industrySpecificFeatures": [
      {
        "name": "string",
        "description": "string",
        "importance": "critical | high | medium"
      }
    ],
    "kpiFramework": {
      "sales": [{"name": "string", "formula": "string", "target": "string"}],
      "logistics": [{"name": "string", "formula": "string", "target": "string"}],
      "warehouse": [{"name": "string", "formula": "string", "target": "string"}],
      "finance": [{"name": "string", "formula": "string", "target": "string"}]
    },
    "aiIntelligence": [
      {
        "name": "string",
        "type": "predictive | prescriptive | descriptive",
        "description": "string",
        "dataInputs": ["string"],
        "outputs": ["string"]
      }
    ],
    "integrations": [
      {
        "name": "string",
        "category": "payment | erp | crm | regulatory | logistics | industry-specific",
        "description": "string",
        "priority": "essential | recommended | optional"
      }
    ],
    "dashboards": [
      {
        "name": "string",
        "targetRole": "string",
        "widgets": [{"name": "string", "type": "metric | chart | table | map | list", "description": "string"}]
      }
    ]
  }
}

Be comprehensive, realistic, and industry-specific. Generate 6-8 roles, 8-12 modules, 4-6 AI intelligence models, and 6-10 integrations. Every module must have 4-6 features. Every dashboard must have 4-6 widgets.`;

    const userPrompt = `Generate a complete Industry Operating System for:

Industry: ${industryName}
Description: ${industryDescription || "Not provided"}
Products/Services: ${products || "Not provided"}

Return ONLY the JSON object, no markdown formatting.`;

    const aiText = await callAnthropic({
      model: mapModel("google/gemini-2.5-flash"),
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
      maxTokens: 4096,
    });

    const match = aiText.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: "AI generation failed — no JSON returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(match[0], {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-industry-os error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
