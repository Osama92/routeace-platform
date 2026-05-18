
-- Smart Matching Jobs table
CREATE TABLE public.smart_matching_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT,
  request_payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress_percentage INTEGER DEFAULT 0,
  partial_results JSONB DEFAULT '[]',
  final_results JSONB,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.smart_matching_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON public.smart_matching_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can create jobs" ON public.smart_matching_jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own jobs" ON public.smart_matching_jobs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Stablecoin Corridor Arbitrage
CREATE TABLE public.stablecoin_corridors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  stablecoin_symbol TEXT NOT NULL,
  onramp_rate NUMERIC(18,6) DEFAULT 0,
  offramp_rate NUMERIC(18,6) DEFAULT 0,
  fx_equivalent_rate NUMERIC(18,6) DEFAULT 0,
  liquidity_depth NUMERIC(18,2) DEFAULT 0,
  volatility_index NUMERIC(8,4) DEFAULT 0,
  spread_percentage NUMERIC(8,4) DEFAULT 0,
  arbitrage_flag BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stablecoin_corridors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance can view corridors" ON public.stablecoin_corridors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Only super_admin can manage corridors" ON public.stablecoin_corridors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- CBDC Integration
CREATE TABLE public.cbdc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuing_country TEXT NOT NULL,
  cbdc_code TEXT NOT NULL,
  corridor TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  programmable_flag BOOLEAN DEFAULT false,
  compliance_status TEXT DEFAULT 'pending',
  settlement_finality TEXT DEFAULT 'pending',
  aml_score INTEGER DEFAULT 0,
  tax_tag TEXT,
  transaction_status TEXT DEFAULT 'initiated',
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cbdc_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance view CBDC" ON public.cbdc_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Only super_admin manages CBDC" ON public.cbdc_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Digital Asset Treasury Hedge
CREATE TABLE public.treasury_digital_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  asset_type TEXT NOT NULL,
  exposure_percentage NUMERIC(8,4) DEFAULT 0,
  hedge_ratio NUMERIC(8,4) DEFAULT 0,
  volatility_index NUMERIC(8,4) DEFAULT 0,
  recommended_action TEXT,
  risk_score INTEGER DEFAULT 0,
  last_rebalanced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.treasury_digital_exposure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance view exposure" ON public.treasury_digital_exposure
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Only super_admin manages exposure" ON public.treasury_digital_exposure
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- On-Chain Trade Finance Tokens
CREATE TABLE public.trade_finance_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE,
  linked_freight_contract TEXT,
  corridor TEXT,
  asset_type TEXT NOT NULL DEFAULT 'freight_receivable',
  yield_rate NUMERIC(8,4) DEFAULT 0,
  maturity_date DATE,
  risk_score INTEGER DEFAULT 0,
  insurance_backed BOOLEAN DEFAULT false,
  investor_class TEXT DEFAULT 'institutional',
  issuance_status TEXT DEFAULT 'draft',
  regulatory_tag TEXT,
  amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trade_finance_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance view tokens" ON public.trade_finance_tokens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Only super_admin manages tokens" ON public.trade_finance_tokens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Smart Matching Metrics
CREATE TABLE public.smart_matching_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avg_execution_time_ms NUMERIC(10,2) DEFAULT 0,
  failure_rate NUMERIC(8,4) DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  region TEXT,
  role_type TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_matching_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view metrics" ON public.smart_matching_metrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
