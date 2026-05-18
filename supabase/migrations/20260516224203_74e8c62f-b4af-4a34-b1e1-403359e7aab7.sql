
-- 1. Customer language preference
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

-- 2. Branded multi-language templates
ALTER TABLE public.email_template_configs
  ADD COLUMN IF NOT EXISTS sms_template text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE public.email_template_configs
  DROP CONSTRAINT IF EXISTS email_template_configs_organization_id_template_key_key;

ALTER TABLE public.email_template_configs
  ADD CONSTRAINT email_template_configs_org_template_lang_unique
  UNIQUE (organization_id, template_key, language);

-- 3. Collections reminders log
CREATE TABLE IF NOT EXISTS public.collections_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid,
  days_overdue integer NOT NULL,
  trigger_reason text NOT NULL DEFAULT 'auto_age_10d',
  idempotency_key text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'en',
  email_status text,
  email_message_id text,
  email_error text,
  email_sent_at timestamptz,
  sms_status text,
  sms_message_id text,
  sms_error text,
  sms_sent_at timestamptz,
  web_status text,
  web_error text,
  web_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_reminders_org_invoice
  ON public.collections_reminders(organization_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_collections_reminders_created
  ON public.collections_reminders(created_at DESC);

ALTER TABLE public.collections_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_reminders_select_org_members"
  ON public.collections_reminders FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- 4. Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org
  ON public.push_subscriptions(organization_id) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own_select"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_own_insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_own_update"
  ON public.push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_own_delete"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());
