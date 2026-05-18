
-- API Resale Catalog
CREATE TABLE public.api_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'logistics',
  wholesale_price_per_call NUMERIC DEFAULT 0,
  suggested_retail_price NUMERIC DEFAULT 0,
  bundled_credits INTEGER DEFAULT 0,
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  requires_plan TEXT DEFAULT 'starter',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active API products" ON public.api_products
  FOR SELECT TO authenticated USING (is_active = true);

-- API Subscriptions per partner customer
CREATE TABLE public.api_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_customer_id UUID REFERENCES public.partner_customers(id) ON DELETE CASCADE,
  api_product_id UUID REFERENCES public.api_products(id),
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key_hash TEXT,
  api_key_prefix TEXT,
  calls_this_month INTEGER DEFAULT 0,
  calls_limit_month INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own customer API subs" ON public.api_subscriptions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.partner_customers pc
      JOIN public.partner_accounts pa ON pa.id = pc.partner_id
      WHERE pc.id = partner_customer_id AND pa.user_id = auth.uid()
    )
  );
CREATE POLICY "Partners can manage own customer API subs" ON public.api_subscriptions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_customers pc
      JOIN public.partner_accounts pa ON pa.id = pc.partner_id
      WHERE pc.id = partner_customer_id AND pa.user_id = auth.uid()
    )
  );

-- Billing invoices for partner commerce
CREATE TABLE public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.partner_customers(id),
  invoice_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subscription_amount NUMERIC DEFAULT 0,
  usage_amount NUMERIC DEFAULT 0,
  ai_credits_amount NUMERIC DEFAULT 0,
  api_usage_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  platform_share NUMERIC DEFAULT 0,
  partner_share NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'failed', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  dunning_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own invoices" ON public.partner_invoices
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partner_accounts pa WHERE pa.id = partner_id AND pa.user_id = auth.uid())
  );

-- Payout ledger
CREATE TABLE public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'held')),
  payout_method TEXT,
  payout_reference TEXT,
  reserve_holdback NUMERIC DEFAULT 0,
  net_payout NUMERIC DEFAULT 0,
  period_start DATE,
  period_end DATE,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own payouts" ON public.partner_payouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partner_accounts pa WHERE pa.id = partner_id AND pa.user_id = auth.uid())
  );

-- Delegated support access sessions
CREATE TABLE public.delegated_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id),
  customer_id UUID REFERENCES public.partner_customers(id),
  requested_by UUID,
  access_scope TEXT[] DEFAULT '{}',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'expired', 'revoked')),
  approved_by UUID,
  expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  pages_viewed TEXT[] DEFAULT '{}',
  fields_accessed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delegated_access_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own support sessions" ON public.delegated_access_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partner_accounts pa WHERE pa.id = partner_id AND pa.user_id = auth.uid())
  );
CREATE POLICY "Partners can create support requests" ON public.delegated_access_sessions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.partner_accounts pa WHERE pa.id = partner_id AND pa.user_id = auth.uid())
  );

-- Risk events
CREATE TABLE public.partner_risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id),
  customer_id UUID REFERENCES public.partner_customers(id),
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own risk events" ON public.partner_risk_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partner_accounts pa WHERE pa.id = partner_id AND pa.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );
