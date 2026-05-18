
-- 6 engines: Deal Closer, Partnerships, Global Expansion, Monopoly Strategy, Competitive Intelligence, Pricing Dominance

-- 1. Enterprise deals (Deal Closer)
CREATE TABLE public.enterprise_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  industry text,
  fleet_size int,
  estimated_monthly_loss numeric DEFAULT 0,
  deal_probability text DEFAULT 'medium',
  deal_stage text DEFAULT 'identified',
  recommended_pitch text,
  objection_responses jsonb DEFAULT '[]'::jsonb,
  recommended_structure jsonb DEFAULT '{}'::jsonb,
  estimated_value numeric DEFAULT 0,
  ai_confidence numeric DEFAULT 0,
  status text DEFAULT 'pending_review',
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.enterprise_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage deals" ON public.enterprise_deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 2. Partnership opportunities
CREATE TABLE public.partnership_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_name text NOT NULL,
  partner_type text NOT NULL,
  match_score numeric DEFAULT 0,
  match_reason text,
  shipper_id uuid,
  fleet_operator_id uuid,
  route_context text,
  estimated_revenue numeric DEFAULT 0,
  cost_savings numeric DEFAULT 0,
  proposal_text text,
  status text DEFAULT 'suggested',
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.partnership_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partnerships" ON public.partnership_opportunities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3. Expansion targets
CREATE TABLE public.expansion_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_name text NOT NULL,
  country text,
  city text,
  demand_score numeric DEFAULT 0,
  inefficiency_score numeric DEFAULT 0,
  ease_of_entry numeric DEFAULT 0,
  revenue_potential numeric DEFAULT 0,
  composite_score numeric DEFAULT 0,
  entry_strategy jsonb DEFAULT '{}'::jsonb,
  roadmap jsonb DEFAULT '[]'::jsonb,
  recommended_segment text,
  status text DEFAULT 'evaluating',
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expansion_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expansion" ON public.expansion_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 4. Monopoly strategy
CREATE TABLE public.monopoly_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_region text NOT NULL,
  total_market_value numeric DEFAULT 0,
  market_players_count int DEFAULT 0,
  priority_targets jsonb DEFAULT '[]'::jsonb,
  lock_in_strategies jsonb DEFAULT '[]'::jsonb,
  network_expansion jsonb DEFAULT '[]'::jsonb,
  competitor_displacement jsonb DEFAULT '[]'::jsonb,
  dominance_score numeric DEFAULT 0,
  status text DEFAULT 'pending_review',
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.monopoly_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage monopoly" ON public.monopoly_strategies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 5. Competitor intelligence
CREATE TABLE public.competitor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competitor_name text NOT NULL,
  pricing_model text,
  price_per_unit numeric,
  strengths text[],
  weaknesses text[],
  feature_gaps jsonb DEFAULT '[]'::jsonb,
  win_strategy jsonb DEFAULT '{}'::jsonb,
  threat_level text DEFAULT 'medium',
  last_observed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage competitors" ON public.competitor_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 6. Pricing recommendations (autonomous pricing dominance)
CREATE TABLE public.pricing_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_segment text NOT NULL,
  customer_id uuid,
  current_price numeric DEFAULT 0,
  recommended_price numeric DEFAULT 0,
  price_change_pct numeric DEFAULT 0,
  cost_savings_delivered numeric DEFAULT 0,
  dependency_score numeric DEFAULT 0,
  churn_risk numeric DEFAULT 0,
  reasoning text,
  bundle_suggestions jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending_review',
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pricing_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pricing recs" ON public.pricing_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Triggers
CREATE TRIGGER trg_deals_upd BEFORE UPDATE ON public.enterprise_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partnerships_upd BEFORE UPDATE ON public.partnership_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expansion_upd BEFORE UPDATE ON public.expansion_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_monopoly_upd BEFORE UPDATE ON public.monopoly_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_competitors_upd BEFORE UPDATE ON public.competitor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pricing_recs_upd BEFORE UPDATE ON public.pricing_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
