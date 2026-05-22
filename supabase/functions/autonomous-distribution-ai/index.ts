import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits } from "../_shared/ai-credits.ts";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";
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

    const scope = await getTenantScope(auth.user.id, auth.userRoles);
    const orgId = await resolveCallerOrgId(req, auth.user.id, auth.userRoles);
    if (!scope.unrestricted && !orgId) {
      return new Response(JSON.stringify({ error: "Forbidden: no organization scope" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const scoped = (q: any): any =>
      scope.unrestricted ? q : q.eq("organization_id", orgId);

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

    const totalDispatches = dispatches.length;
    const deliveredDispatches = dispatches.filter((d: any) => ["delivered", "closed"].includes(d.status));
    const onTimeCount = deliveredDispatches.filter((d: any) => d.on_time_flag === true).length;
    const otdRate = deliveredDispatches.length > 0 ? Math.round((onTimeCount / deliveredDispatches.length) * 100) : 0;
    const activeVehicles = vehicles.filter((v: any) => v.status === "active").length;
    const fleetUtilization = vehicles.length > 0 ? Math.round((activeVehicles / vehicles.length) * 100) : 0;
    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
    const overdueInvoices = invoices.filter((inv: any) => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0);
    const pendingDispatches = dispatches.filter((d: any) => ["draft", "pending", "routed"].includes(d.status)).length;
    const inTransit = dispatches.filter((d: any) => d.status === "in_transit").length;

    const cityDensity: Record<string, number> = {};
    customers.forEach((c: any) => {
      const city = c.city || c.state || "Unknown";
      cityDensity[city] = (cityDensity[city] || 0) + 1;
    });
    const topCities = Object.entries(cityDensity).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const metrics = {
      totalDispatches, otdRate, fleetUtilization, totalRevenue, overdueAmount,
      pendingDispatches, inTransit, activeVehicles,
      totalVehicles: vehicles.length, totalDrivers: drivers.length,
      totalCustomers: customers.length, totalWarehouses: warehouses.length,
    };

    const topCitiesStr = topCities.map(([city, count]) => (city + "(" + count + ")")).join(", ");

    const prompt = "You are RouteAce's Autonomous Distribution AI analyzing real logistics data for an African distribution network.\n\nLIVE PLATFORM DATA:\n- Total dispatches (recent): " + totalDispatches + "\n- On-time delivery rate: " + otdRate + "%\n- Fleet utilization: " + fleetUtilization + "% (" + activeVehicles + "/" + vehicles.length + " vehicles active)\n- Revenue (recent invoices): ₦" + (totalRevenue / 1000000).toFixed(1) + "M\n- Overdue receivables: ₦" + (overdueAmount / 1000000).toFixed(1) + "M (" + overdueInvoices.length + " invoices)\n- Pending dispatches: " + pendingDispatches + "\n- In-transit: " + inTransit + "\n- Total customers: " + customers.length + "\n- Total drivers: " + drivers.length + "\n- Warehouses: " + warehouses.length + "\n- Top cities by customer density: " + topCitiesStr + "\n\nGenerate a JSON response with EXACTLY this structure (no markdown, raw JSON only):\n{\n  \"demandPredictions\": [\n    {\"region\": \"string\", \"currentDemand\": number, \"predictedDemand\": number, \"confidence\": number, \"trend\": \"string like +12%\", \"signal\": \"string describing why\"}\n  ],\n  \"inventoryAlerts\": [\n    {\"warehouse\": \"string\", \"item\": \"string\", \"currentStock\": number, \"daysUntilStockout\": number, \"severity\": \"critical|warning|info\", \"recommendation\": \"string\"}\n  ],\n  \"fleetRecommendations\": [\n    {\"action\": \"string\", \"description\": \"string\", \"impact\": \"string\", \"priority\": \"high|medium|low\", \"automatable\": false}\n  ],\n  \"distributorExpansion\": [\n    {\"region\": \"string\", \"opportunity\": \"string\", \"score\": number, \"marketSize\": \"string\", \"reasoning\": \"string\"}\n  ],\n  \"creditRisks\": [\n    {\"entity\": \"string\", \"riskScore\": number, \"overdueAmount\": \"string\", \"recommendation\": \"string\"}\n  ],\n  \"networkHealth\": {\n    \"overallScore\": number,\n    \"deliveryEfficiency\": number,\n    \"coverageGap\": number,\n    \"bottlenecks\": [\"string\"]\n  }\n}\n\nProvide 4-6 items per array. Use realistic Nigerian/African city names and currency. Base predictions on the actual data provided.";

    let aiPredictions: any = null;
    try {
      const rawContent = await callAnthropic({
        system: "You are a logistics AI engine. Return valid JSON only, no markdown fences.",
        messages: [{ role: "user", content: prompt }],
        model: mapModel("google/gemini-2.5-flash"),
        maxTokens: 2048,
      });
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiPredictions = JSON.parse(cleaned);
    } catch (_e) {
      aiPredictions = null;
    }

    if (!aiPredictions) {
      return new Response(JSON.stringify({
        metrics,
        cityDistribution: topCities,
        predictions: [],
        recommendations: [],
        error: "AI unavailable - showing live metrics only",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      metrics,
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
