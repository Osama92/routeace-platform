CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  payment_reference TEXT UNIQUE,
  payment_channel TEXT,
  gateway_response JSONB,
  billing_cycle TEXT DEFAULT 'monthly',
  paid_at TIMESTAMPTZ,
  next_billing_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read own invoices"
  ON public.subscription_invoices FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Service role full access on invoices"
  ON public.subscription_invoices FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN subscription_status TEXT DEFAULT 'active'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN subscription_expires_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN paystack_customer_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;