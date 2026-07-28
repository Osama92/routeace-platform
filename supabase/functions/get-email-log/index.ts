// Returns email_send_log entries scoped to the caller's organization.
// email_send_log has no organization_id, so we filter by recipient_email
// matching members/customers of the caller's org.
// super_admin sees all entries across all organizations.
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

  // Fetch caller's roles and org membership
  const [rolesRes, membershipRes] = await Promise.all([
    svc.from("user_roles").select("role").eq("user_id", userData.user.id),
    svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const roles: string[] = (rolesRes.data ?? []).map((r: any) => r.role);
  const allowed = new Set([
    "super_admin", "admin", "org_admin", "ops_manager", "support", "finance_manager",
  ]);
  const hasRole = roles.some((r) => allowed.has(r));
  if (!hasRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isSuperAdmin = roles.includes("super_admin");
  const organizationId = membershipRes.data?.organization_id ?? null;

  let query = svc
    .from("email_send_log")
    .select("id, template_name, recipient_email, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  // Non-super_admin: restrict to recipient emails known to this org
  if (!isSuperAdmin) {
    if (!organizationId) {
      // No org membership — return empty rather than leaking data
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

    query = query.in("recipient_email", Array.from(emailSet));
  }

  const { data, error } = await query;

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
