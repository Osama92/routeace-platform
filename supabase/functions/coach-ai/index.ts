// coach-ai — RouteAce Coach Gemini fallback
// Answers platform-specific questions about RouteAce features.
// Called by AICoach.tsx when keyword matching doesn't find a navigation intent.
import { buildCors } from "../_shared/cors.ts";
import { callGemini } from "../_shared/gemini.ts";

const SYSTEM_PROMPT = `You are RouteAce Coach, an expert AI assistant for the RouteAce Distribution Intelligence Platform.

RouteAce is a logistics SaaS for managing fleets, dispatches, drivers, invoices, expenses, route planning, maintenance, and analytics.

Key modules:
- Fleet & Vehicles: register vehicles, run inspections, track health scores
- Dispatch: create and manage delivery orders, assign vehicles and drivers
- Live Tracking: real-time GPS tracking with Google Maps
- Drivers: onboard drivers, manage documents and leave
- Invoices & Bills: finance workflows, ERP sync (QuickBooks, Xero, Zoho Books)
- Expenses: log and approve expenses
- Route Planner: multi-drop optimisation with AI confidence scores
- Maintenance Intelligence: predictive failure alerts, repair vs replace
- Analytics & KPIs: 90+ metrics across finance, fleet, and operations
- User Management: role-based access (super_admin, admin, org_admin, ops_manager, finance_manager, dispatcher, driver, support)
- Integration Hub: connect QuickBooks, Xero, Zoho Books, HubSpot, Stripe, Salesforce
- PAYE Calculator, Profitability Engine, Asset Profitability, Customer Profitability

Only answer questions related to what RouteAce offers. Be concise (max 3 sentences). If the user is asking how to navigate to a feature, name the menu path. Do not answer questions unrelated to logistics or the platform.`;

Deno.serve(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const answer = await callGemini({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question.slice(0, 1000) }],
      maxTokens: 300,
      temperature: 0.5,
    });

    return new Response(JSON.stringify({ answer }), {
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
