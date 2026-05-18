// erp-sync: service-role function to sync data with external ERP/WMS systems.
// Authenticates caller, verifies they are super_admin/org_admin in the target org,
// then loads credentials server-side and runs pull (ERP -> RouteAce) or push
// (RouteAce -> ERP) flows. Credentials are NEVER returned to caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
type Direction = "pull" | "push" | "manual" | "auto" | "import_sales_orders";

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabaseUser.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const {
      organization_id, provider, sync_type,
      since, until, mode, orders,
    } = body as {
      organization_id?: string; provider?: string; sync_type?: Direction;
      since?: string; until?: string;
      mode?: "preview" | "commit";
      orders?: any[];
    };
    if (!organization_id || !provider) return json({ error: "Missing organization_id or provider" }, 400);

    const direction: Direction = sync_type ?? "manual";

    // Light validation of date params (ISO date or datetime). Reject anything else.
    const isoOk = (s?: string) => !s || /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(s);
    if (!isoOk(since) || !isoOk(until)) return json({ error: "Invalid since/until" }, 400);
    if (mode && mode !== "preview" && mode !== "commit") return json({ error: "Invalid mode" }, 400);
    if (orders && !Array.isArray(orders)) return json({ error: "orders must be an array" }, 400);

    // Verify caller has appropriate role in this org.
    // import_sales_orders is an Outbound/Inbound Desk capability - ops_manager allowed.
    const { data: roles } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id);
    const allowedRoles = direction === "import_sales_orders"
      ? new Set(["super_admin", "org_admin", "ops_manager", "dispatcher"])
      : new Set(["super_admin", "org_admin"]);
    const hasRole = (roles ?? []).some((r: any) => allowedRoles.has(r.role));
    if (!hasRole) return json({ error: "Forbidden: insufficient role" }, 403);

    const { data: membership } = await admin
      .from("organization_members").select("user_id")
      .eq("organization_id", organization_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) return json({ error: "Forbidden: not a member of this org" }, 403);

    // Load creds server-side (never returned to client)
    const { data: cfg, error: cfgErr } = await admin
      .from("integration_configs").select("*")
      .eq("organization_id", organization_id)
      .eq("provider", provider)
      .eq("is_active", true)
      .maybeSingle();
    if (cfgErr || !cfg) return json({ error: "Integration not configured or inactive" }, 404);

    // Merge vault secrets into cfg so downstream code can use cfg.client_secret etc.
    const { data: secrets } = await admin.rpc("get_integration_config_secrets", {
      _integration_config_id: cfg.id,
    });
    if (secrets && typeof secrets === "object") {
      cfg.client_secret = (secrets as any).client_secret ?? cfg.client_secret;
      cfg.access_token = (secrets as any).access_token ?? cfg.access_token;
      cfg.refresh_token = (secrets as any).refresh_token ?? cfg.refresh_token;
    }

    const logEntry = await admin.from("integration_sync_log").insert({
      organization_id, provider, sync_type: direction,
      status: "running", triggered_by: userData.user.id,
    }).select().single();
    const logId = logEntry.data?.id;

    let recordsProcessed = 0;
    let errorMessage: string | null = null;
    let summary: Record<string, unknown> = {};

    try {
      const ctx = { admin, cfg, organization_id, direction, userId: userData.user.id };
      if (direction === "import_sales_orders") {
        const r = await importSalesOrdersToOutbound(ctx, { since, until, mode, orders });
        recordsProcessed = r.records; summary = r.summary;
      } else if (provider === "jaggaer") {
        const r = await syncJaggaer(ctx);
        recordsProcessed = r.records; summary = r.summary;
      } else if (provider === "sap" || provider === "sap_wms") {
        const r = await syncSap(ctx);
        recordsProcessed = r.records; summary = r.summary;
      } else if (provider === "oracle" || provider === "netsuite") {
        const r = await syncOracle(ctx);
        recordsProcessed = r.records; summary = r.summary;
      } else if (provider === "odoo") {
        const r = await syncOdoo(ctx);
        recordsProcessed = r.records; summary = r.summary;
      } else if (provider === "dynamics365") {
        const r = await syncDynamics365(ctx);
        recordsProcessed = r.records; summary = r.summary;
      } else {
        // Generic stub for not-yet-implemented providers
        summary = { note: `Provider ${provider} sync not yet implemented`, direction };
      }
    } catch (e: any) {
      errorMessage = e?.message ?? "Unknown sync error";
    }

    const finalStatus = errorMessage ? "failed" : "success";
    await admin.from("integration_sync_log").update({
      status: finalStatus,
      records_processed: recordsProcessed,
      error_message: errorMessage,
      payload_summary: { direction, ...summary },
      completed_at: new Date().toISOString(),
    }).eq("id", logId);
    await admin.from("integration_configs").update({
      last_sync_at: new Date().toISOString(), last_sync_status: finalStatus,
    }).eq("id", cfg.id);

    return json({
      status: finalStatus,
      direction,
      records_processed: recordsProcessed,
      summary,
      error: errorMessage,
    });
  } catch (e) {
    console.error("erp-sync error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ============================================================================
// Provider implementations. Each returns { records, summary }.
// ctx = { admin, cfg, organization_id, direction }
// ============================================================================

type SyncCtx = {
  // typed as any so test fakes and the real client both satisfy it without
  // dragging in the full generated Database generics
  admin: any;
  cfg: any;
  organization_id: string;
  direction: Direction;
  userId?: string;
};

// ---------------------------------------------------------------------------
// safeFetchJson - never throws. Returns { ok, data, error } so a single
// downed endpoint (e.g. sales-orders) can't take down the whole pull.
// Always consumes the response body to prevent Deno resource leaks.
// ---------------------------------------------------------------------------
export async function safeFetchJson(
  url: string,
  init?: RequestInit,
  label = "fetch",
): Promise<{ ok: boolean; data: any; error?: string; status?: number }> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) {
      try { await r.text(); } catch (_) { /* ignore */ }
      return { ok: false, data: null, status: r.status, error: `${label} HTTP ${r.status}` };
    }
    const data = await r.json().catch(() => ({}));
    return { ok: true, data, status: r.status };
  } catch (e: any) {
    return { ok: false, data: null, error: `${label} ${e?.message ?? "network error"}` };
  }
}

type Resource = { count: number; ok: boolean; error?: string };
function resource(ok: boolean, count: number, error?: string): Resource {
  return ok ? { count, ok: true } : { count: 0, ok: false, error };
}

async function syncJaggaer({ cfg }: SyncCtx) {
  const tokenResp = await fetch(`${cfg.instance_url}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.client_id ?? "",
      client_secret: cfg.client_secret ?? "",
    }),
  });
  if (!tokenResp.ok) throw new Error(`Jaggaer auth failed: ${tokenResp.status}`);
  await tokenResp.json().catch(() => ({}));
  return { records: 0, summary: { auth: "ok" } };
}

// ---------------------------------------------------------------------------
// SAP S/4HANA - OData v2 with Basic auth (or OAuth depending on deployment).
// PULL: cost centres + transport-related purchase orders.
// PUSH: goods movements (material documents) for delivered dispatches.
// ---------------------------------------------------------------------------
export async function syncSap(ctx: SyncCtx) {
  const { cfg, admin, organization_id, direction } = ctx;
  const base = (cfg.instance_url ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("SAP instance_url not configured");
  const basic = "Basic " + btoa(`${cfg.client_id ?? ""}:${cfg.client_secret ?? ""}`);
  const headers = { "Authorization": basic, "Accept": "application/json" };

  if (direction === "push") {
    // Push delivered dispatches (last 7 days, not yet synced) as material documents
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: dispatches } = await admin
      .from("dispatches")
      .select("id, status, updated_at, organization_id")
      .eq("organization_id", organization_id)
      .eq("status", "delivered")
      .is("external_synced_at", null)
      .gte("updated_at", sinceIso)
      .limit(100);

    let pushed = 0; let failed = 0;
    for (const d of dispatches ?? []) {
      const matDocUrl = `${base}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader`;
      const resp = await fetch(matDocUrl, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          DocumentDate: new Date().toISOString().slice(0, 10),
          PostingDate: new Date().toISOString().slice(0, 10),
          ReferenceDocument: d.id,
          GoodsMovementCode: "07", // 07 = goods issue for delivery
        }),
      }).catch((e) => ({ ok: false, status: 0, text: () => Promise.resolve(String(e)) } as any));

      if (resp.ok) {
        await admin.from("dispatches")
          .update({ external_synced_at: new Date().toISOString() })
          .eq("id", d.id);
        pushed++;
      } else {
        failed++;
      }
    }
    return { records: pushed, summary: { mode: "push", pushed, failed, total: dispatches?.length ?? 0 } };
  }

  // PULL: cost centres + transport-related purchase orders + sales orders.
  // Each endpoint is fetched independently - a single down endpoint must not
  // take down the others, and we never throw out of pull for an upstream HTTP
  // failure (config errors above already threw before this point).
  const ccUrl = `${base}/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter?$top=200`;
  const poUrl = `${base}/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?$filter=PurchasingDocumentCategory eq 'F'&$top=200`;
  const soUrl = `${base}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder?$top=200`;
  const [cc, po, so] = await Promise.all([
    safeFetchJson(ccUrl, { headers }, "sap_cost_centres"),
    safeFetchJson(poUrl, { headers }, "sap_purchase_orders"),
    safeFetchJson(soUrl, { headers }, "sap_sales_orders"),
  ]);
  const ccCount = cc.ok ? (cc.data?.d?.results ?? cc.data?.value ?? []).length : 0;
  const poCount = po.ok ? (po.data?.d?.results ?? po.data?.value ?? []).length : 0;
  const soCount = so.ok ? (so.data?.d?.results ?? so.data?.value ?? []).length : 0;
  const resources = {
    cost_centres: resource(cc.ok, ccCount, cc.error),
    purchase_orders: resource(po.ok, poCount, po.error),
    sales_orders: resource(so.ok, soCount, so.error),
  };
  return {
    records: ccCount + poCount + soCount,
    summary: {
      mode: "pull",
      cost_centres: ccCount, purchase_orders: poCount, sales_orders: soCount,
      resources, partial: !cc.ok || !po.ok || !so.ok,
    },
  };
}

// ---------------------------------------------------------------------------
// Oracle / NetSuite - OAuth client_credentials, REST endpoints.
// ---------------------------------------------------------------------------
export async function syncOracle(ctx: SyncCtx) {
  const { cfg, admin, organization_id, direction } = ctx;
  const base = (cfg.instance_url ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Oracle instance_url not configured");
  // Basic auth fallback (Oracle Fusion supports it)
  const basic = "Basic " + btoa(`${cfg.client_id ?? ""}:${cfg.client_secret ?? ""}`);
  const headers = { "Authorization": basic, "Accept": "application/json" };

  if (direction === "push") {
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: dispatches } = await admin
      .from("dispatches")
      .select("id, status, updated_at")
      .eq("organization_id", organization_id)
      .eq("status", "delivered")
      .is("external_synced_at", null)
      .gte("updated_at", sinceIso)
      .limit(100);
    let pushed = 0;
    for (const d of dispatches ?? []) {
      const r = await fetch(`${base}/fscmRestApi/resources/11.13.18.05/journalEntries`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ Description: `RouteAce dispatch ${d.id}`, Source: "RouteAce" }),
      }).catch(() => null);
      if (r?.ok) {
        await admin.from("dispatches").update({ external_synced_at: new Date().toISOString() }).eq("id", d.id);
        pushed++;
      }
    }
    return { records: pushed, summary: { mode: "push", pushed, total: dispatches?.length ?? 0 } };
  }

  // PULL: cost centres + sales orders. Per-endpoint failure isolation.
  const [cc, so] = await Promise.all([
    safeFetchJson(`${base}/fscmRestApi/resources/11.13.18.05/costCenters?limit=200`, { headers }, "oracle_cost_centres"),
    safeFetchJson(`${base}/fscmRestApi/resources/11.13.18.05/salesOrdersForOrderHub?limit=200`, { headers }, "oracle_sales_orders"),
  ]);
  const ccCount = cc.ok ? (cc.data?.items ?? []).length : 0;
  const soCount = so.ok ? (so.data?.items ?? []).length : 0;
  const resources = {
    cost_centres: resource(cc.ok, ccCount, cc.error),
    purchase_orders: resource(true, 0), // not pulled for Oracle today; reported for UI parity
    sales_orders: resource(so.ok, soCount, so.error),
  };
  return {
    records: ccCount + soCount,
    summary: {
      mode: "pull",
      cost_centres: ccCount, purchase_orders: 0, sales_orders: soCount,
      resources, partial: !cc.ok || !so.ok,
    },
  };
}

// ---------------------------------------------------------------------------
// Odoo - JSON-RPC at /web/dataset/call_kw, models stock.picking & account.move
// ---------------------------------------------------------------------------
export async function syncOdoo(ctx: SyncCtx) {
  const { cfg, admin, organization_id, direction } = ctx;
  const base = (cfg.instance_url ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Odoo instance_url not configured");

  // Authenticate to get uid (Odoo uses session auth via /web/session/authenticate)
  const dbName = (cfg.config?.database ?? cfg.config?.db ?? "").toString();
  const authResp = await fetch(`${base}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: { db: dbName, login: cfg.client_id, password: cfg.client_secret },
    }),
  });
  if (!authResp.ok) throw new Error(`Odoo auth failed: ${authResp.status}`);
  const cookie = authResp.headers.get("set-cookie") ?? "";

  const callKw = async (model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) => {
    try {
      const r = await fetch(`${base}/web/dataset/call_kw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": cookie },
        body: JSON.stringify({
          jsonrpc: "2.0", method: "call",
          params: { model, method, args, kwargs },
        }),
      });
      if (!r.ok) {
        try { await r.text(); } catch (_) { /* ignore */ }
        return { ok: false, result: [], error: `${model} HTTP ${r.status}` };
      }
      const j = await r.json().catch(() => ({} as any));
      // Odoo wraps app errors inside the JSON body
      if (j?.error) return { ok: false, result: [], error: `${model} ${j.error?.data?.message ?? j.error?.message ?? "rpc error"}` };
      return { ok: true, result: j?.result ?? [] };
    } catch (e: any) {
      return { ok: false, result: [], error: `${model} ${e?.message ?? "network error"}` };
    }
  };

  if (direction === "push") {
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: dispatches } = await admin
      .from("dispatches")
      .select("id, status, updated_at")
      .eq("organization_id", organization_id)
      .eq("status", "delivered")
      .is("external_synced_at", null)
      .gte("updated_at", sinceIso)
      .limit(100);
    let pushed = 0;
    for (const d of dispatches ?? []) {
      const r: any = await callKw("account.move", "create", [{
        ref: `RouteAce ${d.id}`,
        move_type: "out_invoice",
      }]);
      if (!r?.error) {
        await admin.from("dispatches").update({ external_synced_at: new Date().toISOString() }).eq("id", d.id);
        pushed++;
      }
    }
    return { records: pushed, summary: { mode: "push", pushed, total: dispatches?.length ?? 0 } };
  }

  const [pickings, moves, salesOrders] = await Promise.all([
    callKw("stock.picking", "search_read", [[], ["id", "name", "state"]], { limit: 200 }),
    callKw("account.move", "search_read", [[], ["id", "name", "state"]], { limit: 200 }),
    callKw("sale.order", "search_read", [[], ["id", "name", "state"]], { limit: 200 }),
  ]);
  const pickCount = pickings.ok ? (pickings.result ?? []).length : 0;
  const moveCount = moves.ok ? (moves.result ?? []).length : 0;
  const soCount = salesOrders.ok ? (salesOrders.result ?? []).length : 0;
  const resources = {
    cost_centres: resource(true, 0), // not modelled in Odoo pull
    purchase_orders: resource(moves.ok, moveCount, moves.error), // account_moves proxy
    sales_orders: resource(salesOrders.ok, soCount, salesOrders.error),
    stock_pickings: resource(pickings.ok, pickCount, pickings.error),
  };
  return {
    records: pickCount + moveCount + soCount,
    summary: {
      mode: "pull",
      cost_centres: 0, purchase_orders: moveCount, sales_orders: soCount,
      stock_pickings: pickCount, account_moves: moveCount,
      resources, partial: !pickings.ok || !moves.ok || !salesOrders.ok,
    },
  };
}

// ---------------------------------------------------------------------------
// Microsoft Dynamics 365 - OAuth 2.0 against login.microsoftonline.com,
// then Web API at /api/data/v9.2/.
// ---------------------------------------------------------------------------
export async function syncDynamics365(ctx: SyncCtx) {
  const { cfg, admin, organization_id, direction } = ctx;
  const base = (cfg.instance_url ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Dynamics365 instance_url not configured");
  const tenant = (cfg.config?.tenant_id ?? cfg.config?.tenant ?? "common").toString();

  const tokenResp = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: cfg.client_id ?? "",
        client_secret: cfg.client_secret ?? "",
        scope: `${base}/.default`,
      }),
    }
  );
  if (!tokenResp.ok) throw new Error(`D365 auth failed: ${tokenResp.status}`);
  const tokJson = await tokenResp.json();
  const token = tokJson.access_token;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json",
    "OData-Version": "4.0",
  };

  if (direction === "push") {
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: dispatches } = await admin
      .from("dispatches")
      .select("id, status, updated_at")
      .eq("organization_id", organization_id)
      .eq("status", "delivered")
      .is("external_synced_at", null)
      .gte("updated_at", sinceIso)
      .limit(100);
    let pushed = 0;
    for (const d of dispatches ?? []) {
      const r = await fetch(`${base}/api/data/v9.2/invoices`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: `RouteAce dispatch ${d.id}` }),
      }).catch(() => null);
      if (r?.ok || r?.status === 204) {
        await admin.from("dispatches").update({ external_synced_at: new Date().toISOString() }).eq("id", d.id);
        pushed++;
      }
    }
    return { records: pushed, summary: { mode: "push", pushed, total: dispatches?.length ?? 0 } };
  }

  // PULL: D365 supports cost centres (msdyn_costcenters), purchase orders
  // (purchaseorders), and sales orders. Each is fetched independently - a
  // single down endpoint must not break the others.
  const [cc, po, so] = await Promise.all([
    safeFetchJson(`${base}/api/data/v9.2/msdyn_costcenters?$top=200`, { headers }, "d365_cost_centres"),
    safeFetchJson(`${base}/api/data/v9.2/purchaseorders?$top=200`, { headers }, "d365_purchase_orders"),
    safeFetchJson(`${base}/api/data/v9.2/salesorders?$top=200`, { headers }, "d365_sales_orders"),
  ]);
  const ccCount = cc.ok ? (cc.data?.value ?? []).length : 0;
  const poCount = po.ok ? (po.data?.value ?? []).length : 0;
  const soCount = so.ok ? (so.data?.value ?? []).length : 0;
  const resources = {
    cost_centres: resource(cc.ok, ccCount, cc.error),
    purchase_orders: resource(po.ok, poCount, po.error),
    sales_orders: resource(so.ok, soCount, so.error),
  };
  return {
    records: ccCount + poCount + soCount,
    summary: {
      mode: "pull",
      cost_centres: ccCount, purchase_orders: poCount, sales_orders: soCount,
      resources, partial: !cc.ok || !po.ok || !so.ok,
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// importSalesOrdersToOutbound
// Pulls open sales orders from any configured ERP provider and inserts them as
// outbound_requests rows so the Outbound & Inbound Desk (Ops Manager) can then
// convert them to dispatches via the existing flow. No new tables, no schema
// changes. Idempotent on (organization_id, customer_id_external, picklist_number).
// ---------------------------------------------------------------------------
type NormalizedSO = {
  external_id: string;
  customer_name?: string | null;
  customer_id?: string | null;
  destination_address: string;
  origin_address?: string | null;
  sku?: string | null;
  weight_kg?: number | null;
  requested_date?: string | null;
};

export type SalesOrderFetchOpts = { since?: string; until?: string };

function toIsoDate(s?: string): string | undefined {
  if (!s) return undefined;
  // Accept date or datetime - normalize to YYYY-MM-DD for ERP filters that need it
  return s.length >= 10 ? s.slice(0, 10) : undefined;
}

export async function fetchSalesOrdersForProvider(
  provider: string,
  cfg: any,
  opts: SalesOrderFetchOpts = {},
): Promise<NormalizedSO[]> {
  const base = (cfg.instance_url ?? "").replace(/\/+$/, "");
  if (!base) return [];
  const out: NormalizedSO[] = [];
  const sinceDate = toIsoDate(opts.since);
  const untilDate = toIsoDate(opts.until);

  try {
    if (provider === "sap" || provider === "sap_wms") {
      const basic = "Basic " + btoa(`${cfg.client_id ?? ""}:${cfg.client_secret ?? ""}`);
      const filters = ["OverallSDProcessStatus ne 'C'"];
      if (sinceDate) filters.push(`RequestedDeliveryDate ge datetime'${sinceDate}T00:00:00'`);
      if (untilDate) filters.push(`RequestedDeliveryDate le datetime'${untilDate}T23:59:59'`);
      const url = `${base}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder?$top=200&$filter=${encodeURIComponent(filters.join(" and "))}`;
      const r = await fetch(url, { headers: { Authorization: basic, Accept: "application/json" } });
      if (!r.ok) return [];
      const j = await r.json().catch(() => ({} as any));
      const items = j?.d?.results ?? j?.value ?? [];
      for (const so of items) {
        out.push({
          external_id: String(so.SalesOrder ?? so.SalesOrderID ?? so.id ?? ""),
          customer_name: so.SoldToPartyName ?? so.CustomerName ?? null,
          customer_id: so.SoldToParty ?? so.CustomerID ?? null,
          destination_address: so.ShippingAddress ?? so.ShipToAddress ?? "",
          sku: so.Material ?? null,
          weight_kg: so.GrossWeight ? Number(so.GrossWeight) : null,
          requested_date: so.RequestedDeliveryDate ?? null,
        });
      }
    } else if (provider === "oracle" || provider === "netsuite") {
      const basic = "Basic " + btoa(`${cfg.client_id ?? ""}:${cfg.client_secret ?? ""}`);
      const qParts = ["StatusCode!='CLOSED'"];
      if (sinceDate) qParts.push(`RequestedShipDate>='${sinceDate}'`);
      if (untilDate) qParts.push(`RequestedShipDate<='${untilDate}'`);
      const url = `${base}/fscmRestApi/resources/11.13.18.05/salesOrdersForOrderHub?limit=200&q=${encodeURIComponent(qParts.join(";"))}`;
      const r = await fetch(url, { headers: { Authorization: basic, Accept: "application/json" } });
      if (!r.ok) return [];
      const j = await r.json().catch(() => ({} as any));
      for (const so of j?.items ?? []) {
        out.push({
          external_id: String(so.OrderNumber ?? so.HeaderId ?? ""),
          customer_name: so.BuyingPartyName ?? null,
          customer_id: so.BuyingPartyNumber ?? null,
          destination_address: so.ShipToAddress1 ?? so.ShippingAddress ?? "",
          requested_date: so.RequestedShipDate ?? so.RequestedArrivalDate ?? null,
        });
      }
    } else if (provider === "odoo") {
      const dbName = (cfg.config?.database ?? cfg.config?.db ?? "").toString();
      const authResp = await fetch(`${base}/web/session/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", params: { db: dbName, login: cfg.client_id, password: cfg.client_secret } }),
      });
      if (!authResp.ok) return [];
      const cookie = authResp.headers.get("set-cookie") ?? "";
      const domain: any[] = [["state", "in", ["sale", "done"]]];
      if (sinceDate) domain.push(["commitment_date", ">=", `${sinceDate} 00:00:00`]);
      if (untilDate) domain.push(["commitment_date", "<=", `${untilDate} 23:59:59`]);
      const r = await fetch(`${base}/web/dataset/call_kw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          jsonrpc: "2.0", method: "call",
          params: {
            model: "sale.order", method: "search_read",
            args: [domain, ["id", "name", "partner_id", "partner_shipping_id", "commitment_date"]],
            kwargs: { limit: 200 },
          },
        }),
      });
      if (!r.ok) return [];
      const j: any = await r.json().catch(() => ({}));
      for (const so of j?.result ?? []) {
        out.push({
          external_id: String(so.name ?? so.id ?? ""),
          customer_name: Array.isArray(so.partner_id) ? so.partner_id[1] : null,
          customer_id: Array.isArray(so.partner_id) ? String(so.partner_id[0]) : null,
          destination_address: Array.isArray(so.partner_shipping_id) ? so.partner_shipping_id[1] : "",
          requested_date: so.commitment_date ?? null,
        });
      }
    } else if (provider === "dynamics365") {
      const tenant = (cfg.config?.tenant_id ?? cfg.config?.tenant ?? "common").toString();
      const tokenResp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: cfg.client_id ?? "", client_secret: cfg.client_secret ?? "",
          scope: `${base}/.default`,
        }),
      });
      if (!tokenResp.ok) return [];
      const tok = await tokenResp.json().catch(() => ({} as any));
      const filters = ["statecode eq 0"];
      if (sinceDate) filters.push(`requestdeliveryby ge ${sinceDate}`);
      if (untilDate) filters.push(`requestdeliveryby le ${untilDate}`);
      const url = `${base}/api/data/v9.2/salesorders?$top=200&$filter=${encodeURIComponent(filters.join(" and "))}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${tok.access_token}`, Accept: "application/json", "OData-Version": "4.0" },
      });
      if (!r.ok) return [];
      const j: any = await r.json().catch(() => ({}));
      for (const so of j?.value ?? []) {
        out.push({
          external_id: String(so.ordernumber ?? so.salesorderid ?? ""),
          customer_name: so["_customerid_value@OData.Community.Display.V1.FormattedValue"] ?? null,
          customer_id: so._customerid_value ?? null,
          destination_address: so.shipto_composite ?? so.shipto_line1 ?? "",
          requested_date: so.requestdeliveryby ?? null,
        });
      }
    }
  } catch (e) {
    console.error(`fetchSalesOrders ${provider} failed`, e);
  }
  return out;
}

export type ImportOpts = SalesOrderFetchOpts & {
  mode?: "preview" | "commit";
  // For commit: client-supplied (potentially user-edited) order list to insert.
  // External IDs are still validated against the live ERP fetch results so a
  // malicious client cannot inject arbitrary picklist_numbers.
  orders?: Array<Partial<NormalizedSO> & { external_id: string; destination_address?: string }>;
};

export async function importSalesOrdersToOutbound(ctx: SyncCtx, opts: ImportOpts = {}) {
  const { admin, cfg, organization_id, userId } = ctx;
  if (!userId) throw new Error("Missing user context");
  const provider = String(cfg.provider ?? "");
  const mode = opts.mode ?? "commit"; // back-compat: default = fetch+insert
  const fetched = await fetchSalesOrdersForProvider(provider, cfg, { since: opts.since, until: opts.until });

  // Existing duplicates
  const externalIds = fetched.map((o) => o.external_id).filter(Boolean);
  const { data: existing } = externalIds.length
    ? await admin.from("outbound_requests")
        .select("picklist_number")
        .eq("organization_id", organization_id)
        .in("picklist_number", externalIds)
    : { data: [] as any[] };
  const existingSet = new Set((existing ?? []).map((r: any) => r.picklist_number));

  // Annotate preview rows with status for the UI
  const previewRows = fetched.map((o) => {
    const addr = (o.destination_address ?? "").trim();
    const incomplete = !addr || addr.length < 8;
    return {
      ...o,
      already_imported: existingSet.has(o.external_id),
      address_incomplete: incomplete,
    };
  });

  if (mode === "preview") {
    return {
      records: 0,
      summary: {
        mode: "preview", provider,
        fetched: fetched.length,
        new_count: previewRows.filter((r) => !r.already_imported).length,
        skipped: previewRows.filter((r) => r.already_imported).length,
        incomplete_addresses: previewRows.filter((r) => r.address_incomplete && !r.already_imported).length,
        orders: previewRows,
        since: opts.since ?? null, until: opts.until ?? null,
      },
    };
  }

  // commit - pick orders to insert
  const validIds = new Set(externalIds);
  // If the client supplied edited orders, intersect with what the ERP actually returned.
  const candidateOrders: Array<NormalizedSO> = (opts.orders && opts.orders.length > 0)
    ? opts.orders
        .filter((o) => o && o.external_id && validIds.has(o.external_id))
        .map((edited) => {
          const original = fetched.find((f) => f.external_id === edited.external_id)!;
          return {
            ...original,
            // Only address is user-overridable from preview UI.
            destination_address: (edited.destination_address ?? original.destination_address ?? "").toString().slice(0, 500),
          };
        })
    : fetched;

  const { data: defaultWh } = await admin
    .from("warehouses")
    .select("id, name, address, location")
    .eq("organization_id", organization_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const rows: any[] = [];
  let skipped = 0;
  for (const o of candidateOrders) {
    if (!o.external_id || existingSet.has(o.external_id)) { skipped++; continue; }
    rows.push({
      organization_id,
      created_by: userId,
      warehouse_id: defaultWh?.id ?? null,
      warehouse_name: defaultWh?.name ?? "ERP Import",
      origin_address: defaultWh?.address ?? defaultWh?.location ?? "Origin pending - assign warehouse",
      destination_address: o.destination_address || "Address pending - confirm with customer",
      customer_name: o.customer_name ?? null,
      customer_id_external: o.customer_id ?? null,
      picklist_number: o.external_id,
      sku: o.sku ?? null,
      total_weight_kg: o.weight_kg ?? null,
      requested_date: (o.requested_date ?? today).toString().slice(0, 10),
      priority: "normal",
      source: "erp_sync",
      status: "pending",
      notes: `Imported from ${provider} sales order ${o.external_id}`,
    });
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await admin
      .from("outbound_requests")
      .insert(rows, { count: "exact" });
    if (error) throw new Error(`Insert outbound_requests failed: ${error.message}`);
    inserted = count ?? rows.length;
  }

  return {
    records: inserted,
    summary: {
      mode: "import_sales_orders", provider,
      fetched: fetched.length, inserted, skipped,
      since: opts.since ?? null, until: opts.until ?? null,
    },
  };
}
