import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface SLARiskPayload {
  dispatchId: string;
  dispatchNumber: string;
  customerEmail: string;
  customerName: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  hoursRemaining: number;
  riskFactors: string[];
  aiRecommendation: string;
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal-only: must be invoked with the service-role bearer token.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const presented = authHeader.replace(/^Bearer\s+/i, "");
    if (!presented || presented !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: internal endpoint" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: SLARiskPayload = await req.json();
    console.log("Processing SLA risk notification:", payload);

    // Generate risk level styling
    const riskColors = {
      low: { bg: "#10B981", text: "#065F46" },
      medium: { bg: "#F59E0B", text: "#92400E" },
      high: { bg: "#F97316", text: "#9A3412" },
      critical: { bg: "#EF4444", text: "#991B1B" },
    };

    const colors = riskColors[payload.riskLevel] || riskColors.medium;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.text} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .status-box { background: white; border: 2px solid ${colors.bg}; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .risk-badge { display: inline-block; background: ${colors.bg}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .factor-list { background: white; padding: 15px 20px; border-radius: 8px; margin: 15px 0; }
    .factor-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .factor-item:last-child { border-bottom: none; }
    .ai-insight { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .reassurance { background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0 0 10px 0;">⚠️ Delivery Update</h1>
      <p style="margin: 0; opacity: 0.9;">Route ${payload.dispatchNumber}</p>
    </div>
    <div class="content">
      <p>Dear ${payload.customerName},</p>
      
      <div class="status-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
          <span class="risk-badge">${payload.riskLevel} Risk</span>
          <span style="font-size: 24px; font-weight: bold; color: ${colors.bg};">${payload.riskScore}%</span>
        </div>
        <p style="margin: 0; color: #6b7280;">
          Your delivery is currently experiencing ${payload.riskLevel} risk of delay.
          ${payload.hoursRemaining > 0 
            ? `Estimated ${Math.floor(payload.hoursRemaining)} hours until SLA deadline.`
            : "The SLA deadline has been reached."}
        </p>
      </div>

      ${payload.riskFactors.length > 0 ? `
      <h3 style="margin-bottom: 10px;">Contributing Factors:</h3>
      <div class="factor-list">
        ${payload.riskFactors.map(factor => `
          <div class="factor-item">• ${factor}</div>
        `).join("")}
      </div>
      ` : ""}

      <div class="ai-insight">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">🤖 AI Recommendation</h3>
        <p style="margin: 0;">${payload.aiRecommendation}</p>
      </div>

      <div class="reassurance">
        <strong style="color: #065F46;">Our team is actively working on this.</strong>
        <p style="margin: 10px 0 0 0; color: #047857;">
          This is a proactive notification to keep you informed. Our operations team is 
          monitoring this route closely and taking steps to minimize any potential impact 
          to your delivery timeline.
        </p>
      </div>

      <p>If you have any questions, please don't hesitate to contact our support team.</p>
    </div>
    <div class="footer">
      <p>RouteAce Logistics Management System</p>
      <p style="color: #9CA3AF; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "RouteAce <onboarding@resend.dev>",
      to: [payload.customerEmail],
      subject: `📍 Delivery Update: ${payload.dispatchNumber} - ${payload.riskLevel.toUpperCase()} Risk Alert`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Record notification in database
    const { error: insertError } = await supabase
      .from("sla_risk_notifications")
      .insert({
        dispatch_id: payload.dispatchId,
        risk_score: payload.riskScore,
        risk_level: payload.riskLevel,
        notification_type: "email",
        notification_status: "sent",
        notification_sent_at: new Date().toISOString(),
        notification_content: emailHtml,
        ai_recommendation: payload.aiRecommendation,
        risk_factors: payload.riskFactors,
      });

    if (insertError) {
      console.error("Failed to record notification:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending SLA risk notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
