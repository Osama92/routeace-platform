import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// ---- CORS (reflect request Origin so browser sandboxes work) ---------------
function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function jsonRes(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---- Plan price table ------------------------------------------------------
// MUST mirror src/config/lcPricingPlans.ts. The runtime consistency check
// (`pricing-consistency-check` edge function) flags drift to admins.
type PlanDef = {
  id: string;
  monthly_base_kobo: number;   // multiplied by vehicle_count for per_vehicle / hybrid
  per_drop_kobo: number;       // not billed at subscribe time, captured for metadata
  billing_model: "free" | "per_drop" | "per_vehicle" | "hybrid";
  db_tier: "starter" | "professional" | "enterprise";
  subscribable: boolean;
};
const PLAN_TABLE: Record<string, PlanDef> = {
  // Logistics Company (LC)
  starter:      { id: "starter",      monthly_base_kobo: 0,        per_drop_kobo: 0,    billing_model: "free",        db_tier: "starter",      subscribable: false },
  bikes_vans:   { id: "bikes_vans",   monthly_base_kobo: 0,        per_drop_kobo: 5_000, billing_model: "per_drop",   db_tier: "starter",      subscribable: false },
  heavy_fleet:  { id: "heavy_fleet",  monthly_base_kobo: 500_000,  per_drop_kobo: 0,    billing_model: "per_vehicle", db_tier: "professional", subscribable: true  },
  mixed_fleet:  { id: "mixed_fleet",  monthly_base_kobo: 500_000,  per_drop_kobo: 5_000, billing_model: "hybrid",     db_tier: "professional", subscribable: true  },

  // Legacy ids kept for backward compatibility with existing callers
  professional: { id: "professional", monthly_base_kobo: 500_000,  per_drop_kobo: 0,    billing_model: "per_vehicle", db_tier: "professional", subscribable: true  },
  enterprise:   { id: "enterprise",   monthly_base_kobo: 1_000_000,per_drop_kobo: 0,    billing_model: "per_vehicle", db_tier: "enterprise",   subscribable: true  },

  // Logistics Department (LD)
  foundation:      { id: "foundation",      monthly_base_kobo: 15_000_000,  per_drop_kobo: 0, billing_model: "per_vehicle", db_tier: "professional", subscribable: true },
  growth:          { id: "growth",          monthly_base_kobo: 35_000_000,  per_drop_kobo: 0, billing_model: "per_vehicle", db_tier: "professional", subscribable: true },
  dept_enterprise: { id: "dept_enterprise", monthly_base_kobo: 120_000_000, per_drop_kobo: 0, billing_model: "per_vehicle", db_tier: "enterprise",   subscribable: true },
};

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://routeace.app";

    if (!PAYSTACK_SECRET) return jsonRes({ error: "Payment provider not configured" }, 500, cors);

    const auth = req.headers.get("Authorization");
    if (!auth) return jsonRes({ error: "Unauthorized" }, 401, cors);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Unauthorized" }, 401, cors);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) return jsonRes({ error: "No active organisation" }, 403, cors);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch (_e) { return jsonRes({ error: "Invalid JSON body" }, 400, cors); }

    const plan_name = String((body as any).plan_name ?? "");
    const billing_cycle = ((body as any).billing_cycle ?? "monthly") as string;
    const vehicle_count = Math.max(1, Number((body as any).vehicle_count ?? 1) || 1);

    const plan = PLAN_TABLE[plan_name];
    if (!plan) {
      return jsonRes({ error: `Unknown plan '${plan_name}'`, accepted: Object.keys(PLAN_TABLE) }, 400, cors);
    }
    if (!plan.subscribable) {
      return jsonRes({
        error: plan.billing_model === "free"
          ? "Starter is free - no subscription required"
          : "This tier is billed per delivery, not via monthly subscription",
        billing_model: plan.billing_model,
      }, 400, cors);
    }

    const orgId = membership.organization_id;
    const isPerVehicle = plan.billing_model === "per_vehicle" || plan.billing_model === "hybrid";
    const multiplier = isPerVehicle ? vehicle_count : 1;
    const cycleMultiplier = billing_cycle === "annual" ? 10 : 1;
    const priceKobo = plan.monthly_base_kobo * multiplier * cycleMultiplier;

    if (priceKobo <= 0) {
      return jsonRes({ error: "Computed amount is zero" }, 400, cors);
    }

    const { data: invoice, error: invErr } = await admin
      .from("subscription_invoices")
      .insert({
        organization_id: orgId,
        plan_name,
        amount: priceKobo / 100,
        currency: "NGN",
        billing_cycle,
        status: "pending",
      })
      .select("id")
      .single();
    if (invErr || !invoice) {
      console.error("invoice error", invErr);
      return jsonRes({ error: "Failed to create invoice", details: invErr?.message }, 500, cors);
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: priceKobo,
        reference: invoice.id,
        callback_url: `${SITE_URL}/billing/verify`,
        metadata: {
          organization_id: orgId,
          plan_name,
          plan_db_tier: plan.db_tier,
          billing_model: plan.billing_model,
          invoice_id: invoice.id,
          billing_cycle,
          vehicle_count,
          unit_price_kobo: plan.monthly_base_kobo,
        },
      }),
    });

    const ps = await paystackRes.json();
    if (!ps.status) {
      console.error("paystack error", ps);
      return jsonRes({ error: ps.message ?? "Paystack error" }, 502, cors);
    }

    return jsonRes({
      authorization_url: ps.data.authorization_url,
      reference: invoice.id,
      amount_kobo: priceKobo,
      plan: plan.id,
    }, 200, cors);
  } catch (err: any) {
    console.error("initiate-subscription-payment error", err);
    return jsonRes({ error: err?.message ?? "Internal error" }, 500, corsFor(req));
  }
});
