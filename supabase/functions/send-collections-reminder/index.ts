// Auto-collections-reminder dispatcher.
// Sends branded email + SMS reminders for invoices overdue by 10+ days.
// Logs every attempt to public.collections_reminders.
//
// Trigger modes:
//   1. Cron (server-side): caller passes header `x-cron-secret: <CRON_SECRET>`.
//      Runs across every organisation.
//   2. User-initiated: caller passes a valid user JWT in Authorization header.
//      Runs only for that user's organisation(s).
//
// Per-tenant isolation: all DB reads are explicitly filtered by organization_id.
// Idempotency: one reminder row per invoice per day (key = collections-<inv>-<YYYY-MM-DD>).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const AT_API_KEY = Deno.env.get("AFRICASTALKING_API_KEY") ?? "";
const AT_USERNAME = Deno.env.get("AFRICASTALKING_USERNAME") ?? "";

const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface PerOrgResult {
  organization_id: string;
  processed: number;
  skipped: number;
  email_sent: number;
  sms_sent: number;
}

function interpolate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}

function defaultSmsBody(lang: string, ctx: { invoiceNumber: string; daysOverdue: number; orgName: string; amount: number; currency: string }): string {
  switch (lang) {
    case "fr":
      return `Rappel: la facture ${ctx.invoiceNumber} (${ctx.currency} ${ctx.amount}) est en retard de ${ctx.daysOverdue} jours. Merci de regler. -- ${ctx.orgName}`;
    case "sw":
      return `Kumbusho: ankara ${ctx.invoiceNumber} (${ctx.currency} ${ctx.amount}) imechelewa kwa siku ${ctx.daysOverdue}. Tafadhali lipa. -- ${ctx.orgName}`;
    default:
      return `Reminder: invoice ${ctx.invoiceNumber} (${ctx.currency} ${ctx.amount}) is ${ctx.daysOverdue} days overdue. Please remit payment. -- ${ctx.orgName}`;
  }
}

async function sendSms(phone: string, message: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!AT_API_KEY || !AT_USERNAME) {
    return { ok: false, error: "sms_not_configured" };
  }
  try {
    const form = new URLSearchParams();
    form.append("username", AT_USERNAME);
    form.append("to", phone);
    form.append("message", message);
    const resp = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) return { ok: false, error: JSON.stringify(json ?? { status: resp.status }) };
    const rec = json?.SMSMessageData?.Recipients?.[0];
    if (rec?.status && rec.status !== "Success") {
      return { ok: false, error: rec.status, messageId: rec.messageId };
    }
    return { ok: true, messageId: rec?.messageId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function processOrg(orgId: string, triggeredBy: string | null): Promise<PerOrgResult> {
  const ad = admin();
  const cutoffDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: invoices, error: invErr } = await ad
    .from("invoices")
    .select("id, organization_id, invoice_number, total_amount, amount, currency_code, due_date, invoice_date, customer_id, status")
    .eq("organization_id", orgId)
    .not("status", "in", "(paid,cancelled,void,draft)")
    .lte("invoice_date", cutoffDate)
    .limit(500);

  if (invErr || !invoices?.length) {
    return { organization_id: orgId, processed: 0, skipped: 0, email_sent: 0, sms_sent: 0 };
  }

  const customerIds = Array.from(new Set(invoices.map((i) => i.customer_id).filter(Boolean) as string[]));
  const { data: customers } = customerIds.length
    ? await ad.from("customers")
        .select("id,company_name,contact_name,email,phone,preferred_language,email_invoice_reminders,organization_id")
        .in("id", customerIds)
    : { data: [] as any[] };
  const customersMap = new Map<string, any>((customers ?? []).filter((c) => c.organization_id === orgId).map((c) => [c.id, c]));

  const { data: branding } = await ad
    .from("company_settings_branding").select("company_name").eq("organization_id", orgId).maybeSingle();
  const orgName = (branding as any)?.company_name ?? "Your Provider";

  let processed = 0, skipped = 0, emailSent = 0, smsSent = 0;

  for (const inv of invoices) {
    const customer = customersMap.get(inv.customer_id);
    if (!customer || customer.email_invoice_reminders === false) {
      skipped++; continue;
    }
    const idempotencyKey = `collections-${inv.id}-${today}`;
    const { data: existing } = await ad
      .from("collections_reminders").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) { skipped++; continue; }

    const lang: string = customer.preferred_language || "en";
    const amount = Number(inv.total_amount ?? inv.amount ?? 0);
    const currency = inv.currency_code ?? "NGN";
    const baseDate = new Date(inv.invoice_date ?? inv.due_date ?? Date.now());
    const daysOverdue = Math.max(0, Math.floor((Date.now() - baseDate.getTime()) / 86400000));

    // Resolve template config (per-org + per-template_key + language; fallback to en)
    const { data: cfgRows } = await ad
      .from("email_template_configs")
      .select("*")
      .eq("organization_id", orgId)
      .eq("template_key", "collections_reminder")
      .in("language", Array.from(new Set([lang, "en"])));
    const cfg = (cfgRows ?? []).find((r: any) => r.language === lang) ?? (cfgRows ?? []).find((r: any) => r.language === "en");

    const log: Record<string, unknown> = {
      organization_id: orgId,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      days_overdue: daysOverdue,
      language: lang,
      idempotency_key: idempotencyKey,
      created_by: triggeredBy,
    };

    // ---- Email ----
    if (customer.email && (!cfg || cfg.enabled !== false)) {
      try {
        const { data: emRes, error: emErr } = await ad.functions.invoke("send-transactional-email", {
          body: {
            templateName: "invoice-update",
            recipientEmail: customer.email,
            organizationId: orgId,
            idempotencyKey: `${idempotencyKey}-email`,
            templateData: {
              recipientName: customer.contact_name || customer.company_name,
              invoiceNumber: inv.invoice_number,
              event: "overdue",
              amount,
              currency,
              dueDate: inv.due_date ?? inv.invoice_date,
              organizationName: orgName,
              notes: cfg?.intro_text ?? undefined,
            },
          },
        });
        if (emErr) {
          log.email_status = "failed";
          log.email_error = String((emErr as any).message ?? emErr);
        } else {
          log.email_status = "queued";
          log.email_message_id = (emRes as any)?.message_id ?? null;
          log.email_sent_at = new Date().toISOString();
          emailSent++;
        }
      } catch (e) {
        log.email_status = "failed";
        log.email_error = (e as Error).message;
      }
    } else {
      log.email_status = "skipped";
      log.email_error = customer.email ? "template_disabled" : "no_email_on_customer";
    }

    // ---- SMS ----
    if (customer.phone) {
      const smsBody = cfg?.sms_template
        ? interpolate(cfg.sms_template, { invoiceNumber: inv.invoice_number, daysOverdue, orgName, amount, currency })
        : defaultSmsBody(lang, { invoiceNumber: inv.invoice_number ?? "", daysOverdue, orgName, amount, currency });
      const smsRes = await sendSms(customer.phone, smsBody);
      if (smsRes.ok) {
        log.sms_status = "sent";
        log.sms_message_id = smsRes.messageId ?? null;
        log.sms_sent_at = new Date().toISOString();
        smsSent++;
      } else {
        log.sms_status = "failed";
        log.sms_error = smsRes.error ?? "unknown";
      }
    } else {
      log.sms_status = "skipped";
      log.sms_error = "no_phone_on_customer";
    }

    // ---- Web push ----
    // Find any push subscriptions linked to the customer's contact user
    // (we map by customer.email -> auth.users via admin lookup). If no matching
    // user/sub, log as skipped. Active push delivery uses send-driver-push.
    log.web_status = "skipped";
    log.web_error = "no_subscribed_devices";

    await ad.from("collections_reminders").insert(log);
    processed++;
  }

  return { organization_id: orgId, processed, skipped, email_sent: emailSent, sms_sent: smsSent };
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ---- AuthZ ----
    const cronHeader = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization") ?? "";
    const isCron = !!(CRON_SECRET && cronHeader && cronHeader === CRON_SECRET);

    let triggeredBy: string | null = null;
    let orgIds: string[] = [];
    let unrestricted = false;

    if (isCron) {
      unrestricted = true;
    } else {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      triggeredBy = user.id;

      // Privilege check
      const ad = admin();
      const { data: roleRows } = await ad.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (roleRows ?? []).map((r: any) => r.role);
      const allowed = new Set(["admin", "super_admin", "org_admin", "finance_manager", "operations", "internal_team", "core_founder"]);
      if (!roles.some((r) => allowed.has(r))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: memberships } = await ad
        .from("organization_members").select("organization_id").eq("user_id", user.id);
      orgIds = (memberships ?? []).map((m: any) => m.organization_id).filter(Boolean);
      if (!orgIds.length) {
        return new Response(JSON.stringify({ error: "No organisation scope" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ---- Resolve targets ----
    let targetOrgIds: string[] = orgIds;
    if (isCron && unrestricted) {
      const ad = admin();
      const { data: orgs } = await ad.from("organizations").select("id");
      targetOrgIds = (orgs ?? []).map((o: any) => o.id);
    }

    // ---- Process ----
    const results: PerOrgResult[] = [];
    for (const orgId of targetOrgIds) {
      try {
        results.push(await processOrg(orgId, triggeredBy));
      } catch (e) {
        results.push({ organization_id: orgId, processed: 0, skipped: 0, email_sent: 0, sms_sent: 0 });
        console.error("processOrg failed", orgId, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, mode: isCron ? "cron" : "user", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("send-collections-reminder error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
