// AI-powered vendor invoice processor: extracts waybill/dispatch numbers from PDF
// and matches them against the organization's dispatches/waybills.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;


  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) return json({ error: "invoice_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: inv, error: e1 } = await admin
      .from("vendor_invoices").select("*").eq("id", invoice_id).maybeSingle();
    if (e1 || !inv) return json({ error: "Invoice not found" }, 404);

    await admin.from("vendor_invoices").update({ match_status: "processing" }).eq("id", invoice_id);

    // Download PDF from storage
    let pdfBytes: Uint8Array | null = null;
    if (inv.pdf_path) {
      const { data: file } = await admin.storage.from("vendor-invoices").download(inv.pdf_path);
      if (file) pdfBytes = new Uint8Array(await file.arrayBuffer());
    }

    let extractedText = "";
    if (pdfBytes) {
      // Lightweight extraction: strip raw text from PDF stream
      const decoder = new TextDecoder("utf-8", { fatal: false });
      extractedText = decoder.decode(pdfBytes);
    }

    // Ask AI to extract structured fields + waybill/dispatch numbers
    const aiPrompt = `You are an invoice parser. Extract from this vendor invoice text:
- invoice_number (string)
- invoice_date (YYYY-MM-DD)
- amount (number, total)
- currency (NGN/USD)
- waybill_numbers (array of strings, look for waybill, WB-, WBL, way bill)
- dispatch_numbers (array of strings, look for DSP-, dispatch, trip, delivery numbers)
- line_items (array of {description, qty, amount})

Return ONLY valid JSON. Text:
${extractedText.slice(0, 30000)}`;

    let parsed: any = {};
    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: aiPrompt }],
          response_format: { type: "json_object" },
        }),
      });
      const aiJson = await aiRes.json();
      const content = aiJson?.choices?.[0]?.message?.content || "{}";
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("AI parse failed", e);
    }

    const waybills: string[] = (parsed.waybill_numbers || []).map((s: any) => String(s).trim()).filter(Boolean);
    const dispatches: string[] = (parsed.dispatch_numbers || []).map((s: any) => String(s).trim()).filter(Boolean);

    // Match against dispatches & waybills in same org for this vendor's partner
    const { data: matchDispatches } = dispatches.length
      ? await admin.from("dispatches")
          .select("id, dispatch_number")
          .eq("organization_id", inv.organization_id)
          .in("dispatch_number", dispatches)
      : { data: [] as any[] };

    const { data: matchWaybills } = waybills.length
      ? await admin.from("waybills")
          .select("id, waybill_number")
          .eq("organization_id", inv.organization_id)
          .in("waybill_number", waybills)
      : { data: [] as any[] };

    const matchedDispatchIds = (matchDispatches || []).map((d: any) => d.id);
    const matchedWaybillIds = (matchWaybills || []).map((w: any) => w.id);

    const totalRefs = waybills.length + dispatches.length;
    const totalMatched = matchedDispatchIds.length + matchedWaybillIds.length;
    const score = totalRefs ? Math.round((totalMatched / totalRefs) * 100) : 0;
    const status = totalRefs === 0 ? "unmatched" : totalMatched === totalRefs ? "matched" : totalMatched > 0 ? "partial" : "unmatched";

    const { error: updErr } = await admin.from("vendor_invoices").update({
      parsed_data: parsed,
      invoice_number: inv.invoice_number || parsed.invoice_number || null,
      invoice_date: inv.invoice_date || (parsed.invoice_date && !isNaN(Date.parse(parsed.invoice_date)) ? parsed.invoice_date : null),
      amount: inv.amount || (Number(parsed.amount) || null),
      currency: inv.currency || parsed.currency || "NGN",
      extracted_waybills: waybills,
      extracted_dispatches: dispatches,
      matched_dispatch_ids: matchedDispatchIds,
      matched_waybill_ids: matchedWaybillIds,
      match_score: score,
      match_status: status,
      match_details: {
        matched_dispatches: matchDispatches,
        matched_waybills: matchWaybills,
        unmatched_waybills: waybills.filter(w => !(matchWaybills || []).some((m: any) => m.waybill_number === w)),
        unmatched_dispatches: dispatches.filter(d => !(matchDispatches || []).some((m: any) => m.dispatch_number === d)),
      },
    }).eq("id", invoice_id);

    if (updErr) return json({ error: updErr.message }, 500);
    return json({ ok: true, score, status, matched_dispatches: matchedDispatchIds.length, matched_waybills: matchedWaybillIds.length });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || "Processing failed" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
