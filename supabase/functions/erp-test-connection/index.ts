// erp-test-connection: validates ERP credentials WITHOUT writing any data.
// Accepts either (a) saved config_id for an existing integration, or
// (b) inline {provider, instance_url, client_id, client_secret} for pre-save testing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    let { provider, instance_url, client_id, client_secret, config_id, organization_id } = body ?? {};

    if (config_id) {
      const { data: cfg } = await admin
        .from("integration_configs")
        .select("provider, instance_url, client_id, organization_id")
        .eq("id", config_id).maybeSingle();
      if (!cfg) return json({ ok: false, error: "Configuration not found" }, 404);
      // Verify caller belongs to org
      const { data: mem } = await admin.from("organization_members")
        .select("user_id").eq("organization_id", cfg.organization_id)
        .eq("user_id", u.user.id).maybeSingle();
      if (!mem) return json({ ok: false, error: "Forbidden" }, 403);
      const { data: secrets } = await admin.rpc("get_integration_config_secrets", {
        _integration_config_id: config_id,
      });
      provider = cfg.provider;
      instance_url = cfg.instance_url;
      client_id = cfg.client_id;
      client_secret = (secrets as any)?.client_secret ?? "";
    } else {
      if (!provider) return json({ ok: false, error: "provider required" }, 400);
      // For inline test, must be admin of the target org
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      const isAdmin = (roles ?? []).some((r: any) => ["super_admin", "org_admin"].includes(r.role));
      if (!isAdmin) return json({ ok: false, error: "Admin role required" }, 403);
    }

    // Per-provider lightweight auth check (token endpoint only - no data fetched/written)
    const result = await testProvider(provider, { instance_url, client_id, client_secret });
    return json(result, result.ok ? 200 : 200);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function testProvider(
  provider: string,
  c: { instance_url?: string; client_id?: string; client_secret?: string }
): Promise<{ ok: boolean; error?: string; details?: string }> {
  try {
    if (provider === "jaggaer") {
      if (!c.instance_url) return { ok: false, error: "Instance URL required" };
      const r = await fetch(`${c.instance_url}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: c.client_id ?? "",
          client_secret: c.client_secret ?? "",
        }),
      });
      if (!r.ok) return { ok: false, error: `Auth failed (${r.status})`, details: await r.text() };
      return { ok: true };
    }

    if (provider === "xero") {
      const r = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${c.client_id}:${c.client_secret}`),
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: "accounting.transactions" }),
      });
      if (!r.ok) return { ok: false, error: `Xero auth failed (${r.status})`, details: await r.text() };
      return { ok: true };
    }

    if (provider === "quickbooks_online") {
      // QBO requires user OAuth (no client_credentials). If creds present, just verify URL reachable.
      if (!c.client_id || !c.client_secret) return { ok: false, error: "Client ID/Secret required" };
      const r = await fetch("https://oauth.platform.intuit.com/op/v1/openid_configuration");
      return r.ok ? { ok: true, details: "Discovery endpoint reachable. Full validation requires user OAuth." }
                  : { ok: false, error: "QBO endpoint unreachable" };
    }

    if (provider === "zoho_books" || provider === "zoho_inventory") {
      if (!c.instance_url) return { ok: false, error: "Region/Instance URL required (e.g. https://accounts.zoho.com)" };
      const r = await fetch(`${c.instance_url}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: c.client_id ?? "",
          client_secret: c.client_secret ?? "",
          scope: "ZohoBooks.fullaccess.READ",
        }),
      });
      if (!r.ok) return { ok: false, error: `Zoho auth failed (${r.status})`, details: await r.text() };
      return { ok: true };
    }

    // Generic reachability check
    if (c.instance_url) {
      try {
        const r = await fetch(c.instance_url, { method: "HEAD" });
        return { ok: r.ok || r.status < 500, details: `Endpoint reachable (HTTP ${r.status}). Provider-specific test not implemented yet.` };
      } catch {
        return { ok: false, error: "Instance URL unreachable" };
      }
    }
    return { ok: false, error: "No instance URL provided" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
