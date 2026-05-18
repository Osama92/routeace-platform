import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireAuth, getTenantScope, assertResourceOrg } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface FuelBaselineCalc {
  distance_km: number;
  vehicle_type: string;
  load_level: "empty" | "half" | "full";
  route_type: "highway" | "urban" | "mixed";
}

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Phase 3: require signed-in privileged caller (no anon AI/data scrape).
  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  // Phase 9: per-user rate limit (60 req/min).
  const rl = rateLimit({ bucket: "fuel-intel", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  // Phase 7: caller's tenant scope.
  const scope = await getTenantScope(auth.user.id, auth.userRoles);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // Phase 7: per-action tenant validation for resource IDs.
    if (action === "analyze_variance" && params.dispatch_id) {
      const denial = await assertResourceOrg({ scope, table: "dispatches", id: params.dispatch_id });
      if (denial) return denial;
    }
    if (action === "score_driver" && params.driver_id) {
      const denial = await assertResourceOrg({ scope, table: "drivers", id: params.driver_id });
      if (denial) return denial;
    }
    if (action === "fleet_fuel_summary" && !scope.unrestricted && scope.orgIds.length === 0) {
      return respond({ error: "Forbidden: no organization scope" }, 403);
    }

    switch (action) {
      case "calculate_baseline": {
        const { distance_km, vehicle_type, load_level, route_type } = params as FuelBaselineCalc;
        const { data: baseline } = await supabase
          .from("fuel_baselines")
          .select("*")
          .eq("vehicle_type", vehicle_type)
          .maybeSingle();

        const avgKmPerL = baseline?.avg_km_per_litre ?? 5.0;
        const loadFactor = baseline
          ? (load_level === "empty" ? baseline.load_factor_empty :
             load_level === "half" ? baseline.load_factor_half : baseline.load_factor_full)
          : (load_level === "empty" ? 1.0 : load_level === "half" ? 1.15 : 1.35);
        const routeFactor = baseline
          ? (route_type === "highway" ? baseline.route_factor_highway :
             route_type === "urban" ? baseline.route_factor_urban : baseline.route_factor_mixed)
          : (route_type === "highway" ? 1.0 : route_type === "urban" ? 1.25 : 1.12);

        const expectedFuel = distance_km / avgKmPerL;
        const adjustedFuel = expectedFuel * loadFactor * routeFactor;
        const threshold = adjustedFuel * 0.15; // 15% variance threshold

        return respond({
          expected_fuel_litres: Math.round(expectedFuel * 100) / 100,
          adjusted_fuel_litres: Math.round(adjustedFuel * 100) / 100,
          load_factor: loadFactor,
          route_factor: routeFactor,
          variance_threshold_litres: Math.round(threshold * 100) / 100,
          avg_km_per_litre: avgKmPerL,
        });
      }

      case "analyze_variance": {
        const { dispatch_id, actual_fuel_litres } = params;
        // Get dispatch details
        const { data: dispatch } = await supabase
          .from("dispatches")
          .select("id, vehicle_id, driver_id, pickup_address, delivery_address, distance_km")
          .eq("id", dispatch_id)
          .maybeSingle();

        if (!dispatch) return respond({ error: "Dispatch not found" }, 404);

        const distance = dispatch.distance_km || 100;
        const adjustedFuel = distance / 5.0 * 1.12; // Default baseline
        const variance = actual_fuel_litres - adjustedFuel;
        const variancePercent = (variance / adjustedFuel) * 100;

        let classification = "normal";
        if (variancePercent > 25) classification = "high_risk";
        else if (variancePercent > 15) classification = "inefficient";

        // Store variance report
        await supabase.from("fuel_variance_reports").insert({
          dispatch_id,
          vehicle_id: dispatch.vehicle_id,
          driver_id: dispatch.driver_id,
          distance_km: distance,
          expected_fuel_litres: Math.round(adjustedFuel * 100) / 100,
          actual_fuel_litres,
          variance_litres: Math.round(variance * 100) / 100,
          variance_percent: Math.round(variancePercent * 100) / 100,
          classification,
          load_factor_used: 1.0,
          route_factor_used: 1.12,
          route_type: "mixed",
        });

        // Auto-flag fraud if high risk
        if (classification === "high_risk") {
          await supabase.from("fuel_fraud_flags").insert({
            dispatch_id,
            driver_id: dispatch.driver_id,
            vehicle_id: dispatch.vehicle_id,
            fraud_type: "over_fueling",
            severity: variancePercent > 40 ? "critical" : "high",
            description: `Fuel variance ${Math.round(variancePercent)}% above expected. ${Math.round(variance)}L excess.`,
            evidence: { variance_percent: variancePercent, expected: adjustedFuel, actual: actual_fuel_litres },
          });
        }

        return respond({
          classification,
          variance_litres: Math.round(variance * 100) / 100,
          variance_percent: Math.round(variancePercent * 100) / 100,
          expected_fuel: Math.round(adjustedFuel * 100) / 100,
          actual_fuel: actual_fuel_litres,
          fraud_flagged: classification === "high_risk",
        });
      }

      case "score_driver": {
        const { driver_id } = params;
        // Get recent variance reports
        const { data: reports } = await supabase
          .from("fuel_variance_reports")
          .select("*")
          .eq("driver_id", driver_id)
          .order("created_at", { ascending: false })
          .limit(50);

        const { data: frauds } = await supabase
          .from("fuel_fraud_flags")
          .select("*")
          .eq("driver_id", driver_id)
          .eq("status", "open");

        const totalTrips = reports?.length || 0;
        const highRisk = reports?.filter(r => r.classification === "high_risk").length || 0;
        const inefficient = reports?.filter(r => r.classification === "inefficient").length || 0;
        const avgVariance = totalTrips > 0
          ? (reports?.reduce((s, r) => s + Math.abs(Number(r.variance_percent || 0)), 0) || 0) / totalTrips
          : 0;

        // Score components (0-100, higher = more risk)
        const varianceScore = Math.min(100, avgVariance * 2.5);
        const fraudScore = Math.min(100, (frauds?.length || 0) * 25);
        const idlingScore = Math.min(100,
          (reports?.reduce((s, r) => s + Number(r.idle_hours || 0), 0) || 0) / Math.max(totalTrips, 1) * 20
        );
        const patternScore = Math.min(100, (highRisk / Math.max(totalTrips, 1)) * 100);
        const historyScore = Math.min(100, (inefficient / Math.max(totalTrips, 1)) * 50 + (highRisk / Math.max(totalTrips, 1)) * 80);

        // Weighted overall (0-100, higher = more risk)
        const overall = Math.round(
          varianceScore * 0.4 +
          patternScore * 0.15 +
          idlingScore * 0.15 +
          fraudScore * 0.15 +
          historyScore * 0.10
        );

        const riskLevel = overall >= 70 ? "high_risk" : overall >= 40 ? "suspicious" : "normal";

        const insights: string[] = [];
        if (varianceScore > 60) insights.push("Consistent fuel variance above expected levels");
        if (fraudScore > 30) insights.push(`${frauds?.length} active fraud flags pending investigation`);
        if (idlingScore > 40) insights.push("Above-average idle time detected");

        // Upsert score
        const { data: existing } = await supabase
          .from("fuel_risk_scores")
          .select("id")
          .eq("driver_id", driver_id)
          .maybeSingle();

        if (existing) {
          await supabase.from("fuel_risk_scores").update({
            overall_score: overall,
            variance_score: Math.round(varianceScore),
            route_deviation_score: 0,
            idling_score: Math.round(idlingScore),
            fuel_request_pattern_score: Math.round(patternScore),
            driver_history_score: Math.round(historyScore),
            risk_level: riskLevel,
            ai_insights: insights,
          }).eq("id", existing.id);
        } else {
          await supabase.from("fuel_risk_scores").insert({
            driver_id,
            overall_score: overall,
            variance_score: Math.round(varianceScore),
            idling_score: Math.round(idlingScore),
            fuel_request_pattern_score: Math.round(patternScore),
            driver_history_score: Math.round(historyScore),
            risk_level: riskLevel,
            ai_insights: insights,
          });
        }

        return respond({
          driver_id,
          overall_score: overall,
          risk_level: riskLevel,
          components: {
            variance: Math.round(varianceScore),
            idling: Math.round(idlingScore),
            pattern: Math.round(patternScore),
            fraud: Math.round(fraudScore),
            history: Math.round(historyScore),
          },
          insights,
          total_trips_analyzed: totalTrips,
        });
      }

      case "fleet_fuel_summary": {
        const { data: events } = await supabase
          .from("fuel_events")
          .select("total_cost, litres_issued, created_at, approval_status, flagged")
          .order("created_at", { ascending: false })
          .limit(500);

        const { data: variances } = await supabase
          .from("fuel_variance_reports")
          .select("variance_litres, classification, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        const { data: fraudFlags } = await supabase
          .from("fuel_fraud_flags")
          .select("id, fraud_type, severity, status")
          .eq("status", "open");

        const totalSpend = events?.reduce((s, e) => s + Number(e.total_cost || 0), 0) || 0;
        const totalLitres = events?.reduce((s, e) => s + Number(e.litres_issued || 0), 0) || 0;
        const totalLoss = variances
          ?.filter(v => Number(v.variance_litres) > 0)
          .reduce((s, v) => s + Number(v.variance_litres), 0) || 0;
        const highRiskTrips = variances?.filter(v => v.classification === "high_risk").length || 0;
        const normalTrips = variances?.filter(v => v.classification === "normal").length || 0;
        const totalTrips = variances?.length || 0;
        const efficiencyScore = totalTrips > 0
          ? Math.round((normalTrips / totalTrips) * 100)
          : 100;

        return respond({
          total_fuel_spend: totalSpend,
          total_litres: totalLitres,
          estimated_loss_litres: Math.round(totalLoss * 100) / 100,
          estimated_loss_cost: Math.round(totalLoss * 700), // avg ₦700/L
          efficiency_score: efficiencyScore,
          active_fraud_flags: fraudFlags?.length || 0,
          high_risk_trips: highRiskTrips,
          total_trips_analyzed: totalTrips,
          fraud_breakdown: {
            over_fueling: fraudFlags?.filter(f => f.fraud_type === "over_fueling").length || 0,
            ghost_fueling: fraudFlags?.filter(f => f.fraud_type === "ghost_fueling").length || 0,
            receipt_mismatch: fraudFlags?.filter(f => f.fraud_type === "receipt_mismatch").length || 0,
            route_deviation: fraudFlags?.filter(f => f.fraud_type === "route_deviation").length || 0,
          },
        });
      }

      default:
        return respond({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Fuel intelligence error:", err);
    return respond({ error: (err as Error).message }, 500);
  }
});
