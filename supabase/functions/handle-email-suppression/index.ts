import { createClient } from 'npm:@supabase/supabase-js@2'

interface SuppressionPayload {
  email: string
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  message_id?: string
  metadata?: Record<string, unknown>
  is_retry: boolean
  retry_count: number
}

// ── Native HMAC verification (no external dependency) ────────────────────────

async function computeHmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

async function verifyAndParse(req: Request, secret: string): Promise<SuppressionPayload> {
  const signature = req.headers.get('x-routeace-signature')
  const timestamp = req.headers.get('x-routeace-timestamp')

  if (!timestamp) throw Object.assign(new Error('Missing x-routeace-timestamp'), { code: 'missing_timestamp' })
  if (!signature) throw Object.assign(new Error('Missing x-routeace-signature'), { code: 'missing_signature' })

  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw Object.assign(new Error('Stale or invalid timestamp'), { code: 'stale_timestamp' })
  }

  const body = await req.text()
  const expected = await computeHmacHex(secret, `${timestamp}.${body}`)
  if (!timingSafeEqual(signature, expected)) {
    throw Object.assign(new Error('Signature mismatch'), { code: 'invalid_signature' })
  }

  let parsed: { data?: SuppressionPayload }
  try {
    parsed = JSON.parse(body)
  } catch (_e) {
    throw Object.assign(new Error('Invalid JSON'), { code: 'invalid_json' })
  }

  const data = parsed?.data
  if (!data?.email || !data?.reason) {
    throw Object.assign(new Error('Missing required fields: email, reason'), { code: 'invalid_payload' })
  }

  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mapReasonToStatus(reason: string): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce': return 'bounced'
    case 'complaint': return 'complained'
    default: return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce': return 'Permanent bounce - email address is invalid or rejected'
    case 'complaint': return 'Spam complaint - recipient marked email as spam'
    case 'unsubscribe': return 'Recipient unsubscribed'
    default: return 'Email suppressed'
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!secret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  let payload: SuppressionPayload
  try {
    payload = await verifyAndParse(req, secret)
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'unknown'
    const message = error instanceof Error ? error.message : 'Verification failed'
    switch (code) {
      case 'missing_signature':
      case 'invalid_signature':
      case 'missing_timestamp':
      case 'stale_timestamp':
        console.error('Webhook auth failed', { code, message })
        return jsonResponse({ error: 'Invalid signature' }, 401)
      case 'invalid_payload':
      case 'invalid_json':
        console.error('Invalid payload', { code, message })
        return jsonResponse({ error: 'Invalid payload' }, 400)
      default:
        console.error('Unexpected verification error', { code, message })
        return jsonResponse({ error: 'Internal error' }, 500)
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = payload.email.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: normalizedEmail, reason: payload.reason, metadata: payload.metadata ?? null },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      error: suppressError,
      email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
    })
    return jsonResponse({ error: 'Failed to write suppression' }, 500)
  }

  const { error: insertError } = await supabase
    .from('email_send_log')
    .insert({
      message_id: payload.message_id ?? null,
      template_name: 'system',
      recipient_email: normalizedEmail,
      status: mapReasonToStatus(payload.reason),
      error_message: mapReasonToMessage(payload.reason),
      metadata: payload.metadata ?? null,
    })

  if (insertError) {
    console.warn('Failed to insert email_send_log', { error: insertError })
  }

  console.log('Suppression processed', {
    email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
    reason: payload.reason,
    is_retry: payload.is_retry,
    retry_count: payload.retry_count,
    has_message_id: !!payload.message_id,
  })

  return jsonResponse({ success: true })
})
