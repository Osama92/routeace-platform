
-- AI Board of Directors decisions
CREATE TABLE public.board_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  ceo_view TEXT,
  coo_view TEXT,
  cfo_view TEXT,
  cro_growth_view TEXT,
  risk_view TEXT,
  cto_view TEXT,
  conflict_summary TEXT,
  final_decision TEXT,
  decision_score NUMERIC,
  confidence NUMERIC,
  scenario_best TEXT,
  scenario_worst TEXT,
  scenario_expected TEXT,
  status TEXT NOT NULL DEFAULT 'recommended',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.board_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_decisions_select_admins" ON public.board_decisions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE POLICY "board_decisions_insert_admins" ON public.board_decisions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE POLICY "board_decisions_update_admins" ON public.board_decisions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE TRIGGER board_decisions_updated_at BEFORE UPDATE ON public.board_decisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Investor assessments
CREATE TABLE public.investor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  readiness_score NUMERIC NOT NULL DEFAULT 0,
  stage TEXT,
  recommended_action TEXT,
  recommended_raise_amount NUMERIC,
  valuation_low NUMERIC,
  valuation_high NUMERIC,
  revenue_multiple NUMERIC,
  cash_runway_months NUMERIC,
  growth_rate_pct NUMERIC,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  use_of_funds JSONB DEFAULT '{}'::jsonb,
  target_investors JSONB DEFAULT '[]'::jsonb,
  ai_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.investor_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investor_assessments_select_admins" ON public.investor_assessments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE POLICY "investor_assessments_insert_admins" ON public.investor_assessments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

-- Growth lead signals
CREATE TABLE public.growth_lead_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_name TEXT NOT NULL,
  segment TEXT,
  region TEXT,
  opportunity_score NUMERIC NOT NULL DEFAULT 0,
  estimated_monthly_value NUMERIC,
  pain_signals JSONB DEFAULT '[]'::jsonb,
  recommended_pitch TEXT,
  source TEXT DEFAULT 'ai_demand_engine',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_lead_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_leads_select" ON public.growth_lead_signals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'finance_manager'));
CREATE POLICY "growth_leads_insert" ON public.growth_lead_signals FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE POLICY "growth_leads_update" ON public.growth_lead_signals FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));
CREATE TRIGGER growth_leads_updated_at BEFORE UPDATE ON public.growth_lead_signals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Growth referral triggers (eligible high-performing customers)
CREATE TABLE public.growth_referral_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  customer_name TEXT,
  trigger_reason TEXT NOT NULL,
  performance_metric TEXT,
  performance_value NUMERIC,
  recommended_reward TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_referral_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_referrals_select" ON public.growth_referral_triggers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'finance_manager'));
CREATE POLICY "growth_referrals_insert" ON public.growth_referral_triggers FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

CREATE INDEX idx_board_decisions_status ON public.board_decisions(status, created_at DESC);
CREATE INDEX idx_investor_assessments_created ON public.investor_assessments(created_at DESC);
CREATE INDEX idx_growth_leads_score ON public.growth_lead_signals(opportunity_score DESC, status);
CREATE INDEX idx_growth_referrals_status ON public.growth_referral_triggers(status, created_at DESC);
