import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const INTUIT_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
// Default scopes: accounting (covers invoices, customers, payments, CoA, journals)
const QB_SCOPES = "com.intuit.quickbooks.accounting openid profile email";

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
    if (!clientId) return json({ error: "QUICKBOOKS_CLIENT_ID is not configured" }, 500);

    // Validate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
    const userId = userRes.user.id;

    // Re-check role + tenant via service role (bypasses RLS for these helpers)
    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: orgId }, { data: roleRows }] = await Promise.all([
      admin.rpc("get_user_organization", { p_user_id: userId }),
      admin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (!orgId) return json({ error: "No organization for user" }, 403);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const allowed = roles.some((r) =>
      ["super_admin", "finance_manager", "org_admin"].includes(r),
    );
    if (!allowed) return json({ error: "Forbidden: requires Super Admin, Finance Manager, or COO/Org Admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const redirectUri: string | undefined = body.redirect_uri;
    if (!redirectUri || !/^https?:\/\//.test(redirectUri)) {
      return json({ error: "redirect_uri (https) is required" }, 400);
    }
    const environment: "sandbox" | "production" = body.environment === "sandbox" ? "sandbox" : "production";

    // Generate state token and persist a pending connection row
    const state = crypto.randomUUID();
    await admin
      .from("erp_connections")
      .upsert(
        {
          organization_id: orgId,
          provider: "quickbooks",
          environment,
          status: "authorizing",
          oauth_state: state,
          connected_by: userId,
          metadata: { redirect_uri: redirectUri, initiated_at: new Date().toISOString() },
        },
        { onConflict: "organization_id,provider" },
      );

    const url = new URL(INTUIT_AUTH_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", QB_SCOPES);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    return json({ authorize_url: url.toString(), state, environment });
  } catch (e) {
    console.error("quickbooks-oauth-init error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
