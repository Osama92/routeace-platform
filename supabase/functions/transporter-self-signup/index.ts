import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ALLOWED_ORIGIN_SUFFIXES = [
  ".lovable.app",
  ".lovableproject.com",
  ".lovable.dev",
];
const ALLOWED_ORIGINS_EXACT = new Set([
  "https://routeaceglyde.app",
  "https://www.routeaceglyde.app",
  "https://routeace-platform.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function pickOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS_EXACT.has(origin)) return origin;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_ORIGIN_SUFFIXES.some((s) => host.endsWith(s))) return origin;
  } catch (_) { /* ignore */ }
  return "https://routeaceglyde.app";
}

function buildCors(req: Request) {
  return {
    "Access-Control-Allow-Origin": pickOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (req: Request, d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...buildCors(req), "Content-Type": "application/json" } });

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

async function sendSMS(phone: string, message: string): Promise<void> {
  const apiKey = Deno.env.get("TERMII_API_KEY");
  if (!apiKey) return;
  try {
    await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: Deno.env.get("TERMII_SENDER_ID") ?? "RouteAce",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });
  } catch (_) { /* best effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: buildCors(req) });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SITE_URL = "https://routeaceglyde.app";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, any>;
  try { body = await req.json(); }
  catch { return json(req, { error: "Invalid request body" }, 400); }

  // 1. Validation-only mode (used by public join page to verify token + get org name)
  if (body.validate_only === true) {
    const tk = String(body.token ?? "");
    const requestedLinkType =
      body.link_type === "new" ? "new" :
      body.link_type === "access" ? "access" :
      body.link_type === "vendor" ? "vendor" : null;
    if (!tk) return json(req, { valid: false, reason: "missing_token" }, 200);
    const { data: tokenRec, error: tokErr } = await admin
      .from("transporter_invite_tokens")
      .select("organization_id, link_type, is_active, expires_at, max_uses, uses_count")
      .eq("token", tk)
      .maybeSingle();
    if (tokErr) return json(req, { valid: false, reason: "db_error", detail: tokErr.message }, 200);
    if (!tokenRec) return json(req, { valid: false, reason: "token_not_found" }, 200);
    if (!tokenRec.is_active) return json(req, { valid: false, reason: "deactivated" }, 200);
    if (requestedLinkType && tokenRec.link_type && tokenRec.link_type !== requestedLinkType)
      return json(req, { valid: false, reason: "link_type_mismatch", expected: tokenRec.link_type, requested: requestedLinkType }, 200);
    if (tokenRec.expires_at && new Date(tokenRec.expires_at) < new Date())
      return json(req, { valid: false, reason: "expired", expires_at: tokenRec.expires_at }, 200);
    if (tokenRec.max_uses && tokenRec.uses_count >= tokenRec.max_uses)
      return json(req, { valid: false, reason: "max_uses_reached" }, 200);
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("name, tenant_mode")
      .eq("id", tokenRec.organization_id)
      .maybeSingle();
    if (orgErr) return json(req, { valid: false, reason: "org_lookup_failed", detail: orgErr.message }, 200);
    if (!org) return json(req, { valid: false, reason: "org_not_found" }, 200);
    if (org.tenant_mode !== "LOGISTICS_DEPARTMENT" && org.tenant_mode !== "LOGISTICS_COMPANY")
      return json(req, { valid: false, reason: "tenant_mode_mismatch", tenant_mode: org.tenant_mode }, 200);
    return json(req, { valid: true, org_name: org.name, org_id: tokenRec.organization_id, link_type: tokenRec.link_type ?? "access" }, 200);
  }

  const {
    token, company_name, contact_name, phone, email,
    vehicle_count, vehicle_types, coverage_areas, cac_number,
    cac_document_url, insurance_document_url, mou_document_url,
    letter_of_intent_url, rates_proposal_url, truck_photos_urls,
    link_type,
  } = body;

  if (!token || !company_name || !contact_name || !phone) {
    return json(req, { error: "token, company_name, contact_name, and phone are required" }, 400);
  }

  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length < 10) return json(req, { error: "Invalid phone number" }, 400);

  const { data: tokenRecord } = await admin
    .from("transporter_invite_tokens")
    .select("id, organization_id, link_type, is_active, max_uses, uses_count, expires_at")
    .eq("token", String(token))
    .maybeSingle();
  if (!tokenRecord) return json(req, { error: "Invalid or expired invite link" }, 404);
  if (!tokenRecord.is_active) return json(req, { error: "This invite link has been deactivated" }, 403);
  const requestedLinkType =
    link_type === "new" ? "new" :
    link_type === "access" ? "access" :
    link_type === "vendor" ? "vendor" : null;
  if (requestedLinkType && tokenRecord.link_type && tokenRecord.link_type !== requestedLinkType) {
    const friendly =
      tokenRecord.link_type === "new" ? "New Transporter Onboarding" :
      tokenRecord.link_type === "vendor" ? "Vendors & Partners" : "Existing Transporter Portal Access";
    return json(req, { error: `This is a ${friendly} link. Please use the correct RouteAce link shared with you.` }, 403);
  }
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return json(req, { error: "This invite link has expired" }, 403);
  }
  if (tokenRecord.max_uses && tokenRecord.uses_count >= tokenRecord.max_uses) {
    return json(req, { error: "This invite link has reached its maximum uses" }, 403);
  }

  const orgId = tokenRecord.organization_id;
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, tenant_mode")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return json(req, { error: "Organisation not found" }, 404);
  if ((org as any).tenant_mode !== "LOGISTICS_DEPARTMENT" && (org as any).tenant_mode !== "LOGISTICS_COMPANY") {
    return json(req, { error: "This invite link is not valid for transporter registration" }, 403);
  }

  const emailToUse = email?.trim().toLowerCase() || `transporter_${cleanPhone}@routeace.internal`;
  const { data: existing } = await admin.auth.admin.listUsers();
  if ((existing?.users ?? []).some((u: any) => u.email?.toLowerCase() === emailToUse)) {
    return json(req, { error: "An account with this email already exists. Please log in." }, 409);
  }

  const tempPassword = generatePassword();
  let userId: string;
  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailToUse,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: contact_name, company_name, phone: cleanPhone, transporter_signup: true },
    });
    if (createErr || !created?.user?.id) throw new Error(createErr?.message ?? "User creation failed");
    userId = created.user.id;
  } catch (e: any) {
    return json(req, { error: e.message ?? "Failed to create account" }, 500);
  }

  try {
    await admin.from("profiles").upsert({
      id: userId,
      full_name: contact_name,
      updated_at: new Date().toISOString(),
    });
    await admin.from("organization_members").insert({
      user_id: userId,
      organization_id: orgId,
      role: "transporter",
      is_active: true,
      joined_at: new Date().toISOString(),
    });
    await admin.from("ld_transporters").insert({
      organization_id: orgId,
      user_id: userId,
      company_name: String(company_name),
      contact_name: String(contact_name),
      phone: cleanPhone,
      email: emailToUse,
      contact_email: emailToUse,
      vehicle_count: parseInt(vehicle_count as string) || 1,
      vehicle_types: Array.isArray(vehicle_types) ? vehicle_types : [],
      coverage_areas: coverage_areas ?? null,
      cac_number: cac_number ?? null,
      cac_document_url: cac_document_url ?? null,
      insurance_document_url: insurance_document_url ?? null,
      mou_document_url: mou_document_url ?? null,
      letter_of_intent_url: letter_of_intent_url ?? null,
      rates_proposal_url: rates_proposal_url ?? null,
      truck_photos_urls: Array.isArray(truck_photos_urls) ? truck_photos_urls : [],
      onboarding_status: "pending_approval",
      self_registered: true,
    });
    await admin.from("transporter_invite_tokens")
      .update({ uses_count: (tokenRecord.uses_count ?? 0) + 1 })
      .eq("id", tokenRecord.id);

    // Brief SMS notification - credentials are delivered via email
    await sendSMS(`+${cleanPhone}`,
      `RouteAce: Your transporter account for ${String(company_name)} has been created. ` +
      `Login credentials have been sent to your email: ${emailToUse}. ` +
      `Await approval before you can receive jobs.`
    );

    // Email delivery (best effort) - only if a real email was provided
    if (email && !emailToUse.includes("@routeace.internal")) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            to: emailToUse,
            subject: "Your RouteAce Transporter Account",
            html: `
              <h2>Welcome to RouteAce</h2>
              <p>Your transporter account has been created for <strong>${company_name}</strong>.</p>
              <p><strong>Login Email:</strong> ${emailToUse}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Login at:</strong> <a href="${SITE_URL}/login">${SITE_URL}/login</a></p>
              <p style="color:#e06820;"><strong>Important:</strong> Change your password after first login.</p>
              <p>Your account is pending approval from the logistics department.
              You will receive another notification once approved.</p>
              <hr/>
              <p style="font-size:12px;color:#666;">This email was sent by RouteAce (Glyde Systems).
              If you did not register as a transporter, please ignore this email.</p>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Email delivery failed (non-fatal):", emailErr);
      }
    }

    return json(req, {
      success: true,
      email: emailToUse,
      message: "Account created. Login credentials sent to your phone. Await approval to receive jobs.",
    });
  } catch (e: any) {
    try { await admin.auth.admin.deleteUser(userId!); } catch (_) { /* cleanup */ }
    return json(req, { error: e.message ?? "Setup failed. Please try again." }, 500);
  }
});
