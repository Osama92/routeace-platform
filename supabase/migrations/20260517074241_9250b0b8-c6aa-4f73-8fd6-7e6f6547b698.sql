-- Per-organization unique invoice numbers + notification email audit fields

-- 1) Drop global unique constraint on invoice_number (replaced by per-org uniqueness)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- 2) Add a per-organization partial unique index on invoice_number
-- Partial index so legacy rows where organization_id IS NULL do not collide
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_invoice_number_unique
  ON public.invoices (organization_id, invoice_number)
  WHERE organization_id IS NOT NULL;

-- 3) Audit columns for delivery notification email source
ALTER TABLE public.client_notification_log
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS from_email_source text
    CHECK (from_email_source IS NULL OR from_email_source IN ('org_support','platform_default'));

COMMENT ON COLUMN public.client_notification_log.from_email IS
  'The actual From address used when sending the client delivery notification.';
COMMENT ON COLUMN public.client_notification_log.from_email_source IS
  'org_support = organization registered support email; platform_default = RouteAce fallback.';

CREATE INDEX IF NOT EXISTS client_notification_log_from_email_source_idx
  ON public.client_notification_log (organization_id, from_email_source);
