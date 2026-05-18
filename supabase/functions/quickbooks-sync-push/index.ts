import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_BASE_PROD = "https://quickbooks.api.intuit.com";
const QBO_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com";

type Conn = {
  id: string;
  organization_id: string;
  realm_id: string | null;
  environment: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

async function loadConnSecrets(
  admin: ReturnType<typeof createClient>,
  connId: string,
): Promise<{ access_token: string | null; refresh_token: string | null }> {
  const { data } = await admin.rpc("get_erp_connection_secrets", { _connection_id: connId });
  const s = (data ?? {}) as Record<string, string>;
  return { access_token: s.access_token ?? null, refresh_token: s.refresh_token ?? null };
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
    const clientSecret = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "QuickBooks credentials not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
    const userId = userRes.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: orgId } = await admin.rpc("get_user_organization", { p_user_id: userId });
    if (!orgId) return json({ error: "No organization for user" }, 403);

    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const allowed = roles.some((r) => ["super_admin", "finance_manager", "org_admin"].includes(r));
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { data: connRow, error: connErr } = await admin
      .from("erp_connections")
      .select("id,organization_id,realm_id,environment,expires_at")
      .eq("organization_id", orgId)
      .eq("provider", "quickbooks")
      .maybeSingle();

    if (connErr || !connRow || connRow.realm_id == null) {
      return json({ error: "QuickBooks not connected for this organization" }, 400);
    }

    const tokens = await loadConnSecrets(admin, connRow.id);
    if (!tokens.access_token) {
      return json({ error: "QuickBooks not connected for this organization" }, 400);
    }

    const conn = { ...connRow, ...tokens } as Conn;
    const accessToken = await ensureFreshToken(admin, conn, clientId, clientSecret);
    const baseUrl = (conn.environment === "sandbox" ? QBO_BASE_SANDBOX : QBO_BASE_PROD) + `/v3/company/${conn.realm_id}`;

    const body = await req.json().catch(() => ({}));
    const entities: string[] = Array.isArray(body.entities) && body.entities.length
      ? body.entities
      : ["customers", "invoices"];
    const limitPerEntity = Math.min(50, Math.max(1, Number(body.limit) || 25));

    const results: Record<string, { pushed: number; failed: number; errors: string[] }> = {};
    for (const entity of entities) {
      results[entity] = { pushed: 0, failed: 0, errors: [] };
      if (entity === "customers") {
        await pushCustomers(admin, conn, baseUrl, accessToken, userId, results[entity], limitPerEntity);
      } else if (entity === "invoices") {
        await pushInvoices(admin, conn, baseUrl, accessToken, userId, results[entity], limitPerEntity);
      } else {
        results[entity].errors.push(`Unsupported entity: ${entity}`);
      }
    }

    await admin
      .from("erp_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_direction: "push", last_error: null })
      .eq("id", conn.id);

    return json({ ok: true, results });
  } catch (e) {
    console.error("quickbooks-sync-push error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function ensureFreshToken(
  admin: ReturnType<typeof createClient>,
  conn: Conn,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const exp = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  // Refresh if expiring in <2 minutes
  if (exp - Date.now() > 120_000) return conn.access_token!;

  const basic = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token!,
    }).toString(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    await admin
      .from("erp_connections")
      .update({ status: "error", last_error: `Refresh failed: ${JSON.stringify(data)}` })
      .eq("id", conn.id);
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from("erp_connections")
    .update({ expires_at: expiresAt })
    .eq("id", conn.id);
  await admin.rpc("set_erp_connection_secrets_service", {
    _connection_id: conn.id,
    _secrets: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? conn.refresh_token,
    },
  });
  return data.access_token as string;
}

async function pushCustomers(
  admin: ReturnType<typeof createClient>,
  conn: Conn,
  baseUrl: string,
  accessToken: string,
  userId: string,
  bucket: { pushed: number; failed: number; errors: string[] },
  limit: number,
) {
  // Pull RouteAce customers for this org that haven't been synced yet
  const { data: customers, error } = await admin
    .from("customers")
    .select("id, company_name, contact_name, email, phone, address")
    .eq("organization_id", conn.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !customers) {
    bucket.errors.push(`Read customers failed: ${error?.message ?? "unknown"}`);
    return;
  }

  for (const c of customers) {
    const displayName = c.company_name || c.contact_name || "Unnamed";
    const payload = {
      DisplayName: displayName,
      CompanyName: c.company_name ?? undefined,
      GivenName: c.contact_name ?? undefined,
      PrimaryEmailAddr: c.email ? { Address: c.email } : undefined,
      PrimaryPhone: c.phone ? { FreeFormNumber: c.phone } : undefined,
      BillAddr: c.address ? { Line1: String(c.address) } : undefined,
    };
    try {
      const resp = await fetch(`${baseUrl}/customer?minorversion=70`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const respBody = await resp.json();
      if (!resp.ok) {
        bucket.failed++;
        const msg = respBody?.Fault?.Error?.[0]?.Detail ?? JSON.stringify(respBody).slice(0, 200);
        bucket.errors.push(`Customer ${displayName}: ${msg}`);
        await logSync(admin, conn, "push", "customer", c.id, null, "error", msg, userId);
      } else {
        bucket.pushed++;
        await logSync(admin, conn, "push", "customer", c.id, respBody?.Customer?.Id ?? null, "success", null, userId);
      }
    } catch (e) {
      bucket.failed++;
      const msg = e instanceof Error ? e.message : "unknown";
      bucket.errors.push(`Customer ${displayName}: ${msg}`);
      await logSync(admin, conn, "push", "customer", c.id, null, "error", msg, userId);
    }
  }
}

async function pushInvoices(
  admin: ReturnType<typeof createClient>,
  conn: Conn,
  baseUrl: string,
  accessToken: string,
  userId: string,
  bucket: { pushed: number; failed: number; errors: string[] },
  limit: number,
) {
  const { data: invoices, error } = await admin
    .from("invoices")
    .select("id, invoice_number, customer_id, total_amount, due_date, currency_code")
    .eq("organization_id", conn.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !invoices) {
    bucket.errors.push(`Read invoices failed: ${error?.message ?? "unknown"}`);
    return;
  }

  for (const inv of invoices) {
    // Lookup customer remote id from log
    const { data: lastCustSync } = await admin
      .from("erp_sync_log")
      .select("remote_id")
      .eq("organization_id", conn.organization_id)
      .eq("provider", "quickbooks")
      .eq("entity", "customer")
      .eq("local_id", inv.customer_id)
      .eq("status", "success")
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastCustSync?.remote_id) {
      bucket.failed++;
      const msg = `Customer ${inv.customer_id} not yet synced; push customers first`;
      bucket.errors.push(`Invoice ${inv.invoice_number}: ${msg}`);
      await logSync(admin, conn, "push", "invoice", inv.id, null, "skipped", msg, userId);
      continue;
    }

    // Pull line items from invoice_line_items table
    const { data: lineItems } = await admin
      .from("invoice_line_items")
      .select("description, quantity, unit_price, amount, line_total")
      .eq("invoice_id", inv.id)
      .order("sequence_order", { ascending: true });

    const lines = (lineItems && lineItems.length)
      ? lineItems.map((it) => ({
          Amount: Number(it.line_total ?? it.amount ?? 0),
          DetailType: "SalesItemLineDetail",
          Description: String(it.description ?? "Item"),
          SalesItemLineDetail: { Qty: Number(it.quantity ?? 1), UnitPrice: Number(it.unit_price ?? 0) },
        }))
      : [{
          Amount: Number(inv.total_amount ?? 0),
          DetailType: "SalesItemLineDetail",
          Description: `Invoice ${inv.invoice_number}`,
          SalesItemLineDetail: { Qty: 1, UnitPrice: Number(inv.total_amount ?? 0) },
        }];

    const payload = {
      CustomerRef: { value: String(lastCustSync.remote_id) },
      DocNumber: String(inv.invoice_number).slice(0, 21),
      DueDate: inv.due_date,
      CurrencyRef: inv.currency_code ? { value: inv.currency_code } : undefined,
      Line: lines,
    };
    try {
      const resp = await fetch(`${baseUrl}/invoice?minorversion=70`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const respBody = await resp.json();
      if (!resp.ok) {
        bucket.failed++;
        const msg = respBody?.Fault?.Error?.[0]?.Detail ?? JSON.stringify(respBody).slice(0, 200);
        bucket.errors.push(`Invoice ${inv.invoice_number}: ${msg}`);
        await logSync(admin, conn, "push", "invoice", inv.id, null, "error", msg, userId);
      } else {
        bucket.pushed++;
        await logSync(admin, conn, "push", "invoice", inv.id, respBody?.Invoice?.Id ?? null, "success", null, userId);
      }
    } catch (e) {
      bucket.failed++;
      const msg = e instanceof Error ? e.message : "unknown";
      bucket.errors.push(`Invoice ${inv.invoice_number}: ${msg}`);
      await logSync(admin, conn, "push", "invoice", inv.id, null, "error", msg, userId);
    }
  }
}

async function logSync(
  admin: ReturnType<typeof createClient>,
  conn: Conn,
  direction: "push" | "pull",
  entity: string,
  localId: string | null,
  remoteId: string | null,
  status: "success" | "error" | "skipped",
  error: string | null,
  triggeredBy: string,
) {
  await admin.from("erp_sync_log").insert({
    organization_id: conn.organization_id,
    provider: "quickbooks",
    direction,
    entity,
    local_id: localId,
    remote_id: remoteId,
    status,
    error,
    triggered_by: triggeredBy,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
