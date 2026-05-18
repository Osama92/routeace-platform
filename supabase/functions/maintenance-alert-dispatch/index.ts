// Multi-channel alert dispatcher for Maintenance Intelligence.
// Sends email (Resend) + Africastalking SMS + writes in-app log row.
// All sends are recorded in alert_dispatch_log (append-only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
type Channel = "email" | "sms" | "in_app";

interface DispatchPayload {
  alert_kind: string; // grounded | scheduled | overdue | rebalanced | leak | etc
  subject: string;
  message: string;
  recipients: Array<{
    email?: string;
    phone?: string;
    user_id?: string;
    channels?: Channel[];
  }>;
  related_entity_type?: string;
  related_entity_id?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set", skipped: true };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "RouteAce Alerts <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, response: data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function sendSMS(to: string, message: string) {
  const username = Deno.env.get("AFRICASTALKING_USERNAME");
  const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
  if (!username || !apiKey) return { ok: false, error: "Africastalking secrets missing", skipped: true };
  try {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("to", to);
    body.append("message", message.slice(0, 280));
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey,
      },
      body: body.toString(),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, response: data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = (await req.json()) as DispatchPayload;
    if (!payload?.alert_kind || !payload?.message || !Array.isArray(payload?.recipients)) {
      return new Response(JSON.stringify({ error: "alert_kind, message, recipients required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown>[] = [];

    for (const r of payload.recipients) {
      const channels: Channel[] = r.channels?.length ? r.channels : ["in_app"];

      for (const ch of channels) {
        let recipient = "";
        let result: any = { ok: false, skipped: true };
        let provider = ch;

        if (ch === "email" && r.email) {
          recipient = r.email;
          provider = "resend";
          result = await sendEmail(r.email, payload.subject, `<p>${payload.message}</p>`);
        } else if (ch === "sms" && r.phone) {
          recipient = r.phone;
          provider = "africastalking";
          result = await sendSMS(r.phone, payload.message);
        } else if (ch === "in_app") {
          recipient = r.user_id || "in_app";
          provider = "in_app";
          result = { ok: true };
        } else {
          // Channel selected but no destination
          continue;
        }

        const status = result.skipped ? "skipped" : result.ok ? "sent" : "failed";

        await supabase.from("alert_dispatch_log").insert({
          alert_kind: payload.alert_kind,
          channel: ch,
          recipient,
          recipient_user_id: r.user_id || null,
          subject: payload.subject || null,
          message: payload.message,
          related_entity_type: payload.related_entity_type || null,
          related_entity_id: payload.related_entity_id || null,
          delivery_status: status,
          provider,
          provider_response: result.response || null,
          error_message: result.error || null,
        });

        results.push({ channel: ch, recipient, status });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
