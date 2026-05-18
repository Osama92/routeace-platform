-- Vehicle Maintenance Records
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change', 'spare_parts', 'service_log', 'tire_replacement', 'brake_service', 'engine_repair', 'general_inspection', 'other')),
  description TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  odometer_reading NUMERIC DEFAULT 0,
  performed_by TEXT,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_maintenance_km NUMERIC,
  next_maintenance_date TIMESTAMP WITH TIME ZONE,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vehicle Mileage Tracking
CREATE TABLE IF NOT EXISTS public.vehicle_mileage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  odometer_reading NUMERIC NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reading_source TEXT DEFAULT 'manual' CHECK (reading_source IN ('manual', 'gps', 'system')),
  gps_distance_km NUMERIC DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for one reading per vehicle per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_mileage_daily ON public.vehicle_mileage_tracking(vehicle_id, reading_date);

-- Maintenance Alerts Configuration
CREATE TABLE IF NOT EXISTS public.maintenance_alert_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('mileage_interval', 'time_interval', 'overdue_service')),
  mileage_threshold NUMERIC DEFAULT 5000,
  days_threshold INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default maintenance alerts
INSERT INTO public.maintenance_alert_config (alert_type, mileage_threshold, days_threshold) VALUES
('mileage_interval', 5000, NULL),
('time_interval', NULL, 30),
('overdue_service', NULL, 7)
ON CONFLICT DO NOTHING;

-- KPI Metrics Table
CREATE TABLE IF NOT EXISTS public.kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('leading', 'lagging')),
  metric_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC,
  unit TEXT DEFAULT 'count',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast KPI queries
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_role_period ON public.kpi_metrics(role, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_entity ON public.kpi_metrics(entity_id, entity_type);

-- Payroll Reconciliation Log
CREATE TABLE IF NOT EXISTS public.payroll_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  ledger_gross NUMERIC DEFAULT 0,
  ledger_tax NUMERIC DEFAULT 0,
  ledger_net NUMERIC DEFAULT 0,
  variance_gross NUMERIC DEFAULT 0,
  variance_tax NUMERIC DEFAULT 0,
  variance_net NUMERIC DEFAULT 0,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for one reconciliation per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_reconciliation_period ON public.payroll_reconciliation(period_month, period_year);

-- Add mileage columns to vehicles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'current_odometer') THEN
    ALTER TABLE public.vehicles ADD COLUMN current_odometer NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'lifetime_km') THEN
    ALTER TABLE public.vehicles ADD COLUMN lifetime_km NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'weekly_km') THEN
    ALTER TABLE public.vehicles ADD COLUMN weekly_km NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'monthly_km') THEN
    ALTER TABLE public.vehicles ADD COLUMN monthly_km NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'health_score') THEN
    ALTER TABLE public.vehicles ADD COLUMN health_score INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'last_service_km') THEN
    ALTER TABLE public.vehicles ADD COLUMN last_service_km NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_mileage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_maintenance_records (using user_roles table)
CREATE POLICY "Users can view vehicle maintenance records" ON public.vehicle_maintenance_records
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage vehicle maintenance records" ON public.vehicle_maintenance_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager'))
  );

-- RLS Policies for vehicle_mileage_tracking
CREATE POLICY "Users can view vehicle mileage" ON public.vehicle_mileage_tracking
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage vehicle mileage" ON public.vehicle_mileage_tracking
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager'))
  );

-- RLS Policies for maintenance_alert_config
CREATE POLICY "Users can view maintenance alerts" ON public.maintenance_alert_config
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage maintenance alerts" ON public.maintenance_alert_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for kpi_metrics
CREATE POLICY "Users can view KPI metrics" ON public.kpi_metrics
  FOR SELECT USING (true);
CREATE POLICY "System can insert KPI metrics" ON public.kpi_metrics
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage KPI metrics" ON public.kpi_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for payroll_reconciliation
CREATE POLICY "Finance can view payroll reconciliation" ON public.payroll_reconciliation
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager'))
  );
CREATE POLICY "Finance can manage payroll reconciliation" ON public.payroll_reconciliation
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'finance_manager'))
  );