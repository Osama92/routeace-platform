// Notifies transporter org contact about a newly assigned dispatch.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { dispatch_id, transporter_id, job_id } = body;
    if (!dispatch_id || !transporter_id) {
      return new Response(JSON.stringify({ error: "dispatch_id & transporter_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: t } = await svc.from("ld_transporters")
      .select("company_name, contact_email, contact_name").eq("id", transporter_id).maybeSingle();
    const { data: d } = await svc.from("dispatches")
      .select("dispatch_number, pickup_address, delivery_address, scheduled_pickup, cargo_description, cargo_weight_kg")
      .eq("id", dispatch_id).maybeSingle();

    if (!t?.contact_email) {
      return new Response(JSON.stringify({ error: "Transporter has no contact email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const portalLink = `${(req.headers.get("origin") ?? "*")}/transporter-portal`;
    const subject = `New Dispatch ${d?.dispatch_number ?? ""} - Action Required`;
    const html = `
      <h2>Hello ${t.contact_name ?? t.company_name},</h2>
      <p>You have a new dispatch assignment.</p>
      <ul>
        <li><strong>Dispatch:</strong> ${d?.dispatch_number ?? dispatch_id}</li>
        <li><strong>Pickup:</strong> ${d?.pickup_address ?? ""}</li>
        <li><strong>Delivery:</strong> ${d?.delivery_address ?? ""}</li>
        ${d?.scheduled_pickup ? `<li><strong>Scheduled Pickup:</strong> ${new Date(d.scheduled_pickup).toLocaleString()}</li>` : ""}
        ${d?.cargo_description ? `<li><strong>Cargo:</strong> ${d.cargo_description} ${d.cargo_weight_kg ? `· ${d.cargo_weight_kg}kg` : ""}</li>` : ""}
      </ul>
      <p>Open the Transporter Portal to accept and confirm pickup:</p>
      <p><a href="${portalLink}" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open Transporter Portal</a></p>
      <p style="color:#888;font-size:12px;">Sent automatically by RouteAce.</p>
    `;

    let sent = false; let error: string | null = null;
    if (RESEND_KEY) {
      try {
        const resend = new Resend(RESEND_KEY);
        await resend.emails.send({
          from: "RouteAce <onboarding@resend.dev>",
          to: [t.contact_email],
          subject, html,
        });
        sent = true;
      } catch (e: any) { error = e?.message ?? "send failed"; }
    } else {
      error = "RESEND_API_KEY not configured";
    }

    await svc.from("dispatches").update({ transporter_notified_at: new Date().toISOString() }).eq("id", dispatch_id);
    if (job_id) {
      await svc.from("ld_transporter_jobs").update({ updated_at: new Date().toISOString() }).eq("id", job_id);
    }
    await svc.from("outbound_requests").update({ transporter_notified_at: new Date().toISOString() })
      .eq("linked_dispatch_id", dispatch_id);

    return new Response(JSON.stringify({ success: sent, error }), {
      status: sent ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unhandled" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
