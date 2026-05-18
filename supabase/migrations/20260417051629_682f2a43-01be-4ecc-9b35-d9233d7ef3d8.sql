
CREATE TABLE IF NOT EXISTS public.vehicle_health_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('injector','brakes','tyres','engine','transmission','battery','suspension','coolant')),
  last_serviced_date DATE,
  service_interval_months INTEGER DEFAULT 6,
  health_score NUMERIC DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  component_status TEXT DEFAULT 'healthy' CHECK (component_status IN ('healthy','degrading','overdue','critical')),
  last_inspection_notes TEXT,
  flagged_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, component_type)
);

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  prediction_id UUID,
  vendor_id UUID,
  service_type TEXT NOT NULL,
  component_type TEXT,
  scheduled_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','immediate')),
  schedule_status TEXT DEFAULT 'scheduled' CHECK (schedule_status IN ('scheduled','in_progress','completed','cancelled','overdue')),
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  blocks_dispatch BOOLEAN DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  business_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  service_locations TEXT[] DEFAULT '{}',
  service_categories TEXT[] DEFAULT '{}',
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  avg_rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  avg_turnaround_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_partners(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  currency TEXT DEFAULT 'NGN',
  estimated_hours NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_partners(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  parts_quality_rating INTEGER CHECK (parts_quality_rating BETWEEN 1 AND 5),
  price_fairness_rating INTEGER CHECK (price_fairness_rating BETWEEN 1 AND 5),
  reliability_rating INTEGER CHECK (reliability_rating BETWEEN 1 AND 5),
  overall_rating NUMERIC GENERATED ALWAYS AS (
    (COALESCE(parts_quality_rating,0)::numeric * 0.4 + COALESCE(price_fairness_rating,0)::numeric * 0.3 + COALESCE(reliability_rating,0)::numeric * 0.3)
  ) STORED,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID,
  vehicle_id UUID,
  driver_id UUID,
  expected_fuel_litres NUMERIC,
  issued_fuel_litres NUMERIC,
  variance_litres NUMERIC,
  variance_percent NUMERIC,
  cost_impact NUMERIC,
  fraud_classification TEXT CHECK (fraud_classification IN ('normal','suspicious','high_risk_fraud')),
  root_causes JSONB DEFAULT '[]'::jsonb,
  driver_behavior_factors JSONB DEFAULT '{}'::jsonb,
  maintenance_factors JSONB DEFAULT '{}'::jsonb,
  ai_conclusion TEXT,
  investigation_status TEXT DEFAULT 'open' CHECK (investigation_status IN ('open','investigating','resolved','dismissed','escalated')),
  action_taken TEXT,
  investigated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vhc_vehicle ON public.vehicle_health_components(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ms_vehicle ON public.maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ms_vendor ON public.maintenance_schedules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vs_vendor ON public.vendor_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vr_vendor ON public.vendor_ratings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_fi_dispatch ON public.fuel_investigations(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_fi_vehicle ON public.fuel_investigations(vehicle_id);

ALTER TABLE public.vehicle_health_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view vehicle health" ON public.vehicle_health_components FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager') OR has_role(auth.uid(),'finance_manager'));
CREATE POLICY "Staff manage vehicle health" ON public.vehicle_health_components FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager'));

CREATE POLICY "Staff view schedules" ON public.maintenance_schedules FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager') OR has_role(auth.uid(),'finance_manager'));
CREATE POLICY "Staff manage schedules" ON public.maintenance_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager'));

CREATE POLICY "Anyone authenticated views active vendors" ON public.vendor_partners FOR SELECT TO authenticated
  USING (is_active = true OR user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Vendors manage own profile" ON public.vendor_partners FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Anyone views active services" ON public.vendor_services FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM vendor_partners vp WHERE vp.id = vendor_id AND vp.user_id = auth.uid()) OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Vendors manage own services" ON public.vendor_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM vendor_partners vp WHERE vp.id = vendor_id AND vp.user_id = auth.uid()) OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM vendor_partners vp WHERE vp.id = vendor_id AND vp.user_id = auth.uid()) OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Authenticated view ratings" ON public.vendor_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers create ratings" ON public.vendor_ratings FOR INSERT TO authenticated WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Customers update own ratings" ON public.vendor_ratings FOR UPDATE TO authenticated
  USING (customer_user_id = auth.uid()) WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Staff view investigations" ON public.fuel_investigations FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'ops_manager') OR has_role(auth.uid(),'finance_manager'));
CREATE POLICY "Staff manage investigations" ON public.fuel_investigations FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager') OR has_role(auth.uid(),'finance_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ops_manager') OR has_role(auth.uid(),'finance_manager'));

CREATE TRIGGER trg_vhc_updated BEFORE UPDATE ON public.vehicle_health_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ms_updated BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.vendor_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vs_updated BEFORE UPDATE ON public.vendor_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fi_updated BEFORE UPDATE ON public.fuel_investigations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_vendor_avg_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.vendor_partners
  SET avg_rating = COALESCE((SELECT AVG(overall_rating) FROM public.vendor_ratings WHERE vendor_id = NEW.vendor_id), 0),
      total_reviews = (SELECT COUNT(*) FROM public.vendor_ratings WHERE vendor_id = NEW.vendor_id)
  WHERE id = NEW.vendor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_rating_update AFTER INSERT OR UPDATE ON public.vendor_ratings FOR EACH ROW EXECUTE FUNCTION public.update_vendor_avg_rating();
