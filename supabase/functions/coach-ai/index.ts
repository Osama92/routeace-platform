// coach-ai — RouteAce Coach Gemini fallback
// Returns { answer, navigation?: { label, href } } so the chat can show a "Take me there" button.
import { buildCors } from "../_shared/cors.ts";
import { callGemini } from "../_shared/gemini.ts";

const SYSTEM_PROMPT = `You are RouteAce Coach, an expert AI assistant for the RouteAce Distribution Intelligence Platform — a logistics SaaS for fleets, dispatches, drivers, invoices, expenses, route planning, maintenance, and analytics.

Key modules and their app routes:
- Dispatch (create/manage deliveries) → /dispatch
- Live Tracking (real-time GPS, fleet map) → /fleet-command  [Live Tracking tab inside Fleet Command]
- Fleet & Vehicles (register, inspect, health scores) → /fleet
- Drivers (onboard, documents, leave) → /drivers
- Invoices & Billing → /invoices
- Bills / Vendor Bills → /bills
- Expenses (log, approve) → /expenses
- Route Planner (multi-drop optimisation) → /advanced-route-planner
- Maintenance Intelligence (predictive failures) → /maintenance-intelligence
- Analytics & KPIs (90+ metrics) → /kpi-dashboard
- Profitability Engine (per-truck, per-route margins) → /profitability-engine
- Integration Hub (QuickBooks, Xero, Zoho Books, HubSpot, Stripe) → /integration-hub
- User Management (roles, approvals, team) → /users
- Settings (company profile, billing) → /settings
- SLA Management → /operations/sla-management
- Reports → /reports
- Audit / System Integrity → /system-integrity
- PAYE Calculator → available inside Finance Manager dashboard

Respond ONLY with a JSON object in this exact shape (no markdown, no code fences, raw JSON):
{
  "answer": "<2-3 sentence answer scoped to RouteAce features only>",
  "navigation": { "label": "<short menu label>", "href": "<route from the list above>" }
}

If the question does not relate to a specific navigable module, omit the "navigation" key entirely.
Never answer questions unrelated to logistics or the platform.`;

Deno.serve(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const raw = await callGemini({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question.slice(0, 1000) }],
      maxTokens: 400,
      temperature: 0.4,
    });

    // Parse structured JSON from Gemini
    let answer = raw.trim();
    let navigation: { label: string; href: string } | undefined;

    try {
      // Strip markdown code fences if Gemini wraps the JSON
      const cleaned = answer.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      answer = parsed.answer ?? raw;
      if (parsed.navigation?.href && parsed.navigation?.label) {
        navigation = { label: parsed.navigation.label, href: parsed.navigation.href };
      }
    } catch {
      // Gemini didn't return valid JSON — use raw text as answer, no navigation
    }

    return new Response(JSON.stringify({ answer, navigation }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("coach-ai error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "AI unavailable" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
