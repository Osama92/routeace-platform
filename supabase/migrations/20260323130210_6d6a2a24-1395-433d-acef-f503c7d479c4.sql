
-- Autonomous Decision Engine tables

CREATE TABLE public.autonomous_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  module_key TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approval_level TEXT NOT NULL DEFAULT 'manager',
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autonomous_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.autonomous_rules(id),
  decision_type TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  recommendation JSONB NOT NULL DEFAULT '{}',
  action JSONB DEFAULT '{}',
  impact_summary TEXT,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  is_reversible BOOLEAN NOT NULL DEFAULT true,
  reversal_action JSONB,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.autonomous_decisions(id) ON DELETE CASCADE,
  result_status TEXT NOT NULL,
  impact_metric TEXT,
  before_value NUMERIC,
  after_value NUMERIC,
  improvement_percent NUMERIC,
  notes TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomous_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rules" ON public.autonomous_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage rules" ON public.autonomous_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read decisions" ON public.autonomous_decisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System and admins can manage decisions" ON public.autonomous_decisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "Authenticated users can read outcomes" ON public.decision_outcomes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage outcomes" ON public.decision_outcomes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.autonomous_decisions;
