CREATE TABLE public.ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_id TEXT NOT NULL,
  action_label TEXT NOT NULL,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  credits_purchased INTEGER NOT NULL DEFAULT 0,
  os_context TEXT NOT NULL DEFAULT 'logistics_os',
  module_context TEXT,
  balance_after INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.industry_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  industry_vertical TEXT NOT NULL DEFAULT 'fmcg',
  max_users INTEGER NOT NULL DEFAULT 2,
  max_ai_credits_monthly INTEGER NOT NULL DEFAULT 0,
  ai_credits_used INTEGER NOT NULL DEFAULT 0,
  ai_credits_total INTEGER NOT NULL DEFAULT 0,
  pricing_currency TEXT NOT NULL DEFAULT 'NGN',
  monthly_price_per_user INTEGER NOT NULL DEFAULT 0,
  enabled_modules TEXT[] NOT NULL DEFAULT '{}',
  enabled_ai_tools TEXT[] NOT NULL DEFAULT '{}',
  api_access_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_objects_enabled BOOLEAN NOT NULL DEFAULT false,
  sandbox_enabled BOOLEAN NOT NULL DEFAULT false,
  conversation_intelligence BOOLEAN NOT NULL DEFAULT false,
  offline_mode_level TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_credit_tx_user ON public.ai_credit_transactions(user_id);
CREATE INDEX idx_ai_credit_tx_created ON public.ai_credit_transactions(created_at);
CREATE INDEX idx_industry_entitlements_user ON public.industry_entitlements(user_id);
CREATE INDEX idx_industry_entitlements_org ON public.industry_entitlements(organization_id);

ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own credit transactions" ON public.ai_credit_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see all credit transactions" ON public.ai_credit_transactions
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid()));
CREATE POLICY "System inserts credit transactions" ON public.ai_credit_transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own entitlements" ON public.industry_entitlements
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage entitlements" ON public.industry_entitlements
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid()));

CREATE TRIGGER update_industry_entitlements_updated_at
  BEFORE UPDATE ON public.industry_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();