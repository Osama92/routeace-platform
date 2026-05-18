import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, password, full_name } = await req.json();
    if (!token || !password) {
      return json({ error: "token and password are required" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Load token
    const { data: invite, error: inviteErr } = await admin
      .from("customer_invite_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr) throw inviteErr;
    if (!invite) return json({ error: "Invalid or expired invite link" }, 404);
    if (invite.used_at) return json({ error: "This invite has already been used" }, 410);
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return json({ error: "This invite has expired" }, 410);
    }

    // 2. Find or create auth user
    const email = invite.email.toLowerCase().trim();
    let userId: string | null = null;

    const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = existingList?.users?.find((u: any) => (u.email || "").toLowerCase() === email);

    if (existing) {
      userId = existing.id;

      // Never convert an internal/staff account into a customer account.
      // Customer portal access must be isolated from admin/org sessions.
      const [{ data: existingRoles, error: rolesErr }, { data: existingMemberships, error: membershipsErr }, { data: existingCustomerLinks, error: customerLinksErr }] = await Promise.all([
        admin.from("user_roles").select("role").eq("user_id", existing.id),
        admin.from("organization_members").select("id").eq("user_id", existing.id).eq("is_active", true).limit(1),
        admin.from("customer_users").select("customer_id").eq("user_id", existing.id),
      ]);
      if (rolesErr) throw rolesErr;
      if (membershipsErr) throw membershipsErr;
      if (customerLinksErr) throw customerLinksErr;

      const roles = (existingRoles || []).map((r: any) => r.role);
      const hasInternalAccess = roles.some((role: string) => role !== "customer") || (existingMemberships || []).length > 0;
      if (hasInternalAccess) {
        return json({ error: "This email is already tied to an internal RouteAce workspace. Use a separate customer email for portal access." }, 409);
      }

      const linkedToDifferentCustomer = (existingCustomerLinks || []).some((link: any) => link.customer_id !== invite.customer_id);
      if (linkedToDifferentCustomer) {
        return json({ error: "This customer email is already linked to a different portal account." }, 409);
      }

      // Existing customer-only account: reset password so they can log in.
      await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || invite.full_name || "" },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // 3. Ensure customer record exists (fall back if invite was created without a customer_id)
    let customerId = invite.customer_id as string | null;
    if (!customerId) {
      const { data: c, error: cErr } = await admin
        .from("customers")
        .insert({
          organization_id: invite.organization_id,
          company_name: full_name || invite.full_name || email,
          contact_name: full_name || invite.full_name || email,
          email,
          phone: "",
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      customerId = c.id;
    }

    // 4. Link customer_users (idempotent)
    const { data: existingLink } = await admin
      .from("customer_users")
      .select("id")
      .eq("user_id", userId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkErr } = await admin.from("customer_users").insert({
        user_id: userId,
        customer_id: customerId,
        is_primary_contact: true,
        can_view_invoices: true,
        can_download_documents: true,
      });
      if (linkErr) throw linkErr;
    }

    // 5. Assign customer role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id,role" });

    // 5b. Customer portal accounts are invite-approved; they should not wait
    // in the internal staff approval queue.
    await admin
      .from("profiles")
      .upsert({
        user_id: userId,
        email,
        full_name: full_name || invite.full_name || email,
        approval_status: "approved",
        is_active: true,
        approved_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    // 6. Mark invite consumed
    await admin
      .from("customer_invite_tokens")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", invite.id);

    return json({ ok: true, email });
  } catch (err: any) {
    console.error("customer-invite-accept error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
