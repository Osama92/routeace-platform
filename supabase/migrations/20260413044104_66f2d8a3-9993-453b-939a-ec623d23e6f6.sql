
-- Fuel baselines per vehicle type
CREATE TABLE public.fuel_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  avg_km_per_litre NUMERIC NOT NULL DEFAULT 5.0,
  load_factor_empty NUMERIC NOT NULL DEFAULT 1.0,
  load_factor_half NUMERIC NOT NULL DEFAULT 1.15,
  load_factor_full NUMERIC NOT NULL DEFAULT 1.35,
  route_factor_highway NUMERIC NOT NULL DEFAULT 1.0,
  route_factor_urban NUMERIC NOT NULL DEFAULT 1.25,
  route_factor_mixed NUMERIC NOT NULL DEFAULT 1.12,
  idle_fuel_per_hour NUMERIC NOT NULL DEFAULT 2.5,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_type, tenant_id)
);
ALTER TABLE public.fuel_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fuel baselines" ON public.fuel_baselines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fuel baselines" ON public.fuel_baselines FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
);

-- Fuel events (every fuel transaction)
CREATE TABLE public.fuel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES public.dispatches(id),
  vehicle_id UUID,
  driver_id UUID,
  litres_issued NUMERIC NOT NULL,
  cost_per_litre NUMERIC,
  total_cost NUMERIC,
  fuel_station TEXT,
  receipt_url TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  gps_location_name TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  tenant_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fuel events" ON public.fuel_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops and above can create fuel events" ON public.fuel_events FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);
CREATE POLICY "Ops and above can update fuel events" ON public.fuel_events FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Fuel variance reports (computed per trip)
CREATE TABLE public.fuel_variance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES public.dispatches(id),
  vehicle_id UUID,
  driver_id UUID,
  distance_km NUMERIC,
  expected_fuel_litres NUMERIC,
  actual_fuel_litres NUMERIC,
  variance_litres NUMERIC,
  variance_percent NUMERIC,
  classification TEXT NOT NULL DEFAULT 'normal',
  load_weight_kg NUMERIC,
  load_factor_used NUMERIC,
  route_factor_used NUMERIC,
  idle_hours NUMERIC DEFAULT 0,
  idle_fuel_litres NUMERIC DEFAULT 0,
  route_type TEXT DEFAULT 'mixed',
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_variance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fuel variance" ON public.fuel_variance_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert fuel variance" ON public.fuel_variance_reports FOR INSERT TO authenticated WITH CHECK (true);

-- Fuel fraud flags
CREATE TABLE public.fuel_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_event_id UUID REFERENCES public.fuel_events(id),
  dispatch_id UUID,
  driver_id UUID,
  vehicle_id UUID,
  fraud_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  investigated_by UUID,
  investigated_at TIMESTAMPTZ,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance and above can view fraud flags" ON public.fuel_fraud_flags FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "System can insert fraud flags" ON public.fuel_fraud_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update fraud flags" ON public.fuel_fraud_flags FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'finance_manager')
);

-- Fuel risk scores per driver
CREATE TABLE public.fuel_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  overall_score NUMERIC NOT NULL DEFAULT 50,
  variance_score NUMERIC DEFAULT 0,
  route_deviation_score NUMERIC DEFAULT 0,
  idling_score NUMERIC DEFAULT 0,
  fuel_request_pattern_score NUMERIC DEFAULT 0,
  driver_history_score NUMERIC DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'normal',
  ai_insights TEXT[],
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fuel risk scores" ON public.fuel_risk_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can manage fuel risk scores" ON public.fuel_risk_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_fuel_events_dispatch ON public.fuel_events(dispatch_id);
CREATE INDEX idx_fuel_events_driver ON public.fuel_events(driver_id);
CREATE INDEX idx_fuel_events_vehicle ON public.fuel_events(vehicle_id);
CREATE INDEX idx_fuel_variance_driver ON public.fuel_variance_reports(driver_id);
CREATE INDEX idx_fuel_fraud_driver ON public.fuel_fraud_flags(driver_id);
CREATE INDEX idx_fuel_risk_driver ON public.fuel_risk_scores(driver_id);

-- Triggers
CREATE TRIGGER update_fuel_baselines_updated_at BEFORE UPDATE ON public.fuel_baselines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_events_updated_at BEFORE UPDATE ON public.fuel_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_risk_scores_updated_at BEFORE UPDATE ON public.fuel_risk_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
