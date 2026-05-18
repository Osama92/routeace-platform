// erp-oauth-initiate: builds the provider authorize URL, stores CSRF state, returns URL.
// Body: { provider: 'xero'|'quickbooks_online'|'zoho_books', organization_id, instance_url? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "mbybrzggrpyhvcnxhlua";
const CALLBACK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/erp-oauth-callback`;

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
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
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { provider, organization_id, instance_url, redirect_after } = await req.json();
    if (!provider || !organization_id) return json({ error: "Missing provider or organization_id" }, 400);

    // Verify caller is admin of the org
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r: any) => ["super_admin", "org_admin"].includes(r.role));
    if (!isAdmin) return json({ error: "Forbidden: admin role required" }, 403);
    const { data: mem } = await admin.from("organization_members")
      .select("user_id").eq("organization_id", organization_id)
      .eq("user_id", u.user.id).maybeSingle();
    if (!mem) return json({ error: "Forbidden: not a member of this org" }, 403);

    const state = crypto.randomUUID() + "-" + crypto.randomUUID();

    // PKCE for QBO
    let code_verifier: string | null = null;
    let code_challenge: string | null = null;
    if (provider === "quickbooks_online") {
      code_verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
      code_challenge = base64url(new Uint8Array(hash));
    }

    await admin.from("integration_oauth_states").insert({
      provider, organization_id, user_id: u.user.id, state, code_verifier, redirect_after,
    });

    let authorizeUrl: string;
    if (provider === "xero") {
      const clientId = Deno.env.get("XERO_CLIENT_ID");
      if (!clientId) return json({ error: "XERO_CLIENT_ID not configured on server" }, 500);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: CALLBACK_URL,
        scope: "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access",
        state,
      });
      authorizeUrl = `https://login.xero.com/identity/connect/authorize?${params}`;
    } else if (provider === "quickbooks_online") {
      const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
      if (!clientId) return json({ error: "QUICKBOOKS_CLIENT_ID not configured on server" }, 500);
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        scope: "com.intuit.quickbooks.accounting openid profile email",
        redirect_uri: CALLBACK_URL,
        state,
        code_challenge: code_challenge!,
        code_challenge_method: "S256",
      });
      authorizeUrl = `https://appcenter.intuit.com/connect/oauth2?${params}`;
    } else if (provider === "zoho_books" || provider === "zoho_inventory") {
      const clientId = Deno.env.get("ZOHO_CLIENT_ID");
      if (!clientId) return json({ error: "ZOHO_CLIENT_ID not configured on server" }, 500);
      const region = instance_url || "https://accounts.zoho.com";
      const scope = provider === "zoho_books"
        ? "ZohoBooks.fullaccess.all"
        : "ZohoInventory.fullaccess.all";
      const params = new URLSearchParams({
        scope, client_id: clientId, response_type: "code",
        access_type: "offline", redirect_uri: CALLBACK_URL, state, prompt: "consent",
      });
      authorizeUrl = `${region}/oauth/v2/auth?${params}`;
    } else {
      return json({ error: `Provider ${provider} does not support one-click OAuth yet` }, 400);
    }

    return json({ authorize_url: authorizeUrl, state });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function base64url(buf: Uint8Array): string {
  let s = btoa(String.fromCharCode(...buf));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
