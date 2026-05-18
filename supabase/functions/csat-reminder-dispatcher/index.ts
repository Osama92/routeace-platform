// Sends CSAT reminder emails 24h after ticket resolution.
// Invoked by pg_cron hourly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron-only endpoint: require shared secret
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const incomingSecret = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const { data: pending, error } = await supabase.rpc("support_pending_csat_reminders");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const appUrl = Deno.env.get("APP_PUBLIC_URL") || "https://routeaceglyde.app";
  let sent = 0, failed = 0;

  for (const t of (pending || []) as any[]) {
    const link = `${appUrl}/support/track/${t.public_token}`;
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: {
          to: t.complainant_email,
          subject: `How was our support? Rate ticket ${t.ref}`,
          html: `
            <p>Hi ${t.customer_name || "there"},</p>
            <p>Your support ticket <strong>${t.ref}</strong> (${t.subject}) was resolved.
            We would love your feedback - it takes less than 30 seconds.</p>
            <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:white;border-radius:6px;text-decoration:none">Rate your experience</a></p>
            <p style="color:#666;font-size:12px">This rating link is one-time and expires soon.</p>
          `,
        },
      });
      await supabase.rpc("mark_csat_reminder_sent", { p_ticket_id: t.ticket_id });
      sent++;
    } catch (e) {
      console.error("CSAT reminder failed", t.ticket_id, e);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, considered: pending?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
