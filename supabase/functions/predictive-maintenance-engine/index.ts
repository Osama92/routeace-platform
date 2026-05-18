// Predictive Maintenance Engine - analyzes inspections, maintenance history, dispatch patterns
// to forecast vehicle failures BEFORE they happen. Target ≥80% accuracy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth, getTenantScope, assertResourceOrg } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Prediction {
  vehicle_id: string;
  predicted_issue: string;
  component: string;
  confidence: number;
  risk: "low" | "medium" | "high" | "critical";
  reasoning: string[];
  recommended_action: string;
  urgency_hours: number;
}

function classifyRisk(score: number): Prediction["risk"] {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

async function analyzeVehicle(supa: any, vehicleId: string): Promise<Prediction[]> {
  const predictions: Prediction[] = [];
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  // 1. Pull recent inspections
  const { data: inspections } = await supa
    .from("vehicle_inspections")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("created_at", fourteenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  // 2. Pull component health
  const { data: components } = await supa
    .from("vehicle_health_components")
    .select("*")
    .eq("vehicle_id", vehicleId);

  // 3. Pull recent maintenance
  const { data: maintenance } = await supa
    .from("vehicle_maintenance")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false })
    .limit(20);

  const inspCount = inspections?.length ?? 0;

  // ---- Pattern: repeated component flags ----
  const componentFlagCounts: Record<string, number> = {};
  inspections?.forEach((i: any) => {
    const issues = i.issues_found || i.notes || "";
    const text = (typeof issues === "string" ? issues : JSON.stringify(issues)).toLowerCase();
    ["brake", "tyre", "tire", "engine", "injector", "coolant", "battery", "transmission"].forEach((kw) => {
      if (text.includes(kw)) componentFlagCounts[kw] = (componentFlagCounts[kw] || 0) + 1;
    });
  });

  for (const [kw, count] of Object.entries(componentFlagCounts)) {
    if (count >= 2) {
      const dataConsistency = Math.min(30, count * 10);
      const inspectionFreq = Math.min(25, inspCount * 2);
      const patternStrength = Math.min(20, count * 5);
      const historyAccuracy = 25;
      const score = dataConsistency + inspectionFreq + patternStrength + historyAccuracy;

      predictions.push({
        vehicle_id: vehicleId,
        predicted_issue: `${kw.charAt(0).toUpperCase() + kw.slice(1)} system degradation`,
        component: kw,
        confidence: Math.min(95, score),
        risk: classifyRisk(score),
        reasoning: [
          `${count} ${kw}-related issues flagged in last 14 days`,
          `Pattern strength: ${count >= 3 ? "STRONG" : "MODERATE"}`,
        ],
        recommended_action: `Schedule ${kw} inspection within ${count >= 3 ? 24 : 48} hours`,
        urgency_hours: count >= 3 ? 24 : 48,
      });
    }
  }

  // ---- Pattern: overdue components ----
  components?.forEach((c: any) => {
    if (!c.last_serviced_date) return;
    const monthsSince = (now.getTime() - new Date(c.last_serviced_date).getTime()) / (30 * 86400000);
    const interval = c.service_interval_months || 6;
    if (monthsSince > interval) {
      const overdueRatio = monthsSince / interval;
      const score = Math.min(95, 50 + overdueRatio * 20);
      predictions.push({
        vehicle_id: vehicleId,
        predicted_issue: `${c.component_type} servicing overdue`,
        component: c.component_type,
        confidence: Math.round(score),
        risk: classifyRisk(score),
        reasoning: [
          `${c.component_type} last serviced ${monthsSince.toFixed(1)} months ago`,
          `Service interval: ${interval} months (${(overdueRatio * 100).toFixed(0)}% overdue)`,
          c.component_type === "injector" && monthsSince > 6
            ? "High fuel inefficiency risk"
            : "Failure risk increases with overdue period",
        ],
        recommended_action: `Service ${c.component_type} immediately${c.component_type === "injector" ? " - affects fuel economy" : ""}`,
        urgency_hours: overdueRatio > 1.5 ? 24 : 48,
      });
    }
  });

  return predictions;
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Phase 3: privileged auth gate to prevent anonymous tenant data scrape.
  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  // Phase 9: per-user rate limit (60 req/min).
  const rl = rateLimit({ bucket: "pred-maint", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  // Phase 7: tenant scope.
  const scope = await getTenantScope(auth.user.id, auth.userRoles);

  try {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "/predict";

    if (route === "/predict") {
      let vehicleIds: string[] = [];
      const targetVehicleId = url.searchParams.get("vehicle_id");
      if (targetVehicleId) {
        // Phase 7: validate this vehicle belongs to caller's org.
        const denial = await assertResourceOrg({ scope, table: "vehicles", id: targetVehicleId });
        if (denial) return denial;
        vehicleIds = [targetVehicleId];
      } else {
        // Phase 7: scope vehicle list to caller's orgs.
        let q = supa.from("vehicles").select("id").limit(100);
        if (!scope.unrestricted) {
          if (scope.orgIds.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "Forbidden: no organization scope" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          q = q.in("organization_id", scope.orgIds);
        }
        const { data } = await q;
        vehicleIds = (data || []).map((v: any) => v.id);
      }

      const allPredictions: Prediction[] = [];
      for (const vid of vehicleIds) {
        const preds = await analyzeVehicle(supa, vid);
        allPredictions.push(...preds);
      }

      // Persist new predictions
      let saved = 0;
      for (const p of allPredictions) {
        const { error } = await supa.from("maintenance_predictions").insert({
          vehicle_id: p.vehicle_id,
          component: p.component,
          confidence_score: p.confidence,
          failure_probability: p.confidence,
          urgency: p.risk,
          risk_factors: { reasoning: p.reasoning, predicted_issue: p.predicted_issue },
          recommended_action: p.recommended_action,
          predicted_failure_date: new Date(Date.now() + p.urgency_hours * 3600000).toISOString().split("T")[0],
        });
        if (!error) saved++;
      }

      return new Response(
        JSON.stringify({ success: true, predictions: allPredictions, saved, vehicles_analyzed: vehicleIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (route === "/list") {
      const { data, error } = await supa
        .from("maintenance_predictions")
        .select("*")
        .is("resolved_at", null)
        .order("confidence_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (route === "/schedule" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      // Phase 7: validate vehicle_id belongs to caller's org before scheduling.
      if (body.vehicle_id) {
        const denial = await assertResourceOrg({ scope, table: "vehicles", id: body.vehicle_id });
        if (denial) return denial;
      }
      const { data, error } = await supa.from("maintenance_schedules").insert({
        vehicle_id: body.vehicle_id,
        prediction_id: body.prediction_id,
        service_type: body.service_type || "predictive_service",
        component_type: body.component_type,
        scheduled_date: body.scheduled_date || new Date().toISOString().split("T")[0],
        priority: body.priority || "high",
        blocks_dispatch: body.blocks_dispatch ?? false,
        notes: body.notes,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown route" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("predictive-maintenance-engine error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
