// Integration tests for erp-sync provider pulls.
//
// Verifies:
//   1. Per-endpoint failure isolation (sales-orders down ≠ whole pull down)
//   2. Cost-centre / PO / sales-order counts surface in summary.resources
//   3. importSalesOrdersToOutbound is strictly tenant-scoped - every Supabase
//      call is bound to the ctx.organization_id and never leaks across LD tenants.
//
// fetch is mocked per-suite. The supabase admin client is replaced with a
// recording fake that captures every chained .from()/.select()/.eq() call so
// we can assert org-scoping even when no real network is available.

import {
  syncSap,
  syncOracle,
  syncOdoo,
  syncDynamics365,
  importSalesOrdersToOutbound,
} from "./index.ts";

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function withMockFetch(handler: FetchHandler, fn: () => Promise<void>) {
  return async () => {
    const original = globalThis.fetch;
    globalThis.fetch = ((input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.url;
      return Promise.resolve(handler(url, init));
    }) as typeof fetch;
    try {
      await fn();
    } finally {
      globalThis.fetch = original;
    }
  };
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function errResp(status = 500) {
  return new Response("internal error", { status });
}

/**
 * Recording fake for the supabase admin client.
 * Captures every chained .from(...).select(...).eq(...).<terminal>() call so
 * tests can assert tenant scoping. Returns deterministic data for
 * `outbound_requests` (existing-IDs check) and `warehouses` (default lookup).
 */
function makeAdminFake() {
  const calls: Array<{ table: string; filters: Record<string, unknown>; ops: string[] }> = [];
  const inserts: Array<{ table: string; rows: any[] }> = [];

  function tableBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    const ops: string[] = [];
    const entry = { table, filters, ops };
    calls.push(entry);

    const builder: any = {
      select: (_cols?: string) => { ops.push("select"); return builder; },
      insert: (rows: any | any[], _opts?: any) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        inserts.push({ table, rows: arr });
        return Promise.resolve({ data: arr, error: null, count: arr.length });
      },
      update: (_v: any) => { ops.push("update"); return builder; },
      eq: (k: string, v: unknown) => { filters[k] = v; ops.push(`eq:${k}`); return builder; },
      in: (k: string, v: unknown[]) => { filters[`in:${k}`] = v; ops.push(`in:${k}`); return builder; },
      is: (k: string, v: unknown) => { filters[`is:${k}`] = v; return builder; },
      gte: (k: string, v: unknown) => { filters[`gte:${k}`] = v; return builder; },
      not: (..._a: unknown[]) => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        if (table === "warehouses") {
          return Promise.resolve({
            data: { id: "wh-1", name: "Default WH", address: "1 Default St", location: null },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => {
        // Used when callers await the builder directly (e.g. existing-IDs check).
        if (table === "outbound_requests" && ops.includes("select")) {
          return resolve({ data: [], error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return builder;
  }

  return {
    admin: { from: (table: string) => tableBuilder(table) } as any,
    calls, inserts,
  };
}

// ---------------------------------------------------------------------------
// SAP - partial-failure isolation
// ---------------------------------------------------------------------------
Deno.test(
  "syncSap pull: sales-orders endpoint down still returns CC and PO counts",
  withMockFetch(
    (url) => {
      if (url.includes("A_CostCenter")) return jsonResp({ d: { results: [{}, {}, {}] } });
      if (url.includes("A_PurchaseOrder")) return jsonResp({ d: { results: [{}, {}] } });
      if (url.includes("A_SalesOrder")) return errResp(503);
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncSap({
        admin,
        cfg: { instance_url: "https://sap.example.com", client_id: "u", client_secret: "p" },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.cost_centres, 3);
      assertEquals(r.summary.purchase_orders, 2);
      assertEquals(r.summary.sales_orders, 0);
      assertEquals(r.summary.resources.sales_orders.ok, false);
      assert(r.summary.partial, "expected partial=true");
      assertEquals(r.records, 5);
    },
  ),
);

Deno.test(
  "syncSap pull: all endpoints succeed -> partial=false, all counts present",
  withMockFetch(
    (url) => {
      if (url.includes("A_CostCenter")) return jsonResp({ d: { results: [{}] } });
      if (url.includes("A_PurchaseOrder")) return jsonResp({ d: { results: [{}, {}] } });
      if (url.includes("A_SalesOrder")) return jsonResp({ d: { results: [{}, {}, {}, {}] } });
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncSap({
        admin,
        cfg: { instance_url: "https://sap.example.com", client_id: "u", client_secret: "p" },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.cost_centres, 1);
      assertEquals(r.summary.purchase_orders, 2);
      assertEquals(r.summary.sales_orders, 4);
      assertEquals(r.summary.partial, false);
    },
  ),
);

// ---------------------------------------------------------------------------
// Oracle
// ---------------------------------------------------------------------------
Deno.test(
  "syncOracle pull: sales-orders 500 still returns CC count",
  withMockFetch(
    (url) => {
      if (url.includes("/costCenters")) return jsonResp({ items: [{}, {}] });
      if (url.includes("/salesOrdersForOrderHub")) return errResp(500);
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncOracle({
        admin,
        cfg: { instance_url: "https://oracle.example.com", client_id: "u", client_secret: "p" },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.cost_centres, 2);
      assertEquals(r.summary.sales_orders, 0);
      assertEquals(r.summary.resources.sales_orders.ok, false);
      assert(r.summary.partial);
    },
  ),
);

Deno.test(
  "syncOracle pull: sales orders happy path",
  withMockFetch(
    (url) => {
      if (url.includes("/costCenters")) return jsonResp({ items: [{}] });
      if (url.includes("/salesOrdersForOrderHub")) return jsonResp({ items: [{}, {}, {}] });
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncOracle({
        admin,
        cfg: { instance_url: "https://oracle.example.com", client_id: "u", client_secret: "p" },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.sales_orders, 3);
      assertEquals(r.summary.partial, false);
    },
  ),
);

// ---------------------------------------------------------------------------
// Odoo
// ---------------------------------------------------------------------------
Deno.test(
  "syncOdoo pull: sale.order RPC error doesn't kill stock.picking / account.move counts",
  withMockFetch(
    (url, init) => {
      if (url.endsWith("/web/session/authenticate")) return jsonResp({ uid: 1 });
      if (url.endsWith("/web/dataset/call_kw")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const model = body?.params?.model;
        if (model === "stock.picking") return jsonResp({ result: [{}, {}, {}] });
        if (model === "account.move") return jsonResp({ result: [{}, {}] });
        if (model === "sale.order") return errResp(502);
      }
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncOdoo({
        admin,
        cfg: { instance_url: "https://odoo.example.com", client_id: "u", client_secret: "p", config: { database: "demo" } },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.stock_pickings, 3);
      assertEquals(r.summary.purchase_orders, 2);
      assertEquals(r.summary.sales_orders, 0);
      assertEquals(r.summary.resources.sales_orders.ok, false);
      assert(r.summary.partial);
    },
  ),
);

Deno.test(
  "syncOdoo pull: sales orders happy path",
  withMockFetch(
    (url, init) => {
      if (url.endsWith("/web/session/authenticate")) return jsonResp({ uid: 1 });
      if (url.endsWith("/web/dataset/call_kw")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const model = body?.params?.model;
        if (model === "stock.picking") return jsonResp({ result: [] });
        if (model === "account.move") return jsonResp({ result: [] });
        if (model === "sale.order") return jsonResp({ result: [{}, {}, {}, {}, {}] });
      }
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncOdoo({
        admin,
        cfg: { instance_url: "https://odoo.example.com", client_id: "u", client_secret: "p", config: { database: "demo" } },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.sales_orders, 5);
      assertEquals(r.summary.partial, false);
    },
  ),
);

// ---------------------------------------------------------------------------
// Dynamics 365
// ---------------------------------------------------------------------------
Deno.test(
  "syncDynamics365 pull: sales-orders down still returns CC + PO",
  withMockFetch(
    (url) => {
      if (url.includes("login.microsoftonline.com")) return jsonResp({ access_token: "t", expires_in: 3600 });
      if (url.includes("/msdyn_costcenters")) return jsonResp({ value: [{}, {}, {}, {}] });
      if (url.includes("/purchaseorders")) return jsonResp({ value: [{}] });
      if (url.includes("/salesorders")) return errResp(504);
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncDynamics365({
        admin,
        cfg: { instance_url: "https://contoso.crm.dynamics.com", client_id: "u", client_secret: "p", config: { tenant_id: "t" } },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.cost_centres, 4);
      assertEquals(r.summary.purchase_orders, 1);
      assertEquals(r.summary.sales_orders, 0);
      assertEquals(r.summary.resources.sales_orders.ok, false);
      assert(r.summary.partial);
    },
  ),
);

Deno.test(
  "syncDynamics365 pull: sales orders happy path",
  withMockFetch(
    (url) => {
      if (url.includes("login.microsoftonline.com")) return jsonResp({ access_token: "t", expires_in: 3600 });
      if (url.includes("/msdyn_costcenters")) return jsonResp({ value: [] });
      if (url.includes("/purchaseorders")) return jsonResp({ value: [] });
      if (url.includes("/salesorders")) return jsonResp({ value: [{}, {}] });
      return errResp(404);
    },
    async () => {
      const { admin } = makeAdminFake();
      const r: any = await syncDynamics365({
        admin,
        cfg: { instance_url: "https://contoso.crm.dynamics.com", client_id: "u", client_secret: "p", config: { tenant_id: "t" } },
        organization_id: "org-A",
        direction: "pull",
      });
      assertEquals(r.summary.sales_orders, 2);
      assertEquals(r.summary.partial, false);
    },
  ),
);

// ---------------------------------------------------------------------------
// Tenant isolation - importSalesOrdersToOutbound for each provider must
// scope every Supabase call to ctx.organization_id and write outbound_requests
// rows that carry that org id only.
// ---------------------------------------------------------------------------
const PROVIDERS_TO_TEST: Array<{ name: string; mockFetch: FetchHandler; cfg: any }> = [
  {
    name: "sap",
    cfg: { provider: "sap", instance_url: "https://sap.example.com", client_id: "u", client_secret: "p" },
    mockFetch: (url) => {
      if (url.includes("A_SalesOrder"))
        return jsonResp({ d: { results: [{ SalesOrder: "SO-1", SoldToPartyName: "Acme", ShippingAddress: "1 A St" }] } });
      return errResp(404);
    },
  },
  {
    name: "oracle",
    cfg: { provider: "oracle", instance_url: "https://oracle.example.com", client_id: "u", client_secret: "p" },
    mockFetch: (url) => {
      if (url.includes("salesOrdersForOrderHub"))
        return jsonResp({ items: [{ OrderNumber: "O-1", BuyingPartyName: "Acme", ShipToAddress1: "1 A St" }] });
      return errResp(404);
    },
  },
  {
    name: "odoo",
    cfg: { provider: "odoo", instance_url: "https://odoo.example.com", client_id: "u", client_secret: "p", config: { database: "demo" } },
    mockFetch: (url, init) => {
      if (url.endsWith("/web/session/authenticate")) return jsonResp({ uid: 1 });
      if (url.endsWith("/web/dataset/call_kw")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        if (body?.params?.model === "sale.order")
          return jsonResp({ result: [{ id: 1, name: "S1", partner_id: [10, "Acme"], partner_shipping_id: [11, "1 A St"] }] });
      }
      return errResp(404);
    },
  },
  {
    name: "dynamics365",
    cfg: { provider: "dynamics365", instance_url: "https://contoso.crm.dynamics.com", client_id: "u", client_secret: "p", config: { tenant_id: "t" } },
    mockFetch: (url) => {
      if (url.includes("login.microsoftonline.com")) return jsonResp({ access_token: "t", expires_in: 3600 });
      if (url.includes("/salesorders"))
        return jsonResp({ value: [{ ordernumber: "O-1", shipto_composite: "1 A St" }] });
      return errResp(404);
    },
  },
];

for (const p of PROVIDERS_TO_TEST) {
  Deno.test(
    `importSalesOrdersToOutbound (${p.name}): only writes rows scoped to ctx.organization_id`,
    withMockFetch(p.mockFetch, async () => {
      const { admin, calls, inserts } = makeAdminFake();
      const r: any = await importSalesOrdersToOutbound({
        admin,
        cfg: p.cfg,
        organization_id: "org-TENANT-A",
        direction: "import_sales_orders",
        userId: "user-1",
      });

      assertEquals(r.summary.mode, "import_sales_orders");
      assertEquals(r.summary.provider, p.name);

      // (1) Every READ against outbound_requests/warehouses MUST be filtered by org.
      //     Inserts have no .eq() chain - they're validated separately below.
      const orgScopedTables = ["outbound_requests", "warehouses"];
      for (const c of calls) {
        if (orgScopedTables.includes(c.table) && c.ops.includes("select")) {
          assertEquals(
            c.filters["organization_id"],
            "org-TENANT-A",
            `Tenant leak: ${c.table} read missing org filter`,
          );
        }
      }

      // (2) Every inserted outbound_requests row MUST carry organization_id == ctx.org.
      const insertedRows = inserts.filter((i) => i.table === "outbound_requests").flatMap((i) => i.rows);
      assert(insertedRows.length > 0, `${p.name}: expected at least one imported row`);
      for (const row of insertedRows) {
        assertEquals(row.organization_id, "org-TENANT-A", `Tenant leak in inserted row for ${p.name}`);
        assertEquals(row.created_by, "user-1");
        assertEquals(row.source, "erp_sync");
        assertEquals(row.status, "pending");
      }
    }),
  );
}
