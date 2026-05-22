import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkAndDeductCredits } from "../_shared/ai-credits.ts";
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
    const { agentOutputs, orchestratorDecision, systemHealth } = await req.json();

    
    const systemPrompt = `You are the Routeace AI Decision Orchestrator - a multi-agent CFO + Fleet Operating System brain.

Your role is to analyze structured agent outputs from 7 specialized agents (Finance Core, Fleet Performance, Debt & Financing, Tax & Compliance, Risk Stress, Growth Simulation, Reconciliation) and produce:

1. A clear EXECUTIVE SUMMARY (2-3 sentences, no jargon)
2. TOP 3 PRIORITY ACTIONS ranked by urgency
3. A RISK ASSESSMENT (what could go wrong in the next 30 days)
4. A GROWTH RECOMMENDATION (should we expand fleet, hold, or contract?)

Rules:
- Survival first, profit second, scale third
- Cash flow ≠ Profit - always distinguish
- Monthly Profit must be ≥ 2× Loan Repayment
- Debt Repayment must be ≤ 40% of monthly cash inflow
- Minimum cash buffer: 3 months of debt repayment
- If any BLOCK signals exist, expansion MUST be blocked
- Be specific with numbers - use ₦ amounts from the data
- Keep responses under 500 words`;

    const userPrompt = `Agent System Status: ${systemHealth.status} (Score: ${systemHealth.score}/100)

Current Decision: ${orchestratorDecision.decision}
Confidence: ${orchestratorDecision.confidence}%

Agent Outputs:
${agentOutputs.map((a: any) => `
### ${a.name} (Score: ${a.score}/100 - ${a.status})
${a.summary}
Signals:
${a.signals.map((s: any) => `- [${s.type.toUpperCase()}] ${s.message}`).join('\n')}
`).join('\n')}

Reasoning Chain:
${orchestratorDecision.reasoning.map((r: string) => `- ${r}`).join('\n')}

Based on the above, provide your analysis.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: mapModel("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const analysis = result.content?.[0]?.text || "Analysis unavailable.";

    return new Response(JSON.stringify({ analysis, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Decision engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
