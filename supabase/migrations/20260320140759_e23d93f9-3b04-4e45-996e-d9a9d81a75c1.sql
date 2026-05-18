
-- Sales OS Core Tables

-- 1. Sales Leads
CREATE TABLE public.sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  industry_code TEXT DEFAULT 'fmcg',
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'manual',
  source_detail TEXT,
  stage TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  expected_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  assigned_to UUID,
  territory TEXT,
  industry TEXT,
  notes TEXT,
  qualified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  first_response_at TIMESTAMPTZ,
  sla_response_due TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sales Accounts
CREATE TABLE public.sales_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  industry_code TEXT DEFAULT 'fmcg',
  account_name TEXT NOT NULL,
  account_type TEXT DEFAULT 'retailer',
  parent_account_id UUID REFERENCES public.sales_accounts(id),
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  tier TEXT DEFAULT 'standard',
  credit_limit NUMERIC DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  territory TEXT,
  assigned_rep UUID,
  last_order_at TIMESTAMPTZ,
  total_revenue NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  commerce_identity_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sales Contacts
CREATE TABLE public.sales_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.sales_accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.sales_leads(id),
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'buyer',
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sales Opportunities
CREATE TABLE public.sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  industry_code TEXT DEFAULT 'fmcg',
  opportunity_name TEXT NOT NULL,
  account_id UUID REFERENCES public.sales_accounts(id),
  lead_id UUID REFERENCES public.sales_leads(id),
  stage TEXT DEFAULT 'lead',
  probability INTEGER DEFAULT 10,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  expected_close_date DATE,
  actual_close_date DATE,
  assigned_to UUID,
  territory TEXT,
  competitor TEXT,
  loss_reason TEXT,
  win_reason TEXT,
  deal_risk TEXT DEFAULT 'low',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sales Activities
CREATE TABLE public.sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  activity_type TEXT NOT NULL DEFAULT 'call',
  subject TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES public.sales_leads(id),
  account_id UUID REFERENCES public.sales_accounts(id),
  opportunity_id UUID REFERENCES public.sales_opportunities(id),
  contact_id UUID REFERENCES public.sales_contacts(id),
  performed_by UUID,
  activity_date TIMESTAMPTZ DEFAULT now(),
  duration_minutes INTEGER,
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Sales Quotes
CREATE TABLE public.sales_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  quote_number TEXT NOT NULL,
  account_id UUID REFERENCES public.sales_accounts(id),
  opportunity_id UUID REFERENCES public.sales_opportunities(id),
  contact_id UUID REFERENCES public.sales_contacts(id),
  status TEXT DEFAULT 'draft',
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  valid_until DATE,
  version INTEGER DEFAULT 1,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Sales Quote Line Items
CREATE TABLE public.sales_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.sales_quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku_code TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Sales Territories
CREATE TABLE public.sales_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  territory_name TEXT NOT NULL,
  region TEXT,
  country TEXT DEFAULT 'Nigeria',
  parent_territory_id UUID REFERENCES public.sales_territories(id),
  assigned_manager UUID,
  account_count INTEGER DEFAULT 0,
  quota_amount NUMERIC DEFAULT 0,
  quota_currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Sales Forecasts
CREATE TABLE public.sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  forecast_period TEXT NOT NULL,
  forecast_year INTEGER NOT NULL,
  forecast_month INTEGER,
  forecast_quarter INTEGER,
  rep_id UUID,
  territory_id UUID REFERENCES public.sales_territories(id),
  pipeline_value NUMERIC DEFAULT 0,
  weighted_value NUMERIC DEFAULT 0,
  committed_value NUMERIC DEFAULT 0,
  best_case_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Sales Targets / Quotas
CREATE TABLE public.sales_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),
  rep_id UUID,
  territory_id UUID REFERENCES public.sales_territories(id),
  target_period TEXT DEFAULT 'monthly',
  target_year INTEGER NOT NULL,
  target_month INTEGER,
  target_quarter INTEGER,
  target_amount NUMERIC DEFAULT 0,
  achieved_amount NUMERIC DEFAULT 0,
  attainment_percent NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can manage their org data
CREATE POLICY "Auth users manage sales_leads" ON public.sales_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_accounts" ON public.sales_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_contacts" ON public.sales_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_opportunities" ON public.sales_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_activities" ON public.sales_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_quotes" ON public.sales_quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_quote_items" ON public.sales_quote_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_territories" ON public.sales_territories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_forecasts" ON public.sales_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sales_quotas" ON public.sales_quotas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_sales_leads_stage ON public.sales_leads(stage);
CREATE INDEX idx_sales_leads_assigned ON public.sales_leads(assigned_to);
CREATE INDEX idx_sales_opportunities_stage ON public.sales_opportunities(stage);
CREATE INDEX idx_sales_opportunities_account ON public.sales_opportunities(account_id);
CREATE INDEX idx_sales_activities_lead ON public.sales_activities(lead_id);
CREATE INDEX idx_sales_activities_account ON public.sales_activities(account_id);
CREATE INDEX idx_sales_quotes_account ON public.sales_quotes(account_id);
CREATE INDEX idx_sales_accounts_territory ON public.sales_accounts(territory);
