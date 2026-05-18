
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'autonomous_decisions','billing_accounts','cfo_brief_log','execution_outcomes','execution_tasks',
    'fmcg_beat_plans','fmcg_deliveries','fmcg_distributors','fmcg_field_visits','fmcg_orders','fmcg_outlets',
    'fmcg_reconciliation','fmcg_retailer_credit','fmcg_route_plans','fmcg_skus','fmcg_stock_levels',
    'fmcg_trade_promotions','fuel_fraud_flags','fuel_risk_scores','fuel_variance_reports','platform_events',
    'smart_matching_jobs','treasury_digital_exposure'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS enforce_tenant_isolation ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY enforce_tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL '
        'USING (tenant_id IS NULL OR tenant_id = public._lc_user_org() OR public.is_super_admin(auth.uid())) '
        'WITH CHECK (tenant_id IS NULL OR tenant_id = public._lc_user_org() OR public.is_super_admin(auth.uid()))',
        t
      );
    END IF;
  END LOOP;
END $$;
