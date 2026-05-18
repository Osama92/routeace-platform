// dispatch-driver-job-notifications
// Routes a dispatch (or ad-hoc job) to drivers whose preferred_vehicle_category
// matches the requested vehicle_category. Strictly tenant-scoped via the caller's
// org membership. Inserts one row per matched driver into driver_job_notifications.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Body {
  dispatch_id?: string;
  vehicle_category: "bike" | "van" | "truck_15t" | "truck_20t" | "trailer";
  title: string;
  body?: string;
  expires_in_minutes?: number; // default 30
}

const VALID = new Set(["bike", "van", "truck_15t", "truck_20t", "trailer"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing Authorization" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Caller-scoped client (RLS enforced) - used to verify identity & org
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!payload?.vehicle_category || !VALID.has(payload.vehicle_category)) {
    return json({ error: "vehicle_category must be one of bike|van|truck_15t|truck_20t|trailer" }, 400);
  }
  if (!payload?.title || typeof payload.title !== "string" || payload.title.length > 200) {
    return json({ error: "title required (<=200 chars)" }, 400);
  }
  if (payload.body && payload.body.length > 2000) {
    return json({ error: "body too long (<=2000 chars)" }, 400);
  }
  const expiresIn = Math.min(Math.max(payload.expires_in_minutes ?? 30, 1), 24 * 60);

  // Service-role client for writes (after authorization is enforced manually below)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Resolve caller's organization_id (active membership)
  const { data: membership, error: memErr } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (memErr) return json({ error: memErr.message }, 500);
  if (!membership?.organization_id) {
    return json({ error: "No active organization membership" }, 403);
  }
  const organizationId = membership.organization_id;

  // 2. Authorization: only org admin / ops_manager / dispatcher / support / super_admin may dispatch
  const allowedRoles = new Set([
    "admin", "super_admin", "ops_manager", "dispatcher", "support", "owner",
  ]);
  const role = (membership.role || "").toLowerCase();
  if (!allowedRoles.has(role)) {
    // Also check global super_admin via has_role just in case
    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userId });
    if (!isSuper) {
      return json({ error: "Forbidden: insufficient role to dispatch jobs" }, 403);
    }
  }

  // 3. If a dispatch_id is provided, verify it belongs to this org
  if (payload.dispatch_id) {
    const { data: d, error: dErr } = await admin
      .from("dispatches")
      .select("id, organization_id")
      .eq("id", payload.dispatch_id)
      .maybeSingle();
    if (dErr) return json({ error: dErr.message }, 500);
    if (!d) return json({ error: "Dispatch not found" }, 404);
    if (d.organization_id !== organizationId) {
      return json({ error: "Dispatch belongs to a different organization" }, 403);
    }
  }

  // 4. Find matching drivers in this org
  const { data: drivers, error: drvErr } = await admin
    .from("drivers")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .eq("preferred_vehicle_category", payload.vehicle_category)
    .in("status", ["available", "active", "on_duty"]);

  if (drvErr) return json({ error: drvErr.message }, 500);
  if (!drivers || drivers.length === 0) {
    return json({
      ok: true,
      matched: 0,
      message: `No available drivers for category ${payload.vehicle_category}`,
    }, 200);
  }

  const expiresAt = new Date(Date.now() + expiresIn * 60_000).toISOString();
  const rows = drivers.map((d) => ({
    organization_id: organizationId,
    driver_id: d.id,
    dispatch_id: payload.dispatch_id ?? null,
    vehicle_category: payload.vehicle_category,
    title: payload.title,
    body: payload.body ?? null,
    status: "sent",
    expires_at: expiresAt,
  }));

  const { data: inserted, error: insErr } = await admin
    .from("driver_job_notifications")
    .insert(rows)
    .select("id, driver_id");

  if (insErr) return json({ error: insErr.message }, 500);

  return json({
    ok: true,
    matched: drivers.length,
    inserted: inserted?.length ?? 0,
    expires_at: expiresAt,
    notification_ids: inserted?.map((n) => n.id) ?? [],
  }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
