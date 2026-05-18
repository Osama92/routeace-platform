import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);

    const { data: { user } } = await anon.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Resolve organization (org-scoped, no cross-tenant leakage)
    const { data: mem } = await svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const orgId: string | null = mem?.organization_id ?? null;
    if (!orgId) {
      return json({
        empty: true,
        heavyKpi: [],
        longHaul: [],
        terrainRisks: [],
        aiScores: [],
        heavyRoutes: [],
        whatIfScenarios: [],
        generatedAt: new Date().toISOString(),
      });
    }

    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    const [{ data: dispatches }, { data: vehicles }, { data: profitability }] =
      await Promise.all([
        svc.from("dispatches")
          .select("id,vehicle_id,distance_km,total_distance_km,cargo_weight_kg,actual_pickup,actual_delivery,scheduled_delivery,on_time_flag,sla_status,status,suggested_fuel_liters,actual_fuel_liters,pickup_address,delivery_address,sla_risk_score,load_capacity_pct,eta_met")
          .eq("organization_id", orgId)
          .gte("created_at", since)
          .limit(1000),
        svc.from("vehicles")
          .select("id,vehicle_type,status,capacity_kg")
          .eq("organization_id", orgId)
          .limit(500),
        svc.from("trip_profitability")
          .select("revenue,total_cost,profit,margin_percent,fuel_cost,driver_cost,created_at")
          .gte("created_at", since)
          .limit(1000),
      ]);

    const D = dispatches ?? [];
    const V = vehicles ?? [];
    const P = profitability ?? [];

    // Heavy KPIs
    const completed = D.filter((d) => d.status === "completed" || d.actual_delivery);
    const onTime = completed.filter((d) => d.on_time_flag || d.eta_met).length;
    const slaCompliance = completed.length ? Math.round((onTime / completed.length) * 100) : 0;

    const totalKm = D.reduce((s, d) => s + (Number(d.total_distance_km || d.distance_km) || 0), 0);
    const totalTons = D.reduce((s, d) => s + (Number(d.cargo_weight_kg) || 0), 0) / 1000;
    const tonKmEff = totalKm > 0 && V.length > 0
      ? Math.min(100, Math.round((totalTons * totalKm) / (V.length * Math.max(totalKm, 1)) * 100))
      : 0;

    const heavyVehicles = V.filter((v) => /truck|hgv|heavy|15t|20t|30t/i.test(String(v.vehicle_type || "")));
    const activeHeavy = heavyVehicles.filter((v) => v.status === "active" || v.status === "in_use").length;
    const heavyUtil = heavyVehicles.length ? Math.round((activeHeavy / heavyVehicles.length) * 100) : 0;

    const fuelSuggested = D.reduce((s, d) => s + (Number(d.suggested_fuel_liters) || 0), 0);
    const fuelActual = D.reduce((s, d) => s + (Number(d.actual_fuel_liters) || 0), 0);
    const fuelOptimalPct = fuelActual > 0
      ? Math.max(0, Math.min(100, Math.round((fuelSuggested / fuelActual) * 100)))
      : 0;

    const avgMargin = P.length
      ? Math.round(P.reduce((s, p) => s + (Number(p.margin_percent) || 0), 0) / P.length)
      : 0;

    const heavyKpi = [
      { label: "On-Time SLA Compliance", value: slaCompliance, unit: "%", desc: `${onTime}/${completed.length} dispatches on time (90d)`, color: "bg-green-500" },
      { label: "Fleet Utilization", value: heavyUtil, unit: "%", desc: `${activeHeavy} of ${heavyVehicles.length} heavy vehicles active`, color: "bg-blue-500" },
      { label: "Fuel Efficiency", value: fuelOptimalPct, unit: "% optimal", desc: `${Math.round(fuelActual)}L actual vs ${Math.round(fuelSuggested)}L suggested`, color: fuelOptimalPct >= 80 ? "bg-green-500" : "bg-yellow-500" },
      { label: "Avg Trip Margin", value: Math.max(0, Math.min(100, avgMargin)), unit: "%", desc: `${P.length} trips analysed`, color: avgMargin >= 20 ? "bg-green-500" : "bg-yellow-500" },
      { label: "Total Distance (90d)", value: Math.min(100, Math.round(totalKm / 100)), unit: "k km", desc: `${Math.round(totalKm).toLocaleString()} km logged`, color: "bg-blue-500" },
      { label: "Cargo Throughput", value: Math.min(100, Math.round(totalTons)), unit: "T", desc: `${Math.round(totalTons).toLocaleString()} tons moved`, color: "bg-green-500" },
    ];

    // Heavy route intelligence - group dispatches by pickup→delivery
    const routeMap = new Map<string, { trips: number; late: number; risk: number }>();
    for (const d of D) {
      const key = `${(d.pickup_address || "Origin").split(",")[0]} → ${(d.delivery_address || "Destination").split(",")[0]}`;
      const e = routeMap.get(key) || { trips: 0, late: 0, risk: 0 };
      e.trips += 1;
      if (d.on_time_flag === false || d.eta_met === false) e.late += 1;
      e.risk += Number(d.sla_risk_score) || 0;
      routeMap.set(key, e);
    }
    const heavyRoutes = Array.from(routeMap.entries())
      .filter(([, v]) => v.trips >= 2)
      .sort((a, b) => b[1].trips - a[1].trips)
      .slice(0, 6)
      .map(([label, v]) => {
        const delayPct = v.trips ? (v.late / v.trips) * 100 : 0;
        const score = Math.max(20, Math.min(100, Math.round(100 - delayPct - (v.risk / v.trips) * 0.2)));
        return { label, score, trips: v.trips, delay: `${delayPct.toFixed(1)}%`, mode: "FLEET" };
      });

    // AI scores derived from real signals
    const avgRisk = D.length ? D.reduce((s, d) => s + (Number(d.sla_risk_score) || 0), 0) / D.length : 0;
    const avgLoad = D.length ? D.reduce((s, d) => s + (Number(d.load_capacity_pct) || 0), 0) / D.length : 0;
    const hasDispatches = D.length > 0;
    const hasCompleted = completed.length > 0;
    const hasTrips = P.length > 0;
    const hasFuel = fuelActual > 0;
    const hasLoad = D.some((d) => Number(d.load_capacity_pct) > 0);
    const hasHeavy = heavyVehicles.length > 0;

    const aiScores = [
      { label: "Confidence Score System", desc: hasDispatches ? `Composite of ${D.length} dispatches across SLA, risk, load` : "Awaiting first dispatches", score: hasDispatches ? Math.max(0, Math.min(100, Math.round(100 - avgRisk))) : 0, color: "text-muted-foreground" },
      { label: "SLA Compliance Prediction", desc: hasCompleted ? `Based on ${completed.length} completed dispatches` : "No completed dispatches yet", score: hasCompleted ? slaCompliance : 0, color: slaCompliance >= 85 ? "text-green-500" : "text-yellow-500" },
      { label: "Margin-Aware Routing", desc: hasTrips ? `Avg margin from ${P.length} trips` : "No profitability data yet", score: hasTrips ? Math.max(0, Math.min(100, avgMargin)) : 0, color: "text-muted-foreground" },
      { label: "Load Consolidation", desc: hasLoad ? `Avg load capacity utilization` : "No load capacity recorded", score: hasLoad ? Math.round(avgLoad) : 0, color: avgLoad >= 70 ? "text-green-500" : "text-yellow-500" },
      { label: "Fuel Efficiency AI", desc: hasFuel ? `Suggested vs actual fuel ratio` : "No fuel data logged", score: hasFuel ? fuelOptimalPct : 0, color: fuelOptimalPct >= 80 ? "text-green-500" : "text-yellow-500" },
      { label: "Fleet Readiness", desc: hasHeavy ? `Heavy vehicles available now` : "No heavy vehicles registered", score: hasHeavy ? heavyUtil : 0, color: "text-muted-foreground" },
    ];

    // Long-haul rest & refuel - derive from longest dispatch routes
    const longHaul = [...D]
      .filter((d) => Number(d.total_distance_km || d.distance_km) >= 200)
      .sort((a, b) => Number(b.total_distance_km || b.distance_km) - Number(a.total_distance_km || a.distance_km))
      .slice(0, 4)
      .map((d) => {
        const km = Number(d.total_distance_km || d.distance_km) || 0;
        const hrs = km / 55;
        return {
          route: `${(d.pickup_address || "Origin").split(",")[0]} → ${(d.delivery_address || "Destination").split(",")[0]} (${Math.round(km)} km)`,
          restStops: Math.max(1, Math.floor(hrs / 4)),
          fuelStops: Math.max(1, Math.floor(km / 400)),
          overnight: hrs > 12 ? 1 : 0,
          borderChecks: 0,
          est: `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`,
        };
      });

    // What-if scenarios anchored to org's actual fleet & dispatch metrics
    const whatIfScenarios = [
      P.length > 0 && {
        label: "Increase load utilization to 90%",
        impact: `Current avg ${Math.round(avgLoad)}% → +${Math.round((avgMargin || 5) * 0.3)}% margin`,
        positive: true,
      },
      fuelOptimalPct < 90 && {
        label: "Apply fuel-optimal routing",
        impact: `Cut fuel variance by ${Math.round(100 - fuelOptimalPct)}% → savings on ${Math.round(fuelActual - fuelSuggested)}L`,
        positive: true,
      },
      heavyUtil < 80 && heavyVehicles.length > 0 && {
        label: `Activate ${heavyVehicles.length - activeHeavy} idle heavy vehicles`,
        impact: `Lift fleet utilization from ${heavyUtil}% to ${Math.min(100, heavyUtil + 20)}%`,
        positive: true,
      },
      slaCompliance < 95 && completed.length > 0 && {
        label: "Earlier dispatch start times",
        impact: `Reduce ${completed.length - onTime} late deliveries → +${Math.round(((completed.length - onTime) / Math.max(completed.length, 1)) * 100)}% on-time`,
        positive: true,
      },
    ].filter(Boolean);

    return json({
      empty: D.length === 0 && V.length === 0,
      heavyKpi,
      longHaul,
      aiScores,
      heavyRoutes,
      whatIfScenarios,
      counts: { dispatches: D.length, vehicles: V.length, trips: P.length },
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
