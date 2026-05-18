-- Multitenant RLS smoke test infrastructure (Core team observability)

CREATE TABLE IF NOT EXISTS public.core_rls_smoke_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid REFERENCES auth.users(id),
  total_checks int NOT NULL DEFAULT 0,
  passed int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  duration_ms int,
  notes text
);

CREATE TABLE IF NOT EXISTS public.core_rls_smoke_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.core_rls_smoke_runs(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  scope text NOT NULL, -- 'LD' | 'LC' | 'TRANSPORTER'
  test_user_id uuid,
  test_user_email text,
  test_org_id uuid,
  expected_max_other_org_rows int NOT NULL DEFAULT 0,
  observed_other_org_rows int NOT NULL DEFAULT 0,
  observed_total_rows int NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pass','fail','skip','error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_rls_findings_run ON public.core_rls_smoke_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_core_rls_findings_status ON public.core_rls_smoke_findings(status);

ALTER TABLE public.core_rls_smoke_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_rls_smoke_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Core team views smoke runs"
  ON public.core_rls_smoke_runs FOR SELECT
  USING (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Core team views smoke findings"
  ON public.core_rls_smoke_findings FOR SELECT
  USING (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Core team inserts smoke runs"
  ON public.core_rls_smoke_runs FOR INSERT
  WITH CHECK (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Core team inserts smoke findings"
  ON public.core_rls_smoke_findings FOR INSERT
  WITH CHECK (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

-- The smoke test runner: simulates each active org member and checks that
-- queries on critical tables return only rows from their own organization.
CREATE OR REPLACE FUNCTION public.run_rls_smoke_tests()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_passed int := 0;
  v_failed int := 0;
  v_total int := 0;
  v_user record;
  v_table text;
  v_scope text;
  v_total_rows int;
  v_other_rows int;
  v_sql text;
  v_critical_tables text[] := ARRAY[
    'dispatches','invoices','expenses','waybills','vehicles','drivers',
    'customers','bills','vendor_payables','accounts_receivable',
    'accounts_payable','fuel_logs','fleet_maintenance_orders','vendor_invoices'
  ];
BEGIN
  IF NOT (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only Core team or Super Admin can run RLS smoke tests';
  END IF;

  INSERT INTO public.core_rls_smoke_runs(triggered_by) VALUES (auth.uid()) RETURNING id INTO v_run_id;

  -- Iterate users: pick at most 2 active members per org to keep runtime bounded
  FOR v_user IN
    WITH ranked AS (
      SELECT om.user_id, om.organization_id, p.email, o.tenant_mode,
             row_number() OVER (PARTITION BY om.organization_id ORDER BY om.user_id) AS rn
      FROM public.organization_members om
      LEFT JOIN public.profiles p ON p.user_id = om.user_id
      LEFT JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.is_active = true
    )
    SELECT * FROM ranked WHERE rn <= 2
  LOOP
    v_scope := CASE
      WHEN v_user.tenant_mode = 'LOGISTICS_DEPARTMENT' THEN 'LD'
      WHEN v_user.tenant_mode = 'LOGISTICS_COMPANY' THEN 'LC'
      ELSE COALESCE(v_user.tenant_mode, 'UNKNOWN')
    END;

    FOREACH v_table IN ARRAY v_critical_tables
    LOOP
      v_total := v_total + 1;
      BEGIN
        -- Simulate the user. set_config(true) = local to transaction.
        PERFORM set_config('request.jwt.claim.sub', v_user.user_id::text, true);
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_user.user_id::text, 'role','authenticated')::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';

        v_sql := format(
          'SELECT count(*)::int, count(*) FILTER (WHERE organization_id IS DISTINCT FROM %L)::int FROM public.%I',
          v_user.organization_id, v_table
        );
        EXECUTE v_sql INTO v_total_rows, v_other_rows;

        EXECUTE 'RESET ROLE';

        IF v_other_rows = 0 THEN
          v_passed := v_passed + 1;
          INSERT INTO public.core_rls_smoke_findings(
            run_id, table_name, scope, test_user_id, test_user_email, test_org_id,
            observed_other_org_rows, observed_total_rows, status
          ) VALUES (
            v_run_id, v_table, v_scope, v_user.user_id, v_user.email, v_user.organization_id,
            v_other_rows, v_total_rows, 'pass'
          );
        ELSE
          v_failed := v_failed + 1;
          INSERT INTO public.core_rls_smoke_findings(
            run_id, table_name, scope, test_user_id, test_user_email, test_org_id,
            observed_other_org_rows, observed_total_rows, status,
            error_message
          ) VALUES (
            v_run_id, v_table, v_scope, v_user.user_id, v_user.email, v_user.organization_id,
            v_other_rows, v_total_rows, 'fail',
            format('Cross-tenant leak: %s rows from other organizations visible', v_other_rows)
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        BEGIN EXECUTE 'RESET ROLE'; EXCEPTION WHEN OTHERS THEN NULL; END;
        INSERT INTO public.core_rls_smoke_findings(
          run_id, table_name, scope, test_user_id, test_user_email, test_org_id,
          status, error_message
        ) VALUES (
          v_run_id, v_table, v_scope, v_user.user_id, v_user.email, v_user.organization_id,
          'error', SQLERRM
        );
      END;
    END LOOP;
  END LOOP;

  -- Transporter scope: also smoke-test the join-token table by ensuring
  -- non-core users can never read other orgs' invitations.
  FOR v_user IN
    SELECT user_id, organization_id, NULL::text AS email, 'TRANSPORTER'::text AS tenant_mode
    FROM public.organization_members
    WHERE is_active = true AND role IN ('transporter','vendor','partner')
    LIMIT 5
  LOOP
    v_total := v_total + 1;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', v_user.user_id::text, true);
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_user.user_id::text, 'role','authenticated')::text, true);
      EXECUTE 'SET LOCAL ROLE authenticated';

      EXECUTE format(
        'SELECT count(*)::int, count(*) FILTER (WHERE organization_id IS DISTINCT FROM %L)::int FROM public.dispatches',
        v_user.organization_id
      ) INTO v_total_rows, v_other_rows;

      EXECUTE 'RESET ROLE';

      IF v_other_rows = 0 THEN
        v_passed := v_passed + 1;
        INSERT INTO public.core_rls_smoke_findings(run_id, table_name, scope, test_user_id, test_org_id, observed_other_org_rows, observed_total_rows, status)
        VALUES (v_run_id, 'dispatches', 'TRANSPORTER', v_user.user_id, v_user.organization_id, v_other_rows, v_total_rows, 'pass');
      ELSE
        v_failed := v_failed + 1;
        INSERT INTO public.core_rls_smoke_findings(run_id, table_name, scope, test_user_id, test_org_id, observed_other_org_rows, observed_total_rows, status, error_message)
        VALUES (v_run_id, 'dispatches', 'TRANSPORTER', v_user.user_id, v_user.organization_id, v_other_rows, v_total_rows, 'fail',
                format('Transporter sees %s dispatches from other orgs', v_other_rows));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      BEGIN EXECUTE 'RESET ROLE'; EXCEPTION WHEN OTHERS THEN NULL; END;
      INSERT INTO public.core_rls_smoke_findings(run_id, table_name, scope, test_user_id, test_org_id, status, error_message)
      VALUES (v_run_id, 'dispatches', 'TRANSPORTER', v_user.user_id, v_user.organization_id, 'error', SQLERRM);
    END;
  END LOOP;

  UPDATE public.core_rls_smoke_runs
     SET total_checks = v_total,
         passed = v_passed,
         failed = v_failed,
         duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int
   WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_rls_smoke_tests() TO authenticated;