
-- =====================================================
-- 1. CREATE DISTRIBUTION EXCHANGE TABLES
-- =====================================================

-- Supply listings for the Distribution Exchange
CREATE TABLE IF NOT EXISTS public.exchange_supply_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity TEXT NOT NULL,
  location TEXT NOT NULL,
  quantity_tonnes NUMERIC NOT NULL DEFAULT 0,
  packaging TEXT,
  certification TEXT,
  price_per_tonne NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'matched', 'expired')),
  listed_by UUID REFERENCES auth.users(id),
  contact_name TEXT,
  contact_email TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Demand listings for the Distribution Exchange
CREATE TABLE IF NOT EXISTS public.exchange_demand_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  quantity_tonnes NUMERIC NOT NULL DEFAULT 0,
  delivery_window TEXT,
  is_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'fulfilled', 'expired')),
  listed_by UUID REFERENCES auth.users(id),
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouse listings for the Distribution Exchange
CREATE TABLE IF NOT EXISTS public.exchange_warehouse_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  capacity_description TEXT,
  warehouse_type TEXT,
  utilization_percent NUMERIC DEFAULT 0,
  rate_description TEXT,
  is_available BOOLEAN DEFAULT true,
  listed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logistics capacity listings
CREATE TABLE IF NOT EXISTS public.exchange_logistics_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  capacity_tonnes NUMERIC,
  departure_schedule TEXT,
  vehicle_type TEXT,
  operator_name TEXT,
  is_available BOOLEAN DEFAULT true,
  listed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trade matches
CREATE TABLE IF NOT EXISTS public.exchange_trade_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_listing_id UUID REFERENCES public.exchange_supply_listings(id),
  demand_listing_id UUID REFERENCES public.exchange_demand_listings(id),
  match_status TEXT DEFAULT 'aggregating' CHECK (match_status IN ('aggregating', 'logistics_assigned', 'in_transit', 'completed')),
  progress_percent NUMERIC DEFAULT 0,
  matched_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all exchange tables
ALTER TABLE public.exchange_supply_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_demand_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_warehouse_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_logistics_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_trade_matches ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read all exchange listings (marketplace is public to authenticated users)
CREATE POLICY "Authenticated users can view supply listings" ON public.exchange_supply_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own supply listings" ON public.exchange_supply_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = listed_by);
CREATE POLICY "Users can update own supply listings" ON public.exchange_supply_listings FOR UPDATE TO authenticated USING (auth.uid() = listed_by);

CREATE POLICY "Authenticated users can view demand listings" ON public.exchange_demand_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own demand listings" ON public.exchange_demand_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = listed_by);
CREATE POLICY "Users can update own demand listings" ON public.exchange_demand_listings FOR UPDATE TO authenticated USING (auth.uid() = listed_by);

CREATE POLICY "Authenticated users can view warehouse listings" ON public.exchange_warehouse_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own warehouse listings" ON public.exchange_warehouse_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = listed_by);

CREATE POLICY "Authenticated users can view logistics listings" ON public.exchange_logistics_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own logistics listings" ON public.exchange_logistics_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = listed_by);

CREATE POLICY "Authenticated users can view trade matches" ON public.exchange_trade_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage trade matches" ON public.exchange_trade_matches FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin')
);

-- =====================================================
-- 2. RESTRICT SENSITIVE TABLE SELECT POLICIES
-- =====================================================

-- Restrict driver_salaries to admin/finance/ops roles only
DROP POLICY IF EXISTS "Authenticated users can view driver salaries" ON public.driver_salaries;
CREATE POLICY "Role-restricted view driver salaries" ON public.driver_salaries FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict driver_bonuses to admin/finance/ops roles only
DROP POLICY IF EXISTS "Authenticated users can view driver bonuses" ON public.driver_bonuses;
CREATE POLICY "Role-restricted view driver bonuses" ON public.driver_bonuses FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict accounting_ledger to admin/finance roles only
DROP POLICY IF EXISTS "Authenticated users can view accounting ledger" ON public.accounting_ledger;
CREATE POLICY "Role-restricted view accounting ledger" ON public.accounting_ledger FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict approval_risk_scores to admin roles
DROP POLICY IF EXISTS "Authenticated users can view approval risk scores" ON public.approval_risk_scores;
CREATE POLICY "Role-restricted view approval risk scores" ON public.approval_risk_scores FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict fraud_flags to admin roles
DROP POLICY IF EXISTS "Authenticated users can view fraud flags" ON public.fraud_flags;
CREATE POLICY "Role-restricted view fraud flags" ON public.fraud_flags FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict accounts_payable to admin/finance
DROP POLICY IF EXISTS "Authenticated users can view accounts payable" ON public.accounts_payable;
CREATE POLICY "Role-restricted view accounts payable" ON public.accounts_payable FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict chart_of_accounts to admin/finance
DROP POLICY IF EXISTS "Authenticated users can view chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Role-restricted view chart of accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict capital_funding to admin/finance
DROP POLICY IF EXISTS "Authenticated users can view capital funding" ON public.capital_funding;
CREATE POLICY "Role-restricted view capital funding" ON public.capital_funding FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'finance_manager')
  OR public.has_role(auth.uid(), 'org_admin')
);

-- Restrict security_events to admin roles only
DROP POLICY IF EXISTS "Authenticated users can view security events" ON public.security_events;
CREATE POLICY "Role-restricted view security events" ON public.security_events FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Restrict api_keys to admin roles only
DROP POLICY IF EXISTS "Authenticated users can view api keys" ON public.api_keys;
CREATE POLICY "Role-restricted view api keys" ON public.api_keys FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin')
);
