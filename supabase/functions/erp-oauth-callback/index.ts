// erp-oauth-callback: provider redirects here with ?code & ?state.
// Exchanges code for tokens, stores in integration_configs, redirects user back to app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "mbybrzggrpyhvcnxhlua";
const CALLBACK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/erp-oauth-callback`;
const APP_FALLBACK = "https://routeaceglyde.app/dept/erp-integrations";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  const realmId = url.searchParams.get("realmId"); // QBO
  const accountsServer = url.searchParams.get("accounts-server"); // Zoho region

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (errParam) return redirect(`${APP_FALLBACK}?oauth=error&reason=${encodeURIComponent(errParam)}`);
  if (!code || !state) return redirect(`${APP_FALLBACK}?oauth=error&reason=missing_params`);

  const { data: stateRow } = await admin
    .from("integration_oauth_states").select("*")
    .eq("state", state).maybeSingle();
  if (!stateRow || stateRow.consumed_at || new Date(stateRow.expires_at) < new Date()) {
    return redirect(`${APP_FALLBACK}?oauth=error&reason=invalid_state`);
  }

  try {
    const provider = stateRow.provider;
    let tokenResp: any;
    let instance_url: string | null = null;

    if (provider === "xero") {
      const r = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${Deno.env.get("XERO_CLIENT_ID")}:${Deno.env.get("XERO_CLIENT_SECRET")}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, redirect_uri: CALLBACK_URL,
        }),
      });
      tokenResp = await r.json();
      if (!r.ok) throw new Error(`Xero token exchange failed: ${JSON.stringify(tokenResp)}`);
      // Fetch tenant connection
      const tenantsR = await fetch("https://api.xero.com/connections", {
        headers: { Authorization: `Bearer ${tokenResp.access_token}` },
      });
      const tenants = await tenantsR.json();
      instance_url = tenants?.[0]?.tenantId ? `xero://${tenants[0].tenantId}` : "https://api.xero.com";
    } else if (provider === "quickbooks_online") {
      const r = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: "Basic " + btoa(`${Deno.env.get("QUICKBOOKS_CLIENT_ID")}:${Deno.env.get("QUICKBOOKS_CLIENT_SECRET")}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, redirect_uri: CALLBACK_URL,
          code_verifier: stateRow.code_verifier ?? "",
        }),
      });
      tokenResp = await r.json();
      if (!r.ok) throw new Error(`QBO token exchange failed: ${JSON.stringify(tokenResp)}`);
      instance_url = realmId ? `https://quickbooks.api.intuit.com/v3/company/${realmId}` : "https://quickbooks.api.intuit.com";
    } else if (provider === "zoho_books" || provider === "zoho_inventory") {
      const region = accountsServer || "https://accounts.zoho.com";
      const r = await fetch(`${region}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, redirect_uri: CALLBACK_URL,
          client_id: Deno.env.get("ZOHO_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("ZOHO_CLIENT_SECRET") ?? "",
        }),
      });
      tokenResp = await r.json();
      if (!r.ok || tokenResp.error) throw new Error(`Zoho token exchange failed: ${JSON.stringify(tokenResp)}`);
      instance_url = region.replace("accounts.", "www.");
    } else {
      throw new Error(`Unsupported provider ${provider}`);
    }

    const expiresAt = tokenResp.expires_in
      ? new Date(Date.now() + Number(tokenResp.expires_in) * 1000).toISOString()
      : null;

    const { data: upserted } = await admin.from("integration_configs").upsert({
      organization_id: stateRow.organization_id,
      integration_type: provider,
      provider,
      instance_url,
      client_id: tokenResp.access_token ? "oauth" : null,
      token_expires_at: expiresAt,
      auth_method: "oauth",
      is_active: true,
    } as any, { onConflict: "organization_id,provider" }).select("id").single();

    if (upserted?.id) {
      await admin.rpc("set_integration_config_secrets_service", {
        _integration_config_id: upserted.id,
        _secrets: {
          client_secret: tokenResp.refresh_token ?? tokenResp.access_token,
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
        },
      });
    }

    await admin.from("integration_oauth_states")
      .update({ consumed_at: new Date().toISOString() }).eq("id", stateRow.id);

    const back = stateRow.redirect_after || APP_FALLBACK;
    return redirect(`${back}?oauth=success&provider=${provider}`);
  } catch (e) {
    const reason = encodeURIComponent(e instanceof Error ? e.message : "unknown");
    return redirect(`${APP_FALLBACK}?oauth=error&reason=${reason}`);
  }
});

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
