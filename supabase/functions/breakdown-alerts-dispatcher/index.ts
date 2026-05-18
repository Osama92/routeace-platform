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
    const { alert_type, severity = "high", vehicle_id, driver_id, message, recipients = [], channels = ["email"] } = await req.json();
    if (!message || !alert_type) throw new Error("alert_type and message required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const AT_API_KEY = Deno.env.get("AFRICASTALKING_API_KEY");
    const AT_USERNAME = Deno.env.get("AFRICASTALKING_USERNAME");

    const sent_status: Record<string, any> = {};

    // Email via Resend
    if (channels.includes("email") && RESEND_API_KEY) {
      const emails = recipients.filter((r: any) => r.email).map((r: any) => r.email);
      if (emails.length > 0) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Routeace Alerts <alerts@routeace.com>",
            to: emails,
            subject: `[${severity.toUpperCase()}] ${alert_type.replace(/_/g, " ")}`,
            html: `<h2>${alert_type}</h2><p>${message}</p><p>Severity: <b>${severity}</b></p>`,
          }),
        });
        sent_status.email = { ok: r.ok, status: r.status };
      }
    }

    // SMS via Africa's Talking
    if (channels.includes("sms") && AT_API_KEY && AT_USERNAME) {
      const phones = recipients.filter((r: any) => r.phone).map((r: any) => r.phone);
      if (phones.length > 0) {
        const r = await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: { apiKey: AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: new URLSearchParams({ username: AT_USERNAME, to: phones.join(","), message: `[${alert_type}] ${message}` }),
        });
        sent_status.sms = { ok: r.ok, status: r.status };
      }
    }

    const { data, error } = await supabase.from("breakdown_alerts").insert({
      alert_type, severity, vehicle_id, driver_id, message, channels, recipients, sent_status,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ alert: data, sent_status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
