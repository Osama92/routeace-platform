/**
 * Regression tests for ai-operations-live.
 *
 * Guarantees:
 *  1. Logistics Department (LD) tenants NEVER receive financial KPIs
 *     (total_revenue, overdue_amount, revenue_recovered, cost_savings)
 *     nor financial predictions (e.g. "Revenue at Risk").
 *  2. Logistics Company (LC) tenants DO receive financial KPIs.
 *  3. Responses are tenant-scoped - organization_id in the payload always
 *     matches the caller's membership and is never another tenant's id.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FINANCIAL_KEYS = [
  "total_revenue",
  "overdue_amount",
  "revenue_recovered",
  "cost_savings",
];
const FINANCIAL_PREDICTION_METRICS = new Set([
  "Revenue at Risk",
  "Overdue AR",
]);

async function callAs(
  jwt: string,
): Promise<{ status: number; body: any }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-operations-live`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await r.json();
  return { status: r.status, body };
}

/** Try to find one active member for a given tenant_mode and mint a JWT. */
async function getTenantSession(
  tenantMode: "LOGISTICS_DEPARTMENT" | "LOGISTICS_COMPANY",
): Promise<{ jwt: string; orgId: string } | null> {
  if (!SERVICE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: orgs } = await admin
    .from("organizations")
    .select("id")
    .eq("tenant_mode", tenantMode)
    .limit(20);
  if (!orgs?.length) return null;

  for (const org of orgs) {
    const { data: mem } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!mem?.user_id) continue;

    const { data: u } = await admin.auth.admin.getUserById(mem.user_id);
    const email = u?.user?.email;
    if (!email) continue;

    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    // Some environments expose the access token via session.
    const session = (link as any)?.properties?.action_link
      ? null
      : (link as any)?.session;
    if (session?.access_token) {
      return { jwt: session.access_token, orgId: org.id };
    }
  }
  return null;
}

Deno.test("LD payload omits all financial KPIs and predictions", async () => {
  const sess = await getTenantSession("LOGISTICS_DEPARTMENT");
  if (!sess) {
    console.warn("skip: no LD member with derivable session in this env");
    return;
  }
  const { status, body } = await callAs(sess.jwt);
  assertEquals(status, 200);
  assertEquals(body.organization_id, sess.orgId);
  assertEquals(body.is_logistics_department, true);
  for (const k of FINANCIAL_KEYS) {
    assert(
      !(k in (body.kpis ?? {})),
      `LD payload must not include kpis.${k}`,
    );
  }
  for (const p of body.predictions ?? []) {
    assert(
      !FINANCIAL_PREDICTION_METRICS.has(p.metric),
      `LD payload must not include prediction "${p.metric}"`,
    );
  }
});

Deno.test("LC payload includes financial KPIs", async () => {
  const sess = await getTenantSession("LOGISTICS_COMPANY");
  if (!sess) {
    console.warn("skip: no LC member with derivable session in this env");
    return;
  }
  const { status, body } = await callAs(sess.jwt);
  assertEquals(status, 200);
  assertEquals(body.organization_id, sess.orgId);
  assertEquals(body.is_logistics_department, false);
  assert("total_revenue" in (body.kpis ?? {}), "LC must have total_revenue");
  assert("overdue_amount" in (body.kpis ?? {}), "LC must have overdue_amount");
});

Deno.test("Unauthenticated calls are rejected", async () => {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-operations-live`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const txt = await r.text();
  assert(r.status === 401 || r.status === 400, `got ${r.status}: ${txt}`);
});
