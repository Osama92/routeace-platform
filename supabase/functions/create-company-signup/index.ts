// Create-company-signup - Atomically provisions a Super Admin owner + organization.
// Runs with the service role so RLS does not block the bootstrap step that happens
// BEFORE the new user's email is confirmed (no session = no auth.uid()).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface Body {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  subscription_tier?: string;
  business_type?: string;
  billing_model?: string;
  industry?: string;
  fleet_size?: string;
  country?: string;
  currency?: string;
  tenant_mode?: string;
  dept_plan?: string;
  dept_industry?: string;
  dept_erp_system?: string;
  dept_team_size?: number;
  dept_operating_regions?: string;
  dept_warehouse_count?: string;
}

const PLAN_CODE_MAP: Record<string, string> = {
  heavy_truck: "logistics_haulage",
  bikes_vans: "logistics_bikes",
  mixed: "logistics_mixed",
  starter: "logistics_starter",
  haulage: "logistics_haulage",
  dept_foundation: "logistics_dept_foundation",
  dept_growth: "logistics_dept_growth",
  dept_enterprise: "logistics_dept_enterprise",
  foundation: "logistics_dept_foundation",
  growth: "logistics_dept_growth",
  enterprise: "logistics_dept_enterprise",
};

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const fullName = (body.full_name || "").trim();
    const companyName = (body.company_name || "").trim();
    const isDepartment = body.tenant_mode === "LOGISTICS_DEPARTMENT";

    if (!email.includes("@") || !body.password || body.password.length < 6) {
      return json({ success: false, error: "Valid email and password (6+ chars) required" }, 400);
    }
    if (!fullName || !companyName) {
      return json({ success: false, error: "Full name and company name required" }, 400);
    }

    // Pre-check: email already registered?
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existingProfile) {
      return json({ success: false, error: "This email is already registered. Please sign in instead." }, 409);
    }

    // Pre-check: is this email under an active reseller agreement?
    const { data: resellerLock } = await admin
      .from("reseller_client_locks")
      .select("locked_until, reseller_org_id")
      .ilike("client_email", email)
      .gt("locked_until", new Date().toISOString())
      .order("locked_until", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resellerLock) {
      return json({
        success: false,
        error: "This email is under a reseller agreement. Please contact your RouteAce reseller to manage your account.",
        locked_until: resellerLock.locked_until,
      }, 403);
    }

    // 1. Create auth user. admin.createUser does NOT send a confirmation
    //    email by itself - we must explicitly trigger it below via resend().
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created.user) {
      const raw = createErr?.message ?? "";
      const friendly = /already|exists|registered|duplicate/i.test(raw)
        ? "This email is already registered. Please sign in instead."
        : "We couldn't create your account. Please try again.";
      return json({ success: false, error: friendly }, /already|exists|registered/i.test(raw) ? 409 : 400);
    }
    const userId = created.user.id;

    const rollbackUser = async () => {
      try { await admin.auth.admin.deleteUser(userId); } catch (_) { /* noop */ }
    };

    // 2. Create organization (service role bypasses RLS - needed because the user
    //    has no session yet until they click the verification link).
    const INTERNAL_ACCOUNTS = [
      "glyde systems services ltd",
      "relma haulage and logistics ltd",
    ];
    const isInternalAccount = INTERNAL_ACCOUNTS.includes(
      companyName.toLowerCase().trim()
    );

    const { data: orgData, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: companyName,
        owner_user_id: userId,
        subscription_tier: body.subscription_tier ?? "starter",
        subscription_status: isInternalAccount ? "active" : "trial",
        subscription_expires_at: isInternalAccount
          ? "2099-12-31T23:59:59.000Z"
          : new Date(Date.now() + (isDepartment ? 60 : 30) * 86_400_000).toISOString(),
        business_type: isDepartment ? null : body.business_type ?? null,
        industry: isDepartment ? body.dept_industry ?? body.industry ?? null : body.industry ?? null,
        fleet_size: isDepartment ? null : body.fleet_size ?? null,
        country: body.country ?? null,
        currency: body.currency ?? null,
        dept_plan: isDepartment ? body.dept_plan ?? null : null,
        dept_industry: isDepartment ? body.dept_industry ?? body.industry ?? null : null,
        dept_erp_system: isDepartment ? body.dept_erp_system ?? null : null,
        dept_team_size: isDepartment ? body.dept_team_size ?? null : null,
      } as any)
      .select("id")
      .single();
    if (orgError || !orgData) {
      await rollbackUser();
      return json({ success: false, error: orgError?.message ?? "Failed to create organization" }, 400);
    }

    // 3. Owner membership
    const { error: memberError } = await admin
      .from("organization_members")
      .insert({
        organization_id: orgData.id,
        user_id: userId,
        role: "super_admin",
        is_owner: true,
        is_active: true,
      });
    if (memberError) {
      await admin.from("organizations").delete().eq("id", orgData.id);
      await rollbackUser();
      return json({ success: false, error: memberError.message }, 400);
    }

    // 4. Super Admin role assignment
    await admin.from("user_roles").insert({ user_id: userId, role: "super_admin" });

    // 5. Auto-approve the founding Super Admin (they own the tenant - no one else can approve them).
    //    Use force_approve_user_profile RPC: bypasses protect_profile trigger safely.
    await admin.rpc("force_approve_user_profile", { p_user_id: userId });
    await admin.from("profiles").update({ approved_by: userId }).eq("user_id", userId);

    // 6. Tenant config
    if (body.tenant_mode) {
      await admin.from("tenant_config").upsert(
        {
          user_id: userId,
          organization_id: orgData.id,
          company_name: companyName,
          country: body.country ?? null,
          tenant_mode: body.tenant_mode,
          mode_locked_at: new Date().toISOString(),
          ...(isDepartment ? {
            // tenant_mode drives Department behavior. Keep operating_model within
            // the existing DB constraint so tenant_config is actually created.
            operating_model: "haulage",
            plan_tier: body.dept_plan ?? "foundation",
            dept_plan: body.dept_plan ?? "foundation",
            dept_industry: body.dept_industry ?? body.industry ?? null,
            dept_erp_system: body.dept_erp_system ?? null,
            dept_team_size: body.dept_team_size ?? null,
            dept_operating_regions: body.dept_operating_regions ?? null,
            dept_warehouse_count: body.dept_warehouse_count ?? null,
            enabled_modules: {
              dispatch: true,
              tracking: true,
              fleet: true,
              vendor_management: true,
              sla: true,
              sales_department_portal: true,
            },
          } : {}),
        } as any,
        { onConflict: "user_id" },
      );
    }

    // 7. Company settings
    await admin.from("company_settings").upsert({
      company_name: companyName,
      updated_by: userId,
    });

    // 7b. Billing account linked to the correct plan (best-effort)
    try {
      const planLookupKey = isDepartment
        ? body.billing_model || `dept_${body.dept_plan || "foundation"}`
        : body.billing_model || body.business_type || "starter";
      const planCode = PLAN_CODE_MAP[planLookupKey] ?? "logistics_starter";
      const { data: planRow } = await admin
        .from("billing_plans")
        .select("id")
        .eq("plan_code", planCode)
        .eq("is_active", true)
        .maybeSingle();

      if (planRow?.id) {
        await admin.from("billing_accounts").upsert(
          {
            tenant_id: orgData.id,
            plan_id: planRow.id,
            billing_currency: body.currency ?? "NGN",
            billing_email: email,
            status: "active",
            wallet_balance: 0,
            prepaid_mode: true,
          },
          { onConflict: "tenant_id" }
        );
      }
    } catch (billingErr) {
      console.warn("billing_account creation failed (non-fatal):", billingErr);
    }

    // 8. Audit
    await admin.from("audit_logs").insert({
      action: "company_created",
      table_name: "organizations",
      record_id: orgData.id,
      user_id: userId,
      user_email: email,
      new_data: {
        company_name: companyName,
        subscription_tier: body.subscription_tier ?? "starter",
        owner_email: email,
        tenant_mode: body.tenant_mode ?? "LOGISTICS_COMPANY",
        dept_plan: isDepartment ? body.dept_plan ?? "foundation" : null,
      },
    });

    // 9. POST-SIGNUP VERIFICATION - confirm role + org actually landed.
    //    If any check fails, roll the whole thing back so the user can retry
    //    cleanly instead of being stuck on a half-provisioned account.
    const [{ data: roleCheck }, { data: memberCheck }, { data: profileCheck }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      admin.from("organization_members").select("organization_id, role, is_owner").eq("user_id", userId).maybeSingle(),
      admin.from("profiles").select("approval_status").eq("user_id", userId).maybeSingle(),
    ]);

    const verification = {
      super_admin_role: roleCheck?.role === "super_admin",
      organization_created: memberCheck?.organization_id === orgData.id,
      is_owner: memberCheck?.is_owner === true,
      profile_approved: profileCheck?.approval_status === "approved",
    };
    const allPassed = Object.values(verification).every(Boolean);

    if (!allPassed) {
      // Rollback - provisioning is broken. Force a clean retry.
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("organization_members").delete().eq("user_id", userId);
      await admin.from("organizations").delete().eq("id", orgData.id);
      await rollbackUser();
      return json({
        success: false,
        error: "We couldn't finish setting up your workspace. Please try signing up again.",
        verification,
      }, 500);
    }

    // 10. Send the confirmation email via the auth email hook.
    //     admin.createUser() does NOT trigger this - we must explicitly resend.
    const originHeader = req.headers.get("origin") || req.headers.get("referer") || "";
    const siteUrl = originHeader ? new URL(originHeader).origin : "https://routeace.app";
    try {
      const { error: resendErr } = await admin.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${siteUrl}/auth` },
      });
      if (resendErr) console.warn("Confirmation email resend failed:", resendErr.message);
    } catch (e) {
      console.warn("Confirmation email resend threw:", e);
    }

    return json({
      success: true,
      user_id: userId,
      organization_id: orgData.id,
      email,
      verification,
      message: isDepartment
        ? "Department workspace created. A verification email has been sent - verify to sign in."
        : "Company created. A verification email has been sent - verify to sign in.",
    });
  } catch (err: any) {
    console.error("create-company-signup error", err);
    return json({ success: false, error: "Something went wrong on our end. Please try again in a moment." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
