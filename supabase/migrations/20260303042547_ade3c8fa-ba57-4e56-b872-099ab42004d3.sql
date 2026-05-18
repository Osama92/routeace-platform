
-- Industry OS Core Tables

-- Industries registry
CREATE TABLE public.industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT,
  color_primary TEXT,
  color_secondary TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read industries" ON public.industries FOR SELECT USING (true);

-- Seed all industries
INSERT INTO public.industries (code, name, display_name, icon, color_primary, color_secondary, description) VALUES
  ('fmcg', 'FMCG', 'RouteAce FMCG OS', 'Store', '142 76% 36%', '173 80% 40%', 'Fast-Moving Consumer Goods distribution intelligence'),
  ('liquor', 'Liquor', 'RouteAce Liquor OS', 'Wine', '0 72% 51%', '348 83% 47%', 'Beverage distribution with excise & compliance tracking'),
  ('agri', 'Agri-Inputs', 'RouteAce Agri OS', 'Wheat', '83 78% 41%', '120 61% 34%', 'Agricultural input distribution with crop-cycle intelligence'),
  ('pharma', 'Pharmaceuticals', 'RouteAce Pharma OS', 'Pill', '199 89% 48%', '210 79% 42%', 'Pharmaceutical distribution with prescription tracking'),
  ('building', 'Building Materials', 'RouteAce Build OS', 'HardHat', '25 95% 53%', '32 95% 44%', 'Construction material distribution with project tracking'),
  ('cosmetics', 'Cosmetics', 'RouteAce Beauty OS', 'Sparkles', '330 81% 60%', '316 72% 52%', 'Beauty & cosmetics distribution with campaign intelligence'),
  ('bfsi', 'BFSI', 'RouteAce Finance OS', 'Landmark', '217 91% 60%', '224 76% 48%', 'Banking & financial services agent network management'),
  ('auto', 'Auto-Ancillary', 'RouteAce Auto OS', 'Wrench', '45 93% 47%', '38 92% 50%', 'Automotive parts distribution with workshop intelligence'),
  ('consumer', 'Consumer Goods', 'RouteAce Consumer OS', 'ShoppingBag', '262 83% 58%', '270 76% 50%', 'General consumer goods distribution management'),
  ('other', 'Others', 'RouteAce Industry OS', 'Factory', '220 14% 46%', '220 9% 36%', 'Custom industry distribution operating system');

-- Industry tenants - links organizations to their industry
CREATE TABLE public.industry_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  industry_code TEXT NOT NULL REFERENCES public.industries(code),
  tenant_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, industry_code)
);

ALTER TABLE public.industry_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org industry tenants" ON public.industry_tenants
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage industry tenants" ON public.industry_tenants
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

-- Industry-specific KPIs definition table
CREATE TABLE public.industry_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_code TEXT NOT NULL REFERENCES public.industries(code),
  kpi_name TEXT NOT NULL,
  kpi_key TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT DEFAULT '%',
  description TEXT,
  target_value NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(industry_code, kpi_key)
);

ALTER TABLE public.industry_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read industry KPIs" ON public.industry_kpis FOR SELECT USING (true);

-- Seed industry-specific KPIs
INSERT INTO public.industry_kpis (industry_code, kpi_name, kpi_key, category, unit, description) VALUES
  ('liquor', 'Case Movement Velocity', 'case_velocity', 'Sales', 'cases/day', 'Daily case movement rate'),
  ('liquor', 'Outlet Compliance Rate', 'outlet_compliance', 'Compliance', '%', 'Age verification and excise compliance'),
  ('liquor', 'Regional Brand Penetration', 'brand_penetration', 'Distribution', '%', 'Brand penetration per region'),
  ('liquor', 'Bottle Return Rate', 'bottle_return_rate', 'Operations', '%', 'Returned bottles as % of sold'),
  ('agri', 'Agro-Dealer Coverage', 'dealer_coverage', 'Distribution', '%', 'Coverage of mapped agro-dealers'),
  ('agri', 'Seasonal Order Capture', 'seasonal_capture', 'Sales', '%', 'Orders captured during season'),
  ('agri', 'Input Adoption Rate', 'input_adoption', 'Sales', '%', 'Farmer adoption of recommended inputs'),
  ('pharma', 'Prescription Uplift', 'rx_uplift', 'Sales', '%', 'Increase in prescriptions post-visit'),
  ('pharma', 'Doctor Coverage Ratio', 'doctor_coverage', 'Distribution', '%', 'Doctors visited vs total mapped'),
  ('pharma', 'Sample-to-Sale Conversion', 'sample_conversion', 'Sales', '%', 'Samples that led to prescriptions'),
  ('building', 'Project Pipeline Conversion', 'project_conversion', 'Sales', '%', 'Projects converting to orders'),
  ('building', 'Site Coverage', 'site_coverage', 'Distribution', '%', 'Construction sites covered'),
  ('building', 'Bulk Order Velocity', 'bulk_velocity', 'Sales', 'orders/week', 'Weekly bulk order rate'),
  ('cosmetics', 'Counter Conversion Rate', 'counter_conversion', 'Sales', '%', 'In-store counter conversions'),
  ('cosmetics', 'Campaign ROI', 'campaign_roi', 'Marketing', '%', 'Return on campaign investment'),
  ('cosmetics', 'Retail Shelf Share', 'shelf_share', 'Distribution', '%', 'Share of retail shelf space'),
  ('bfsi', 'Loan Book Growth', 'loan_growth', 'Sales', '%', 'Monthly loan book growth rate'),
  ('bfsi', 'Agent Productivity', 'agent_productivity', 'Operations', 'deals/agent', 'Deals per agent per month'),
  ('bfsi', 'Portfolio-at-Risk', 'par_rate', 'Risk', '%', 'Portfolio at risk percentage'),
  ('auto', 'Parts Penetration', 'parts_penetration', 'Distribution', '%', 'Parts penetration in workshops'),
  ('auto', 'Workshop Activation Rate', 'workshop_activation', 'Sales', '%', 'Active workshops vs mapped'),
  ('auto', 'Territory Fill Rate', 'territory_fill', 'Distribution', '%', 'Territory fill rate for parts');

-- Add industry_code to existing FMCG tables for multi-industry support
ALTER TABLE public.fmcg_outlets ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_orders ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_skus ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_deliveries ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_stock_levels ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_reconciliation ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_trade_promotions ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_retailer_credit ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_distributors ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_beat_plans ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_field_visits ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
ALTER TABLE public.fmcg_benchmark_index ADD COLUMN IF NOT EXISTS industry_code TEXT DEFAULT 'fmcg';
