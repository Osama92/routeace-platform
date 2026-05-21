import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface SendNotificationEmailRequest {
  dispatch_id?: string | null;
  recipient_email: string;
  recipient_type: string; // customer, leadership, support, etc.
  subject: string;
  body: string;
  notification_type?: string | null;
  include_dispatch_details?: boolean; // If true, fetch truck & locations for subject
}

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Validate caller is authenticated
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic role gate (admin/support/operations)
    const { data: roleRow } = await authedClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const role = (roleRow as any)?.role as string | undefined;
    const allowed = new Set([
      "admin", "support", "operations",
      "super_admin", "org_admin", "ops_manager", "finance_manager", "dispatcher",
    ]);
    if (!role || !allowed.has(role)) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: SendNotificationEmailRequest = await req.json();
    if (!payload.recipient_email || !payload.subject || !payload.body) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Build enhanced subject with truck and locations if dispatch_id provided
    let finalSubject = payload.subject;
    if (payload.dispatch_id && payload.include_dispatch_details !== false) {
      const { data: dispatchData } = await serviceClient
        .from("dispatches")
        .select(`
          dispatch_number,
          pickup_address,
          delivery_address,
          vehicles(registration_number)
        `)
        .eq("id", payload.dispatch_id)
        .single();

      if (dispatchData) {
        const truckNumber = (dispatchData.vehicles as any)?.registration_number || "N/A";
        const pickup = dispatchData.pickup_address?.split(",")[0] || "Origin";
        const delivery = dispatchData.delivery_address?.split(",")[0] || "Destination";
        finalSubject = `[${truckNumber}] ${pickup} → ${delivery} - ${payload.subject}`;
      }
    }

    let status: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      const platformFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@routeace.app";
      const siteUrl = Deno.env.get("SITE_URL") ?? "https://routeace.app";

      const { data: callerMembership } = await serviceClient
        .from("organization_members")
        .select("organization_id, organizations ( name )")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      const orgName = (callerMembership as any)?.organizations?.name ?? "RouteAce";
      const orgId = (callerMembership as any)?.organization_id ?? null;

      let orgSupportEmail: string | null = null;
      if (orgId) {
        const { data: integConf } = await serviceClient
          .from("integrations")
          .select("config")
          .eq("organization_id", orgId)
          .eq("type", "notifications")
          .maybeSingle();
        const cfg = (integConf as any)?.config;
        orgSupportEmail = (typeof cfg?.support_email === "string" && cfg.support_email) ? cfg.support_email : null;
      }
      const fromEmail = orgSupportEmail ?? platformFromEmail;

      const escHtml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const safeBody = escHtml(payload.body).replace(/\n/g, "<br/>");
      const htmlBody = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="padding:24px 32px;background:#0f172a;color:#ffffff;">
          <div style="font-size:20px;font-weight:700;">${orgName}</div>
          <div style="font-size:12px;opacity:0.8;margin-top:4px;">Powered by RouteAce · <a href="${siteUrl}" style="color:#93c5fd;text-decoration:none;">routeace.app</a></div>
        </td></tr>
        <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1f2937;">
          ${safeBody}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
          Sent by ${orgName} via RouteAce · <a href="${siteUrl}" style="color:#2563eb;text-decoration:none;">routeace.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      const emailResponse = await resend.emails.send({
        from: orgSupportEmail
          ? `${orgName} <${fromEmail}>`
          : `${orgName} via RouteAce <${fromEmail}>`,
        to: [payload.recipient_email],
        subject: finalSubject,
        html: htmlBody,
        text: payload.body,
      });
      console.log("Notification email sent:", emailResponse);
    } catch (e: any) {
      status = "failed";
      errorMessage = e?.message ?? "Failed to send";
      console.error("Notification email send failed:", e);
    }

    // Always log with the enhanced subject
    await serviceClient.from("email_notifications").insert({
      dispatch_id: payload.dispatch_id ?? null,
      recipient_email: payload.recipient_email,
      recipient_type: payload.recipient_type,
      subject: finalSubject,
      body: payload.body,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage,
      notification_type: payload.notification_type ?? "manual",
      sent_by: userData.user.id,
      sla_met: status === "sent" ? true : null,
      sla_response_time_minutes: status === "sent" ? 0 : null,
    });

    return new Response(JSON.stringify({ success: status === "sent", status, error: errorMessage }), {
      status: status === "sent" ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-notification-email error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
