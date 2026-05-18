
-- =============================================================
-- HIERARCHICAL ACCESS GOVERNANCE
-- =============================================================

-- Role hierarchy definition
CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role TEXT NOT NULL,
  child_role TEXT NOT NULL,
  os_context TEXT NOT NULL DEFAULT 'fmcg',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_role, child_role, os_context)
);

ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role hierarchy"
  ON public.role_hierarchy FOR SELECT TO authenticated
  USING (true);

-- Seed FMCG hierarchy
INSERT INTO public.role_hierarchy (parent_role, child_role, os_context) VALUES
  ('strategic_leadership', 'regional_sales_manager', 'fmcg'),
  ('regional_sales_manager', 'area_sales_manager', 'fmcg'),
  ('area_sales_manager', 'sales_supervisor', 'fmcg'),
  ('area_sales_manager', 'sales_representative', 'fmcg'),
  ('area_sales_manager', 'merchandiser', 'fmcg'),
  ('sales_supervisor', 'sales_representative', 'fmcg'),
  ('sales_supervisor', 'merchandiser', 'fmcg'),
  ('strategic_leadership', 'finance_manager', 'fmcg'),
  ('strategic_leadership', 'logistics_coordinator', 'fmcg'),
  ('strategic_leadership', 'warehouse_manager', 'fmcg'),
  ('strategic_leadership', 'distributor', 'fmcg'),
  ('logistics_coordinator', 'warehouse_manager', 'fmcg');

-- Team access requests (manager approval workflow)
CREATE TABLE IF NOT EXISTS public.team_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL,
  requester_email TEXT,
  requester_name TEXT,
  requested_role TEXT NOT NULL,
  os_context TEXT NOT NULL DEFAULT 'fmcg',
  manager_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  rejected_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON public.team_access_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR manager_user_id = auth.uid());

CREATE POLICY "Users can create their own requests"
  ON public.team_access_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Managers can update requests assigned to them"
  ON public.team_access_requests FOR UPDATE TO authenticated
  USING (manager_user_id = auth.uid());

-- Access governance audit log
CREATE TABLE IF NOT EXISTS public.access_governance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  actor_role TEXT,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_role TEXT,
  new_role TEXT,
  os_context TEXT NOT NULL DEFAULT 'fmcg',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.access_governance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view governance logs"
  ON public.access_governance_log FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

CREATE POLICY "System can insert governance logs"
  ON public.access_governance_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- =============================================================
-- RETAIL CREDIT NETWORK
-- =============================================================

CREATE TABLE IF NOT EXISTS public.retail_credit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID,
  retailer_name TEXT NOT NULL,
  territory TEXT,
  credit_score INTEGER DEFAULT 0,
  credit_tier TEXT DEFAULT 'tier_3',
  purchase_velocity_score NUMERIC DEFAULT 0,
  payment_history_score NUMERIC DEFAULT 0,
  store_stability_score NUMERIC DEFAULT 0,
  territory_demand_score NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  available_credit NUMERIC DEFAULT 0,
  last_assessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.retail_credit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view credit scores"
  ON public.retail_credit_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert credit scores"
  ON public.retail_credit_scores FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update credit scores"
  ON public.retail_credit_scores FOR UPDATE TO authenticated
  USING (true);

-- =============================================================
-- DISTRIBUTOR MARKETPLACE
-- =============================================================

CREATE TABLE IF NOT EXISTS public.distributor_marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  region TEXT,
  territories_served TEXT[] DEFAULT '{}',
  warehouse_count INTEGER DEFAULT 0,
  fleet_size INTEGER DEFAULT 0,
  retail_network_size INTEGER DEFAULT 0,
  category_expertise TEXT[] DEFAULT '{}',
  monthly_revenue NUMERIC DEFAULT 0,
  performance_rating NUMERIC DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.distributor_marketplace_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for marketplace profiles"
  ON public.distributor_marketplace_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own profiles"
  ON public.distributor_marketplace_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profiles"
  ON public.distributor_marketplace_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Partnership requests
CREATE TABLE IF NOT EXISTS public.distributor_partnership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_user_id UUID NOT NULL,
  manufacturer_name TEXT NOT NULL,
  distributor_profile_id UUID REFERENCES public.distributor_marketplace_profiles(id),
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.distributor_partnership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their requests"
  ON public.distributor_partnership_requests FOR SELECT TO authenticated
  USING (manufacturer_user_id = auth.uid());

CREATE POLICY "Manufacturers can create requests"
  ON public.distributor_partnership_requests FOR INSERT TO authenticated
  WITH CHECK (manufacturer_user_id = auth.uid());

-- =============================================================
-- AI DEMAND FORECASTING
-- =============================================================

CREATE TABLE IF NOT EXISTS public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_name TEXT NOT NULL,
  territory TEXT NOT NULL,
  forecast_period TEXT NOT NULL,
  predicted_demand INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  actual_demand INTEGER,
  variance_percent NUMERIC,
  seasonality_factor NUMERIC DEFAULT 1.0,
  growth_trend NUMERIC DEFAULT 0,
  restock_recommendation TEXT,
  data_sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecasts"
  ON public.demand_forecasts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forecasts"
  ON public.demand_forecasts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecasts"
  ON public.demand_forecasts FOR UPDATE TO authenticated
  USING (true);
