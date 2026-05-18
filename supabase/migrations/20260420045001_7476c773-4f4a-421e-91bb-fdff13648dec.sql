
-- ============ ECOSYSTEM CONTROL LAYER ============
CREATE TABLE IF NOT EXISTS public.ecosystem_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type TEXT NOT NULL CHECK (node_type IN ('vendor','partner','insurer','fmcg','3pl','driver_pool','marketplace')),
  name TEXT NOT NULL,
  category TEXT,
  region TEXT,
  contact_info JSONB DEFAULT '{}'::jsonb,
  capabilities TEXT[] DEFAULT '{}',
  trust_score NUMERIC DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecosystem_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  node_id UUID REFERENCES public.ecosystem_nodes(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested','accepted','rejected','active','paused')),
  ai_reasoning TEXT,
  match_score NUMERIC,
  estimated_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecosystem_vendor_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES public.ecosystem_nodes(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  price_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  reliability_score NUMERIC DEFAULT 0,
  composite_score NUMERIC DEFAULT 0,
  total_jobs INT DEFAULT 0,
  rank_position INT,
  computed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ecosystem_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_vendor_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ecosystem_nodes" ON public.ecosystem_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ecosystem_nodes" ON public.ecosystem_nodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

CREATE POLICY "Users view own ecosystem_connections" ON public.ecosystem_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users manage own ecosystem_connections" ON public.ecosystem_connections FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Authenticated read vendor_rankings" ON public.ecosystem_vendor_rankings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage vendor_rankings" ON public.ecosystem_vendor_rankings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ AI WEBSITE GENERATOR ============
CREATE TABLE IF NOT EXISTS public.tenant_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  company_name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  custom_domain TEXT,
  brand_style TEXT DEFAULT 'professional',
  primary_color TEXT DEFAULT '#0EA5E9',
  logo_url TEXT,
  tagline TEXT,
  services TEXT[] DEFAULT '{}',
  cities_served TEXT[] DEFAULT '{}',
  fleet_size INT,
  target_clients TEXT[] DEFAULT '{}',
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','generating','published','archived')),
  seo_keywords TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  ai_generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES public.tenant_websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('home','services','coverage','contact','about','blog')),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_meta JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(website_id, slug)
);

CREATE TABLE IF NOT EXISTS public.tenant_website_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES public.tenant_websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_company TEXT,
  service_interest TEXT,
  message TEXT,
  source_page TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenant_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_website_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published websites" ON public.tenant_websites FOR SELECT TO anon, authenticated
  USING (status = 'published' OR user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Users manage own websites" ON public.tenant_websites FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Public can read published pages" ON public.tenant_website_pages FOR SELECT TO anon, authenticated
  USING (is_published = true OR user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Users manage own pages" ON public.tenant_website_pages FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Anyone can submit leads" ON public.tenant_website_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners view leads" ON public.tenant_website_leads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners update leads" ON public.tenant_website_leads FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS idx_ecosystem_connections_user ON public.ecosystem_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_websites_user ON public.tenant_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_website_pages_site ON public.tenant_website_pages(website_id);
CREATE INDEX IF NOT EXISTS idx_tenant_website_leads_site ON public.tenant_website_leads(website_id);
