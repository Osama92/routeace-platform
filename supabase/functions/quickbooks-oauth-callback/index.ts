import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://routeace.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

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

    const body = await req.json().catch(() => ({}));
    const { code, state, realm_id, redirect_uri } = body as Record<string, string>;
    if (!code || !state || !realm_id || !redirect_uri) {
      return json({ error: "code, state, realm_id, redirect_uri are required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    // Lookup pending connection by state
    const { data: pending, error: pendErr } = await admin
      .from("erp_connections")
      .select("*")
      .eq("provider", "quickbooks")
      .eq("oauth_state", state)
      .maybeSingle();

    if (pendErr || !pending) return json({ error: "Invalid or expired OAuth state" }, 400);
    if (pending.connected_by !== userId) return json({ error: "State token does not belong to caller" }, 403);

    // Exchange code for tokens
    const basic = btoa(`${clientId}:${clientSecret}`);
    const formBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
    });

    const tokenResp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Intuit token exchange failed", tokenData);
      await admin
        .from("erp_connections")
        .update({ status: "error", last_error: `Token exchange failed: ${JSON.stringify(tokenData)}` })
        .eq("id", pending.id);
      return json({ error: "Intuit token exchange failed", details: tokenData }, 502);
    }

    const now = Date.now();
    const expiresAt = new Date(now + (tokenData.expires_in ?? 3600) * 1000).toISOString();
    const refreshExpiresAt = new Date(now + (tokenData.x_refresh_token_expires_in ?? 8726400) * 1000).toISOString();

    const { error: updErr } = await admin
      .from("erp_connections")
      .update({
        realm_id,
        token_type: tokenData.token_type ?? "bearer",
        scope: tokenData.scope ?? null,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        status: "connected",
        oauth_state: null,
        last_error: null,
      })
      .eq("id", pending.id);

    if (updErr) {
      console.error("Failed to persist connection metadata", updErr);
      return json({ error: "Failed to persist connection metadata" }, 500);
    }

    const { error: secretErr } = await admin.rpc("set_erp_connection_secrets_service", {
      _connection_id: pending.id,
      _secrets: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      },
    });
    if (secretErr) {
      console.error("Failed to store tokens in Vault", secretErr);
      return json({ error: "Failed to store tokens securely" }, 500);
    }

    return json({ ok: true, organization_id: pending.organization_id, realm_id });
  } catch (e) {
    console.error("quickbooks-oauth-callback error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
