// Send a web-push notification to one or more drivers.
// Triggers: cron (x-cron-secret) for delivery reminders, OR authenticated user
// dispatching to drivers within their organization.
//
// Body: { user_ids?: string[], driver_ids?: string[], title, body, url?, dispatch_id?, tag? }
//   - user_ids: direct user UUIDs
//   - driver_ids: driver UUIDs -> resolved via drivers.user_id (tenant-scoped)
//   - When triggered by cron with no targets, scans dispatches with status='in_transit'
//     having no driver activity in last 60min and pings their driver.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import webpush from "npm:web-push@3.6.7";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@routeaceglyde.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (_) { /* ignore until secrets exist */ }
}

interface Target {
  user_ids: string[];
  organization_id?: string | null;
}

async function resolveTargets(admin: ReturnType<typeof createClient>, body: any, orgScope: string | null): Promise<string[]> {
  const set = new Set<string>();
  if (Array.isArray(body?.user_ids)) body.user_ids.forEach((u: string) => set.add(u));
  if (Array.isArray(body?.driver_ids) && body.driver_ids.length) {
    let q = admin.from("drivers").select("user_id, organization_id").in("id", body.driver_ids);
    if (orgScope) q = q.eq("organization_id", orgScope);
    const { data } = await q;
    (data ?? []).forEach((d: any) => d?.user_id && set.add(d.user_id));
  }
  return [...set];
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const isCron = CRON_SECRET && cronHeader === CRON_SECRET;
  let orgScope: string | null = null;

  if (!isCron) {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: prof } = await admin.from("profiles").select("organization_id").eq("id", u.user.id).maybeSingle();
    orgScope = (prof as any)?.organization_id ?? null;
    if (!orgScope) {
      return new Response(JSON.stringify({ error: "no organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "RouteAce");
  const message = String(body?.body ?? "You have a delivery update.");
  const url = body?.url ? String(body.url) : "/driver";
  const tag = body?.tag ? String(body.tag) : "routeace";

  const userIds = await resolveTargets(admin, body, orgScope);
  if (!userIds.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, note: "no targets" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let q = admin.from("push_subscriptions").select("*").in("user_id", userIds).eq("is_active", true);
  if (orgScope) q = q.eq("organization_id", orgScope);
  const { data: subs, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({ title, body: message, url, tag });
  let sent = 0, failed = 0;

  await Promise.all((subs ?? []).map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
      await admin.from("push_subscriptions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id);
    } catch (err: any) {
      failed++;
      const status = err?.statusCode ?? 0;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").update({ is_active: false }).eq("id", s.id);
      }
    }
  }));

  return new Response(JSON.stringify({ ok: true, sent, failed, targets: userIds.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
