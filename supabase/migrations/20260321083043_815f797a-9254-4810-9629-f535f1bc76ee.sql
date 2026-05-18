
-- Governance policies table: stores autonomy mode and rules per module
CREATE TABLE public.governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  os_context TEXT NOT NULL DEFAULT 'logistics',
  autonomy_mode TEXT NOT NULL DEFAULT 'manual' CHECK (autonomy_mode IN ('manual', 'assisted', 'autonomous')),
  approval_type TEXT NOT NULL DEFAULT 'single' CHECK (approval_type IN ('none', 'single', 'multi_level', 'conditional')),
  risk_threshold NUMERIC DEFAULT 50,
  value_threshold NUMERIC DEFAULT 0,
  ai_allowed BOOLEAN DEFAULT false,
  ai_can_execute BOOLEAN DEFAULT false,
  escalation_role TEXT DEFAULT 'super_admin',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage governance_policies" ON public.governance_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Governance audit log
CREATE TABLE public.governance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  action TEXT NOT NULL,
  autonomy_mode TEXT,
  decision TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  ai_initiated BOOLEAN DEFAULT false,
  ai_confidence NUMERIC,
  override_by UUID,
  override_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read governance_audit_log" ON public.governance_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "System inserts governance_audit_log" ON public.governance_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- AI decision log
CREATE TABLE public.ai_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  confidence_score NUMERIC DEFAULT 0,
  was_executed BOOLEAN DEFAULT false,
  was_overridden BOOLEAN DEFAULT false,
  overridden_by UUID,
  override_reason TEXT,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai_decision_log" ON public.ai_decision_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts ai_decision_log" ON public.ai_decision_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default governance policies
INSERT INTO public.governance_policies (module_key, module_name, os_context, autonomy_mode, approval_type, risk_threshold, value_threshold, ai_allowed) VALUES
  ('dispatch_routing', 'Dispatch & Routing', 'logistics', 'manual', 'single', 50, 0, false),
  ('order_processing', 'Order Processing', 'logistics', 'manual', 'single', 50, 0, false),
  ('fleet_management', 'Fleet Management', 'logistics', 'manual', 'single', 50, 0, false),
  ('trade_finance', 'Trade Finance', 'finance', 'manual', 'multi_level', 70, 500000, false),
  ('sales_automation', 'Sales Automation', 'industry', 'manual', 'single', 50, 0, false),
  ('payments_billing', 'Payments & Billing', 'finance', 'manual', 'multi_level', 60, 100000, false),
  ('api_reseller', 'API & Reseller Ops', 'platform', 'manual', 'single', 50, 0, false),
  ('invoice_generation', 'Invoice Generation', 'finance', 'manual', 'single', 40, 0, false),
  ('credit_decisions', 'Credit Decisions', 'finance', 'manual', 'multi_level', 80, 1000000, true),
  ('driver_assignment', 'Driver Assignment', 'logistics', 'manual', 'none', 30, 0, true);
