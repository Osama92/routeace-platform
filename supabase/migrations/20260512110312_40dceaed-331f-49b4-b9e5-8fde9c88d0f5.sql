-- Phase 14 — Cross-tenant RLS hardening for dispatch, GTM, KPI, ops & config tables
-- Plus storage company-assets lockdown

-- ============================================================
-- 1. vendor_yearly_targets — fix broken self-referential subquery
-- ============================================================
DROP POLICY IF EXISTS "vyt_insert_managers" ON public.vendor_yearly_targets;
DROP POLICY IF EXISTS "vyt_select_org_members" ON public.vendor_yearly_targets;
DROP POLICY IF EXISTS "vyt_update_managers" ON public.vendor_yearly_targets;

CREATE POLICY "vyt_select_org_members" ON public.vendor_yearly_targets
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

CREATE POLICY "vyt_insert_managers" ON public.vendor_yearly_targets
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

CREATE POLICY "vyt_update_managers" ON public.vendor_yearly_targets
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))
  WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

-- ============================================================
-- 2. dispatch_plans / dispatch_plan_items — remove has_any_role open access
-- ============================================================
DROP POLICY IF EXISTS "Allow access to dispatch_plans" ON public.dispatch_plans;
DROP POLICY IF EXISTS "Allow access to dispatch_plan_items" ON public.dispatch_plan_items;

CREATE POLICY "Dispatch plans creator or super admin" ON public.dispatch_plans
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Dispatch plan items via parent dispatch org" ON public.dispatch_plan_items
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_plan_items.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_plan_items.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  );

-- ============================================================
-- 3. order_items — scope via parent dispatch
-- ============================================================
DROP POLICY IF EXISTS "Allow access to order_items" ON public.order_items;

CREATE POLICY "Order items via parent dispatch org" ON public.order_items
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = order_items.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = order_items.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  );

-- ============================================================
-- 4. route_waypoints / routes — scope via creator + super admin
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.route_waypoints'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.route_waypoints', pol.polname);
  END LOOP;
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.routes'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.routes', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Routes creator or super admin" ON public.routes
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Route waypoints via parent route" ON public.route_waypoints
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_waypoints.route_id AND r.created_by = auth.uid()
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_waypoints.route_id AND r.created_by = auth.uid()
    )
  );

-- ============================================================
-- 5. warehouses — org-scoped SELECT
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.warehouses'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.warehouses', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Warehouses org-scoped read" ON public.warehouses
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

-- ============================================================
-- 6. kpi_metrics — super admin only (no org column)
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.kpi_metrics'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.kpi_metrics', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "KPI metrics super admin only" ON public.kpi_metrics
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================
-- 7. breakdown_alerts — INSERT requires org membership via vehicle
-- ============================================================
DROP POLICY IF EXISTS "Authenticated inserts breakdown_alerts" ON public.breakdown_alerts;
CREATE POLICY "Breakdown alerts org-scoped insert" ON public.breakdown_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
  );

-- ============================================================
-- 8. GTM tables — restrict writes to org members
-- ============================================================
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['gtm_demand_supply_matches','gtm_product_signals','gtm_signals','gtm_search_queries','gtm_conversations'] LOOP
    FOR pol IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid = %L::regclass', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "%s_org_select" ON public.%I FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))', t, t);
    EXECUTE format('CREATE POLICY "%s_org_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))', t, t);
    EXECUTE format('CREATE POLICY "%s_org_update" ON public.%I FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))) WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))', t, t);
  END LOOP;
END $$;

-- gtm_messages — scope via parent conversation org
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.gtm_messages'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gtm_messages', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "gtm_messages_via_conversation" ON public.gtm_messages
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.gtm_conversations c
      WHERE c.id = gtm_messages.conversation_id
        AND c.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), c.organization_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.gtm_conversations c
      WHERE c.id = gtm_messages.conversation_id
        AND c.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), c.organization_id)
    )
  );

-- gtm_intent_classifications / gtm_intent_scores — scope via parent signal
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['gtm_intent_classifications','gtm_intent_scores'] LOOP
    FOR pol IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid = %L::regclass', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
    EXECUTE format($q$
      CREATE POLICY "%s_via_signal" ON public.%I FOR ALL TO authenticated
      USING (is_super_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.gtm_signals s WHERE s.id = %I.signal_id
          AND s.organization_id IS NOT NULL AND is_org_member(auth.uid(), s.organization_id)))
      WITH CHECK (is_super_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.gtm_signals s WHERE s.id = %I.signal_id
          AND s.organization_id IS NOT NULL AND is_org_member(auth.uid(), s.organization_id)))
    $q$, t, t, t, t);
  END LOOP;
END $$;

-- ============================================================
-- 9. cross_role_impacts / approval_delay_predictions — super admin only (no org)
-- ============================================================
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['cross_role_impacts','approval_delay_predictions'] LOOP
    FOR pol IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid = %L::regclass', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "%s_super_admin_only" ON public.%I FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 10. KPI config & ops/config tables — super admin only
-- ============================================================
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kpi_definitions','kpi_role_assignments','dispatch_state_transitions',
    'sensor_thresholds','fuel_baselines','ecosystem_vendor_rankings','partner_tiers'
  ] LOOP
    FOR pol IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid = %L::regclass', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "%s_super_admin_only" ON public.%I FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

-- kpi_target_overrides — org-scoped (has organization_id)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.kpi_target_overrides'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.kpi_target_overrides', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "kpi_target_overrides_org" ON public.kpi_target_overrides
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))
  WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

-- ============================================================
-- 11. vendor_ratings — super admin (no clear org link)
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.vendor_ratings'::regclass AND polcmd IN ('r','*') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendor_ratings', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "vendor_ratings_super_admin_read" ON public.vendor_ratings
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

-- ============================================================
-- 12. sales_call_logs — rep owner or super admin
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.sales_call_logs'::regclass AND polcmd IN ('r','*') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales_call_logs', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "sales_call_logs_owner_read" ON public.sales_call_logs
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR rep_id = auth.uid());

-- ============================================================
-- 13. storage.objects — drop overly broad company-assets policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company assets" ON storage.objects;