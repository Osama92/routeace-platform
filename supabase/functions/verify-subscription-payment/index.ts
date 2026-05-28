import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildCors, preflight, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = buildCors();
  if (req.method === "OPTIONS") return preflight(cors);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return json({ error: "Payment provider not configured" }, 500, cors);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth gate: require a valid logged-in user
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, cors);
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401, cors);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch (_e) { return json({ error: "Invalid JSON body" }, 400, cors); }
    const reference = (body as any).reference;
    if (!reference) return json({ error: "reference is required" }, 400, cors);

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      await admin.from("subscription_invoices").update({ status: "failed" }).eq("id", reference);
      return json({ success: false, message: "Payment not confirmed by Paystack" }, 200, cors);
    }

    const tx = verifyData.data;
    const meta = tx.metadata ?? {};
    const orgId = meta.organization_id;
    const planName = meta.plan_name;

    // Org ownership check: ensure the authenticated user belongs to the org being charged
    if (orgId) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership) return json({ error: "Unauthorized: you do not belong to this organization" }, 403, cors);
    }
    const billingCycle = meta.billing_cycle ?? "monthly";
    const daysToAdd = billingCycle === "annual" ? 365 : 30;
    const expiresAt = new Date(Date.now() + daysToAdd * 86400_000).toISOString();

    await admin.from("subscription_invoices").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_channel: tx.channel,
      payment_reference: tx.reference,
      gateway_response: tx,
      next_billing_date: expiresAt.split("T")[0],
    }).eq("id", reference);

    const vehicleCount = Number(meta.vehicle_count ?? 0);
    const orgUpdate: Record<string, unknown> = {
      subscription_tier: planName,
      subscription_status: "active",
      subscription_expires_at: expiresAt,
      paystack_customer_code: tx.customer?.customer_code ?? null,
    };
    if (vehicleCount > 0) orgUpdate.vehicle_quota = vehicleCount;

    await admin.from("organizations").update(orgUpdate as any).eq("id", orgId);

    // Sync tenant_config limits to the new plan
    if (orgId && planName) {
      const { data: planLimits } = await admin.rpc("get_plan_limits", { tier: planName }).single();
      if (planLimits) {
        await admin.from("tenant_config").update({
          plan_tier:              planName,
          max_users:              (planLimits as any).max_users,
          max_vehicles:           (planLimits as any).max_vehicles,
          max_branches:           (planLimits as any).max_branches,
          max_monthly_dispatches: (planLimits as any).max_monthly_dispatches,
          max_api_calls:          (planLimits as any).max_api_calls,
          max_integrations:       (planLimits as any).max_integrations,
          ai_credits_total:       (planLimits as any).ai_credits_total,
        }).eq("organization_id", orgId);
      }
    }

    // Attribute commission to reseller if this org was provisioned by one
    try {
      const { data: orgData } = await admin
        .from("organizations")
        .select("reseller_org_id, reseller_relationship_id")
        .eq("id", orgId)
        .single();

      const grossAmount = tx.amount / 100; // Paystack sends kobo - convert to NGN

      if (orgData?.reseller_org_id) {
        const { data: relData } = await admin
          .from("reseller_relationships")
          .select("id")
          .eq("reseller_org_id", orgData.reseller_org_id)
          .eq("client_org_id", orgId)
          .maybeSingle();

        await admin.functions.invoke("api-commission-engine", {
          body: {
            event_type: "subscription",
            gross_amount: grossAmount,
            source_org_id: orgId,
            reseller_org_id: orgData.reseller_org_id,
            reseller_relationship_id: relData?.id ?? orgData.reseller_relationship_id ?? null,
            reference_id: tx.reference,
            currency: "NGN",
            metadata: {
              plan_name: planName,
              billing_cycle: billingCycle,
              paystack_reference: tx.reference,
            },
          },
        });
      } else {
        await admin.functions.invoke("api-commission-engine", {
          body: {
            event_type: "subscription",
            gross_amount: grossAmount,
            source_org_id: orgId,
            reseller_org_id: null,
            reference_id: tx.reference,
            currency: "NGN",
            metadata: { plan_name: planName, billing_cycle: billingCycle },
          },
        });
      }
    } catch (commissionErr) {
      console.error("Commission attribution failed (non-fatal):", commissionErr);
    }

    return json({ success: true, plan_name: planName, expires_at: expiresAt }, 200, cors);
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
