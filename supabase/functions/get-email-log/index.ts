// Returns email_send_log entries scoped to the requested organization.
// email_send_log has no organization_id column, so we filter by recipient_email
// matching members/customers of the org. super_admin must also pass organization_id
// to avoid leaking cross-org data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { buildCors } from "../_shared/cors.ts";

let corsHeaders: Record<string, string> = buildCors();

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization") ?? "";
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await authedClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(supabaseUrl, serviceKey);

  // Parse requested organization_id from body
  let requestedOrgId: string | null = null;
  try {
    const body = await req.json();
    requestedOrgId = body?.organization_id ?? null;
  } catch (_) { /* no body or invalid JSON — treat as null */ }

  // Fetch caller's roles
  const rolesRes = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  const roles: string[] = (rolesRes.data ?? []).map((r: any) => r.role);
  const allowed = new Set([
    "super_admin", "admin", "org_admin", "ops_manager", "support", "finance_manager",
  ]);
  if (!roles.some((r) => allowed.has(r))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isSuperAdmin = roles.includes("super_admin");

  // Determine which org to scope to:
  // - Non-super_admin: always their own org (ignore requested org to prevent escalation)
  // - super_admin: use the requested org_id (must be provided to prevent platform-wide leakage)
  let organizationId: string | null;
  if (isSuperAdmin) {
    organizationId = requestedOrgId;
  } else {
    const membershipRes = await svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    organizationId = membershipRes.data?.organization_id ?? null;
  }

  // No org context — return empty rather than leaking data
  if (!organizationId) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Collect all email addresses associated with this org:
  // 1. org member profiles
  // 2. customers belonging to the org
  const [membersRes, customersRes] = await Promise.all([
    svc
      .from("organization_members")
      .select("profiles!inner(email)")
      .eq("organization_id", organizationId),
    svc
      .from("customers")
      .select("email")
      .eq("organization_id", organizationId)
      .not("email", "is", null),
  ]);

  const emailSet = new Set<string>();
  for (const m of membersRes.data ?? []) {
    const email = (m as any).profiles?.email;
    if (email) emailSet.add(email.toLowerCase());
  }
  for (const c of customersRes.data ?? []) {
    if (c.email) emailSet.add(c.email.toLowerCase());
  }

  if (emailSet.size === 0) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await svc
    .from("email_send_log")
    .select("id, template_name, recipient_email, status, error_message, created_at")
    .in("recipient_email", Array.from(emailSet))
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
