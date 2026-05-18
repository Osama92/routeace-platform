// Admin-create-user - Super Admin / Org Admin provisions a new user with role + org membership.
// Validates caller role server-side; never trusts client claims.
// Atomic: rolls back the auth user if role assignment or org membership fails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
// Must mirror the public.app_role enum in the database.
const VALID_ROLES = [
  "super_admin",
  "admin",
  "org_admin",
  "ops_manager",
  "operations",
  "finance_manager",
  "dispatcher",
  "driver",
  "support",
  "customer",
  "internal_team",
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  org_admin: "Organization Admin",
  ops_manager: "Operations Manager",
  operations: "Operations",
  finance_manager: "Finance Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  support: "Support",
  customer: "Customer",
  internal_team: "Internal Team",
};

interface CreateUserBody {
  email: string;
  password?: string;
  temporary_password?: string;
  full_name?: string;
  phone?: string;
  role: string;
  organization_id?: string;
  send_invite?: boolean;
  annual_leave_days?: number;
}

async function seedLeaveBalance(
  admin: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string | undefined,
  days: number | undefined,
) {
  if (!days || days <= 0) return;
  const year = new Date().getFullYear();
  try {
    await admin.from("leave_balances").upsert(
      {
        user_id: userId,
        organization_id: organizationId ?? null,
        year,
        leave_type: "annual",
        allocated_days: days,
      },
      { onConflict: "user_id,year,leave_type" },
    );
  } catch (e) {
    console.warn("[seedLeaveBalance] failed for", userId, e);
  }
}

async function sendWelcomeEmail(opts: {
  email: string;
  fullName: string;
  role: string;
  tempPassword?: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("[welcome-email] RESEND_API_KEY not set - skipping email to", opts.email);
    return;
  }
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://routeace-platform.lovable.app";
  const loginUrl = `${siteUrl}/auth`;
  const displayRole = ROLE_LABELS[opts.role] ?? opts.role;

  try {
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: "RouteAce <onboarding@resend.dev>",
      to: [opts.email],
      subject: `Welcome to RouteAce - Your ${displayRole} account is ready`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
          <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
            <div style="text-align:center;margin-bottom:24px">
              <h1 style="color:#0f172a;margin:0 0 8px 0;font-size:22px">Welcome to RouteAce</h1>
              <p style="color:#64748b;margin:0;font-size:14px">Your ${displayRole} account has been created</p>
            </div>
            <p style="color:#0f172a;font-size:14px">Hi ${opts.fullName},</p>
            <p style="color:#334155;font-size:14px;line-height:1.5">
              Your account on the RouteAce platform has been created. Here are your login details:
            </p>
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Email:</strong> ${opts.email}</p>
              ${opts.tempPassword
                ? `<p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>`
                : `<p style="margin:4px 0;color:#0f172a;font-size:14px">A separate email was sent for you to set your password.</p>`}
              <p style="margin:4px 0;color:#0f172a;font-size:14px"><strong>Role:</strong> ${displayRole}</p>
            </div>
            <div style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:6px;padding:12px 16px;margin:16px 0">
              <p style="margin:0;color:#92400e;font-size:13px">
                <strong>Pending approval:</strong> A Super Admin must approve your account before you can sign in. You'll receive a confirmation once you're approved.
              </p>
            </div>
            ${opts.tempPassword ? `<p style="color:#b91c1c;font-size:13px"><strong>Please change your password immediately after your first login.</strong></p>` : ""}
            <div style="text-align:center;margin:24px 0">
              <a href="${loginUrl}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">Sign In to RouteAce</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">
              If you were not expecting this email, please contact your organisation administrator.
            </p>
          </div>
        </div>
      `,
    });
    console.log("[welcome-email] sent to", opts.email, "result:", JSON.stringify(result));
    if ((result as any)?.error) {
      console.error("[welcome-email] Resend REJECTED for", opts.email, "-", (result as any).error);
    }
  } catch (emailErr) {
    console.error("[welcome-email] failed for", opts.email, "-", emailErr);
  }
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let createdUserId: string | null = null;
  let admin: ReturnType<typeof createClient> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Missing authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ success: false, error: "Invalid auth token" }, 401);
    }
    const callerId = userData.user.id;

    admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller role
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    const isPrivileged = roles.some((r: string) =>
      ["super_admin", "admin", "org_admin"].includes(r)
    );
    if (!isPrivileged) {
      return json({ success: false, error: "Insufficient privileges" }, 403);
    }

    const body = (await req.json()) as CreateUserBody;
    const email = (body.email || "").trim().toLowerCase();
    const role = body.role;
    const fullName = body.full_name?.trim() || email;

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "Valid email required" }, 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ success: false, error: `Invalid role '${role}'. Allowed: ${VALID_ROLES.join(", ")}` }, 400);
    }
    if (role === "super_admin" && !roles.includes("super_admin")) {
      return json({ success: false, error: "Only a super_admin can create another super_admin" }, 403);
    }

    // Resolve organization_id: use caller's org if not supplied
    let organizationId = body.organization_id;
    if (!organizationId) {
      const { data: callerOrg } = await admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", callerId)
        .eq("is_active", true)
        .maybeSingle();
      organizationId = callerOrg?.organization_id ?? undefined;
    }

    // Email lookup - O(1) via getUserByEmail (avoids slow listUsers scan).
    let existingAuthUser: { id: string; email?: string } | null = null;
    try {
      // @ts-ignore - getUserByEmail is in newer GoTrue admin API
      const { data: found } = await (admin.auth.admin as any).getUserByEmail(email);
      if (found?.user?.id) existingAuthUser = { id: found.user.id, email: found.user.email };
    } catch (_) {
      // getUserByEmail throws 404 when user doesn't exist - expected, not an error
    }

    if (!existingAuthUser) {
      // Fallback: profile row may already point to the auth user
      const { data: profileRow } = await admin
        .from("profiles")
        .select("user_id, email")
        .ilike("email", email)
        .maybeSingle();
      if (profileRow?.user_id) {
        existingAuthUser = { id: profileRow.user_id, email: profileRow.email };
      }
    }

    // ADOPT mode: if the auth user already exists, attach role + org membership to them
    // instead of failing.
    if (existingAuthUser) {
      const existingId = existingAuthUser.id;

      // Optional org membership (only if a target org is in scope)
      if (organizationId) {
        const { data: existingMember } = await admin
          .from("organization_members")
          .select("id, is_active")
          .eq("user_id", existingId)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (!existingMember) {
          const { error: memberErr } = await admin.from("organization_members").insert({
            user_id: existingId,
            organization_id: organizationId,
            role,
            is_active: true,
            is_owner: false,
            invited_by: callerId,
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          });
          if (memberErr) {
            return json({ success: false, error: `Organization assignment failed: ${memberErr.message}` }, 400);
          }
        } else if (!existingMember.is_active) {
          await admin.from("organization_members")
            .update({ is_active: true, role, joined_at: new Date().toISOString() })
            .eq("id", existingMember.id);
        }
      }

      // Ensure role is assigned (idempotent)
      const { data: hasRole } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", existingId)
        .eq("role", role)
        .maybeSingle();
      if (!hasRole) {
        const { error: roleErr } = await admin
          .from("user_roles")
          .insert({ user_id: existingId, role });
        if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
          return json({ success: false, error: `Role assignment failed: ${roleErr.message}` }, 400);
        }
      }

      // Upsert profile in PENDING state - Super Admin must approve before login
      await admin
        .from("profiles")
        .upsert(
          {
            user_id: existingId,
            email,
            full_name: fullName,
            phone: body.phone ?? null,
            approval_status: "pending",
            is_active: false,
          },
          { onConflict: "user_id" }
        );

      await admin.from("audit_logs").insert({
        action: "user_adopted",
        table_name: "auth.users",
        record_id: existingId,
        user_id: callerId,
        user_email: userData.user.email,
        new_data: { email, role, organization_id: organizationId },
      });

      // Adopted users keep their existing password - only notify them
      await seedLeaveBalance(admin, existingId, organizationId, body.annual_leave_days);
      await sendWelcomeEmail({ email, fullName, role });

      return json({
        success: true,
        adopted: true,
        user_id: existingId,
        email,
        role,
        organization_id: organizationId,
        message: "Existing user was attached to this organization with the requested role.",
      });
    }

    // 1) Create auth user
    const password = body.password ?? body.temporary_password ?? (crypto.randomUUID() + "!Aa1");
    const generatedPassword = !body.password && !body.temporary_password;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: body.phone },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "User creation failed";
      // Auth says the email exists but our lookup missed it - recover by re-listing
      // and adopting that user instead of returning 409.
      if (msg.toLowerCase().includes("already")) {
        try {
          // @ts-ignore
          const { data: foundAgain } = await (admin.auth.admin as any).getUserByEmail(email).catch(() => ({ data: null }));
          const match = foundAgain?.user;
          if (match?.id) {
            const existingId = match.id;
            if (organizationId) {
              const { data: existingMember } = await admin
                .from("organization_members")
                .select("id, is_active")
                .eq("user_id", existingId)
                .eq("organization_id", organizationId)
                .maybeSingle();
              if (!existingMember) {
                await admin.from("organization_members").insert({
                  user_id: existingId, organization_id: organizationId, role,
                  is_active: true, is_owner: false, invited_by: callerId,
                  invited_at: new Date().toISOString(), joined_at: new Date().toISOString(),
                });
              } else if (!existingMember.is_active) {
                await admin.from("organization_members")
                  .update({ is_active: true, role, joined_at: new Date().toISOString() })
                  .eq("id", existingMember.id);
              }
            }
            const { data: hasRole } = await admin.from("user_roles")
              .select("id").eq("user_id", existingId).eq("role", role).maybeSingle();
            if (!hasRole) {
              await admin.from("user_roles").insert({ user_id: existingId, role });
            }
            await admin.from("profiles").upsert({
              user_id: existingId, email, full_name: fullName,
              phone: body.phone ?? null, approval_status: "pending",
              is_active: false,
            }, { onConflict: "user_id" });
            await seedLeaveBalance(admin, existingId, organizationId, body.annual_leave_days);
            await sendWelcomeEmail({ email, fullName, role });
            return json({
              success: true, adopted: true, user_id: existingId, email, role,
              organization_id: organizationId,
              message: "Existing user was attached to this organization with the requested role.",
            });
          }
        } catch (recoverErr) {
          console.error("adopt-on-duplicate failed", recoverErr);
        }
      }
      const status = msg.toLowerCase().includes("already") ? 409 : 400;
      return json({ success: false, error: msg }, status);
    }
    createdUserId = created.user.id;

    // 2) Assign role (rollback auth user on failure)
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: createdUserId, role });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
      await admin.auth.admin.deleteUser(createdUserId);
      return json({ success: false, error: `Role assignment failed: ${roleErr.message}` }, 400);
    }

    // 3) Org membership (role column is NOT NULL - must include it)
    if (organizationId) {
      const { error: memberErr } = await admin.from("organization_members").insert({
        user_id: createdUserId,
        organization_id: organizationId,
        role,
        is_active: true,
        is_owner: false,
        invited_by: callerId,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      });
      if (memberErr) {
        await admin.from("user_roles").delete().eq("user_id", createdUserId).eq("role", role);
        await admin.auth.admin.deleteUser(createdUserId);
        return json({ success: false, error: `Organization assignment failed: ${memberErr.message}` }, 400);
      }
    }

    // 4) Upsert profile in PENDING state - Super Admin approves before login
    await admin
      .from("profiles")
      .upsert(
        {
          user_id: createdUserId,
          email,
          full_name: fullName,
          phone: body.phone ?? null,
          approval_status: "pending",
          is_active: false,
        },
        { onConflict: "user_id" }
      );

    // 5) Audit log (best-effort)
    await admin.from("audit_logs").insert({
      action: "user_created",
      table_name: "auth.users",
      record_id: createdUserId,
      user_id: callerId,
      user_email: userData.user.email,
      new_data: { email, role, organization_id: organizationId },
    });

    // 6) Seed annual leave balance (non-fatal)
    await seedLeaveBalance(admin, createdUserId, organizationId, body.annual_leave_days);

    // 7) Welcome email with login credentials (non-fatal)
    await sendWelcomeEmail({
      email,
      fullName,
      role,
      tempPassword: generatedPassword ? password : (body.temporary_password || body.password),
    });

    return json({
      success: true,
      user_id: createdUserId,
      email,
      role,
      organization_id: organizationId,
      temp_password: generatedPassword ? password : undefined,
    });
  } catch (err: any) {
    console.error("admin-create-user error", err);
    if (createdUserId && admin) {
      try { await admin.auth.admin.deleteUser(createdUserId); } catch (_) { /* ignore */ }
    }
    return json({ success: false, error: String(err?.message ?? err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
