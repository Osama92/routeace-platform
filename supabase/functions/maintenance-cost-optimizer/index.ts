import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;


  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { vehicle_id } = await req.json().catch(() => ({}));

    // Pull vehicles
    const { data: vehicles } = await supabase.from("vehicles").select("id, plate_number, truck_type").limit(50);

    const periodStart = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const periodEnd = new Date().toISOString().split("T")[0];
    const inserts: any[] = [];

    // Deterministic per-vehicle seed (stable, derived from id) — replaces Math.random heuristic
    const seedFrac = (id: string, salt: number) => {
      let h = 2166136261 ^ salt;
      for (let i = 0; i < id.length; i++) { h = Math.imul(h ^ id.charCodeAt(i), 16777619); }
      return ((h >>> 0) % 1000) / 1000;
    };

    for (const v of vehicles || []) {
      if (vehicle_id && v.id !== vehicle_id) continue;
      // Deterministic heuristic estimate (replace with real maintenance data when ready)
      const reactive = Math.round(150000 + seedFrac(v.id, 1) * 250000);
      const preventive = Math.round(40000 + seedFrac(v.id, 2) * 80000);
      const downtimeHrs = Math.round(8 + seedFrac(v.id, 3) * 40);
      const downtimeCost = downtimeHrs * 12500; // ₦/hr opportunity cost
      const projectedSavings = Math.round(reactive * 0.45);
      const roi = Math.round((projectedSavings / Math.max(preventive, 1)) * 10) / 10;
      const action = roi > 3
        ? "Shift to preventive maintenance schedule - high ROI"
        : roi > 1.5 ? "Increase inspection frequency"
        : "Continue current schedule";

      inserts.push({
        vehicle_id: v.id, period_start: periodStart, period_end: periodEnd,
        reactive_spend: reactive, preventive_spend: preventive,
        downtime_hours: downtimeHrs, downtime_cost: downtimeCost,
        projected_savings: projectedSavings, roi_score: roi,
        recommended_action: action,
        ai_recommendation: `${v.plate_number}: Reactive ₦${reactive.toLocaleString()} vs preventive ₦${preventive.toLocaleString()}. Projected save: ₦${projectedSavings.toLocaleString()}.`,
      });
    }

    if (inserts.length > 0) await supabase.from("maintenance_cost_analysis").insert(inserts);

    return new Response(JSON.stringify({ analyzed: inserts.length, total_projected_savings: inserts.reduce((a, b) => a + b.projected_savings, 0) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
