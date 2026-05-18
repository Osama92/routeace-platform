import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { requireAuth, getTenantScope, assertResourceOrg } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Phase 3: privileged auth gate (any signed-in privileged user). Internal cron
  // callers should use SERVICE_ROLE_KEY directly via DB, not via this HTTP entry.
  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  // Phase 9: per-user rate limit (60 req/min) to stop accidental floods.
  const rl = rateLimit({ bucket: "driver-scoring", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  // Phase 7: resolve caller's org scope for cross-tenant validation.
  const scope = await getTenantScope(auth.user.id, auth.userRoles);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read body once and reuse - earlier code re-read req.json() in branches,
    // which would throw "body already used"; consolidate here.
    const body = await req.json().catch(() => ({}));
    const { action, driver_id } = body as { action?: string; driver_id?: string };

    // Phase 7: validate driver_id belongs to caller's org (skip for unscoped fleet_scan).
    if (driver_id && action !== "fleet_scan") {
      const denial = await assertResourceOrg({ scope, table: "drivers", id: driver_id });
      if (denial) return denial;
    }

    if (action === "calculate_score") {
      // Get driver's dispatches
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, status, on_time_flag, actual_delivery_days, estimated_delivery_days, created_at")
        .eq("driver_id", driver_id)
        .order("created_at", { ascending: false })
        .limit(100);

      // Get behavior events
      const { data: events } = await supabase
        .from("driver_behavior_events")
        .select("*")
        .eq("driver_id", driver_id)
        .order("created_at", { ascending: false })
        .limit(200);

      // Get inspections
      const { data: inspections } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("inspector_id", driver_id)
        .order("created_at", { ascending: false })
        .limit(50);

      const totalTrips = dispatches?.length || 0;
      const onTimeTrips = dispatches?.filter((d: any) => d.on_time_flag === true).length || 0;
      const completedTrips = dispatches?.filter((d: any) => ["delivered", "closed"].includes(d.status)).length || 0;

      // Safety score (30%) - based on incidents
      const incidents = events?.filter((e: any) => ["accident", "near_miss"].includes(e.event_type)) || [];
      const criticalIncidents = incidents.filter((e: any) => e.severity === "critical").length;
      const safetyScore = Math.max(0, 100 - (criticalIncidents * 25) - (incidents.length * 5));

      // Fuel efficiency (15%)
      const fuelAnomalies = events?.filter((e: any) => e.event_type === "fuel_anomaly").length || 0;
      const fuelScore = Math.max(0, 100 - (fuelAnomalies * 10));

      // Brake/acceleration (15%)
      const harshEvents = events?.filter((e: any) => ["harsh_braking", "harsh_acceleration"].includes(e.event_type)).length || 0;
      const brakeScore = Math.max(0, 100 - (harshEvents * 3));

      // Route compliance (15%)
      const routeDeviations = events?.filter((e: any) => e.event_type === "route_deviation").length || 0;
      const routeScore = Math.max(0, 100 - (routeDeviations * 8));

      // Incident history (15%)
      const incidentScore = Math.max(0, 100 - (incidents.length * 10));

      // Inspection compliance (10%)
      const passedInspections = inspections?.filter((i: any) => i.overall_status === "pass").length || 0;
      const totalInspections = inspections?.length || 1;
      const inspectionScore = (passedInspections / totalInspections) * 100;

      // Delivery timeliness (10%) - capped contribution
      const timelinessScore = totalTrips > 0 ? (onTimeTrips / totalTrips) * 100 : 50;

      // Composite score
      const overallScore = Math.round(
        (safetyScore * 0.30) +
        (fuelScore * 0.15) +
        (brakeScore * 0.15) +
        (routeScore * 0.15) +
        (incidentScore * 0.15) +
        (inspectionScore * 0.10) +
        (timelinessScore * 0.10)
      );

      // Determine tier
      let tier = "good";
      if (overallScore >= 90) tier = "elite";
      else if (overallScore >= 75) tier = "good";
      else if (overallScore >= 50) tier = "risk_monitor";
      else tier = "blocked";

      // Upsert score
      const { data: existing } = await supabase
        .from("driver_behavior_scores")
        .select("id")
        .eq("driver_id", driver_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("driver_behavior_scores").update({
          overall_score: overallScore,
          safety_score: safetyScore,
          fuel_efficiency_score: fuelScore,
          brake_acceleration_score: brakeScore,
          route_compliance_score: routeScore,
          incident_history_score: incidentScore,
          inspection_compliance_score: inspectionScore,
          delivery_timeliness_score: timelinessScore,
          dispatch_tier: tier,
          total_trips: totalTrips,
          total_incidents: incidents.length,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("driver_behavior_scores").insert({
          driver_id,
          overall_score: overallScore,
          safety_score: safetyScore,
          fuel_efficiency_score: fuelScore,
          brake_acceleration_score: brakeScore,
          route_compliance_score: routeScore,
          incident_history_score: incidentScore,
          inspection_compliance_score: inspectionScore,
          delivery_timeliness_score: timelinessScore,
          dispatch_tier: tier,
          total_trips: totalTrips,
          total_incidents: incidents.length,
        });
      }

      // Calculate insurance risk
      const insuranceScore = Math.round(
        ((100 - safetyScore) * 0.25) +
        ((100 - brakeScore) * 0.25) +
        ((100 - inspectionScore) * 0.15) +
        ((100 - routeScore) * 0.10) +
        ((100 - timelinessScore) * 0.10) +
        ((100 - fuelScore) * 0.10) +
        (incidents.length * 2)
      );

      const clampedInsurance = Math.min(100, Math.max(0, insuranceScore));
      let riskTier = "medium";
      if (clampedInsurance <= 30) riskTier = "low";
      else if (clampedInsurance <= 60) riskTier = "medium";
      else if (clampedInsurance <= 80) riskTier = "high";
      else riskTier = "critical";

      const premiumMultiplier = clampedInsurance <= 30 ? 0.85 : clampedInsurance <= 60 ? 1.0 : clampedInsurance <= 80 ? 1.3 : 1.8;
      const claimProb = Math.min(1, clampedInsurance / 200);

      const { data: existingIns } = await supabase
        .from("driver_insurance_profiles")
        .select("id")
        .eq("driver_id", driver_id)
        .maybeSingle();

      const insuranceData = {
        insurance_risk_score: clampedInsurance,
        risk_tier: riskTier,
        premium_multiplier: premiumMultiplier,
        claim_probability: claimProb,
        accident_history_score: safetyScore,
        behavior_score: overallScore,
        inspection_failure_score: inspectionScore,
        route_violation_score: routeScore,
        timeliness_risk_score: timelinessScore,
        fatigue_pattern_score: fuelScore,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIns) {
        await supabase.from("driver_insurance_profiles").update(insuranceData).eq("id", existingIns.id);
      } else {
        await supabase.from("driver_insurance_profiles").insert({ driver_id, ...insuranceData });
      }

      return new Response(JSON.stringify({
        success: true,
        score: { overall: overallScore, tier, safety: safetyScore, fuel: fuelScore, brake: brakeScore, route: routeScore, incident: incidentScore, inspection: inspectionScore, timeliness: timelinessScore },
        insurance: { score: clampedInsurance, tier: riskTier, premium: premiumMultiplier, claimProb },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "fleet_scan") {
      // Phase 7: scope active drivers to caller's orgs.
      let driverQuery = supabase.from("drivers").select("id, organization_id").eq("status", "active");
      if (!scope.unrestricted) {
        if (scope.orgIds.length === 0) {
          return new Response(JSON.stringify({ error: "Forbidden: no organization scope" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        driverQuery = driverQuery.in("organization_id", scope.orgIds);
      }
      const { data: drivers } = await driverQuery;
      const results = [];
      for (const driver of (drivers || []).slice(0, 50)) {
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/driver-scoring-engine`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
            body: JSON.stringify({ action: "calculate_score", driver_id: driver.id }),
          });
          const data = await res.json();
          results.push({ driver_id: driver.id, ...data });
        } catch (e) {
          results.push({ driver_id: driver.id, error: (e as Error).message });
        }
      }
      return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "calculate_accident_risk") {
      const { vehicle_id, dispatch_id, route_description } = body as { vehicle_id?: string; dispatch_id?: string; route_description?: string };

      // Phase 7: validate vehicle_id and dispatch_id belong to caller's org.
      if (vehicle_id) {
        const denial = await assertResourceOrg({ scope, table: "vehicles", id: vehicle_id });
        if (denial) return denial;
      }
      if (dispatch_id) {
        const denial = await assertResourceOrg({ scope, table: "dispatches", id: dispatch_id });
        if (denial) return denial;
      }

      // Get driver score
      const { data: driverScore } = await supabase
        .from("driver_behavior_scores")
        .select("*")
        .eq("driver_id", driver_id)
        .maybeSingle();

      // Get vehicle health
      const { data: vehiclePrediction } = vehicle_id ? await supabase
        .from("maintenance_predictions")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() : { data: null };

      const driverRisk = driverScore ? (100 - (driverScore.overall_score || 50)) : 50;
      const vehicleRisk = vehiclePrediction ? (vehiclePrediction.failure_probability || 30) : 30;
      const routeRisk = 30; // Default, can be enhanced with route data
      const fatigueRisk = (driverScore?.total_trips || 0) > 10 ? 40 : 20;
      const loadRisk = 20;
      const weatherRisk = 15;
      const historyRisk = driverScore ? Math.min(100, (driverScore.total_incidents || 0) * 15) : 10;

      const accidentRisk = Math.round(
        (driverRisk * 0.30) + (vehicleRisk * 0.20) + (routeRisk * 0.15) +
        (fatigueRisk * 0.10) + (loadRisk * 0.10) + (weatherRisk * 0.10) + (historyRisk * 0.05)
      );

      let riskLevel = "low";
      let recommendation = "approve";
      if (accidentRisk >= 80) { riskLevel = "critical"; recommendation = "block"; }
      else if (accidentRisk >= 60) { riskLevel = "high"; recommendation = "require_approval"; }
      else if (accidentRisk >= 30) { riskLevel = "medium"; recommendation = "caution"; }

      await supabase.from("accident_risk_scores").insert({
        driver_id, vehicle_id, dispatch_id, route_description,
        overall_risk_score: accidentRisk,
        driver_behavior_risk: driverRisk,
        vehicle_condition_risk: vehicleRisk,
        route_risk: routeRisk,
        fatigue_risk: fatigueRisk,
        load_risk: loadRisk,
        weather_risk: weatherRisk,
        incident_history_risk: historyRisk,
        risk_level: riskLevel,
        dispatch_recommendation: recommendation,
      });

      return new Response(JSON.stringify({
        success: true, accidentRisk, riskLevel, recommendation,
        components: { driverRisk, vehicleRisk, routeRisk, fatigueRisk, loadRisk, weatherRisk, historyRisk },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
