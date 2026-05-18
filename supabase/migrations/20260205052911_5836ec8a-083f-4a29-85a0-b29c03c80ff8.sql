-- =========================================================
-- SECTION A: SOP OWD (Operational Work Diagnosis) Reports
-- =========================================================

-- SOP Diagnosis/OWD table to store analysis results
CREATE TABLE IF NOT EXISTS public.sop_owd_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.ops_sops(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_status TEXT NOT NULL DEFAULT 'valid' CHECK (overall_status IN ('valid', 'needs_update', 'critical_blocker')),
  missing_steps JSONB DEFAULT '[]'::jsonb,
  logic_flow_issues JSONB DEFAULT '[]'::jsonb,
  dependency_violations JSONB DEFAULT '[]'::jsonb,
  compliance_gaps JSONB DEFAULT '[]'::jsonb,
  redundant_tasks JSONB DEFAULT '[]'::jsonb,
  step_statuses JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sop_owd_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for sop_owd_reports
CREATE POLICY "Ops/Admins can view OWD reports" ON public.sop_owd_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Ops managers can create OWD reports" ON public.sop_owd_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin')
    )
  );

-- =========================================================
-- SECTION E: Email Notification CC System
-- =========================================================

-- Email activity log table
CREATE TABLE IF NOT EXISTS public.email_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_notification_id UUID REFERENCES public.email_notifications(id),
  original_recipient TEXT NOT NULL,
  cc_recipients TEXT[] DEFAULT '{}',
  sender_email TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  dispatch_id UUID REFERENCES public.dispatches(id),
  invoice_id UUID REFERENCES public.invoices(id),
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_activity_log
CREATE POLICY "Admins can view email logs" ON public.email_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('org_admin', 'super_admin', 'admin', 'finance_manager')
    )
  );

CREATE POLICY "System can insert email logs" ON public.email_activity_log
  FOR INSERT WITH CHECK (true);

-- =========================================================
-- NEW KPIs: Average Wait Days & Profit Margin per Asset
-- =========================================================

-- Truck arrival/loading tracking table for wait time calculation
CREATE TABLE IF NOT EXISTS public.truck_wait_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  customer_id UUID REFERENCES public.customers(id),
  site_name TEXT,
  arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  loading_timestamp TIMESTAMP WITH TIME ZONE,
  exit_timestamp TIMESTAMP WITH TIME ZONE,
  wait_status TEXT NOT NULL DEFAULT 'waiting' CHECK (wait_status IN ('waiting', 'loaded', 'cancelled', 'departed_empty')),
  wait_reason TEXT CHECK (wait_reason IN ('supply_shortage', 'no_customer_order', 'equipment_issue', 'weather', 'other')),
  wait_hours NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truck_wait_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for truck_wait_tracking
CREATE POLICY "Ops and admins can view wait tracking" ON public.truck_wait_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin', 'admin', 'dispatcher')
    )
  );

CREATE POLICY "Ops can manage wait tracking" ON public.truck_wait_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'dispatcher')
    )
  );

-- Asset profitability tracking table
CREATE TABLE IF NOT EXISTS public.asset_profitability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('truck', 'trailer', 'leased_equipment')),
  asset_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Revenue components
  delivery_revenue NUMERIC(12,2) DEFAULT 0,
  rental_income NUMERIC(12,2) DEFAULT 0,
  trip_fees NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  -- Cost components  
  fuel_cost NUMERIC(12,2) DEFAULT 0,
  driver_payroll_cost NUMERIC(12,2) DEFAULT 0,
  maintenance_cost NUMERIC(12,2) DEFAULT 0,
  depreciation_cost NUMERIC(12,2) DEFAULT 0,
  financing_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  -- Calculated metrics
  net_profit NUMERIC(12,2) DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_type, asset_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.asset_profitability ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_profitability
CREATE POLICY "Finance and admins can view profitability" ON public.asset_profitability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('finance_manager', 'org_admin', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Finance can manage profitability" ON public.asset_profitability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('finance_manager', 'org_admin', 'super_admin')
    )
  );

-- =========================================================
-- SECTION K & L: Order Ingestion from External Sources
-- =========================================================

-- External order sources table
CREATE TABLE IF NOT EXISTS public.external_order_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('website', 'google_form', 'wordpress', 'api', 'whatsapp', 'landing_page')),
  source_name TEXT NOT NULL,
  source_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT,
  api_key_hash TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_order_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for external_order_sources
CREATE POLICY "Admins can manage order sources" ON public.external_order_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('org_admin', 'super_admin', 'admin')
    )
  );

-- Incoming orders inbox table
CREATE TABLE IF NOT EXISTS public.order_inbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.external_order_sources(id),
  source_type TEXT NOT NULL,
  source_channel TEXT,
  raw_data JSONB NOT NULL,
  parsed_customer_name TEXT,
  parsed_pickup_address TEXT,
  parsed_delivery_address TEXT,
  parsed_contact_phone TEXT,
  parsed_contact_email TEXT,
  parsed_cargo_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'converted', 'rejected', 'duplicate')),
  converted_dispatch_id UUID REFERENCES public.dispatches(id),
  converted_customer_id UUID REFERENCES public.customers(id),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_inbox ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_inbox
CREATE POLICY "Ops and admins can view order inbox" ON public.order_inbox
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin', 'admin', 'dispatcher')
    )
  );

CREATE POLICY "Ops can manage order inbox" ON public.order_inbox
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin', 'dispatcher')
    )
  );

-- Order source analytics
CREATE TABLE IF NOT EXISTS public.order_source_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.external_order_sources(id),
  source_type TEXT NOT NULL,
  period_date DATE NOT NULL,
  orders_received INTEGER DEFAULT 0,
  orders_converted INTEGER DEFAULT 0,
  orders_rejected INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  avg_processing_time_minutes NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_id, period_date)
);

-- Enable RLS
ALTER TABLE public.order_source_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_source_analytics
CREATE POLICY "Admins can view source analytics" ON public.order_source_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('ops_manager', 'org_admin', 'super_admin', 'admin')
    )
  );

-- =========================================================
-- Indexes for performance
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_truck_wait_tracking_dispatch ON public.truck_wait_tracking(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_truck_wait_tracking_status ON public.truck_wait_tracking(wait_status);
CREATE INDEX IF NOT EXISTS idx_truck_wait_tracking_arrival ON public.truck_wait_tracking(arrival_timestamp);
CREATE INDEX IF NOT EXISTS idx_asset_profitability_asset ON public.asset_profitability(asset_type, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_profitability_period ON public.asset_profitability(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_order_inbox_status ON public.order_inbox(status);
CREATE INDEX IF NOT EXISTS idx_order_inbox_received ON public.order_inbox(received_at);
CREATE INDEX IF NOT EXISTS idx_email_activity_log_sent ON public.email_activity_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_sop_owd_reports_sop ON public.sop_owd_reports(sop_id);