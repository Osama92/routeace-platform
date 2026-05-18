
-- Partner accounts table
CREATE TABLE public.partner_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'reseller',
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT DEFAULT 'NG',
  commission_rate NUMERIC(5,2) DEFAULT 20.00,
  billing_model TEXT NOT NULL DEFAULT 'platform_collected',
  wholesale_discount_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  total_downstream_tenants INTEGER DEFAULT 0,
  total_mrr NUMERIC(12,2) DEFAULT 0,
  payout_balance NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Downstream customer tenants provisioned by partners
CREATE TABLE public.partner_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  tenant_user_id UUID REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  operating_type TEXT NOT NULL DEFAULT 'haulage',
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  billing_ownership TEXT NOT NULL DEFAULT 'platform_collected',
  status TEXT NOT NULL DEFAULT 'trial',
  monthly_bill NUMERIC(12,2) DEFAULT 0,
  vehicles_count INTEGER DEFAULT 0,
  ai_credits_used INTEGER DEFAULT 0,
  dispatches_this_month INTEGER DEFAULT 0,
  activation_date TIMESTAMPTZ,
  churn_risk_score INTEGER DEFAULT 0,
  contact_email TEXT,
  contact_name TEXT,
  country TEXT DEFAULT 'NG',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partner commission ledger
CREATE TABLE public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.partner_customers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_revenue NUMERIC(12,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 20.00,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'accrued',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Delegated support access logs
CREATE TABLE public.partner_support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_accounts(id),
  customer_id UUID NOT NULL REFERENCES public.partner_customers(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  scope_modules TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  pages_viewed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_support_sessions ENABLE ROW LEVEL SECURITY;

-- Partner accounts: owner or super_admin
CREATE POLICY "partner_accounts_own" ON public.partner_accounts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Partner customers: partner owner or super_admin
CREATE POLICY "partner_customers_own" ON public.partner_customers
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partner_accounts WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Partner commissions: partner owner or super_admin
CREATE POLICY "partner_commissions_own" ON public.partner_commissions
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partner_accounts WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Support sessions: partner or super_admin
CREATE POLICY "partner_support_sessions_own" ON public.partner_support_sessions
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partner_accounts WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Update trigger
CREATE TRIGGER update_partner_accounts_updated_at
  BEFORE UPDATE ON public.partner_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_customers_updated_at
  BEFORE UPDATE ON public.partner_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
