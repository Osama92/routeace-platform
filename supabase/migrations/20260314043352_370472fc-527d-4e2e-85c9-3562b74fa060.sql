
-- Fleet Maintenance Work Orders (for TTR/MTTR tracking)
CREATE TABLE public.fleet_maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.fmcg_fleet_tracking(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'corrective',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  failure_type TEXT,
  assigned_technician TEXT,
  assigned_to_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  parts_ordered_at TIMESTAMPTZ,
  parts_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  downtime_hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
    ELSE NULL END
  ) STORED,
  repair_hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600
    ELSE NULL END
  ) STORED,
  parts_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (COALESCE(parts_cost, 0) + COALESCE(labor_cost, 0)) STORED,
  is_repeat_repair BOOLEAN DEFAULT false,
  root_cause TEXT,
  notes TEXT,
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fleet Downtime Log (daily availability tracking)
CREATE TABLE public.fleet_downtime_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.fmcg_fleet_tracking(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  downtime_reason TEXT,
  maintenance_order_id UUID REFERENCES public.fleet_maintenance_orders(id),
  hours_available NUMERIC DEFAULT 24,
  hours_down NUMERIC DEFAULT 0,
  notes TEXT,
  logged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, log_date)
);

-- Fleet KPI Snapshots (aggregated KPIs)
CREATE TABLE public.fleet_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.fmcg_fleet_tracking(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'fleet',
  scope_ref TEXT,
  days_available INTEGER DEFAULT 0,
  days_down INTEGER DEFAULT 0,
  uptime_pct NUMERIC DEFAULT 0,
  mttr_hours NUMERIC DEFAULT 0,
  mtbf_hours NUMERIC DEFAULT 0,
  total_cost_ownership NUMERIC DEFAULT 0,
  cost_per_km NUMERIC DEFAULT 0,
  cost_per_delivery NUMERIC DEFAULT 0,
  maintenance_cost NUMERIC DEFAULT 0,
  fuel_cost NUMERIC DEFAULT 0,
  utilization_rate_pct NUMERIC DEFAULT 0,
  idle_time_pct NUMERIC DEFAULT 0,
  empty_miles_pct NUMERIC DEFAULT 0,
  route_deviation_rate NUMERIC DEFAULT 0,
  avg_load_factor_pct NUMERIC DEFAULT 0,
  pm_compliance_pct NUMERIC DEFAULT 0,
  scheduled_vs_unscheduled_ratio NUMERIC DEFAULT 0,
  repeat_repair_pct NUMERIC DEFAULT 0,
  driver_behavior_score NUMERIC DEFAULT 0,
  accident_rate NUMERIC DEFAULT 0,
  dvir_compliance_pct NUMERIC DEFAULT 0,
  on_time_delivery_pct NUMERIC DEFAULT 0,
  first_attempt_success_pct NUMERIC DEFAULT 0,
  carbon_per_km NUMERIC DEFAULT 0,
  hos_compliance_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Driver Performance Tracking
CREATE TABLE public.fleet_driver_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name TEXT NOT NULL,
  driver_user_id UUID,
  vehicle_id UUID REFERENCES public.fmcg_fleet_tracking(id) ON DELETE SET NULL,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  harsh_braking_count INTEGER DEFAULT 0,
  speeding_count INTEGER DEFAULT 0,
  rapid_accel_count INTEGER DEFAULT 0,
  idle_minutes INTEGER DEFAULT 0,
  overall_score NUMERIC DEFAULT 100,
  deliveries_completed INTEGER DEFAULT 0,
  deliveries_on_time INTEGER DEFAULT 0,
  first_attempt_success INTEGER DEFAULT 0,
  route_deviation_km NUMERIC DEFAULT 0,
  dvir_completed BOOLEAN DEFAULT false,
  hos_compliant BOOLEAN DEFAULT true,
  fuel_consumed_liters NUMERIC DEFAULT 0,
  distance_km NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_name, score_date)
);

-- RLS
ALTER TABLE public.fleet_maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_downtime_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_driver_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read fleet maintenance orders"
  ON public.fleet_maintenance_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops admin manage fleet maintenance orders"
  ON public.fleet_maintenance_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));
CREATE POLICY "Ops admin update fleet maintenance orders"
  ON public.fleet_maintenance_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));
CREATE POLICY "Ops admin delete fleet maintenance orders"
  ON public.fleet_maintenance_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "Authenticated read fleet downtime log"
  ON public.fleet_downtime_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops admin manage fleet downtime log"
  ON public.fleet_downtime_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));
CREATE POLICY "Ops admin update fleet downtime log"
  ON public.fleet_downtime_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "Authenticated read fleet kpi snapshots"
  ON public.fleet_kpi_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops admin manage fleet kpi snapshots"
  ON public.fleet_kpi_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "Authenticated read fleet driver scores"
  ON public.fleet_driver_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops admin manage fleet driver scores"
  ON public.fleet_driver_scores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));
CREATE POLICY "Ops admin update fleet driver scores"
  ON public.fleet_driver_scores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE INDEX idx_fleet_maint_vehicle ON public.fleet_maintenance_orders(vehicle_id);
CREATE INDEX idx_fleet_maint_status ON public.fleet_maintenance_orders(status);
CREATE INDEX idx_fleet_downtime_date ON public.fleet_downtime_log(log_date);
CREATE INDEX idx_fleet_kpi_date ON public.fleet_kpi_snapshots(snapshot_date);
CREATE INDEX idx_fleet_driver_date ON public.fleet_driver_scores(score_date);
