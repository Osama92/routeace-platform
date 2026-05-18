
CREATE OR REPLACE FUNCTION public._drop_permissive_select_policies(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = p_table
      AND cmd = 'SELECT'
      AND (qual = 'true' OR qual IS NULL OR qual ILIKE '%true%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, p_table);
  END LOOP;
END$$;

DO $$
DECLARE
  t TEXT;
  fin TEXT[] := ARRAY[
    'driver_insurance_profiles','retail_credit_scores','trip_profitability',
    'journal_entries','vat_transactions','tax_filing_reports',
    'deferred_revenue_ledger','intercompany_transactions',
    'cashflow_forecasts','cash_flow_projections','operational_kpi_snapshots',
    'revenue_loss_events','revenue_loss_analysis','bills','treasury_risk_logs',
    'pan_african_settlement_ledger','trade_history_ledger','ar_payments'
  ];
BEGIN
  FOREACH t IN ARRAY fin LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM public._drop_permissive_select_policies(t);
      EXECUTE format($q$
        CREATE POLICY "Finance/admin select %I"
          ON public.%I FOR SELECT
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'org_admin') OR
            public.has_role(auth.uid(), 'finance_manager')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

DO $$
DECLARE
  t TEXT;
  ops TEXT[] := ARRAY[
    'driver_behavior_events','delivery_updates','fleet_driver_scores',
    'vehicle_sensor_readings','fuel_variance_reports','fuel_risk_scores',
    'fleet_maintenance_orders','fleet_kpi_snapshots','auto_dispatch_decisions',
    'accident_risk_scores','vehicle_maintenance_records','vehicle_mileage_tracking',
    'vehicle_documents','driver_documents'
  ];
BEGIN
  FOREACH t IN ARRAY ops LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM public._drop_permissive_select_policies(t);
      EXECUTE format($q$
        CREATE POLICY "Ops/admin select %I"
          ON public.%I FOR SELECT
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'org_admin') OR
            public.has_role(auth.uid(), 'ops_manager')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='edit_requests') THEN
    PERFORM public._drop_permissive_select_policies('edit_requests');
    CREATE POLICY "Requester or admin can view edit_requests"
      ON public.edit_requests FOR SELECT
      USING (
        requested_by = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'org_admin')
      );
  END IF;
END$$;

DO $$
DECLARE
  t TEXT;
  gtm TEXT[] := ARRAY['gtm_supply_nodes','exchange_supply_listings','exchange_demand_listings'];
BEGIN
  FOREACH t IN ARRAY gtm LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM public._drop_permissive_select_policies(t);
      EXECUTE format($q$
        CREATE POLICY "Org members or admin can view %I"
          ON public.%I FOR SELECT
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'org_admin')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='gtm_credit_txns') THEN
    PERFORM public._drop_permissive_select_policies('gtm_credit_txns');
    CREATE POLICY "Owner or admin can view gtm_credit_txns"
      ON public.gtm_credit_txns FOR SELECT
      USING (
        user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'super_admin')
      );
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='support_tickets') THEN
    PERFORM public._drop_permissive_select_policies('support_tickets');
    CREATE POLICY "Creator or support/admin view support_tickets"
      ON public.support_tickets FOR SELECT
      USING (
        created_by = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'support')
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='support_ticket_messages') THEN
    PERFORM public._drop_permissive_select_policies('support_ticket_messages');
    CREATE POLICY "Ticket party or support/admin view messages"
      ON public.support_ticket_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.support_tickets st
          WHERE st.id = support_ticket_messages.ticket_id
            AND st.created_by = auth.uid()
        ) OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'support')
      );
  END IF;
END$$;

DROP FUNCTION public._drop_permissive_select_policies(TEXT);
