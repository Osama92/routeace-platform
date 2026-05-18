import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { requireAuth } from "../_shared/require-auth.ts";
import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, vehicle_id, driver_id, route_description } = await req.json();

    if (action === "evaluate_dispatch") {
      // Get driver score
      const { data: driverScore } = await supabase
        .from("driver_behavior_scores")
        .select("*")
        .eq("driver_id", driver_id)
        .maybeSingle();

      // Get vehicle inspection status
      const { data: latestInspection } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .eq("inspection_type", "pre_trip")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get vehicle health prediction
      const { data: prediction } = await supabase
        .from("maintenance_predictions")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get dispatch safety gate
      const { data: safetyGate } = await supabase
        .from("dispatch_safety_gates")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const dScore = driverScore?.overall_score || 50;
      const vehicleHealth = prediction ? (100 - (prediction.failure_probability || 0)) : 70;
      const inspectionPass = latestInspection?.overall_status === "pass";
      const accidentRisk = 30; // Simplified

      const compositeScore = Math.round(
        (dScore * 0.30) + (vehicleHealth * 0.30) + (inspectionPass ? 25 : 0) + (Math.max(0, 100 - accidentRisk) * 0.15)
      );

      let decision = "auto_approved";
      let reason = "All checks passed";

      if (!inspectionPass) {
        decision = "blocked";
        reason = "Pre-trip inspection not passed";
      } else if (dScore < 50) {
        decision = "blocked";
        reason = `Driver score ${dScore} below minimum threshold (50)`;
      } else if (vehicleHealth < 30) {
        decision = "blocked";
        reason = `Vehicle health critical (${vehicleHealth}%)`;
      } else if (compositeScore < 60) {
        decision = "pending_approval";
        reason = `Composite score ${compositeScore} requires manager approval`;
      } else if (dScore < 75) {
        decision = "pending_approval";
        reason = `Driver in risk_monitor tier - restricted routes`;
      }

      // Record decision
      await supabase.from("auto_dispatch_decisions").insert({
        vehicle_id, driver_id, route_description,
        decision, reason,
        driver_score: dScore,
        vehicle_health_score: vehicleHealth,
        accident_risk_score: accidentRisk,
        composite_score: compositeScore,
      });

      return new Response(JSON.stringify({
        success: true, decision, reason, compositeScore,
        details: { driverScore: dScore, vehicleHealth, inspectionPass, accidentRisk },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "predict_parts") {
      // Get vehicles with maintenance predictions
      const { data: predictions } = await supabase
        .from("maintenance_predictions")
        .select("*")
        .gte("failure_probability", 60)
        .order("failure_probability", { ascending: false })
        .limit(20);

      const partsOrders = [];
      for (const pred of predictions || []) {
        const componentMap: Record<string, { part: string; category: string; cost: number }> = {
          brakes: { part: "Brake Pad Set", category: "brakes", cost: 45000 },
          engine: { part: "Engine Oil + Filter Kit", category: "engine", cost: 35000 },
          tires: { part: "Tire Set (4)", category: "tyres", cost: 180000 },
          transmission: { part: "Transmission Fluid Kit", category: "transmission", cost: 25000 },
          electrical: { part: "Battery + Alternator Check Kit", category: "electrical", cost: 55000 },
          suspension: { part: "Shock Absorber Set", category: "suspension", cost: 65000 },
        };

        const component = pred.component || "engine";
        const partInfo = componentMap[component] || componentMap.engine;
        const urgency = pred.failure_probability >= 85 ? "emergency" : pred.failure_probability >= 70 ? "urgent" : "predictive";

        const needDate = new Date();
        needDate.setDate(needDate.getDate() + (pred.predicted_days_to_failure || 14));

        partsOrders.push({
          vehicle_id: pred.vehicle_id,
          part_name: partInfo.part,
          part_category: partInfo.category,
          urgency,
          predicted_need_date: needDate.toISOString().split("T")[0],
          estimated_cost: partInfo.cost,
          triggered_by: "predictive_ai",
          prediction_id: pred.id,
        });
      }

      // Insert parts orders
      if (partsOrders.length > 0) {
        await supabase.from("parts_orders").insert(partsOrders);
      }

      return new Response(JSON.stringify({ success: true, ordersCreated: partsOrders.length, orders: partsOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "detect_fraud") {
      const fraudEvents: any[] = [];

      // Fuel theft detection - look for sudden fuel drops
      const { data: fuelReadings } = await supabase
        .from("vehicle_sensor_readings")
        .select("*")
        .eq("sensor_type", "fuel_level")
        .order("recorded_at", { ascending: false })
        .limit(500);

      // Group by vehicle
      const byVehicle: Record<string, any[]> = {};
      for (const r of fuelReadings || []) {
        if (!byVehicle[r.vehicle_id]) byVehicle[r.vehicle_id] = [];
        byVehicle[r.vehicle_id].push(r);
      }

      for (const [vid, readings] of Object.entries(byVehicle)) {
        for (let i = 0; i < readings.length - 1; i++) {
          const drop = readings[i].value - readings[i + 1].value;
          if (drop > 30) { // 30% sudden drop
            fraudEvents.push({
              fraud_type: "fuel_theft",
              entity_type: "vehicle",
              entity_id: vid,
              confidence_score: Math.min(95, 50 + drop),
              severity: drop > 50 ? "critical" : "high",
              description: `Sudden fuel drop of ${drop.toFixed(1)}% detected`,
              evidence: { readings: [readings[i], readings[i + 1]] },
              financial_impact: drop * 500,
            });
          }
        }
      }

      for (const event of fraudEvents) {
        await supabase.from("fraud_detection_events").insert(event);
      }

      return new Response(JSON.stringify({ success: true, detected: fraudEvents.length, events: fraudEvents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
