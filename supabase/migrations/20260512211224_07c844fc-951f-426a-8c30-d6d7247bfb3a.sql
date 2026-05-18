
-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.lc_access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_org_id uuid,
  attempted_org_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL,
  blocked boolean NOT NULL DEFAULT true,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lc_access_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admin or finance manager of the same org can read; nobody can write directly
CREATE POLICY "lc_audit_log_select_finance"
ON public.lc_access_audit_log FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'finance_manager')
    AND user_org_id = _lc_user_org()
  )
);

CREATE POLICY "lc_audit_log_no_direct_write"
ON public.lc_access_audit_log FOR INSERT
WITH CHECK (false);

-- 2. Trigger function — block + log cross-org writes
CREATE OR REPLACE FUNCTION public.log_lc_org_violation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_org uuid;
  v_target_org uuid;
BEGIN
  v_user_org := _lc_user_org();
  v_target_org := COALESCE(NEW.organization_id, OLD.organization_id);

  IF v_user_org IS NULL THEN
    RETURN NEW;  -- service-role / migrations
  END IF;

  IF v_target_org IS NOT NULL AND v_target_org <> v_user_org AND NOT is_super_admin(auth.uid()) THEN
    INSERT INTO public.lc_access_audit_log
      (user_id, user_org_id, attempted_org_id, table_name, operation, blocked, details)
    VALUES
      (auth.uid(), v_user_org, v_target_org, TG_TABLE_NAME, TG_OP, true,
        jsonb_build_object('row_id', COALESCE(NEW.id, OLD.id)));
    RAISE EXCEPTION 'Cross-organization access denied on %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to protected LC finance tables (idempotent)
DO $$
DECLARE
  t text;
  protected_tables text[] := ARRAY[
    'ledger_entries',
    'invoices',
    'bills',
    'expenses',
    'reconciliation_batches',
    'finance_reconciliation',
    'suspense_cases',
    'finance_approval_requests',
    'finance_anomaly_events',
    'treasury_risk_scores',
    'sovereign_report_snapshots',
    'cash_transactions',
    'fleet_downtime_log',
    'settlement_obligations'
  ];
BEGIN
  FOREACH t IN ARRAY protected_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_lc_org_guard ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_lc_org_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_lc_org_violation()',
        t
      );
    END IF;
  END LOOP;
END $$;
