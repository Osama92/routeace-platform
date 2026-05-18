// Register a web-push subscription for the authenticated user.
// Body: { endpoint, keys: { p256dh, auth }, user_agent? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({ vapid_public_key: VAPID_PUBLIC }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user_id = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint ?? "");
    const p256dh = String(body?.keys?.p256dh ?? "");
    const authKey = String(body?.keys?.auth ?? "");
    const user_agent = body?.user_agent ? String(body.user_agent).slice(0, 500) : null;
    if (!endpoint || !p256dh || !authKey) {
      return new Response(JSON.stringify({ error: "missing subscription fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve organization (best-effort)
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: prof } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", user_id)
      .maybeSingle();
    const organization_id = (prof as any)?.organization_id ?? null;

    const { error: upErr } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id,
          organization_id,
          endpoint,
          p256dh,
          auth: authKey,
          user_agent,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, vapid_public_key: VAPID_PUBLIC }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
