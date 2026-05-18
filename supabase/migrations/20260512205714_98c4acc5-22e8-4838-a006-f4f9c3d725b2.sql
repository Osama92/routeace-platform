
-- Helper: org from current user
CREATE OR REPLACE FUNCTION public._lc_user_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Generic trigger to set organization_id from creator
CREATE OR REPLACE FUNCTION public.set_org_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'sovereign_report_snapshots','treasury_risk_scores','fleet_downtime_log','settlement_obligations',
    'suspense_cases','finance_periods','finance_anomaly_events','finance_approval_requests',
    'finance_reconciliation','reconciliation_batches','cash_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Add column
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_'||t||'_org', t);
    -- Backfill from created_by/user_id where present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='created_by') THEN
      EXECUTE format($f$UPDATE public.%I x SET organization_id = (SELECT organization_id FROM public.organization_members om WHERE om.user_id = x.created_by LIMIT 1) WHERE x.organization_id IS NULL AND x.created_by IS NOT NULL$f$, t);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='user_id') THEN
      EXECUTE format($f$UPDATE public.%I x SET organization_id = (SELECT organization_id FROM public.organization_members om WHERE om.user_id = x.user_id LIMIT 1) WHERE x.organization_id IS NULL AND x.user_id IS NOT NULL$f$, t);
    END IF;
    -- Trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_setorg_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_setorg_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user()', t, t);
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Drop prior org-scoped select policy if any
    EXECUTE format('DROP POLICY IF EXISTS "lc_org_select_%s" ON public.%I', t, t);
    EXECUTE format($f$CREATE POLICY "lc_org_select_%s" ON public.%I FOR SELECT TO authenticated USING (organization_id = public._lc_user_org() OR public.has_role(auth.uid(), 'super_admin'::app_role))$f$, t, t);
  END LOOP;
END $$;
