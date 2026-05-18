
-- Stablecoin Settlement Engine Tables

-- 1. Stablecoin Transaction Log
CREATE TABLE public.stablecoin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT NOT NULL,
  wallet_address_sender TEXT NOT NULL,
  wallet_address_receiver TEXT NOT NULL,
  stablecoin_type TEXT NOT NULL DEFAULT 'USDT',
  blockchain_network TEXT NOT NULL DEFAULT 'ethereum',
  amount NUMERIC NOT NULL DEFAULT 0,
  block_number BIGINT,
  gas_fee NUMERIC DEFAULT 0,
  sender_country_estimated TEXT,
  wallet_risk_score INTEGER DEFAULT 0,
  wallet_age_days INTEGER,
  exchange_source TEXT,
  mixer_exposure BOOLEAN DEFAULT false,
  institutional_wallet BOOLEAN DEFAULT false,
  aml_flag TEXT DEFAULT 'clear',
  aml_risk_score INTEGER DEFAULT 0,
  sanctions_check_status TEXT DEFAULT 'pending',
  settlement_status TEXT DEFAULT 'pending',
  fiat_conversion_rate NUMERIC,
  linked_invoice_id UUID,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  tenant_id UUID,
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Stablecoin Business Wallets
CREATE TABLE public.stablecoin_business_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  wallet_address TEXT NOT NULL,
  blockchain_network TEXT NOT NULL DEFAULT 'ethereum',
  supported_tokens TEXT[] DEFAULT ARRAY['USDT', 'USDC'],
  linked_bank_account TEXT,
  auto_convert_enabled BOOLEAN DEFAULT false,
  auto_convert_currency TEXT DEFAULT 'NGN',
  treasury_policy_id UUID,
  custody_provider TEXT DEFAULT 'embedded',
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fiat Conversion Log
CREATE TABLE public.fiat_conversion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.stablecoin_transactions(id),
  original_token TEXT NOT NULL,
  amount_token NUMERIC NOT NULL,
  fiat_currency TEXT NOT NULL,
  conversion_rate NUMERIC NOT NULL,
  spread NUMERIC DEFAULT 0,
  fiat_amount NUMERIC NOT NULL,
  liquidity_provider TEXT,
  treasury_impact TEXT,
  fx_gain_loss NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Stablecoin Compliance Log
CREATE TABLE public.stablecoin_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.stablecoin_transactions(id),
  check_type TEXT NOT NULL,
  result TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  jurisdiction TEXT,
  reporting_threshold_triggered BOOLEAN DEFAULT false,
  tax_implications TEXT,
  capital_controls_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.stablecoin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stablecoin_business_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_conversion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stablecoin_compliance_log ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users with roles
CREATE POLICY "Authenticated users can view stablecoin transactions" ON public.stablecoin_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stablecoin transactions" ON public.stablecoin_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

CREATE POLICY "Authenticated users can view business wallets" ON public.stablecoin_business_wallets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage business wallets" ON public.stablecoin_business_wallets FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view conversion log" ON public.fiat_conversion_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert conversion log" ON public.fiat_conversion_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

CREATE POLICY "Authenticated users can view compliance log" ON public.stablecoin_compliance_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert compliance log" ON public.stablecoin_compliance_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));
