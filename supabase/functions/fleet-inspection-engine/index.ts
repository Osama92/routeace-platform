import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, vehicle_id, inspection_id, dispatch_id } = await req.json();

    // ACTION: Run predictive maintenance analysis for a vehicle
    if (action === "predict_maintenance") {
      // Gather vehicle data
      const [vehicleRes, inspRes, maintRes, dispatchRes] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", vehicle_id).single(),
        supabase.from("vehicle_inspections").select("*, vehicle_inspection_items(*)").eq("vehicle_id", vehicle_id).order("created_at", { ascending: false }).limit(10),
        supabase.from("fleet_maintenance_orders").select("*").eq("vehicle_id", vehicle_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("dispatches").select("id, status, created_at, actual_delivery").eq("vehicle_id", vehicle_id).order("created_at", { ascending: false }).limit(30),
      ]);

      const vehicle = vehicleRes.data;
      if (!vehicle) return new Response(JSON.stringify({ error: "Vehicle not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const inspections = inspRes.data || [];
      const maintenance = maintRes.data || [];
      const dispatches = dispatchRes.data || [];

      // Calculate component risk scores
      const components = ["brakes", "engine", "tires", "transmission", "suspension", "electrical", "fuel_system", "cooling"];
      const predictions: any[] = [];

      for (const component of components) {
        // Base risk from mileage
        const mileage = vehicle.current_mileage || 0;
        let baseRisk = Math.min(40, Math.floor(mileage / 5000));

        // Inspection history factor
        const relatedItems = inspections.flatMap((i: any) => (i.vehicle_inspection_items || []).filter((item: any) => item.category?.toLowerCase().includes(component)));
        const criticalItems = relatedItems.filter((item: any) => item.condition === "critical" || item.condition === "poor");
        const inspectionRisk = relatedItems.length > 0 ? (criticalItems.length / relatedItems.length) * 40 : 10;

        // Maintenance recency factor
        const componentMaint = maintenance.filter((m: any) => m.description?.toLowerCase().includes(component) || m.maintenance_type?.toLowerCase().includes(component));
        const lastMaint = componentMaint[0];
        const daysSinceMaint = lastMaint ? Math.floor((Date.now() - new Date(lastMaint.created_at).getTime()) / 86400000) : 180;
        const maintRisk = Math.min(30, daysSinceMaint / 6);

        // Usage intensity factor
        const recentDispatches = dispatches.filter((d: any) => {
          const age = (Date.now() - new Date(d.created_at).getTime()) / 86400000;
          return age < 30;
        });
        const usageRisk = Math.min(20, recentDispatches.length * 2);

        // Recurrence factor
        const recurrence = criticalItems.length > 2 ? 15 : criticalItems.length > 0 ? 8 : 0;

        const failureProbability = Math.min(100, Math.round(baseRisk + inspectionRisk + maintRisk + usageRisk + recurrence));
        const confidence = Math.min(95, Math.max(40, 50 + inspections.length * 3 + maintenance.length * 2));

        let urgency = "low";
        if (failureProbability >= 85) urgency = "critical";
        else if (failureProbability >= 70) urgency = "high";
        else if (failureProbability >= 50) urgency = "medium";

        const daysToFailure = Math.max(1, Math.round((100 - failureProbability) * 0.5));

        const riskFactors = [];
        if (mileage > 100000) riskFactors.push({ factor: "High mileage", weight: baseRisk });
        if (criticalItems.length > 0) riskFactors.push({ factor: `${criticalItems.length} critical inspection(s)`, weight: inspectionRisk });
        if (daysSinceMaint > 90) riskFactors.push({ factor: `${daysSinceMaint} days since last maintenance`, weight: maintRisk });
        if (recentDispatches.length > 10) riskFactors.push({ factor: "High usage intensity", weight: usageRisk });

        let recommendedAction = "Continue monitoring";
        if (urgency === "critical") recommendedAction = `Immediate ${component} inspection and repair required`;
        else if (urgency === "high") recommendedAction = `Schedule ${component} maintenance within 48 hours`;
        else if (urgency === "medium") recommendedAction = `Plan ${component} check at next service window`;

        predictions.push({
          vehicle_id,
          component,
          failure_probability: failureProbability,
          confidence_score: confidence,
          predicted_failure_date: new Date(Date.now() + daysToFailure * 86400000).toISOString().split("T")[0],
          urgency,
          risk_factors: riskFactors,
          recommended_action: recommendedAction,
          auto_blocked: failureProbability >= 85,
        });
      }

      // Upsert predictions
      for (const pred of predictions) {
        const { data: existing } = await supabase.from("maintenance_predictions").select("id").eq("vehicle_id", vehicle_id).eq("component", pred.component).is("resolved_at", null).maybeSingle();
        if (existing) {
          await supabase.from("maintenance_predictions").update(pred).eq("id", existing.id);
        } else {
          await supabase.from("maintenance_predictions").insert(pred);
        }
      }

      // Calculate overall health score
      const avgRisk = predictions.reduce((s, p) => s + p.failure_probability, 0) / predictions.length;
      const healthScore = Math.max(0, Math.round(100 - avgRisk));

      return new Response(JSON.stringify({
        vehicle_id,
        health_score: healthScore,
        predictions,
        critical_count: predictions.filter(p => p.urgency === "critical").length,
        high_count: predictions.filter(p => p.urgency === "high").length,
        auto_blocked: predictions.some(p => p.auto_blocked),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: Evaluate dispatch safety gate
    if (action === "evaluate_dispatch_gate") {
      // Check pre-trip inspection
      const { data: latestInspection } = await supabase.from("vehicle_inspections")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .eq("inspection_type", "pre_trip")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check active predictions
      const { data: activePredictions } = await supabase.from("maintenance_predictions")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .is("resolved_at", null)
        .in("urgency", ["critical", "high"]);

      let decision = "approved";
      let reason = "Vehicle cleared for dispatch";
      const predictionIds = (activePredictions || []).map((p: any) => p.id);

      // Check inspection status
      if (!latestInspection || latestInspection.status === "failed") {
        decision = "blocked";
        reason = latestInspection ? "Pre-trip inspection failed" : "No pre-trip inspection completed";
      } else if (latestInspection.status === "attention_needed") {
        decision = "conditional";
        reason = "Pre-trip inspection passed with minor issues - dispatch with caution";
      }

      // Check predictions
      const criticalPreds = (activePredictions || []).filter((p: any) => p.urgency === "critical");
      if (criticalPreds.length > 0) {
        decision = "blocked";
        reason = `Critical failure predicted: ${criticalPreds.map((p: any) => p.component).join(", ")}`;
      } else if ((activePredictions || []).length > 0 && decision !== "blocked") {
        decision = "conditional";
        reason = `High-risk components detected: ${(activePredictions || []).map((p: any) => p.component).join(", ")}`;
      }

      // Check post-trip from last dispatch
      const { data: lastDispatch } = await supabase.from("dispatches")
        .select("id, status")
        .eq("vehicle_id", vehicle_id)
        .in("status", ["delivered", "closed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastDispatch) {
        const { data: postTrip } = await supabase.from("vehicle_inspections")
          .select("id, status")
          .eq("vehicle_id", vehicle_id)
          .eq("dispatch_id", lastDispatch.id)
          .eq("inspection_type", "post_trip")
          .maybeSingle();

        if (!postTrip) {
          decision = "blocked";
          reason = "Post-trip inspection from last dispatch not completed";
        }
      }

      // Record gate decision
      await supabase.from("dispatch_safety_gates").insert({
        vehicle_id,
        dispatch_id: dispatch_id || null,
        gate_type: "pre_dispatch",
        decision,
        reason,
        inspection_id: latestInspection?.id || null,
        prediction_ids: predictionIds,
      });

      return new Response(JSON.stringify({ decision, reason, inspection: latestInspection, predictions: activePredictions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: Run fleet-wide predictions
    if (action === "fleet_scan") {
      const { data: vehicles } = await supabase.from("vehicles").select("id, plate_number, status").eq("status", "active");
      const results = [];
      for (const v of (vehicles || []).slice(0, 20)) {
        // Lightweight per-vehicle prediction
        const { data: preds } = await supabase.from("maintenance_predictions").select("*").eq("vehicle_id", v.id).is("resolved_at", null);
        const critCount = (preds || []).filter((p: any) => p.urgency === "critical").length;
        const highCount = (preds || []).filter((p: any) => p.urgency === "high").length;
        const avgRisk = (preds || []).length > 0 ? Math.round((preds || []).reduce((s: number, p: any) => s + p.failure_probability, 0) / (preds || []).length) : 0;
        results.push({
          vehicle_id: v.id,
          plate_number: v.plate_number,
          health_score: Math.max(0, 100 - avgRisk),
          critical_count: critCount,
          high_count: highCount,
          auto_blocked: critCount > 0,
        });
      }

      return new Response(JSON.stringify({
        fleet_health: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.health_score, 0) / results.length) : 100,
        vehicles: results,
        blocked_count: results.filter(r => r.auto_blocked).length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Fleet inspection engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
