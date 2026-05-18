
-- Pan-African Settlement Ledger
CREATE TABLE public.pan_african_settlement_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_wallet TEXT NOT NULL,
  destination_wallet TEXT NOT NULL,
  origin_currency TEXT NOT NULL DEFAULT 'NGN',
  destination_currency TEXT NOT NULL DEFAULT 'NGN',
  amount NUMERIC NOT NULL DEFAULT 0,
  fx_rate_locked NUMERIC,
  settlement_status TEXT NOT NULL DEFAULT 'pending',
  corridor_id TEXT,
  compliance_status TEXT DEFAULT 'pending',
  liquidity_source TEXT,
  risk_score INTEGER DEFAULT 0,
  aml_score INTEGER DEFAULT 0,
  sanctions_clear BOOLEAN DEFAULT false,
  net_settlement_batch_id TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pan_african_settlement_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settlements" ON public.pan_african_settlement_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert settlements" ON public.pan_african_settlement_ledger
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admins can update settlements" ON public.pan_african_settlement_ledger
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
  );

-- Remittance Wallet
CREATE TABLE public.remittance_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id TEXT NOT NULL UNIQUE DEFAULT 'REM-' || substr(gen_random_uuid()::text, 1, 8),
  sender_user_id UUID REFERENCES auth.users(id),
  sender_country TEXT NOT NULL,
  receiver_country TEXT NOT NULL,
  purpose_code TEXT NOT NULL DEFAULT 'general',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  destination_currency TEXT NOT NULL DEFAULT 'NGN',
  fx_rate NUMERIC,
  linked_trade_contract UUID,
  escrow_flag BOOLEAN DEFAULT false,
  merchant_id UUID,
  logistics_partner TEXT,
  risk_score INTEGER DEFAULT 0,
  aml_status TEXT DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  commerce_trigger_type TEXT,
  commerce_trigger_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.remittance_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own remittances" ON public.remittance_wallets
  FOR SELECT TO authenticated USING (
    sender_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Users can create remittances" ON public.remittance_wallets
  FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "Admins can update remittances" ON public.remittance_wallets
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
  );

-- SME Credit Profiles
CREATE TABLE public.sme_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_id TEXT,
  country TEXT NOT NULL,
  trade_volume NUMERIC DEFAULT 0,
  cross_border_frequency INTEGER DEFAULT 0,
  default_probability NUMERIC DEFAULT 0,
  insurance_coverage_ratio NUMERIC DEFAULT 0,
  cashflow_stability_index NUMERIC DEFAULT 0,
  credit_score INTEGER DEFAULT 0,
  eligible_limit NUMERIC DEFAULT 0,
  freight_history_score NUMERIC DEFAULT 0,
  delivery_reliability NUMERIC DEFAULT 0,
  payment_consistency NUMERIC DEFAULT 0,
  corridor_stability_index NUMERIC DEFAULT 0,
  insurance_claims_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_assessed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sme_credit_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view SME credits" ON public.sme_credit_profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admins can manage SME credits" ON public.sme_credit_profiles
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Trade Liquidity Exchange
CREATE TABLE public.trade_liquidity_exchange (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL UNIQUE DEFAULT 'TLE-' || substr(gen_random_uuid()::text, 1, 8),
  asset_type TEXT NOT NULL DEFAULT 'freight_note',
  asset_name TEXT NOT NULL,
  origin_corridor TEXT,
  risk_score INTEGER DEFAULT 0,
  yield_rate NUMERIC DEFAULT 0,
  insurance_backing BOOLEAN DEFAULT false,
  insurance_coverage NUMERIC DEFAULT 0,
  liquidity_depth NUMERIC DEFAULT 0,
  investor_class TEXT DEFAULT 'retail',
  duration_days INTEGER DEFAULT 30,
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  backing_entity_type TEXT,
  backing_entity_id UUID,
  maturity_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_liquidity_exchange ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view exchange" ON public.trade_liquidity_exchange
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage exchange" ON public.trade_liquidity_exchange
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );
