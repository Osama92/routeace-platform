
-- GTM Brain: Demand Intelligence & Matching Engine

-- Demand signals from social, search, manual input
CREATE TABLE public.gtm_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'manual', -- social, search, first_party, manual
  source_platform TEXT, -- twitter, instagram, google, bing, yahoo, manual
  content TEXT NOT NULL,
  keyword TEXT,
  author_handle TEXT,
  author_metadata JSONB DEFAULT '{}',
  geo_location TEXT,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  industry_tag TEXT, -- logistics, goods, building_materials, fmcg, pharma
  os_context TEXT DEFAULT 'logistics', -- logistics, industry
  raw_payload JSONB DEFAULT '{}',
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Entities: companies, individuals detected from signals
CREATE TABLE public.gtm_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT DEFAULT 'company', -- individual, company, distributor, retailer
  industry TEXT,
  estimated_scale TEXT DEFAULT 'mid', -- small, mid, large
  location TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  contact_info JSONB DEFAULT '{}',
  source_origin TEXT, -- which signal or platform
  os_context TEXT DEFAULT 'logistics',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Intent classification results
CREATE TABLE public.gtm_intent_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.gtm_signals(id) ON DELETE CASCADE NOT NULL,
  intent_type TEXT NOT NULL DEFAULT 'passive', -- active_buy, problem_aware, expansion, passive
  confidence_score NUMERIC DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Intent scores per signal+entity
CREATE TABLE public.gtm_intent_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.gtm_signals(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.gtm_entities(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  tier TEXT DEFAULT 'tier3', -- tier1, tier2, tier3
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Search queries captured
CREATE TABLE public.gtm_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  platform TEXT DEFAULT 'google', -- google, bing, yahoo, direct
  user_identifier TEXT,
  geo_location TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  intent_type TEXT DEFAULT 'logistics_needed', -- logistics_needed, goods_needed
  os_context TEXT DEFAULT 'logistics',
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supply nodes: logistics operators, distributors
CREATE TABLE public.gtm_supply_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'logistics_operator', -- logistics_operator, distributor, manufacturer, exporter
  industry TEXT,
  service_capabilities JSONB DEFAULT '[]',
  geo_coverage JSONB DEFAULT '{}',
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  capacity JSONB DEFAULT '{}',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  rating NUMERIC DEFAULT 0,
  sla_compliance_rate NUMERIC DEFAULT 0,
  delivery_success_rate NUMERIC DEFAULT 0,
  avg_response_minutes NUMERIC DEFAULT 0,
  historical_conversion_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  os_context TEXT DEFAULT 'logistics',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Opportunities: qualified demand
CREATE TABLE public.gtm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.gtm_entities(id) ON DELETE SET NULL,
  signal_id UUID REFERENCES public.gtm_signals(id) ON DELETE SET NULL,
  search_query_id UUID REFERENCES public.gtm_search_queries(id) ON DELETE SET NULL,
  opportunity_type TEXT DEFAULT 'logistics', -- logistics, distribution, sourcing, export
  title TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  geo_location TEXT,
  estimated_value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'new', -- new, contacted, qualified, negotiation, closed_won, closed_lost
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  os_context TEXT DEFAULT 'logistics',
  assigned_to UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Demand-supply matches
CREATE TABLE public.gtm_demand_supply_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.gtm_opportunities(id) ON DELETE CASCADE NOT NULL,
  supply_node_id UUID REFERENCES public.gtm_supply_nodes(id) ON DELETE CASCADE NOT NULL,
  match_score NUMERIC DEFAULT 0,
  geo_proximity_score NUMERIC DEFAULT 0,
  service_fit_score NUMERIC DEFAULT 0,
  capacity_score NUMERIC DEFAULT 0,
  performance_score NUMERIC DEFAULT 0,
  response_speed_score NUMERIC DEFAULT 0,
  historical_score NUMERIC DEFAULT 0,
  match_reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, contacted, engaged, converted, failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE public.gtm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.gtm_entities(id) ON DELETE SET NULL,
  supply_node_id UUID REFERENCES public.gtm_supply_nodes(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.gtm_opportunities(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, email, phone, in_app
  status TEXT DEFAULT 'active', -- active, paused, closed
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Messages within conversations
CREATE TABLE public.gtm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.gtm_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'system', -- system, operator, prospect, ai
  sender_name TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Meetings
CREATE TABLE public.gtm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.gtm_entities(id) ON DELETE SET NULL,
  supply_node_id UUID REFERENCES public.gtm_supply_nodes(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.gtm_opportunities(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.gtm_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_intent_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_intent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_supply_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_demand_supply_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_meetings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all GTM data
CREATE POLICY "Authenticated read gtm_signals" ON public.gtm_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_signals" ON public.gtm_signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_signals" ON public.gtm_signals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_entities" ON public.gtm_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_entities" ON public.gtm_entities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_entities" ON public.gtm_entities FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_intent_classifications" ON public.gtm_intent_classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_intent_classifications" ON public.gtm_intent_classifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read gtm_intent_scores" ON public.gtm_intent_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_intent_scores" ON public.gtm_intent_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read gtm_search_queries" ON public.gtm_search_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_search_queries" ON public.gtm_search_queries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_search_queries" ON public.gtm_search_queries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_supply_nodes" ON public.gtm_supply_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_supply_nodes" ON public.gtm_supply_nodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_supply_nodes" ON public.gtm_supply_nodes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_opportunities" ON public.gtm_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_opportunities" ON public.gtm_opportunities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_opportunities" ON public.gtm_opportunities FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_demand_supply_matches" ON public.gtm_demand_supply_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_demand_supply_matches" ON public.gtm_demand_supply_matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_demand_supply_matches" ON public.gtm_demand_supply_matches FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_conversations" ON public.gtm_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_conversations" ON public.gtm_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_conversations" ON public.gtm_conversations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read gtm_messages" ON public.gtm_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_messages" ON public.gtm_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read gtm_meetings" ON public.gtm_meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert gtm_meetings" ON public.gtm_meetings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update gtm_meetings" ON public.gtm_meetings FOR UPDATE TO authenticated USING (true);

-- Anon access for signal ingestion API
CREATE POLICY "Anon insert gtm_signals" ON public.gtm_signals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert gtm_search_queries" ON public.gtm_search_queries FOR INSERT TO anon WITH CHECK (true);
