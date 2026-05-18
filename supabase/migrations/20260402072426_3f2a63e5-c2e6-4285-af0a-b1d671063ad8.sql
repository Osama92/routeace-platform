
-- Add org/industry columns to existing GTM tables
ALTER TABLE public.gtm_signals 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_entities 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_opportunities 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_supply_nodes 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_search_queries 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_conversations 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_meetings 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

ALTER TABLE public.gtm_demand_supply_matches 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'logistics';

-- Campaign Insights table
CREATE TABLE IF NOT EXISTS public.gtm_campaign_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  industry_type TEXT NOT NULL DEFAULT 'logistics',
  os_context TEXT NOT NULL DEFAULT 'logistics',
  platform TEXT NOT NULL DEFAULT 'meta',
  campaign_name TEXT NOT NULL,
  campaign_id TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(6,4) DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  conversions INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  region TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  ad_type TEXT,
  target_audience TEXT,
  landing_page_url TEXT,
  notes TEXT,
  campaign_start DATE,
  campaign_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gtm_campaign_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read campaign insights"
  ON public.gtm_campaign_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert campaign insights"
  ON public.gtm_campaign_insights FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaign insights"
  ON public.gtm_campaign_insights FOR UPDATE TO authenticated USING (true);

-- Product Signals table
CREATE TABLE IF NOT EXISTS public.gtm_product_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  industry_type TEXT NOT NULL DEFAULT 'fmcg',
  os_context TEXT NOT NULL DEFAULT 'industry',
  product_name TEXT NOT NULL,
  product_category TEXT,
  sku_code TEXT,
  signal_type TEXT NOT NULL DEFAULT 'demand',
  signal_source TEXT DEFAULT 'internal',
  volume_indicator INTEGER DEFAULT 0,
  sentiment_score NUMERIC(4,2),
  region TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  is_stockout BOOLEAN DEFAULT false,
  demand_level TEXT DEFAULT 'medium',
  price_sensitivity TEXT,
  competitor_mention TEXT,
  raw_content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gtm_product_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read product signals"
  ON public.gtm_product_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert product signals"
  ON public.gtm_product_signals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update product signals"
  ON public.gtm_product_signals FOR UPDATE TO authenticated USING (true);

-- Credit Wallets table
CREATE TABLE IF NOT EXISTS public.gtm_credit_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  industry_type TEXT NOT NULL DEFAULT 'logistics',
  os_context TEXT NOT NULL DEFAULT 'logistics',
  balance INTEGER NOT NULL DEFAULT 100,
  total_purchased INTEGER NOT NULL DEFAULT 100,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  last_topped_up_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gtm_credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read credit wallets"
  ON public.gtm_credit_wallets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert credit wallets"
  ON public.gtm_credit_wallets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update credit wallets"
  ON public.gtm_credit_wallets FOR UPDATE TO authenticated USING (true);

-- Credit Transactions table
CREATE TABLE IF NOT EXISTS public.gtm_credit_txns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.gtm_credit_wallets(id),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_label TEXT,
  credits_consumed INTEGER DEFAULT 0,
  credits_purchased INTEGER DEFAULT 0,
  balance_after INTEGER DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  os_context TEXT NOT NULL DEFAULT 'logistics',
  industry_type TEXT NOT NULL DEFAULT 'logistics',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gtm_credit_txns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read credit txns"
  ON public.gtm_credit_txns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert credit txns"
  ON public.gtm_credit_txns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gtm_signals_org_industry ON public.gtm_signals(organization_id, industry_type);
CREATE INDEX IF NOT EXISTS idx_gtm_opportunities_org_industry ON public.gtm_opportunities(organization_id, industry_type);
CREATE INDEX IF NOT EXISTS idx_gtm_campaign_insights_org ON public.gtm_campaign_insights(organization_id, industry_type);
CREATE INDEX IF NOT EXISTS idx_gtm_product_signals_org ON public.gtm_product_signals(organization_id, industry_type);
CREATE INDEX IF NOT EXISTS idx_gtm_credit_wallets_org ON public.gtm_credit_wallets(organization_id, industry_type);
