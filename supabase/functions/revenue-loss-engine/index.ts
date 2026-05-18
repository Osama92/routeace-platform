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

    const { action } = await req.json();

    if (action === "detect_losses") {
      const losses: any[] = [];

      // Exclude LD tenants - revenue loss is an LC-only concept
      const { data: ldOrgs } = await supabase.from("organizations").select("id").eq("tenant_mode", "LOGISTICS_DEPARTMENT");
      const ldOrgIds = (ldOrgs || []).map((o: any) => o.id);

      // 1. Idle truck detection
      let vehQuery = supabase
        .from("vehicles")
        .select("id, plate_number, truck_type, status, organization_id")
        .in("status", ["available", "idle"]);
      if (ldOrgIds.length) vehQuery = vehQuery.not("organization_id", "in", `(${ldOrgIds.join(",")})`);
      const { data: vehicles } = await vehQuery;

      for (const v of vehicles || []) {
        const { data: recentDispatches } = await supabase
          .from("dispatches")
          .select("id, created_at")
          .eq("vehicle_id", v.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastDispatch = recentDispatches?.[0];
        if (lastDispatch) {
          const daysSince = (Date.now() - new Date(lastDispatch.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 3) {
            const dailyLoss = v.truck_type?.includes("45") ? 85000 : v.truck_type?.includes("30") ? 65000 : v.truck_type?.includes("20") ? 45000 : 30000;
            losses.push({
              loss_type: "idle_truck",
              entity_type: "vehicle",
              entity_id: v.id,
              estimated_loss_amount: Math.round(dailyLoss * daysSince),
              severity: daysSince > 7 ? "critical" : daysSince > 5 ? "high" : "medium",
              description: `${v.plate_number} idle for ${Math.round(daysSince)} days. Est. ₦${Math.round(dailyLoss * daysSince).toLocaleString()} lost.`,
              recommended_action: "Assign to next available dispatch or list on marketplace",
            });
          }
        }
      }

      // 2. Delay penalty detection
      const { data: delayedDispatches } = await supabase
        .from("dispatches")
        .select("id, dispatch_number, actual_delivery, scheduled_delivery, cost, customer_id")
        .not("actual_delivery", "is", null)
        .not("scheduled_delivery", "is", null);

      for (const d of delayedDispatches || []) {
        if (new Date(d.actual_delivery) > new Date(d.scheduled_delivery)) {
          const delayHours = (new Date(d.actual_delivery).getTime() - new Date(d.scheduled_delivery).getTime()) / (1000 * 60 * 60);
          if (delayHours > 6) {
            const penaltyRate = 0.02;
            const penalty = Math.round((d.cost || 0) * penaltyRate * (delayHours / 24));
            losses.push({
              loss_type: "delay_penalty",
              entity_type: "dispatch",
              entity_id: d.id,
              estimated_loss_amount: penalty,
              severity: delayHours > 48 ? "critical" : delayHours > 24 ? "high" : "medium",
              description: `${d.dispatch_number} delayed ${Math.round(delayHours)}h. Potential penalty: ₦${penalty.toLocaleString()}`,
              recommended_action: "Review route and driver performance for future optimization",
            });
          }
        }
      }

      // Insert detected losses
      for (const loss of losses) {
        await supabase.from("revenue_loss_events").insert(loss);
      }

      // Generate analysis summary
      const totalLoss = losses.reduce((sum, l) => sum + l.estimated_loss_amount, 0);
      const idleLoss = losses.filter(l => l.loss_type === "idle_truck").reduce((s, l) => s + l.estimated_loss_amount, 0);
      const delayLoss = losses.filter(l => l.loss_type === "delay_penalty").reduce((s, l) => s + l.estimated_loss_amount, 0);

      return new Response(JSON.stringify({
        success: true,
        detected: losses.length,
        total_loss: totalLoss,
        breakdown: { idle: idleLoss, delays: delayLoss },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_summary") {
      const { data: recentLosses } = await supabase
        .from("revenue_loss_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const totalLoss = (recentLosses || []).reduce((s: number, l: any) => s + (l.estimated_loss_amount || 0), 0);
      const byType: Record<string, number> = {};
      for (const l of recentLosses || []) {
        byType[l.loss_type] = (byType[l.loss_type] || 0) + (l.estimated_loss_amount || 0);
      }

      return new Response(JSON.stringify({ success: true, totalLoss, byType, count: recentLosses?.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
