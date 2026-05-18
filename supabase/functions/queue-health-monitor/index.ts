// Queue Worker Health Monitor
// Returns queue snapshot + raises platform_audit_log entries when alert thresholds are exceeded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: snap, error } = await supa.rpc("get_queue_health_snapshot");
    if (error) throw error;

    // Auto-emit alerts via log_platform_event when thresholds tripped
    const alerts = (snap as any)?.alerts ?? {};
    const fired: string[] = [];
    for (const [k, v] of Object.entries(alerts)) {
      if (!v) continue;
      fired.push(k);
      await supa.rpc("log_platform_event", {
        p_event_class: "queue_alert",
        p_message: `Queue alert: ${k}`,
        p_severity: "warn",
        p_organization_id: null,
        p_tenant_mode: null,
        p_resource: "async_jobs",
        p_payload: { alert: k, snapshot: snap },
        p_source: "edge",
      });
    }

    return new Response(JSON.stringify({ snapshot: snap, fired_alerts: fired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
