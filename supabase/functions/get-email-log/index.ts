// Returns email_send_log entries for authenticated admin/ops users.
// email_send_log has no organization_id so it can't be read directly
// by the browser via RLS. This function uses service role to read it.
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

  // Role gate — only privileged roles can see the email log
  const { data: roleRows } = await authedClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const allowed = new Set([
    "super_admin", "admin", "org_admin", "ops_manager", "support", "finance_manager",
  ]);
  const hasRole = (roleRows ?? []).some((r: any) => allowed.has(r.role));
  if (!hasRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read with service role (bypasses RLS)
  const svc = createClient(supabaseUrl, serviceKey);
  const { data, error } = await svc
    .from("email_send_log")
    .select("id, template_name, recipient_email, status, error_message, created_at")
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
