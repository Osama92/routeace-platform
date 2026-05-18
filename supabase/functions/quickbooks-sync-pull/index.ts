import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://routeaceglyde.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    if (connErr || !connRow || !connRow.realm_id) {
      return json({ error: "QuickBooks not connected for this organization" }, 400);
    }

    const tokens = await loadConnSecrets(admin, connRow.id);
    if (!tokens.access_token) {
      return json({ error: "QuickBooks not connected for this organization" }, 400);
    }

    const conn = { ...connRow, ...tokens } as Conn;
    const accessToken = await ensureFreshToken(admin, conn, clientId, clientSecret);
    const baseUrl = (conn.environment === "sandbox" ? QBO_BASE_SANDBOX : QBO_BASE_PROD) +
      `/v3/company/${conn.realm_id}`;

    const body = await req.json().catch(() => ({}));
    const entities: string[] = Array.isArray(body.entities) && body.entities.length
      ? body.entities
      : ["chart_of_accounts", "payments", "journal_entries"];
    const limit = Math.min(200, Math.max(10, Number(body.limit) || 100));

    const summary: Record<string, { pulled: number; error?: string }> = {};

    for (const entity of entities) {
      summary[entity] = { pulled: 0 };
      const queryMap: Record<string, string> = {
        chart_of_accounts: `select * from Account maxresults ${limit}`,
        payments: `select * from Payment maxresults ${limit}`,
        journal_entries: `select * from JournalEntry maxresults ${limit}`,
      };
      const q = queryMap[entity];
      if (!q) {
        summary[entity].error = `Unsupported entity ${entity}`;
        continue;
      }

      try {
        const url = `${baseUrl}/query?query=${encodeURIComponent(q)}&minorversion=70`;
        const resp = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const data = await resp.json();
        if (!resp.ok) {
          const msg = data?.Fault?.Error?.[0]?.Detail ?? JSON.stringify(data).slice(0, 200);
          summary[entity].error = msg;
          await logSync(admin, conn, "pull", entity, null, null, "error", msg, userId);
          continue;
        }

        const rows: Record<string, unknown>[] =
          data?.QueryResponse?.Account ??
          data?.QueryResponse?.Payment ??
          data?.QueryResponse?.JournalEntry ??
          [];

        for (const row of rows) {
          await logSync(
            admin,
            conn,
            "pull",
            entity,
            null,
            String(row.Id ?? ""),
            "success",
            null,
            userId,
            { name: row.Name ?? row.DocNumber ?? null, amount: row.TotalAmt ?? null },
          );
          summary[entity].pulled++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        summary[entity].error = msg;
        await logSync(admin, conn, "pull", entity, null, null, "error", msg, userId);
      }
    }

    await admin
      .from("erp_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_direction: "pull", last_error: null })
      .eq("id", conn.id);

    return json({ ok: true, summary });
  } catch (e) {
    console.error("quickbooks-sync-pull error", e);
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
  payloadSummary?: Record<string, unknown>,
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
    payload_summary: payloadSummary ?? null,
    triggered_by: triggeredBy,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
