
-- Commerce Identities (RCID)
CREATE TABLE public.commerce_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  rcid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL DEFAULT 'distributor',
  business_name TEXT NOT NULL,
  registration_number TEXT,
  tax_id TEXT,
  country_code TEXT DEFAULT 'NG',
  verified_at TIMESTAMPTZ,
  verification_level TEXT DEFAULT 'unverified',
  verification_checks JSONB DEFAULT '{}',
  trust_score NUMERIC DEFAULT 0,
  trust_grade TEXT DEFAULT 'unrated',
  credit_score NUMERIC DEFAULT 0,
  trade_volume_total NUMERIC DEFAULT 0,
  delivery_completion_rate NUMERIC DEFAULT 0,
  payment_reliability_score NUMERIC DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.commerce_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view commerce identities"
  ON public.commerce_identities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage commerce identities"
  ON public.commerce_identities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trade History Ledger
CREATE TABLE public.trade_history_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rcid TEXT REFERENCES public.commerce_identities(rcid),
  counterparty_rcid TEXT,
  transaction_type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'completed',
  description TEXT,
  performance_rating NUMERIC,
  dispute_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trade_history_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view trade history"
  ON public.trade_history_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage trade history"
  ON public.trade_history_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trust Badges
CREATE TABLE public.trust_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rcid TEXT REFERENCES public.commerce_identities(rcid),
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  criteria_met JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.trust_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view trust badges"
  ON public.trust_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage trust badges"
  ON public.trust_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trade Disputes
CREATE TABLE public.trade_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_rcid TEXT REFERENCES public.commerce_identities(rcid),
  respondent_rcid TEXT REFERENCES public.commerce_identities(rcid),
  dispute_type TEXT NOT NULL,
  description TEXT,
  amount_in_dispute NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  trust_impact NUMERIC DEFAULT 0,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trade_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view disputes"
  ON public.trade_disputes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage disputes"
  ON public.trade_disputes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Digital Trade Contracts
CREATE TABLE public.trade_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_a_rcid TEXT REFERENCES public.commerce_identities(rcid),
  party_b_rcid TEXT REFERENCES public.commerce_identities(rcid),
  contract_type TEXT NOT NULL,
  title TEXT NOT NULL,
  terms JSONB DEFAULT '{}',
  total_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'draft',
  signed_by_a_at TIMESTAMPTZ,
  signed_by_b_at TIMESTAMPTZ,
  effective_date DATE,
  expiry_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trade_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view trade contracts"
  ON public.trade_contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage trade contracts"
  ON public.trade_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Compliance Registry
CREATE TABLE public.compliance_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rcid TEXT REFERENCES public.commerce_identities(rcid),
  compliance_type TEXT NOT NULL,
  issuing_authority TEXT,
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'valid',
  document_url TEXT,
  country_code TEXT DEFAULT 'NG',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.compliance_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view compliance registry"
  ON public.compliance_registry FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage compliance registry"
  ON public.compliance_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
