// Approve a vendor invoice and email it to finance.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthenticated" }, 401);

    const { invoice_id, decision, rejection_reason, finance_email } = await req.json();
    if (!invoice_id || !["approved", "rejected"].includes(decision)) {
      return json({ error: "invoice_id and decision (approved|rejected) required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: inv, error: e1 } = await admin
      .from("vendor_invoices")
      .select("*, partners:partner_id(company_name, contact_email)")
      .eq("id", invoice_id).maybeSingle();
    if (e1 || !inv) return json({ error: "Invoice not found" }, 404);

    const toEmail = (decision === "approved") ? (finance_email || null) : null;

    const update: any = {
      approval_status: decision,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: decision === "rejected" ? (rejection_reason || null) : null,
    };
    if (decision === "approved" && toEmail) {
      update.finance_email_to = toEmail;
      update.finance_email_sent_at = new Date().toISOString();
    }

    const { error: updErr } = await admin.from("vendor_invoices").update(update).eq("id", invoice_id);
    if (updErr) return json({ error: updErr.message }, 500);

    if (decision === "approved" && toEmail) {
      // Generate signed URL to PDF
      let pdfLink = inv.pdf_url;
      if (inv.pdf_path) {
        const { data: signed } = await admin.storage.from("vendor-invoices").createSignedUrl(inv.pdf_path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) pdfLink = signed.signedUrl;
      }

      const vendorName = (inv as any).partners?.company_name || "Vendor";
      const html = `
        <h2>Approved Vendor Invoice</h2>
        <p>The following vendor invoice has been approved and is ready for payment processing.</p>
        <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
          <tr><td><b>Vendor</b></td><td>${vendorName}</td></tr>
          <tr><td><b>Invoice #</b></td><td>${inv.invoice_number || "-"}</td></tr>
          <tr><td><b>Amount</b></td><td>${inv.currency || "NGN"} ${Number(inv.amount || 0).toLocaleString()}</td></tr>
          <tr><td><b>Invoice Date</b></td><td>${inv.invoice_date || "-"}</td></tr>
          <tr><td><b>Match Score</b></td><td>${inv.match_score}% (${inv.match_status})</td></tr>
          <tr><td><b>Waybills</b></td><td>${(inv.extracted_waybills || []).join(", ") || "-"}</td></tr>
          <tr><td><b>Dispatches</b></td><td>${(inv.extracted_dispatches || []).join(", ") || "-"}</td></tr>
        </table>
        <p><a href="${pdfLink}">Download invoice PDF</a></p>
      `;

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            to: toEmail,
            subject: `Approved Vendor Invoice - ${vendorName} - ${inv.invoice_number || ""}`,
            html,
          }),
        });
      } catch (err) {
        console.error("Email send failed", err);
      }

      // Auto-create a payable entry
      await admin.from("vendor_payables").insert({
        partner_id: inv.partner_id,
        invoice_number: inv.invoice_number,
        amount: inv.amount || 0,
        notes: `Auto-created from approved vendor invoice ${invoice_id}`,
        created_by: user.id,
      });
    }

    return json({ ok: true, emailed_to: toEmail });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || "Failed" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
