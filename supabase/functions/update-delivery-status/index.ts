import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();

interface DeliveryUpdateRequest {
  dispatch_id: string;
  status: string;
  location?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  corsHeaders = buildCors(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth gate (must be logged in)
    const authHeader = req.headers.get("Authorization") ?? "";
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Role check - only operational/admin staff may change dispatch status
    const ALLOWED_ROLES = new Set([
      "admin",
      "super_admin",
      "org_admin",
      "ops_manager",
      "operations",
      "dispatcher",
      "support",
      "driver",
    ]);
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const callerRoles = (roleRows || []).map((r: any) => r.role);
    if (!callerRoles.some((r: string) => ALLOWED_ROLES.has(r))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { dispatch_id, status, location, notes }: DeliveryUpdateRequest = await req.json();

    // Whitelist allowed status values
    const ALLOWED_STATUSES = new Set([
      "assigned",
      "picked_up",
      "in_transit",
      "delayed",
      "delivered",
      "cancelled",
    ]);
    if (!ALLOWED_STATUSES.has(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get dispatch details with customer info
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatches")
      .select(
        `
        id,
        dispatch_number,
        pickup_address,
        delivery_address,
        organization_id,
        organizations ( name, id ),
        customers (
          company_name,
          contact_name,
          email
        )
      `
      )
      .eq("id", dispatch_id)
      .single();

    if (dispatchError || !dispatch) {
      throw new Error("Dispatch not found");
    }

    // Update dispatch status
    const { error: updateError } = await supabase
      .from("dispatches")
      .update({
        status,
        ...(status === "picked_up" && { actual_pickup: new Date().toISOString() }),
        ...(status === "delivered" && { actual_delivery: new Date().toISOString() }),
      })
      .eq("id", dispatch_id);

    if (updateError) throw updateError;

    // Create delivery update record
    const { error: insertError } = await supabase.from("delivery_updates").insert({
      dispatch_id,
      status,
      location,
      notes,
      email_sent: false,
    });

    if (insertError) throw insertError;

    // Best-effort geocode of free-text location so the Tracking map can show pins.
    const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    if (location && GMAPS_KEY) {
      try {
        const geo = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location + ", Nigeria")}&key=${GMAPS_KEY}`
        );
        const geoJson = await geo.json();
        const pt = geoJson?.results?.[0]?.geometry?.location;
        if (pt?.lat && pt?.lng) {
          // Update the most recent matching delivery_updates row
          const { data: latest } = await supabase
            .from("delivery_updates")
            .select("id")
            .eq("dispatch_id", dispatch_id)
            .eq("status", status)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if ((latest as any)?.id) {
            await supabase
              .from("delivery_updates")
              .update({ latitude: pt.lat, longitude: pt.lng })
              .eq("id", (latest as any).id);
          }
        }
      } catch {
        // geocoding failure never blocks the status update
      }
    }

    const customerEmail = (dispatch as any).customers?.email as string | undefined;
    const customerName =
      (dispatch as any).customers?.contact_name || (dispatch as any).customers?.company_name;

    let emailSent = false;

    if (customerEmail) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.warn("RESEND_API_KEY not configured; cannot send status update email");
      } else {
        const resend = new Resend(resendApiKey);

        const orgName = (dispatch as any).organizations?.name ?? "Your Logistics Provider";
        const orgId = (dispatch as any).organizations?.id ?? (dispatch as any).organization_id ?? null;
        let orgSupportEmail: string | null = null;
        if (orgId) {
          const { data: integConf } = await supabase
            .from("integrations")
            .select("config")
            .eq("organization_id", orgId)
            .eq("type", "notifications")
            .maybeSingle();
          const cfg = (integConf as any)?.config;
          orgSupportEmail = (typeof cfg?.support_email === "string" && cfg.support_email) ? cfg.support_email : null;
        }
        const dispatchNum = (dispatch as any).dispatch_number;
        const pickupAddr = (dispatch as any).pickup_address;
        const delivAddr = (dispatch as any).delivery_address;
        const siteUrl = Deno.env.get("SITE_URL") ?? "https://routeace.app";
        const platformFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@routeace.app";
        const fromEmail = orgSupportEmail ?? platformFromEmail;
        const fromEmailSource: "org_support" | "platform_default" =
          orgSupportEmail ? "org_support" : "platform_default";
        const trackingUrl = `${siteUrl}/public-tracking?ref=${encodeURIComponent(dispatchNum)}`;

        const statusMessages: Record<string, string> = {
          assigned: "Your shipment has been assigned to a driver and will be picked up shortly.",
          picked_up: "Your shipment has been picked up and is now on its way to you.",
          in_transit: "Your shipment is currently in transit and moving toward the delivery address.",
          delayed: "Your shipment has been delayed. Our team is working to deliver it as quickly as possible and will keep you updated.",
          delivered: "Your shipment has been successfully delivered. Thank you for your business.",
          cancelled: "Your shipment has been cancelled. Please contact us if you have any questions.",
        };

        const statusLabel: Record<string, string> = {
          assigned: "Assigned",
          picked_up: "Picked Up",
          in_transit: "In Transit",
          delayed: "Delayed",
          delivered: "Delivered",
          cancelled: "Cancelled",
        };

        const esc = (s: string) =>
          String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

        const badgeColor =
          status === "delivered"
            ? "#16a34a"
            : status === "delayed" || status === "cancelled"
            ? "#dc2626"
            : "#0891b2";

        const subject = `Delivery Update [${statusLabel[status] ?? status}] - ${dispatchNum}`;

        const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">${esc(orgName)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Powered by RouteAce · routeace.app</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Shipment Update</div>
          <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${badgeColor};color:#ffffff;font-size:13px;font-weight:600;">${esc(statusLabel[status] ?? status)}</div>
          <p style="font-size:15px;line-height:1.55;margin:20px 0 12px;">Dear ${esc(customerName || "Valued Customer")},</p>
          <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#374151;">${esc(statusMessages[status] ?? `Your shipment status has been updated to: ${status}.`)}</p>
          ${notes ? `<div style="background:#f9fafb;border-left:3px solid ${badgeColor};padding:12px 14px;border-radius:6px;margin:16px 0;font-size:14px;color:#374151;">${esc(notes)}</div>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">Dispatch No.</strong><div style="color:#0f172a;font-weight:600;margin-top:2px;">${esc(dispatchNum)}</div></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">From</strong><div style="color:#0f172a;margin-top:2px;">${esc(pickupAddr)}</div></td></tr>
            <tr><td style="padding:12px 16px;${location ? "border-bottom:1px solid #e5e7eb;" : ""}font-size:13px;"><strong style="color:#6b7280;font-weight:500;">To</strong><div style="color:#0f172a;margin-top:2px;">${esc(delivAddr)}</div></td></tr>
            ${location ? `<tr><td style="padding:12px 16px;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">Current Location</strong><div style="color:#0f172a;margin-top:2px;">${esc(location)}</div></td></tr>` : ""}
          </table>
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${esc(trackingUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Track Your Shipment</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 8px;">This notification was sent by ${esc(orgName)} via the RouteAce logistics platform. If you have questions about your delivery, reply to this email or contact your logistics provider directly.</p>
          <p style="font-size:12px;color:#9ca3af;margin:0;">RouteAce · <a href="${esc(siteUrl)}" style="color:#9ca3af;text-decoration:underline;">routeace.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const plainText =
          `Dear ${customerName || "Valued Customer"},\n\n` +
          `${statusMessages[status] ?? `Status: ${status}`}\n\n` +
          `Dispatch No.: ${dispatchNum}\n` +
          `From: ${pickupAddr}\n` +
          `To: ${delivAddr}\n` +
          (location ? `Current location: ${location}\n` : "") +
          (notes ? `Note: ${notes}\n` : "") +
          `\nTrack your shipment: ${trackingUrl}\n\n` +
          `Best regards,\n${orgName}`;

        // Retry with exponential backoff (3 attempts: 0ms, 500ms, 1500ms)
        const MAX_ATTEMPTS = 3;
        let attempt = 0;
        let lastError: any = null;
        let emailResponse: any = null;
        while (attempt < MAX_ATTEMPTS) {
          attempt++;
          try {
            emailResponse = await resend.emails.send({
              from: orgSupportEmail
                ? `${orgName} <${fromEmail}>`
                : `${orgName} via RouteAce <${fromEmail}>`,
              to: [customerEmail],
              subject,
              html: htmlBody,
              text: plainText,
            });
            // Resend returns { data, error } - treat error as failure
            if ((emailResponse as any)?.error) {
              throw new Error((emailResponse as any).error?.message ?? "Provider error");
            }
            lastError = null;
            break;
          } catch (e: any) {
            lastError = e;
            console.warn(`[update-delivery-status] attempt ${attempt} failed:`, e?.message);
            if (attempt < MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, 500 * attempt));
            }
          }
        }

        const orgIdForLog = (dispatch as any).organization_id ?? null;

        if (!lastError) {
          console.log("Status update email sent:", emailResponse);
          emailSent = true;

          await supabase
            .from("delivery_updates")
            .update({ email_sent: true })
            .eq("dispatch_id", dispatch_id)
            .eq("status", status)
            .order("created_at", { ascending: false })
            .limit(1);

          await supabase.from("email_notifications").insert({
            dispatch_id,
            recipient_email: customerEmail,
            recipient_type: "customer",
            subject,
            body: plainText,
            status: "sent",
            sent_at: new Date().toISOString(),
            notification_type: "status_update",
            sent_by: userData.user.id,
            sla_met: true,
            sla_response_time_minutes: 0,
          });

          await supabase.from("client_notification_log").insert({
            dispatch_id,
            organization_id: orgIdForLog,
            recipient_email: customerEmail,
            dispatch_status: status,
            attempts: attempt,
            success: true,
            provider_message_id: (emailResponse as any)?.data?.id ?? null,
            provider_response: emailResponse ?? null,
            triggered_by: userData.user.id,
            from_email: fromEmail,
            from_email_source: fromEmailSource,
          });
        } else {
          console.error("Failed to send status update email after retries:", lastError);
          await supabase.from("email_notifications").insert({
            dispatch_id,
            recipient_email: customerEmail,
            recipient_type: "customer",
            subject,
            body: `Failed to send after ${attempt} attempts. Intended body:\n\n${plainText}`,
            status: "failed",
            error_message: lastError?.message ?? "Failed to send",
            notification_type: "status_update",
            sent_by: userData.user.id,
          });

          await supabase.from("client_notification_log").insert({
            dispatch_id,
            organization_id: orgIdForLog,
            recipient_email: customerEmail,
            dispatch_status: status,
            attempts: attempt,
            success: false,
            error_message: lastError?.message ?? "Failed to send",
            triggered_by: userData.user.id,
            from_email: fromEmail,
            from_email_source: fromEmailSource,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Status updated to ${status}`,
        email_sent: emailSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in update-delivery-status function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
