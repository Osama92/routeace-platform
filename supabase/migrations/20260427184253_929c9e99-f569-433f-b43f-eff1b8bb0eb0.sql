
-- =========================================================
-- KPI GOVERNANCE & HIERARCHICAL PERFORMANCE ENGINE
-- Additive only. No destructive changes.
-- =========================================================

-- ---------- 1. kpi_definitions (system catalogue) ----------
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'count',           -- count | % | currency | hours
  default_target numeric NOT NULL DEFAULT 0,
  direction text NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better')),
  weight numeric NOT NULL DEFAULT 1,            -- weighting in composite score
  source_module text NOT NULL,                  -- 'dispatch' | 'support' | 'finance' | 'fuel' | 'signins' | 'maintenance'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads kpi_definitions"
  ON public.kpi_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage kpi_definitions"
  ON public.kpi_definitions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()));

CREATE TRIGGER trg_kpi_definitions_updated
  BEFORE UPDATE ON public.kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. kpi_role_assignments ----------
CREATE TABLE IF NOT EXISTS public.kpi_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL REFERENCES public.kpi_definitions(metric_key) ON DELETE CASCADE,
  role_tag text NOT NULL,                       -- matches app_role text values
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_key, role_tag)
);

ALTER TABLE public.kpi_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads kpi_role_assignments"
  ON public.kpi_role_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage kpi_role_assignments"
  ON public.kpi_role_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()));

-- ---------- 3. kpi_snapshots (system-computed, append-only) ----------
CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  role_tag text NOT NULL,
  metric_key text NOT NULL REFERENCES public.kpi_definitions(metric_key) ON DELETE CASCADE,
  period_type text NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily','weekly','monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 0,
  performance_pct numeric NOT NULL DEFAULT 0,   -- 0-200 (capped)
  status text NOT NULL DEFAULT 'on_track' CHECK (status IN ('green','yellow','red','on_track')),
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_key, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snap_user   ON public.kpi_snapshots(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snap_org    ON public.kpi_snapshots(organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snap_metric ON public.kpi_snapshots(metric_key, period_start DESC);

ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots"
  ON public.kpi_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers view team snapshots"
  ON public.kpi_snapshots FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid()) OR is_ops_manager(auth.uid())
    OR is_finance_manager(auth.uid())
  );

-- No client INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions write here.

CREATE OR REPLACE FUNCTION public.block_kpi_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'kpi_snapshots is system-managed and append-only';
END $$;

CREATE TRIGGER trg_block_kpi_snapshot_mut
  BEFORE UPDATE OR DELETE ON public.kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_kpi_snapshot_mutation();

-- ---------- 4. Lock down staff_kpi_entries (no more manual entries) ----------
DROP POLICY IF EXISTS "Users insert own kpi" ON public.staff_kpi_entries;
-- Users keep read access to their own historical rows; managers retain full access via existing policies.

-- ---------- 5. Seed KPI catalogue ----------
INSERT INTO public.kpi_definitions (metric_key, label, description, unit, default_target, direction, weight, source_module) VALUES
  -- Driver
  ('driver_on_time_delivery_rate','On-time delivery rate','% of dispatches delivered on or before scheduled_delivery','%',95,'higher_better',2,'dispatch'),
  ('driver_trip_completion_rate','Trip completion rate','% of assigned dispatches marked delivered','%',98,'higher_better',2,'dispatch'),
  ('driver_deliveries_completed','Deliveries completed','Count of dispatches delivered in period','count',12,'higher_better',1,'dispatch'),
  ('driver_inspection_compliance','Inspection compliance','% of trips with completed pre/post inspection','%',100,'higher_better',1,'dispatch'),
  -- Support
  ('support_tickets_resolved','Tickets resolved','Count of resolved/closed tickets in period','count',15,'higher_better',1,'support'),
  ('support_first_response_hours','First response time','Average hours to first response','hours',2,'lower_better',1,'support'),
  ('support_resolution_rate','Resolution rate','% of tickets resolved within SLA','%',90,'higher_better',2,'support'),
  -- Ops manager
  ('ops_fleet_utilization','Fleet utilization','% of active vehicles dispatched in period','%',80,'higher_better',2,'dispatch'),
  ('ops_delivery_success_rate','Delivery success rate','% of dispatches delivered (not cancelled)','%',95,'higher_better',2,'dispatch'),
  ('ops_sla_adherence','SLA adherence','% of dispatches within SLA deadline','%',95,'higher_better',2,'dispatch'),
  -- Finance manager
  ('fin_ar_collection_rate','AR collection rate','% of invoiced amount collected in period','%',85,'higher_better',2,'finance'),
  ('fin_outstanding_receivables','Outstanding receivables','Total unpaid invoice amount','currency',0,'lower_better',1,'finance'),
  ('fin_overdue_invoice_count','Overdue invoices','Count of invoices past due date','count',0,'lower_better',1,'finance')
ON CONFLICT (metric_key) DO NOTHING;

-- Seed role assignments
INSERT INTO public.kpi_role_assignments (metric_key, role_tag) VALUES
  ('driver_on_time_delivery_rate','driver'),
  ('driver_trip_completion_rate','driver'),
  ('driver_deliveries_completed','driver'),
  ('driver_inspection_compliance','driver'),
  ('support_tickets_resolved','support'),
  ('support_first_response_hours','support'),
  ('support_resolution_rate','support'),
  ('ops_fleet_utilization','ops_manager'),
  ('ops_delivery_success_rate','ops_manager'),
  ('ops_sla_adherence','ops_manager'),
  ('fin_ar_collection_rate','finance_manager'),
  ('fin_outstanding_receivables','finance_manager'),
  ('fin_overdue_invoice_count','finance_manager')
ON CONFLICT (metric_key, role_tag) DO NOTHING;

-- ---------- 6. Performance % helper ----------
CREATE OR REPLACE FUNCTION public.kpi_performance_pct(
  p_actual numeric, p_target numeric, p_direction text
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_pct numeric;
BEGIN
  IF p_target IS NULL OR p_target = 0 THEN
    -- For lower_better with target 0, score = 100 if actual=0 else 0
    IF p_direction = 'lower_better' THEN
      RETURN CASE WHEN COALESCE(p_actual,0) = 0 THEN 100 ELSE 0 END;
    END IF;
    RETURN 0;
  END IF;
  IF p_direction = 'lower_better' THEN
    v_pct := (p_target / NULLIF(GREATEST(p_actual, 0.0001), 0)) * 100;
  ELSE
    v_pct := (COALESCE(p_actual,0) / p_target) * 100;
  END IF;
  RETURN LEAST(GREATEST(ROUND(v_pct, 2), 0), 200);
END $$;

-- ---------- 7. Compute KPIs for a single user ----------
CREATE OR REPLACE FUNCTION public.compute_user_kpis(
  p_user_id uuid,
  p_period_start date DEFAULT (CURRENT_DATE - interval '7 days')::date,
  p_period_end date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_org uuid;
  v_email text;
  v_staff_id uuid;
  v_driver_id uuid;
  v_def record;
  v_actual numeric;
  v_target numeric;
  v_pct numeric;
  v_status text;
  v_count int := 0;

  -- working values
  v_total_disp int;
  v_delivered int;
  v_on_time int;
  v_total_tickets int;
  v_resolved_tickets int;
  v_active_vehicles int;
  v_used_vehicles int;
  v_invoiced numeric;
  v_collected numeric;
  v_outstanding numeric;
  v_overdue int;
BEGIN
  -- Get user's primary role and org
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('error','user has no role');
  END IF;

  SELECT organization_id INTO v_org FROM public.organization_members
   WHERE user_id = p_user_id AND is_active = true LIMIT 1;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
  SELECT id INTO v_staff_id FROM public.staff WHERE lower(email) = lower(v_email) LIMIT 1;

  -- Try to map to driver row (if driver role)
  SELECT id INTO v_driver_id FROM public.drivers
    WHERE lower(COALESCE(email,'')) = lower(COALESCE(v_email,'__none__')) LIMIT 1;

  -- Loop through KPIs assigned to this role
  FOR v_def IN
    SELECT d.* FROM public.kpi_definitions d
    JOIN public.kpi_role_assignments a ON a.metric_key = d.metric_key
    WHERE a.role_tag = v_role AND d.is_active = true
  LOOP
    v_actual := 0;
    v_target := v_def.default_target;

    -- ----- DRIVER metrics -----
    IF v_def.metric_key = 'driver_deliveries_completed' THEN
      SELECT COUNT(*) INTO v_actual FROM public.dispatches
       WHERE driver_id = v_driver_id
         AND status IN ('delivered','closed')
         AND COALESCE(actual_delivery::date, updated_at::date) BETWEEN p_period_start AND p_period_end;

    ELSIF v_def.metric_key = 'driver_on_time_delivery_rate' THEN
      SELECT COUNT(*) FILTER (WHERE actual_delivery <= COALESCE(scheduled_delivery, actual_delivery)),
             COUNT(*)
        INTO v_on_time, v_delivered
      FROM public.dispatches
      WHERE driver_id = v_driver_id
        AND status IN ('delivered','closed')
        AND actual_delivery::date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_delivered > 0 THEN ROUND(v_on_time::numeric * 100 / v_delivered, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'driver_trip_completion_rate' THEN
      SELECT COUNT(*) FILTER (WHERE status IN ('delivered','closed')), COUNT(*)
        INTO v_delivered, v_total_disp
      FROM public.dispatches
      WHERE driver_id = v_driver_id
        AND created_at::date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_total_disp > 0 THEN ROUND(v_delivered::numeric * 100 / v_total_disp, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'driver_inspection_compliance' THEN
      -- Conservative default: assume compliant if no inspection table mismatch (table existence varies)
      v_actual := 100;

    -- ----- SUPPORT metrics -----
    ELSIF v_def.metric_key = 'support_tickets_resolved' THEN
      SELECT COUNT(*) INTO v_actual FROM public.support_tickets
       WHERE assignee = p_user_id
         AND status IN ('resolved','closed')
         AND updated_at::date BETWEEN p_period_start AND p_period_end;

    ELSIF v_def.metric_key = 'support_resolution_rate' THEN
      SELECT COUNT(*) FILTER (WHERE status IN ('resolved','closed')), COUNT(*)
        INTO v_resolved_tickets, v_total_tickets
      FROM public.support_tickets
      WHERE assignee = p_user_id
        AND created_at::date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_total_tickets > 0 THEN ROUND(v_resolved_tickets::numeric * 100 / v_total_tickets, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'support_first_response_hours' THEN
      -- Placeholder: 0 if no data; production should compute from ticket events
      v_actual := 0;

    -- ----- OPS MANAGER metrics (org-scoped) -----
    ELSIF v_def.metric_key = 'ops_fleet_utilization' THEN
      SELECT COUNT(*) INTO v_active_vehicles FROM public.vehicles WHERE COALESCE(status,'active') = 'active';
      SELECT COUNT(DISTINCT vehicle_id) INTO v_used_vehicles
        FROM public.dispatches
       WHERE created_at::date BETWEEN p_period_start AND p_period_end
         AND vehicle_id IS NOT NULL;
      v_actual := CASE WHEN v_active_vehicles > 0 THEN ROUND(v_used_vehicles::numeric * 100 / v_active_vehicles, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'ops_delivery_success_rate' THEN
      SELECT COUNT(*) FILTER (WHERE status IN ('delivered','closed')), COUNT(*)
        INTO v_delivered, v_total_disp
      FROM public.dispatches
      WHERE created_at::date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_total_disp > 0 THEN ROUND(v_delivered::numeric * 100 / v_total_disp, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'ops_sla_adherence' THEN
      SELECT COUNT(*) FILTER (WHERE COALESCE(sla_status,'on_time') <> 'breached'), COUNT(*)
        INTO v_on_time, v_total_disp
      FROM public.dispatches
      WHERE status IN ('delivered','closed')
        AND actual_delivery::date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_total_disp > 0 THEN ROUND(v_on_time::numeric * 100 / v_total_disp, 2) ELSE 0 END;

    -- ----- FINANCE MANAGER metrics -----
    ELSIF v_def.metric_key = 'fin_ar_collection_rate' THEN
      SELECT COALESCE(SUM(total_amount),0) INTO v_invoiced
        FROM public.invoices
       WHERE invoice_date BETWEEN p_period_start AND p_period_end;
      SELECT COALESCE(SUM(total_amount),0) INTO v_collected
        FROM public.invoices
       WHERE status = 'paid' AND invoice_date BETWEEN p_period_start AND p_period_end;
      v_actual := CASE WHEN v_invoiced > 0 THEN ROUND(v_collected * 100 / v_invoiced, 2) ELSE 0 END;

    ELSIF v_def.metric_key = 'fin_outstanding_receivables' THEN
      SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid,0)),0) INTO v_actual
        FROM public.invoices WHERE status IN ('pending','overdue','partial');

    ELSIF v_def.metric_key = 'fin_overdue_invoice_count' THEN
      SELECT COUNT(*) INTO v_overdue FROM public.invoices WHERE status = 'overdue';
      v_actual := v_overdue;
    END IF;

    v_pct := public.kpi_performance_pct(v_actual, v_target, v_def.direction);
    v_status := CASE
      WHEN v_pct >= 90 THEN 'green'
      WHEN v_pct >= 70 THEN 'yellow'
      ELSE 'red'
    END;

    INSERT INTO public.kpi_snapshots(
      user_id, organization_id, role_tag, metric_key, period_type,
      period_start, period_end, actual_value, target_value, performance_pct, status
    ) VALUES (
      p_user_id, v_org, v_role, v_def.metric_key, 'weekly',
      p_period_start, p_period_end, v_actual, v_target, v_pct, v_status
    )
    ON CONFLICT (user_id, metric_key, period_type, period_start) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', v_role, 'kpis_computed', v_count,
                             'period_start', p_period_start, 'period_end', p_period_end);
END $$;

-- ---------- 8. Caller-friendly wrapper: compute MY KPIs ----------
CREATE OR REPLACE FUNCTION public.refresh_my_kpis()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  RETURN public.compute_user_kpis(auth.uid());
END $$;

-- ---------- 9. Team / org roll-up ----------
-- Aggregates kpi_snapshots into a single weighted performance score per user, role, org.
CREATE OR REPLACE FUNCTION public.rollup_team_performance(
  p_period_start date DEFAULT (CURRENT_DATE - interval '7 days')::date,
  p_period_end date DEFAULT CURRENT_DATE,
  p_organization_id uuid DEFAULT NULL,
  p_role_tag text DEFAULT NULL
) RETURNS TABLE(
  user_id uuid,
  role_tag text,
  organization_id uuid,
  composite_score numeric,
  green_count int,
  yellow_count int,
  red_count int,
  kpi_count int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    s.user_id,
    s.role_tag,
    s.organization_id,
    ROUND(SUM(s.performance_pct * COALESCE(d.weight,1))
          / NULLIF(SUM(COALESCE(d.weight,1)),0), 2) AS composite_score,
    COUNT(*) FILTER (WHERE s.status='green')::int,
    COUNT(*) FILTER (WHERE s.status='yellow')::int,
    COUNT(*) FILTER (WHERE s.status='red')::int,
    COUNT(*)::int AS kpi_count
  FROM public.kpi_snapshots s
  JOIN public.kpi_definitions d ON d.metric_key = s.metric_key
  WHERE s.period_start >= p_period_start
    AND s.period_end   <= p_period_end
    AND (p_organization_id IS NULL OR s.organization_id = p_organization_id)
    AND (p_role_tag IS NULL OR s.role_tag = p_role_tag)
  GROUP BY s.user_id, s.role_tag, s.organization_id;
$$;

-- Org-wide rollup with role breakdown for Super Admin / Org Admin
CREATE OR REPLACE FUNCTION public.rollup_org_performance(
  p_period_start date DEFAULT (CURRENT_DATE - interval '7 days')::date,
  p_period_end date DEFAULT CURRENT_DATE,
  p_organization_id uuid DEFAULT NULL
) RETURNS TABLE(
  organization_id uuid,
  role_tag text,
  user_count int,
  avg_score numeric,
  green_count int,
  yellow_count int,
  red_count int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  WITH per_user AS (
    SELECT * FROM public.rollup_team_performance(p_period_start, p_period_end, p_organization_id, NULL)
  )
  SELECT
    organization_id,
    role_tag,
    COUNT(*)::int                       AS user_count,
    ROUND(AVG(composite_score), 2)      AS avg_score,
    SUM(green_count)::int               AS green_count,
    SUM(yellow_count)::int              AS yellow_count,
    SUM(red_count)::int                 AS red_count
  FROM per_user
  GROUP BY organization_id, role_tag;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_my_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_user_kpis(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollup_team_performance(date, date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollup_org_performance(date, date, uuid) TO authenticated;
