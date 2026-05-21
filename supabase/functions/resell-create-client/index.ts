// Resell-create-client - Super Admin / Reseller provisions a downstream tenant org + owner user.
// Enforces 6-month reseller lock and super_admin / admin role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface CreateResellClientBody {
  // Flat shape
  organization_name?: string;
  admin_email?: string;
  admin_full_name?: string;
  subscription_tier?: string;
  country?: string;
  operating_model?: "haulage" | "multidrop" | "hybrid";
  max_reseller_licenses?: number;
  // Nested shape (used by ProvisionResellerClientDialog)
  organization?: {
    name?: string;
    subscription_tier?: string;
    max_reseller_licenses?: number;
    country?: string;
  };
  owner?: {
    email?: string;
    full_name?: string;
    phone?: string;
  };
}

async function sendResellerWelcomeEmail(opts: {
  email: string;
  fullName: string;
  orgName: string;
  tempPassword: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return;
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://routeace.app";
  const loginUrl = `${siteUrl}/auth`;
  try {
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "RouteAce <onboarding@resend.dev>",
      to: [opts.email],
      subject: `Your RouteAce organisation "${opts.orgName}" is ready`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
          <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
            <h1 style="color:#0f172a;margin:0 0 8px 0;font-size:22px">Welcome to RouteAce</h1>
            <p style="color:#334155;font-size:14px;line-height:1.5">
              Hi ${opts.fullName}, your organisation <strong>${opts.orgName}</strong> has been created on the RouteAce platform.
            </p>
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Login email:</strong> ${opts.email}</p>
              <p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Temporary password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>
              <p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Role:</strong> Organisation Admin</p>
            </div>
            <p style="color:#b91c1c;font-size:13px"><strong>Please change your password immediately after first login.</strong></p>
            <div style="text-align:center;margin:24px 0">
              <a href="${loginUrl}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">Sign In Now</a>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.warn("Reseller welcome email failed (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ success: false, error: "Invalid token" }, 401);
    }
    const callerId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Caller must be super_admin or admin
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.some((r: string) => ["super_admin", "admin"].includes(r))) {
      return json({ success: false, error: "Only super_admin or admin can resell" }, 403);
    }

    // Reseller-lock: caller's parent org must be > 6 months old
    const { data: callerMembership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();

    if (callerMembership?.organization_id) {
      const { data: parentOrg } = await admin
        .from("organizations")
        .select("reseller_lock_until, created_at")
        .eq("id", callerMembership.organization_id)
        .single();

      if (parentOrg) {
        const lockDate = parentOrg.reseller_lock_until
          ? new Date(parentOrg.reseller_lock_until)
          : (() => {
              const d = new Date(parentOrg.created_at);
              d.setMonth(d.getMonth() + 6);
              return d;
            })();
        if (new Date() < lockDate && !roles.includes("super_admin")) {
          return json(
            {
              success: false,
              error: "Reseller features locked until 6 months after org creation",
              lock_expires_at: lockDate.toISOString(),
            },
            403
          );
        }
      }
    }

    const body = (await req.json()) as CreateResellClientBody & { reseller_price?: number };
    // Accept both nested ({organization,owner}) and flat shapes
    const orgName = (body.organization?.name ?? body.organization_name ?? "").trim();
    const adminEmail = (body.owner?.email ?? body.admin_email ?? "").trim().toLowerCase();
    const adminFullName = (body.owner?.full_name ?? body.admin_full_name ?? adminEmail).trim();
    const subscriptionTier = body.organization?.subscription_tier ?? body.subscription_tier ?? "starter";
    const maxLicenses = body.organization?.max_reseller_licenses ?? body.max_reseller_licenses ?? 0;
    const country = body.organization?.country ?? body.country ?? null;
    const resellerPrice = typeof body.reseller_price === "number" ? body.reseller_price : null;

    if (!orgName || !adminEmail.includes("@")) {
      return json({ success: false, error: "organization name and owner email required" }, 400);
    }

    // Server-side price floor enforcement
    if (resellerPrice !== null) {
      const { data: floor } = await admin
        .from("reseller_price_floors")
        .select("floor_price_ngn")
        .eq("tier", subscriptionTier)
        .maybeSingle();
      const floorNgn = Number(floor?.floor_price_ngn ?? 0);
      if (resellerPrice < floorNgn) {
        return json({
          success: false,
          error: `Reseller price (₦${resellerPrice}) is below RouteAce floor (₦${floorNgn}) for the ${subscriptionTier} tier.`,
          floor_price_ngn: floorNgn,
        }, 400);
      }
    }

    // 1. Create downstream organization (with reseller_org_id linking back to caller's org)
    const { data: newOrg, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: orgName,
        subscription_tier: subscriptionTier as any,
        country: country,
        max_reseller_licenses: maxLicenses,
        reseller_org_id: callerMembership?.organization_id ?? null,
        reseller_price: resellerPrice,
        owner_user_id: callerId, // placeholder; will be updated to owner once created
      } as any)
      .select()
      .single();

    if (orgErr || !newOrg) {
      return json({ success: false, error: orgErr?.message ?? "Org creation failed" }, 400);
    }

    // 2. Create owner auth user
    const tempPassword = crypto.randomUUID() + "!Aa1";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: adminFullName },
    });

    if (createErr || !created.user) {
      await admin.from("organizations").delete().eq("id", newOrg.id);
      return json({ success: false, error: createErr?.message ?? "User creation failed" }, 400);
    }
    const newUserId = created.user.id;

    // 3. Update org owner to the actual new user
    await admin.from("organizations").update({ owner_user_id: newUserId }).eq("id", newOrg.id);

    // 4. Assign org_admin role
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "org_admin" });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from("organizations").delete().eq("id", newOrg.id);
      return json({ success: false, error: `Role assignment failed: ${roleErr.message}` }, 400);
    }

    // 5. Org membership (role NOT NULL - must include)
    const { error: memberErr } = await admin.from("organization_members").insert({
      user_id: newUserId,
      organization_id: newOrg.id,
      role: "org_admin",
      is_active: true,
      is_owner: true,
      invited_by: callerId,
      joined_at: new Date().toISOString(),
    });
    if (memberErr) {
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from("organizations").delete().eq("id", newOrg.id);
      return json({ success: false, error: `Membership assignment failed: ${memberErr.message}` }, 400);
    }

    // 6. Approve owner profile so they can sign in immediately
    await admin
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          email: adminEmail,
          full_name: adminFullName,
          phone: body.owner?.phone ?? null,
          approval_status: "approved",
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: callerId,
        },
        { onConflict: "user_id" }
      );

    // 7. Audit
    await admin.from("audit_logs").insert({
      action: "resell_client_created",
      table_name: "organizations",
      record_id: newOrg.id,
      user_id: callerId,
      user_email: userData.user.email,
      new_data: {
        organization_id: newOrg.id,
        organization_name: orgName,
        owner_email: adminEmail,
        owner_user_id: newUserId,
        reseller_org_id: callerMembership?.organization_id ?? null,
      },
    });

    // 8a. Reseller client lock - block direct signup of this email for 6 months
    try {
      const lockUntil = new Date();
      lockUntil.setMonth(lockUntil.getMonth() + 6);
      await admin.from("reseller_client_locks").insert({
        client_email: adminEmail,
        client_org_id: newOrg.id,
        reseller_org_id: callerMembership?.organization_id ?? null,
        locked_until: lockUntil.toISOString(),
      });
    } catch (e) {
      console.warn("reseller_client_locks insert failed (non-fatal):", e);
    }

    // 8. Welcome email (non-fatal)
    await sendResellerWelcomeEmail({
      email: adminEmail,
      fullName: adminFullName,
      orgName,
      tempPassword,
    });

    return json({
      success: true,
      organization_id: newOrg.id,
      organization_name: orgName,
      owner: {
        user_id: newUserId,
        email: adminEmail,
        temp_password: tempPassword,
      },
    });
  } catch (err: any) {
    console.error("resell-create-client error", err);
    return json({ success: false, error: String(err?.message ?? err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
