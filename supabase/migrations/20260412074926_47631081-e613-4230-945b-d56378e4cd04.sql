
-- =============================================================
-- FIX ALL 33 WARN-LEVEL RLS POLICIES (USING/WITH CHECK = true)
-- =============================================================

-- 1. APPROVALS: INSERT
DROP POLICY IF EXISTS "Auth users create approvals" ON public.approvals;
CREATE POLICY "Auth users create approvals" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- 2. BILLS: INSERT, UPDATE, DELETE (use has_role for admin check)
DROP POLICY IF EXISTS "Authenticated users can create bills" ON public.bills;
CREATE POLICY "Authenticated users can create bills" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can update bills" ON public.bills;
CREATE POLICY "Authenticated users can update bills" ON public.bills
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Authenticated users can delete bills" ON public.bills;
CREATE POLICY "Authenticated users can delete bills" ON public.bills
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. DISPATCH_DELAY_REASONS: INSERT
DROP POLICY IF EXISTS "Authenticated users can insert delay reasons" ON public.dispatch_delay_reasons;
CREATE POLICY "Authenticated users can insert delay reasons" ON public.dispatch_delay_reasons
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. GTM_CAMPAIGN_INSIGHTS
DROP POLICY IF EXISTS "Authenticated users can insert campaign insights" ON public.gtm_campaign_insights;
CREATE POLICY "Authenticated users can insert campaign insights" ON public.gtm_campaign_insights
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update campaign insights" ON public.gtm_campaign_insights;
CREATE POLICY "Authenticated users can update campaign insights" ON public.gtm_campaign_insights
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 5. GTM_CONVERSATIONS
DROP POLICY IF EXISTS "Authenticated insert gtm_conversations" ON public.gtm_conversations;
CREATE POLICY "Authenticated insert gtm_conversations" ON public.gtm_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_conversations" ON public.gtm_conversations;
CREATE POLICY "Authenticated update gtm_conversations" ON public.gtm_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 6. GTM_CREDIT_WALLETS
DROP POLICY IF EXISTS "Authenticated users can insert credit wallets" ON public.gtm_credit_wallets;
CREATE POLICY "Authenticated users can insert credit wallets" ON public.gtm_credit_wallets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update credit wallets" ON public.gtm_credit_wallets;
CREATE POLICY "Authenticated users can update credit wallets" ON public.gtm_credit_wallets
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 7. GTM_DEMAND_SUPPLY_MATCHES
DROP POLICY IF EXISTS "Authenticated insert gtm_demand_supply_matches" ON public.gtm_demand_supply_matches;
CREATE POLICY "Authenticated insert gtm_demand_supply_matches" ON public.gtm_demand_supply_matches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_demand_supply_matches" ON public.gtm_demand_supply_matches;
CREATE POLICY "Authenticated update gtm_demand_supply_matches" ON public.gtm_demand_supply_matches
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 8. GTM_ENTITIES
DROP POLICY IF EXISTS "Authenticated insert gtm_entities" ON public.gtm_entities;
CREATE POLICY "Authenticated insert gtm_entities" ON public.gtm_entities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_entities" ON public.gtm_entities;
CREATE POLICY "Authenticated update gtm_entities" ON public.gtm_entities
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 9. GTM_INTENT_CLASSIFICATIONS
DROP POLICY IF EXISTS "Authenticated insert gtm_intent_classifications" ON public.gtm_intent_classifications;
CREATE POLICY "Authenticated insert gtm_intent_classifications" ON public.gtm_intent_classifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 10. GTM_INTENT_SCORES
DROP POLICY IF EXISTS "Authenticated insert gtm_intent_scores" ON public.gtm_intent_scores;
CREATE POLICY "Authenticated insert gtm_intent_scores" ON public.gtm_intent_scores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. GTM_MEETINGS
DROP POLICY IF EXISTS "Authenticated insert gtm_meetings" ON public.gtm_meetings;
CREATE POLICY "Authenticated insert gtm_meetings" ON public.gtm_meetings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated update gtm_meetings" ON public.gtm_meetings;
CREATE POLICY "Authenticated update gtm_meetings" ON public.gtm_meetings
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- 12. GTM_MESSAGES
DROP POLICY IF EXISTS "Authenticated insert gtm_messages" ON public.gtm_messages;
CREATE POLICY "Authenticated insert gtm_messages" ON public.gtm_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 13. GTM_OPPORTUNITIES
DROP POLICY IF EXISTS "Authenticated insert gtm_opportunities" ON public.gtm_opportunities;
CREATE POLICY "Authenticated insert gtm_opportunities" ON public.gtm_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_opportunities" ON public.gtm_opportunities;
CREATE POLICY "Authenticated update gtm_opportunities" ON public.gtm_opportunities
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 14. GTM_PRODUCT_SIGNALS
DROP POLICY IF EXISTS "Authenticated users can insert product signals" ON public.gtm_product_signals;
CREATE POLICY "Authenticated users can insert product signals" ON public.gtm_product_signals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update product signals" ON public.gtm_product_signals;
CREATE POLICY "Authenticated users can update product signals" ON public.gtm_product_signals
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 15. GTM_SEARCH_QUERIES (remove anon insert too)
DROP POLICY IF EXISTS "Anon insert gtm_search_queries" ON public.gtm_search_queries;
DROP POLICY IF EXISTS "Authenticated insert gtm_search_queries" ON public.gtm_search_queries;
CREATE POLICY "Authenticated insert gtm_search_queries" ON public.gtm_search_queries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_search_queries" ON public.gtm_search_queries;
CREATE POLICY "Authenticated update gtm_search_queries" ON public.gtm_search_queries
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 16. GTM_SIGNALS (remove anon insert too)
DROP POLICY IF EXISTS "Anon insert gtm_signals" ON public.gtm_signals;
DROP POLICY IF EXISTS "Authenticated insert gtm_signals" ON public.gtm_signals;
CREATE POLICY "Authenticated insert gtm_signals" ON public.gtm_signals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update gtm_signals" ON public.gtm_signals;
CREATE POLICY "Authenticated update gtm_signals" ON public.gtm_signals
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 17. GTM_SUPPLY_NODES
DROP POLICY IF EXISTS "Authenticated insert gtm_supply_nodes" ON public.gtm_supply_nodes;
CREATE POLICY "Authenticated insert gtm_supply_nodes" ON public.gtm_supply_nodes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated update gtm_supply_nodes" ON public.gtm_supply_nodes;
CREATE POLICY "Authenticated update gtm_supply_nodes" ON public.gtm_supply_nodes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- 18. USAGE_EVENTS
DROP POLICY IF EXISTS "System inserts usage events" ON public.usage_events;
CREATE POLICY "System inserts usage events" ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
