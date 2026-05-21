-- Set up pg_cron job to call process-email-queue every minute.
--
-- PREREQUISITES (run these in Supabase SQL Editor BEFORE applying this migration):
--
--   1. Store your service_role key in Vault:
--      SELECT vault.create_secret(
--        'YOUR_SERVICE_ROLE_KEY_HERE',
--        'email_queue_service_role_key',
--        'Service role key used by the email queue cron job'
--      );
--
--   2. If the secret already exists and you need to update it:
--      UPDATE vault.secrets
--      SET secret = 'YOUR_SERVICE_ROLE_KEY_HERE'
--      WHERE name = 'email_queue_service_role_key';

-- Ensure required extensions are active
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- Clear any stale rate-limit block left over from past Resend 403 errors.
-- A stuck retry_after_until prevents ALL email sends until it expires.
UPDATE public.email_send_state
SET retry_after_until = NULL, updated_at = now()
WHERE id = 1
  AND retry_after_until IS NOT NULL
  AND retry_after_until < now() + interval '24 hours';

-- Remove existing job (idempotent re-run)
DO $$ BEGIN
  PERFORM cron.unschedule('process-email-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Call process-email-queue every minute via pg_net HTTP POST.
-- The function handles empty-queue and rate-limit checks internally.
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mbybrzggrpyhvcnxhlua.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
        LIMIT 1
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);
