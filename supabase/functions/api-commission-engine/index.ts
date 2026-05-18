/**
 * api-commission-engine - Automated revenue split recording.
 * Triggered on API usage events to calculate and record 80/20 commission splits.
 * Records to commission_ledger and updates reseller_payouts.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/security.ts";

const ROUTEACE_SHARE = 80;
const RESELLER_SHARE = 20;

interface CommissionRequest {
  event_type: "api_call" | "subscription" | "usage" | "module_access";
  gross_amount: number;
  source_org_id: string;
  reseller_org_id?: string;
  reseller_relationship_id?: string;
  reference_id?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Internal-only: must be invoked with the service-role bearer token
    // (used by verify-subscription-payment and other trusted edge functions).
    const authHeader = req.headers.get("Authorization") ?? "";
    const presented = authHeader.replace(/^Bearer\s+/i, "");
    if (!presented || presented !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: internal endpoint" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: CommissionRequest = await req.json();

    // Validate required fields
    if (!body.gross_amount || !body.source_org_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: gross_amount, source_org_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.gross_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "gross_amount must be positive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate split (immutable 80/20)
    const routeaceAmount = Math.round(body.gross_amount * (ROUTEACE_SHARE / 100) * 100) / 100;
    const resellerAmount = Math.round(body.gross_amount * (RESELLER_SHARE / 100) * 100) / 100;

    // Record in commission_ledger (immutable)
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("commission_ledger")
      .insert({
        event_type: body.event_type,
        gross_amount: body.gross_amount,
        routeace_amount: routeaceAmount,
        reseller_amount: resellerAmount,
        source_org_id: body.source_org_id,
        reseller_org_id: body.reseller_org_id || null,
        reseller_relationship_id: body.reseller_relationship_id || null,
        reference_id: body.reference_id || null,
        currency: body.currency || "NGN",
        split_percent_routeace: ROUTEACE_SHARE,
        split_percent_reseller: RESELLER_SHARE,
      })
      .select()
      .single();

    if (ledgerError) {
      console.error("Commission ledger insert error:", ledgerError);
      return new Response(
        JSON.stringify({ error: "Failed to record commission", details: ledgerError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If reseller org exists, accrue to their payout balance
    if (body.reseller_org_id) {
      const period = new Date();
      const periodStart = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}-01`;
      const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 0)
        .toISOString().split("T")[0];

      // Upsert payout accrual for this period
      const { data: existing } = await supabase
        .from("reseller_payouts")
        .select("id, amount")
        .eq("reseller_org_id", body.reseller_org_id)
        .eq("period_start", periodStart)
        .eq("status", "accrued")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("reseller_payouts")
          .update({ amount: existing.amount + resellerAmount })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("reseller_payouts")
          .insert({
            reseller_org_id: body.reseller_org_id,
            amount: resellerAmount,
            currency: body.currency || "NGN",
            period_start: periodStart,
            period_end: periodEnd,
            status: "accrued",
          });
      }
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "commission_recorded",
      table_name: "commission_ledger",
      record_id: ledgerEntry.id,
      new_data: {
        event_type: body.event_type,
        gross: body.gross_amount,
        routeace: routeaceAmount,
        reseller: resellerAmount,
        split: `${ROUTEACE_SHARE}/${RESELLER_SHARE}`,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        commission: {
          id: ledgerEntry.id,
          grossAmount: body.gross_amount,
          routeaceAmount,
          resellerAmount,
          splitRatio: `${ROUTEACE_SHARE}/${RESELLER_SHARE}`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Commission engine error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
