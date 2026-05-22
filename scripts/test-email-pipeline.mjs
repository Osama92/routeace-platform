/**
 * Self-test: simulates a signup auth event through the full email pipeline.
 * Stage 1 — POST a signed webhook to auth-email-hook (renders template, enqueues)
 * Stage 2 — POST to process-email-queue (dequeues, calls Resend)
 * Stage 3 — Query email_send_log for final status
 */

import { createHmac } from 'node:crypto'

const SUPABASE_URL = 'https://mbybrzggrpyhvcnxhlua.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ieWJyemdncnB5aHZjbnhobHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExNDYzNCwiZXhwIjoyMDk0NjkwNjM0fQ.3duES4WzJBXd-hph5cGFBR0LTat1Ns1hvMdat4H7Xr0'
const WEBHOOK_SECRET = '140c23ba56794470582300014f788e4f9563e2beeeecac440fd65affe3348b29'
// Send test email to the user's own inbox
const TEST_EMAIL = 'glydeglyder@gmail.com'

function sign(secret, message) {
  return createHmac('sha256', secret).update(message).digest('hex')
}

async function stage1_triggerHook() {
  console.log('\n─── Stage 1: auth-email-hook ───')
  const timestamp = Date.now().toString()
  const runId = crypto.randomUUID()
  const payload = {
    version: '1',
    type: 'auth.email',
    run_id: runId,
    data: {
      action_type: 'signup',
      email: TEST_EMAIL,
      url: `${SUPABASE_URL}/auth/v1/verify?token=TEST_TOKEN_123&type=signup&redirect_to=https://routeace.app`,
      token: 'TEST_TOKEN_123',
    },
  }
  const body = JSON.stringify(payload)
  const signature = sign(WEBHOOK_SECRET, `${timestamp}.${body}`)

  console.log(`  Sending signed signup event for ${TEST_EMAIL}`)
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-routeace-timestamp': timestamp,
      'x-routeace-signature': signature,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body,
  })

  const text = await res.text()
  console.log(`  Status: ${res.status}`)
  console.log(`  Response: ${text}`)
  return res.ok
}

async function stage2_processQueue() {
  console.log('\n─── Stage 2: process-email-queue ───')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-email-queue`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const text = await res.text()
  console.log(`  Status: ${res.status}`)
  console.log(`  Response: ${text}`)
  return res.ok
}

async function stage3_checkLog() {
  console.log('\n─── Stage 3: email_send_log ───')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_send_log?recipient_email=eq.${encodeURIComponent(TEST_EMAIL)}&order=created_at.desc&limit=5`,
    {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    }
  )
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('  No log rows found — email_send_log may be empty or table missing')
    return
  }
  for (const row of rows) {
    console.log(`  [${row.status?.toUpperCase()}] template=${row.template_name}  id=${row.message_id?.slice(0,8)}...  error=${row.error_message ?? 'none'}`)
  }
}

// Run stages sequentially
const ok1 = await stage1_triggerHook()
if (!ok1) {
  console.log('\n  Hook failed — skipping queue drain (email not enqueued)')
} else {
  // Small pause to let the DB write settle
  await new Promise(r => setTimeout(r, 1500))
  await stage2_processQueue()
}
await new Promise(r => setTimeout(r, 1500))
await stage3_checkLog()

console.log('\nDone. Check Stage 3 output for final delivery status.')
