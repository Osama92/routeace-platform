
-- ============================================================
-- Phase 1: Tenant Isolation Audit (read-only) + Expanded Smoke
-- No existing policies are altered. Purely additive.
-- ============================================================

-- 1) Read-only audit: classifies every public table by isolation posture
CREATE OR REPLACE FUNCTION public.get_tenant_isolation_audit()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_count int,
  has_organization_id boolean,
  has_tenant_id boolean,
  has_user_id boolean,
  has_indirect_link boolean,
  verdict text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH t AS (
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),
  cols AS (
    SELECT
      table_name,
      bool_or(column_name = 'organization_id') AS has_org,
      bool_or(column_name = 'tenant_id')       AS has_tenant,
      bool_or(column_name = 'user_id')         AS has_user,
      bool_or(column_name IN (
        'dispatch_id','vehicle_id','driver_id','customer_id','staff_id',
        'invoice_id','partner_id','signal_id','conversation_id',
        'leave_request_id','staff_salary_id','vendor_id','order_id'
      )) AS has_link
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  ),
  pols AS (
    SELECT tablename, COUNT(*)::int AS pc
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  )
  SELECT
    t.relname,
    t.relrowsecurity,
    COALESCE(pols.pc, 0),
    COALESCE(cols.has_org, false),
    COALESCE(cols.has_tenant, false),
    COALESCE(cols.has_user, false),
    COALESCE(cols.has_link, false),
    CASE
      WHEN NOT t.relrowsecurity                                                 THEN 'CRITICAL_RLS_OFF'
      WHEN COALESCE(pols.pc, 0) = 0                                             THEN 'CRITICAL_NO_POLICIES'
      WHEN COALESCE(cols.has_org, false) OR COALESCE(cols.has_tenant, false)    THEN 'OK_TENANT_SCOPED'
      WHEN COALESCE(cols.has_link, false)                                       THEN 'OK_INDIRECT_SCOPED'
      WHEN COALESCE(cols.has_user, false)                                       THEN 'OK_USER_SCOPED'
      ELSE 'REVIEW_GLOBAL_OR_REFERENCE'
    END
  FROM t
  LEFT JOIN cols ON cols.table_name = t.relname
  LEFT JOIN pols ON pols.tablename  = t.relname
  ORDER BY
    CASE
      WHEN NOT t.relrowsecurity THEN 0
      WHEN COALESCE(pols.pc,0) = 0 THEN 1
      WHEN NOT (COALESCE(cols.has_org,false) OR COALESCE(cols.has_tenant,false)
                OR COALESCE(cols.has_link,false) OR COALESCE(cols.has_user,false)) THEN 2
      ELSE 9
    END,
    t.relname;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_isolation_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_isolation_audit() TO authenticated;

-- 2) Expand the smoke-test critical tables. Same logic, broader coverage.
CREATE OR REPLACE FUNCTION public.run_rls_smoke_tests()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Operations
    'dispatches','waybills','routes','route_plans','outbound_requests','picklists',
    -- Fleet
    'vehicles','drivers','fleet_maintenance_orders','fuel_logs',
    -- Customers / Partners
    'customers','partners','vendor_partners','vendor_rate_cards','vendor_invoices',
    -- Finance
    'invoices','expenses','bills','vendor_payables','accounts_receivable','accounts_payable',
    -- Workforce
    'staff','staff_salaries','payslips','leave_requests'
  ];
BEGIN
  IF NOT (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only Core team or Super Admin can run RLS smoke tests';
  END IF;

  INSERT INTO public.core_rls_smoke_runs(triggered_by) VALUES (auth.uid()) RETURNING id INTO v_run_id;

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
      WHEN v_user.tenant_mode = 'LOGISTICS_COMPANY'    THEN 'LC'
      ELSE COALESCE(v_user.tenant_mode, 'UNKNOWN')
    END;

    FOREACH v_table IN ARRAY v_critical_tables
    LOOP
      v_total := v_total + 1;
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', v_user.user_id::text, true);
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_user.user_id::text, 'role','authenticated')::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';

        -- Guard: skip tables that don't have organization_id (treat as N/A)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=v_table AND column_name='organization_id'
        ) THEN
          EXECUTE 'RESET ROLE';
          INSERT INTO public.core_rls_smoke_findings(
            run_id, table_name, scope, test_user_id, test_user_email, test_org_id,
            observed_other_org_rows, observed_total_rows, status, error_message
          ) VALUES (
            v_run_id, v_table, v_scope, v_user.user_id, v_user.email, v_user.organization_id,
            0, 0, 'skip', 'no organization_id column'
          );
          CONTINUE;
        END IF;

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
            0, v_total_rows, 'pass'
          );
        ELSE
          v_failed := v_failed + 1;
          INSERT INTO public.core_rls_smoke_findings(
            run_id, table_name, scope, test_user_id, test_user_email, test_org_id,
            observed_other_org_rows, observed_total_rows, status, error_message
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

  UPDATE public.core_rls_smoke_runs
  SET total_checks = v_total,
      passed = v_passed,
      failed = v_failed,
      duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
      notes = format('Tested %s critical tables across active org members', array_length(v_critical_tables,1))
  WHERE id = v_run_id;

  RETURN v_run_id;
END
$function$;
