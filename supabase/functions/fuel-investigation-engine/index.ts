// Fuel Investigation Engine - produces deep investigation breakdown for fuel anomalies
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;


  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "/investigate";

    if (route === "/list") {
      const { data, error } = await supa
        .from("fuel_investigations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (route === "/investigate" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const dispatchId = body.dispatch_id;
      const vehicleId = body.vehicle_id;
      const driverId = body.driver_id;

      // Pull dispatch, fuel logs, vehicle health, driver behavior
      let dispatch: any = null;
      let fuelLogs: any[] = [];
      let components: any[] = [];

      if (dispatchId) {
        const { data: d } = await supa.from("dispatches").select("*").eq("id", dispatchId).maybeSingle();
        dispatch = d;
        const { data: fl } = await supa.from("fuel_logs").select("*").eq("dispatch_id", dispatchId);
        fuelLogs = fl || [];
      }
      if (vehicleId) {
        const { data: c } = await supa.from("vehicle_health_components").select("*").eq("vehicle_id", vehicleId);
        components = c || [];
      }

      const distance = Number(dispatch?.distance_km || body.distance_km || 0);
      const avgKmPerLitre = Number(dispatch?.avg_km_per_litre || body.avg_km_per_litre || 3.5);
      const expectedFuel = distance > 0 ? distance / avgKmPerLitre : 0;
      const issuedFuel = fuelLogs.reduce((s, f) => s + Number(f.litres || 0), 0) || Number(body.issued_fuel || 0);
      const variance = issuedFuel - expectedFuel;
      const variancePct = expectedFuel > 0 ? (variance / expectedFuel) * 100 : 0;
      const fuelPrice = Number(body.fuel_price || 1500);
      const costImpact = Math.max(0, variance) * fuelPrice;

      // Root cause analysis
      const rootCauses: string[] = [];
      const maintenanceFactors: any = {};
      const driverFactors: any = {};

      // Maintenance factor
      const injector = components.find((c) => c.component_type === "injector");
      if (injector?.last_serviced_date) {
        const months = (Date.now() - new Date(injector.last_serviced_date).getTime()) / (30 * 86400000);
        if (months > 6) {
          rootCauses.push(`Injector overdue for servicing (${months.toFixed(1)} months) - high inefficiency risk`);
          maintenanceFactors.injector_months_overdue = months;
        }
      }

      // Driver behavior
      if (driverId) {
        const { data: behavior } = await supa
          .from("driver_behavior_logs")
          .select("*")
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false })
          .limit(10);
        const idleHigh = behavior?.some((b: any) => (b.idle_minutes || 0) > 60);
        if (idleHigh) {
          rootCauses.push("High idling time detected in driver behavior logs");
          driverFactors.idling = "high";
        }
      }

      // Variance interpretation
      if (variancePct > 30) rootCauses.push(`Severe variance: +${variancePct.toFixed(1)}% over expected`);
      else if (variancePct > 15) rootCauses.push(`Moderate variance: +${variancePct.toFixed(1)}% over expected`);

      // Classify
      let classification: "normal" | "suspicious" | "high_risk_fraud" = "normal";
      if (variancePct > 30 && rootCauses.length < 2) classification = "high_risk_fraud";
      else if (variancePct > 15) classification = "suspicious";

      const aiConclusion = rootCauses.length > 0
        ? `Fuel variance caused by:\n→ ${rootCauses.join("\n→ ")}`
        : "Fuel consumption within acceptable range based on available data.";

      // Persist investigation
      const { data, error } = await supa.from("fuel_investigations").insert({
        dispatch_id: dispatchId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        expected_fuel_litres: expectedFuel,
        issued_fuel_litres: issuedFuel,
        variance_litres: variance,
        variance_percent: variancePct,
        cost_impact: costImpact,
        fraud_classification: classification,
        root_causes: rootCauses,
        driver_behavior_factors: driverFactors,
        maintenance_factors: maintenanceFactors,
        ai_conclusion: aiConclusion,
      }).select().single();
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, investigation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown route" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("fuel-investigation-engine error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
