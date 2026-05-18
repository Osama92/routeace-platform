import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireAuth, getTenantScope } from "../_shared/require-auth.ts";
import { resolveCallerOrgId } from "../_shared/resolve-org.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve caller tenant scope to prevent cross-tenant data leakage
    const scope = await getTenantScope(auth.user.id, auth.userRoles);
    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!scope.unrestricted && !orgId) {
      return new Response(JSON.stringify({ error: "Forbidden: no organization scope" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const scoped = <T extends { eq: (col: string, val: any) => T }>(q: T): T =>
      scope.unrestricted ? q : q.eq("organization_id", orgId);

    // Gather live platform data in parallel, scoped to caller's organization
    const [
      dispatchesRes,
      invoicesRes,
      customersRes,
      vehiclesRes,
      driversRes,
      warehousesRes,
    ] = await Promise.all([
      scoped(supabase.from("dispatches").select("id, status, cost, pickup_address, delivery_address, created_at, actual_delivery, scheduled_delivery, total_drops, on_time_flag, driver_id, vehicle_id")).order("created_at", { ascending: false }).limit(200),
      scoped(supabase.from("invoices").select("id, status, total_amount, due_date, created_at, balance_due")).order("created_at", { ascending: false }).limit(200),
      scoped(supabase.from("customers").select("id, company_name, city, state, country")).limit(500),
      scoped(supabase.from("vehicles").select("id, status, truck_type, current_mileage")).limit(100),
      scoped(supabase.from("drivers").select("id, name, rating, total_trips, is_active")).limit(100),
      scoped(supabase.from("warehouses").select("id, name, city, state")).limit(50),
    ]);

    const dispatches = dispatchesRes.data || [];
    const invoices = invoicesRes.data || [];
    const customers = customersRes.data || [];
    const vehicles = vehiclesRes.data || [];
    const drivers = driversRes.data || [];
    const warehouses = warehousesRes.data || [];

    // Compute live metrics
    const totalDispatches = dispatches.length;
    const deliveredDispatches = dispatches.filter(d => ["delivered", "closed"].includes(d.status));
    const onTimeCount = deliveredDispatches.filter(d => d.on_time_flag === true).length;
    const otdRate = deliveredDispatches.length > 0 ? Math.round((onTimeCount / deliveredDispatches.length) * 100) : 0;
    const activeVehicles = vehicles.filter(v => v.status === "active").length;
    const fleetUtilization = vehicles.length > 0 ? Math.round((activeVehicles / vehicles.length) * 100) : 0;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    const pendingDispatches = dispatches.filter(d => ["draft", "pending", "routed"].includes(d.status)).length;
    const inTransit = dispatches.filter(d => d.status === "in_transit").length;

    // City distribution analysis
    const cityDensity: Record<string, number> = {};
    customers.forEach(c => {
      const city = c.city || c.state || "Unknown";
      cityDensity[city] = (cityDensity[city] || 0) + 1;
    });
    const topCities = Object.entries(cityDensity).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Build AI context prompt
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Return computed metrics without AI predictions
      return new Response(JSON.stringify({
        metrics: { totalDispatches, otdRate, fleetUtilization, totalRevenue, overdueAmount, pendingDispatches, inTransit, activeVehicles, totalVehicles: vehicles.length, totalDrivers: drivers.length, totalCustomers: customers.length, totalWarehouses: warehouses.length },
        cityDistribution: topCities,
        predictions: [],
        recommendations: [],
        error: "AI unavailable - showing live metrics only",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `You are RouteAce's Autonomous Distribution AI analyzing real logistics data for an African distribution network.

LIVE PLATFORM DATA:
- Total dispatches (recent): ${totalDispatches}
- On-time delivery rate: ${otdRate}%
- Fleet utilization: ${fleetUtilization}% (${activeVehicles}/${vehicles.length} vehicles active)
- Revenue (recent invoices): ₦${(totalRevenue / 1000000).toFixed(1)}M
- Overdue receivables: ₦${(overdueAmount / 1000000).toFixed(1)}M (${overdueInvoices.length} invoices)
- Pending dispatches: ${pendingDispatches}
- In-transit: ${inTransit}
- Total customers: ${customers.length}
- Total drivers: ${drivers.length}
- Warehouses: ${warehouses.length}
- Top cities by customer density: ${topCities.map(([city, count]) => `${city}(${count})`).join(", ")}

Generate a JSON response with EXACTLY this structure (no markdown, raw JSON only):
{
  "demandPredictions": [
    {"region": "string", "currentDemand": number, "predictedDemand": number, "confidence": number, "trend": "string like +12%", "signal": "string describing why"}
  ],
  "inventoryAlerts": [
    {"warehouse": "string", "item": "string", "currentStock": number, "daysUntilStockout": number, "severity": "critical|warning|info", "recommendation": "string"}
  ],
  "fleetRecommendations": [
    {"action": "string", "description": "string", "impact": "string", "priority": "high|medium|low", "automatable": boolean}
  ],
  "distributorExpansion": [
    {"region": "string", "opportunity": "string", "score": number, "marketSize": "string", "reasoning": "string"}
  ],
  "creditRisks": [
    {"entity": "string", "riskScore": number, "overdueAmount": "string", "recommendation": "string"}
  ],
  "networkHealth": {
    "overallScore": number,
    "deliveryEfficiency": number,
    "coverageGap": number,
    "bottlenecks": ["string"]
  }
}

Provide 4-6 items per array. Use realistic Nigerian/African city names and currency. Base predictions on the actual data provided.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a logistics AI engine. Return valid JSON only, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response, handle potential markdown fences
    let aiPredictions;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiPredictions = JSON.parse(cleaned);
    } catch {
      aiPredictions = { error: "Failed to parse AI response", raw: rawContent.substring(0, 200) };
    }

    return new Response(JSON.stringify({
      metrics: {
        totalDispatches, otdRate, fleetUtilization, totalRevenue, overdueAmount,
        pendingDispatches, inTransit, activeVehicles,
        totalVehicles: vehicles.length, totalDrivers: drivers.length,
        totalCustomers: customers.length, totalWarehouses: warehouses.length,
      },
      cityDistribution: topCities,
      ai: aiPredictions,
      generatedAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("autonomous-distribution-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
