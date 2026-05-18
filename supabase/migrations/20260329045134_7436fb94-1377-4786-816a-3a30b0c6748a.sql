
-- Revenue Optimization Engine Tables

-- Route profitability metrics (aggregated)
CREATE TABLE public.route_profitability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_hash TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  total_trips INTEGER DEFAULT 0,
  avg_revenue NUMERIC DEFAULT 0,
  avg_cost NUMERIC DEFAULT 0,
  avg_profit NUMERIC DEFAULT 0,
  avg_margin NUMERIC DEFAULT 0,
  demand_score NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Demand signals per route
CREATE TABLE public.demand_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_hash TEXT NOT NULL,
  hour INTEGER,
  request_count INTEGER DEFAULT 0,
  avg_dispatch_delay NUMERIC DEFAULT 0,
  demand_score NUMERIC DEFAULT 0,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dynamic pricing adjustments
CREATE TABLE public.pricing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_hash TEXT NOT NULL,
  vehicle_type TEXT,
  base_price NUMERIC DEFAULT 0,
  recommended_price NUMERIC DEFAULT 0,
  minimum_price NUMERIC DEFAULT 0,
  margin_target NUMERIC DEFAULT 15,
  demand_multiplier NUMERIC DEFAULT 1.0,
  fuel_multiplier NUMERIC DEFAULT 1.0,
  is_auto_pricing BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fuel price index
CREATE TABLE public.fuel_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'NG',
  fuel_type TEXT DEFAULT 'diesel',
  fuel_price_per_liter NUMERIC NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client profitability summary
CREATE TABLE public.client_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.customers(id),
  total_revenue NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  avg_margin NUMERIC DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  late_payment_count INTEGER DEFAULT 0,
  late_payment_rate NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  classification TEXT DEFAULT 'standard',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Margin protection rules
CREATE TABLE public.margin_protection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  min_margin_percent NUMERIC DEFAULT 15,
  action_on_breach TEXT DEFAULT 'warn',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_profitability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_protection_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin/Finance read access
CREATE POLICY "Admin and finance can read route metrics" ON public.route_profitability_metrics FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Admin can manage route metrics" ON public.route_profitability_metrics FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin and finance can read demand signals" ON public.demand_signals FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Admin can manage demand signals" ON public.demand_signals FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin and finance can read pricing adjustments" ON public.pricing_adjustments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Admin can manage pricing adjustments" ON public.pricing_adjustments FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can read fuel index" ON public.fuel_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage fuel index" ON public.fuel_index FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin and finance can read client profitability" ON public.client_profitability FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Admin can manage client profitability" ON public.client_profitability FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin can read margin rules" ON public.margin_protection_rules FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);
CREATE POLICY "Admin can manage margin rules" ON public.margin_protection_rules FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);
