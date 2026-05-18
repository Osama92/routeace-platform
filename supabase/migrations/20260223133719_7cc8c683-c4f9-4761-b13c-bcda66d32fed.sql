
-- Treasury Risk Scores table
CREATE TABLE IF NOT EXISTS public.treasury_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  liquidity_coverage_ratio NUMERIC(10,4) DEFAULT 0,
  debt_service_coverage_ratio NUMERIC(10,4) DEFAULT 0,
  fx_exposure_percent NUMERIC(10,4) DEFAULT 0,
  revenue_concentration_ratio NUMERIC(10,4) DEFAULT 0,
  default_probability_percent NUMERIC(10,4) DEFAULT 0,
  cash_runway_months NUMERIC(10,2) DEFAULT 0,
  risk_category TEXT NOT NULL DEFAULT 'Low' CHECK (risk_category IN ('Low', 'Moderate', 'High', 'Critical')),
  liquidity_risk_score INTEGER DEFAULT 0,
  fx_risk_score INTEGER DEFAULT 0,
  counterparty_risk_score INTEGER DEFAULT 0,
  corridor_risk_score INTEGER DEFAULT 0,
  mitigation_suggestions JSONB DEFAULT '[]'::JSONB,
  data_inputs JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.treasury_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view treasury risk" ON public.treasury_risk_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));
CREATE POLICY "System can insert treasury risk" ON public.treasury_risk_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('operating', 'escrow', 'tax_vat', 'tax_wht', 'insurance', 'driver', 'vendor')),
  wallet_name TEXT NOT NULL,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  kyc_verified BOOLEAN DEFAULT false,
  aml_flagged BOOLEAN DEFAULT false,
  daily_limit NUMERIC(18,2) DEFAULT 50000000,
  owner_type TEXT NOT NULL DEFAULT 'company' CHECK (owner_type IN ('company', 'driver', 'vendor', 'customer')),
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage wallets" ON public.wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Wallet Transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'transfer', 'escrow_lock', 'escrow_release')),
  amount NUMERIC(18,2) NOT NULL,
  balance_before NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(18,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  fraud_risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage wallet txns" ON public.wallet_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Financial Close Periods table
CREATE TABLE IF NOT EXISTS public.financial_close_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'closed', 'locked')),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  checklist_completed JSONB DEFAULT '[]'::JSONB,
  adjustment_count INTEGER DEFAULT 0,
  trial_balance_balanced BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_close_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage close periods" ON public.financial_close_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Sovereign Reporting Snapshots
CREATE TABLE IF NOT EXISTS public.sovereign_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('consolidated_pl', 'consolidated_bs', 'consolidated_cf', 'intercompany_elimination', 'route_profitability', 'asset_roi', 'esg', 'tax_jurisdiction', 'regulatory_export')),
  report_period TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  currency TEXT NOT NULL DEFAULT 'NGN',
  ifrs_compliant BOOLEAN DEFAULT true,
  ipsas_compliant BOOLEAN DEFAULT false,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  export_format TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'pdf', 'xbrl', 'excel'))
);

ALTER TABLE public.sovereign_report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage sovereign reports" ON public.sovereign_report_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));
