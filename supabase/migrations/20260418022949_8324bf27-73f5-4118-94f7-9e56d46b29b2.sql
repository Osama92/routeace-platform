
-- Maintenance Cost Optimization
CREATE TABLE IF NOT EXISTS public.maintenance_cost_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  reactive_spend NUMERIC DEFAULT 0,
  preventive_spend NUMERIC DEFAULT 0,
  downtime_hours NUMERIC DEFAULT 0,
  downtime_cost NUMERIC DEFAULT 0,
  recommended_action TEXT,
  projected_savings NUMERIC DEFAULT 0,
  roi_score NUMERIC DEFAULT 0,
  ai_recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_cost_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read maintenance cost" ON public.maintenance_cost_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage maintenance cost" ON public.maintenance_cost_analysis FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager'));

-- Fuel Savings ROI tracking
CREATE TABLE IF NOT EXISTS public.fuel_savings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  litres_recovered NUMERIC DEFAULT 0,
  cost_saved NUMERIC DEFAULT 0,
  fraud_blocked_count INT DEFAULT 0,
  fraud_blocked_value NUMERIC DEFAULT 0,
  vehicles_optimized INT DEFAULT 0,
  drivers_flagged INT DEFAULT 0,
  payback_days NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fuel_savings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read fuel savings" ON public.fuel_savings_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage fuel savings" ON public.fuel_savings_ledger FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager'));

-- Alert dispatch log
CREATE TABLE IF NOT EXISTS public.breakdown_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  vehicle_id UUID,
  driver_id UUID,
  message TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['email'],
  recipients JSONB DEFAULT '[]'::jsonb,
  sent_status JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.breakdown_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read alerts" ON public.breakdown_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "System inserts alerts" ON public.breakdown_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage alerts" ON public.breakdown_alerts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager'));

-- Revenue Expansion Signals
CREATE TABLE IF NOT EXISTS public.revenue_expansion_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  signal_type TEXT NOT NULL,
  opportunity_value NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0,
  reasoning TEXT,
  recommended_action TEXT,
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.revenue_expansion_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read expansion" ON public.revenue_expansion_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage expansion" ON public.revenue_expansion_signals FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager'));

-- Autonomous Company Mode config (single-row org config)
CREATE TABLE IF NOT EXISTS public.autonomous_company_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  is_enabled BOOLEAN DEFAULT false,
  autonomy_level TEXT DEFAULT 'assisted',
  enabled_modules TEXT[] DEFAULT ARRAY['fuel','maintenance','dispatch','revenue'],
  approval_threshold NUMERIC DEFAULT 100000,
  daily_action_count INT DEFAULT 0,
  total_savings NUMERIC DEFAULT 0,
  last_decision_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.autonomous_company_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read autonomous config" ON public.autonomous_company_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage autonomous" ON public.autonomous_company_config FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin'));
