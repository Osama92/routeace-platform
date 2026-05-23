import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

// ---------------------------------------------------------------------------
// Standard Webhooks signature verification (Supabase native format)
// https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
// ---------------------------------------------------------------------------

class WebhookError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'WebhookError'
  }
}

// Real Supabase "Send Email" hook payload format
interface HookPayload {
  user: {
    id: string
    email: string
    new_email?: string
    [key: string]: unknown
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
    [key: string]: unknown
  }
}

function base64Decode(str: string): Uint8Array {
  // Normalize base64url → base64
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  // Constant-time compare — always iterate the full length of the longer string
  const len = Math.max(aBytes.length, bBytes.length)
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

async function verifyWebhookRequest(
  req: Request,
  secret: string
): Promise<{ payload: HookPayload; body: string }> {
  const msgId = req.headers.get('webhook-id')
  const msgTimestamp = req.headers.get('webhook-timestamp')
  const msgSignature = req.headers.get('webhook-signature')

  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new WebhookError(
      'missing_headers',
      `Missing Standard Webhooks headers. Got: id=${msgId} ts=${msgTimestamp} sig=${!!msgSignature}`
    )
  }

  // Validate timestamp within ±5 minutes (Standard Webhooks uses seconds)
  const ts = parseInt(msgTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    throw new WebhookError('stale_timestamp', 'Webhook timestamp is stale or invalid')
  }

  const body = await req.text()

  // Decode secret: strip 'v1,' and/or 'whsec_' prefixes if present, then base64-decode
  // Supabase dashboard shows the secret as 'v1,whsec_<base64>'
  let rawSecret = secret
  if (rawSecret.startsWith('v1,')) rawSecret = rawSecret.slice(3)
  if (rawSecret.startsWith('whsec_')) rawSecret = rawSecret.slice(6)
  let secretBytes: ArrayBuffer
  try {
    secretBytes = base64Decode(rawSecret).buffer
  } catch {
    // Not base64 — use raw UTF-8 bytes
    secretBytes = new TextEncoder().encode(secret).buffer
  }

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Standard Webhooks signed message: "{webhook-id}.{webhook-timestamp}.{body}"
  const message = `${msgId}.${msgTimestamp}.${body}`
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const computed = base64Encode(sigBytes)

  // webhook-signature may carry multiple space-separated signatures: "v1,<sig1> v1,<sig2>"
  const signatures = msgSignature.split(' ')
  const valid = signatures.some((s) => {
    const comma = s.indexOf(',')
    const sigValue = comma !== -1 ? s.slice(comma + 1) : s
    return timingSafeEqual(computed, sigValue)
  })

  if (!valid) {
    throw new WebhookError('invalid_signature', 'Webhook signature mismatch')
  }

  let payload: HookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    throw new WebhookError('invalid_json', 'Failed to parse request body as JSON')
  }

  if (!payload || typeof payload !== 'object') {
    throw new WebhookError('invalid_payload', 'Payload is not a valid object')
  }

  return { payload, body }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://routeace.app',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'RouteAce'
const ROOT_DOMAIN = 'routeace.app'

// ---------------------------------------------------------------------------
// Direct Resend send (no queue — auth emails must arrive immediately)
// ---------------------------------------------------------------------------

async function sendViaResend(opts: {
  to: string
  from: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') || opts.from

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${errBody}`)
  }
}

// ---------------------------------------------------------------------------
// Preview endpoint — returns rendered HTML for email testing (no delivery)
// Secured with WEBHOOK_SECRET Bearer token.
// ---------------------------------------------------------------------------

const SAMPLE_PROJECT_URL = 'https://routeace.app'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, oldEmail: SAMPLE_EMAIL, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

async function handlePreview(req: Request): Promise<Response> {
  const previewCors = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://routeace.app',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: previewCors })

  const secret = Deno.env.get('WEBHOOK_SECRET')
  const authHeader = req.headers.get('Authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCors, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const b = await req.json()
    type = b.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...previewCors, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCors, 'Content-Type': 'application/json' },
    })
  }

  const html = await renderAsync(React.createElement(EmailTemplate, SAMPLE_DATA[type] ?? {}))
  return new Response(html, {
    status: 200,
    headers: { ...previewCors, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ---------------------------------------------------------------------------
// Webhook handler — verifies signature, renders template, sends via Resend
// ---------------------------------------------------------------------------

async function handleWebhook(req: Request): Promise<Response> {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret) {
    console.error('WEBHOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: HookPayload
  try {
    const verified = await verifyWebhookRequest(req, secret)
    payload = verified.payload
  } catch (error) {
    if (error instanceof WebhookError) {
      console.error('Webhook verification failed', { code: error.code, message: error.message })
      const status = ['invalid_signature', 'missing_headers', 'stale_timestamp'].includes(error.code) ? 401 : 400
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.error('Unexpected webhook error', { error })
    return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const emailType = payload.email_data?.email_action_type
  const recipientEmail = payload.user?.email
  const run_id = crypto.randomUUID()

  console.log('Auth hook received', { emailType, email: recipientEmail })

  if (!recipientEmail) {
    console.error('Payload missing user.email', { payload })
    return new Response(JSON.stringify({ error: 'Missing user email in payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, payload })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Construct the confirmation URL Supabase expects users to click
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://mbybrzggrpyhvcnxhlua.supabase.co'
  const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${payload.email_data.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(payload.email_data.redirect_to)}`

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: recipientEmail,
    confirmationUrl,
    token: payload.email_data.token,        // OTP code for reauthentication
    email: recipientEmail,
    oldEmail: recipientEmail,               // for email_change — old address
    newEmail: payload.user.new_email,       // for email_change — new address
  }

  const [html, text] = await Promise.all([
    renderAsync(React.createElement(EmailTemplate, templateProps)),
    renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true }),
  ])

  // Log to Supabase (non-fatal — don't block email delivery if this fails)
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabase.from('email_send_log').insert({
      message_id: run_id,
      template_name: emailType,
      recipient_email: recipientEmail,
      status: 'pending',
    })
  } catch (logErr) {
    console.warn('Failed to write email_send_log (non-fatal)', { error: logErr })
  }

  try {
    await sendViaResend({
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${ROOT_DOMAIN}>`,
      subject: EMAIL_SUBJECTS[emailType] ?? 'Notification',
      html,
      text,
    })
    console.log('Auth email sent', { emailType, email: recipientEmail, run_id })
  } catch (sendErr) {
    const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr)
    console.error('Failed to send auth email', { emailType, email: recipientEmail, run_id, error: errMsg })

    // Log failure (non-fatal for the log write itself)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('email_send_log').insert({
        message_id: run_id,
        template_name: emailType,
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: errMsg.slice(0, 1000),
      })
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  if (url.pathname.endsWith('/preview')) return handlePreview(req)

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Unhandled error in auth-email-hook:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
