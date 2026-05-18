
-- Autopilot settings per module
CREATE TABLE public.autopilot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'observe' CHECK (mode IN ('observe', 'recommend', 'autopilot')),
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Autopilot predictions
CREATE TABLE public.autopilot_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  confidence_score NUMERIC DEFAULT 0,
  predicted_value JSONB,
  actual_value JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acted', 'dismissed', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Autopilot executed actions
CREATE TABLE public.autopilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prediction_id UUID REFERENCES public.autopilot_predictions(id),
  executed_by TEXT DEFAULT 'ai',
  approved_by UUID,
  result JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'rejected', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Autopilot audit logs
CREATE TABLE public.autopilot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.autopilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage autopilot settings" ON public.autopilot_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view predictions" ON public.autopilot_predictions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage actions" ON public.autopilot_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view logs" ON public.autopilot_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Seed default module settings
INSERT INTO public.autopilot_settings (module_key, module_name, mode) VALUES
  ('fleet', 'Fleet Optimization', 'observe'),
  ('pricing', 'Dynamic Pricing', 'observe'),
  ('revenue', 'Revenue Optimization', 'observe'),
  ('sales', 'Sales Autopilot', 'observe'),
  ('demand', 'Demand Prediction', 'observe'),
  ('churn', 'Churn Detection', 'observe'),
  ('credits', 'AI Credit Optimizer', 'observe'),
  ('api', 'API Performance', 'observe');
