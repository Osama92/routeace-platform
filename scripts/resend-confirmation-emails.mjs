/**
 * Resend signup confirmation emails to unconfirmed users.
 * Calls auth-email-hook directly, bypassing the auth hook dashboard config.
 * Run: node scripts/resend-confirmation-emails.mjs
 */

import { createHmac } from 'node:crypto'

const SUPABASE_URL = 'https://mbybrzggrpyhvcnxhlua.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ieWJyemdncnB5aHZjbnhobHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExNDYzNCwiZXhwIjoyMDk0NjkwNjM0fQ.3duES4WzJBXd-hph5cGFBR0LTat1Ns1hvMdat4H7Xr0'
const WEBHOOK_SECRET = '140c23ba56794470582300014f788e4f9563e2beeeecac440fd65affe3348b29'
const HOOK_URL = `${SUPABASE_URL}/functions/v1/auth-email-hook`
const REDIRECT_TO = 'https://routeace.app'

function sign(secret, message) {
  return createHmac('sha256', secret).update(message).digest('hex')
}

async function generateLink(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'signup', email, redirect_to: REDIRECT_TO }),
  })
  if (!res.ok) throw new Error(`generate_link failed ${res.status}: ${await res.text()}`)
  return res.json()
}

async function callAuthHook(email, actionLink, token) {
  const run_id = crypto.randomUUID()
  const payload = {
    version: '1',
    type: 'auth.email',
    run_id,
    data: {
      action_type: 'signup',
      email,
      url: actionLink,
      token,
    },
  }
  const body = JSON.stringify(payload)
  const timestamp = Date.now().toString()
  const signature = sign(WEBHOOK_SECRET, `${timestamp}.${body}`)

  const res = await fetch(HOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'x-routeace-signature': signature,
      'x-routeace-timestamp': timestamp,
    },
    body,
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function processQueue() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-email-queue`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  return { status: res.status, body: await res.text() }
}

async function main() {
  const users = [
    'dhayo213@gmail.com',
    'r.oladipupo@glydeservicesng.com',
    'adedayo.atobiloye@euro-mega.com',
  ]

  console.log('── Stage 1: Enqueue confirmation emails ──')
  for (const email of users) {
    console.log(`\n  ${email}`)
    try {
      process.stdout.write('    Generating fresh link... ')
      const linkData = await generateLink(email)
      console.log('OK')

      process.stdout.write('    Calling auth-email-hook... ')
      const hookResult = await callAuthHook(email, linkData.action_link, linkData.email_otp)
      if (hookResult.status === 200) {
        console.log('OK  (queued)')
      } else {
        console.log(`FAIL HTTP ${hookResult.status}: ${hookResult.body}`)
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
    }
    await new Promise(r => setTimeout(r, 400))
  }

  console.log('\n── Stage 2: Drain queue now (instead of waiting for cron) ──')
  await new Promise(r => setTimeout(r, 1000))
  process.stdout.write('  Calling process-email-queue... ')
  const qResult = await processQueue()
  console.log(`HTTP ${qResult.status}: ${qResult.body}`)

  console.log('\nDone. Check email_send_log for delivery status.')
}

main().catch(console.error)
