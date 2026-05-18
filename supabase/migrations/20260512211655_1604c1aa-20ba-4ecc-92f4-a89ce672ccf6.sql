
DO $$
DECLARE
  t text;
  leaky_tables text[] := ARRAY[
    'invoices','billing_accounts','payslips','leave_requests','leave_balances',
    'payout_approvals','payout_cycles','tax_remittances','treasury_digital_exposure',
    'platform_events','tenant_websites','side_hustle_trips','vendor_partners',
    'autonomous_decisions','cfo_brief_log','coo_ai_alerts','execution_outcomes',
    'execution_tasks','smart_matching_jobs','integration_oauth_states',
    'fuel_fraud_flags','fuel_risk_scores','fuel_variance_reports','gtm_supply_nodes',
    'drop_performance_metrics','drop_wallets','route_clusters',
    'fmcg_beat_plans','fmcg_deliveries','fmcg_distributors','fmcg_field_visits',
    'fmcg_orders','fmcg_outlets','fmcg_reconciliation','fmcg_retailer_credit',
    'fmcg_route_plans','fmcg_skus','fmcg_stock_levels','fmcg_team_members',
    'fmcg_trade_promotions','liquor_team_members'
  ];
BEGIN
  FOREACH t IN ARRAY leaky_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='organization_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS enforce_org_isolation ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY enforce_org_isolation ON public.%I AS RESTRICTIVE FOR ALL '
        'USING (organization_id IS NULL OR organization_id = public._lc_user_org() OR public.is_super_admin(auth.uid())) '
        'WITH CHECK (organization_id IS NULL OR organization_id = public._lc_user_org() OR public.is_super_admin(auth.uid()))',
        t
      );
    END IF;
  END LOOP;
END $$;
