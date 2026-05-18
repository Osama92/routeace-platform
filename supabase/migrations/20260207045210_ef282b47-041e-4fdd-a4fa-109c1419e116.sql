-- Investor Metrics Tables
CREATE TABLE IF NOT EXISTS public.investor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_formula TEXT,
  data_source TEXT,
  update_frequency VARCHAR(50) DEFAULT 'daily',
  known_limitations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_investor_metrics_date ON public.investor_metrics(metric_date);
CREATE INDEX idx_investor_metrics_type ON public.investor_metrics(metric_type);

-- Customer Cohorts
CREATE TABLE IF NOT EXISTS public.customer_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  signup_month DATE NOT NULL,
  first_order_month DATE,
  cohort_label VARCHAR(50),
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  is_churned BOOLEAN DEFAULT FALSE,
  churn_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_cohorts_signup ON public.customer_cohorts(signup_month);

-- Route Plans
CREATE TABLE IF NOT EXISTS public.route_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  waypoints JSONB DEFAULT '[]',
  alternate_routes JSONB DEFAULT '[]',
  selected_route_index INTEGER DEFAULT 0,
  distance_km NUMERIC,
  estimated_fuel_cost NUMERIC,
  toll_fees NUMERIC DEFAULT 0,
  driver_time_cost NUMERIC,
  risk_premium NUMERIC DEFAULT 0,
  maintenance_cost NUMERIC,
  total_cost NUMERIC,
  cost_efficiency_score NUMERIC,
  time_efficiency_score NUMERIC,
  risk_score NUMERIC,
  override_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_plans_created ON public.route_plans(created_at);

-- White Label Configuration
CREATE TABLE IF NOT EXISTS public.white_label_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  brand_name VARCHAR(255) NOT NULL,
  brand_suffix VARCHAR(50),
  show_powered_by BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  apply_to_customer_portal BOOLEAN DEFAULT TRUE,
  apply_to_tracking BOOLEAN DEFAULT TRUE,
  apply_to_reports BOOLEAN DEFAULT TRUE,
  apply_to_emails BOOLEAN DEFAULT TRUE,
  apply_to_invoices BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier VARCHAR(50) DEFAULT 'enterprise',
  monthly_cost NUMERIC DEFAULT 0,
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dynamic Pricing Configuration
CREATE TABLE IF NOT EXISTS public.dynamic_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id),
  base_price NUMERIC NOT NULL,
  demand_multiplier NUMERIC DEFAULT 1.0,
  availability_multiplier NUMERIC DEFAULT 1.0,
  fuel_multiplier NUMERIC DEFAULT 1.0,
  risk_multiplier NUMERIC DEFAULT 1.0,
  min_multiplier NUMERIC DEFAULT 0.8,
  max_multiplier NUMERIC DEFAULT 2.0,
  demand_weight NUMERIC DEFAULT 0.3,
  availability_weight NUMERIC DEFAULT 0.25,
  fuel_weight NUMERIC DEFAULT 0.25,
  risk_weight NUMERIC DEFAULT 0.2,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Route Blacklist
CREATE TABLE IF NOT EXISTS public.route_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id),
  route_name VARCHAR(255),
  origin TEXT,
  destination TEXT,
  blacklist_reason TEXT NOT NULL,
  loss_amount NUMERIC,
  blacklisted_by UUID,
  blacklisted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Investor Access Logs
CREATE TABLE IF NOT EXISTS public.investor_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  access_type VARCHAR(50),
  resource_accessed TEXT,
  ip_address TEXT,
  user_agent TEXT,
  nda_acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue Channel Tracking
CREATE TABLE IF NOT EXISTS public.revenue_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name VARCHAR(100) NOT NULL,
  channel_type VARCHAR(50),
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  conversion_rate NUMERIC,
  customer_acquisition_cost NUMERIC,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins can manage investor_metrics" ON public.investor_metrics
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_finance_manager(auth.uid())
  );

CREATE POLICY "Admins can manage customer_cohorts" ON public.customer_cohorts
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_finance_manager(auth.uid())
  );

CREATE POLICY "Ops and admins can manage route_plans" ON public.route_plans
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_ops_manager(auth.uid())
  );

CREATE POLICY "Admins can manage white_label_config" ON public.white_label_config
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid())
  );

CREATE POLICY "Admins can manage dynamic_pricing_config" ON public.dynamic_pricing_config
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_finance_manager(auth.uid())
  );

CREATE POLICY "Admins can manage route_blacklist" ON public.route_blacklist
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_ops_manager(auth.uid())
  );

CREATE POLICY "Admins can view investor_access_logs" ON public.investor_access_logs
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid())
  );

CREATE POLICY "System can insert investor_access_logs" ON public.investor_access_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage revenue_channels" ON public.revenue_channels
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.is_finance_manager(auth.uid())
  );