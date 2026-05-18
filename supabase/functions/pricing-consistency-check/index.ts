import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

// Authoritative landing/settings prices (must mirror src/config/lcPricingPlans.ts)
const LANDING_LC = [
  { id: "starter",     db_tier: "starter",      price_monthly_naira: 0 },
  { id: "bikes_vans",  db_tier: "starter",      price_monthly_naira: 0 },
  { id: "heavy_fleet", db_tier: "professional", price_monthly_naira: 5000 },
  { id: "mixed_fleet", db_tier: "professional", price_monthly_naira: 5000 },
];

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get user's organisation (tenant scope)
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const { data: dbPlans, error: dbErr } = await admin
      .from("subscription_plans")
      .select("tier, name, price_monthly, currency, is_active")
      .eq("is_active", true);
    if (dbErr) {
      return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const dbByTier = new Map<string, any>();
    (dbPlans ?? []).forEach((p) => dbByTier.set(p.tier, p));

    const findings: Array<{
      plan_id: string;
      db_tier: string;
      landing_price_naira: number;
      db_price_naira: number | null;
      mismatch: boolean;
      reason?: string;
    }> = [];

    for (const lp of LANDING_LC) {
      const db = dbByTier.get(lp.db_tier);
      const dbPrice = db ? Number(db.price_monthly) : null;
      const mismatch =
        lp.price_monthly_naira > 0 && (dbPrice === null || dbPrice !== lp.price_monthly_naira);
      findings.push({
        plan_id: lp.id,
        db_tier: lp.db_tier,
        landing_price_naira: lp.price_monthly_naira,
        db_price_naira: dbPrice,
        mismatch,
        reason: !db
          ? "DB plan missing for tier"
          : mismatch
          ? `Landing ₦${lp.price_monthly_naira} ≠ DB ₦${dbPrice}`
          : undefined,
      });
    }

    const ok = findings.every((f) => !f.mismatch);
    return new Response(JSON.stringify({
      ok,
      tenant_id: membership?.organization_id ?? null,
      checked_at: new Date().toISOString(),
      findings,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    });
  }
});
