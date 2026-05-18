DROP FUNCTION IF EXISTS public.generate_recommendations(uuid);

-- 1. KPI target overrides
CREATE TABLE IF NOT EXISTS public.kpi_target_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL REFERENCES public.kpi_definitions(metric_key) ON DELETE CASCADE,
  role_tag text NOT NULL,
  organization_id uuid,
  target_value numeric NOT NULL,
  notes text,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_key, role_tag, organization_id)
);
ALTER TABLE public.kpi_target_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone authenticated reads kpi_target_overrides"
    ON public.kpi_target_overrides FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage kpi_target_overrides"
    ON public.kpi_target_overrides FOR ALL TO authenticated
    USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()))
    WITH CHECK (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_kpi_target_overrides_updated
    BEFORE UPDATE ON public.kpi_target_overrides
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. KPI audit log
CREATE TABLE IF NOT EXISTS public.kpi_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.kpi_snapshots(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  organization_id uuid,
  role_tag text NOT NULL,
  metric_key text NOT NULL,
  source_module text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_value numeric NOT NULL,
  target_value numeric NOT NULL,
  performance_pct numeric NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  formula text,
  computed_by uuid,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_user ON public.kpi_audit_log(user_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_metric ON public.kpi_audit_log(metric_key, computed_at DESC);
ALTER TABLE public.kpi_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read kpi_audit_log"
    ON public.kpi_audit_log FOR SELECT TO authenticated
    USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System inserts kpi_audit_log"
    ON public.kpi_audit_log FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.block_kpi_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'kpi_audit_log is append-only'; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_block_kpi_audit_mut
    BEFORE UPDATE OR DELETE ON public.kpi_audit_log
    FOR EACH ROW EXECUTE FUNCTION public.block_kpi_audit_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Signals on recommendations
ALTER TABLE public.kpi_recommendations
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. Resolve effective target
CREATE OR REPLACE FUNCTION public.resolve_kpi_target(
  p_metric_key text, p_role_tag text, p_org_id uuid
) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT target_value FROM public.kpi_target_overrides
       WHERE metric_key = p_metric_key AND role_tag = p_role_tag
         AND organization_id IS NOT DISTINCT FROM p_org_id LIMIT 1),
    (SELECT target_value FROM public.kpi_target_overrides
       WHERE metric_key = p_metric_key AND role_tag = p_role_tag
         AND organization_id IS NULL LIMIT 1),
    (SELECT default_target FROM public.kpi_definitions WHERE metric_key = p_metric_key)
  );
$$;

-- 5. compute_user_kpis (with overrides + audit log)
CREATE OR REPLACE FUNCTION public.compute_user_kpis(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text; v_org uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end   date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_metric record;
  v_actual numeric; v_target numeric; v_pct numeric; v_status text;
  v_inputs jsonb; v_formula text; v_snap_id uuid;
  v_count int := 0;
BEGIN
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN RETURN jsonb_build_object('error','no role'); END IF;
  SELECT organization_id INTO v_org FROM public.organization_members
   WHERE user_id = p_user_id AND is_active = true LIMIT 1;

  FOR v_metric IN
    SELECT d.metric_key, d.source_module, d.direction, d.unit, d.label
    FROM public.kpi_definitions d
    JOIN public.kpi_role_assignments r ON r.metric_key = d.metric_key
    WHERE d.is_active = true AND r.role_tag = v_role
  LOOP
    v_actual := 0; v_inputs := '{}'::jsonb; v_formula := NULL;

    IF v_metric.metric_key = 'on_time_delivery_rate' THEN
      WITH d AS (
        SELECT count(*) FILTER (WHERE on_time_flag) AS on_time, count(*) AS total
        FROM public.dispatches
        WHERE driver_id IN (SELECT id FROM public.drivers WHERE user_id = p_user_id)
          AND status IN ('delivered','closed')
          AND DATE(actual_delivery) BETWEEN v_period_start AND v_period_end
      )
      SELECT CASE WHEN total > 0 THEN ROUND((on_time::numeric / total) * 100, 2) ELSE 0 END,
             jsonb_build_object('on_time', on_time, 'total', total)
      INTO v_actual, v_inputs FROM d;
      v_formula := '(on_time / total) * 100';

    ELSIF v_metric.metric_key = 'ticket_resolution_rate' THEN
      WITH t AS (
        SELECT count(*) FILTER (WHERE status = 'resolved') AS resolved, count(*) AS total
        FROM public.support_tickets
        WHERE assigned_to = p_user_id
          AND DATE(created_at) BETWEEN v_period_start AND v_period_end
      )
      SELECT CASE WHEN total > 0 THEN ROUND((resolved::numeric / total) * 100, 2) ELSE 0 END,
             jsonb_build_object('resolved', resolved, 'total', total)
      INTO v_actual, v_inputs FROM t;
      v_formula := '(resolved / total) * 100';

    ELSIF v_metric.metric_key = 'ar_collection_rate' THEN
      WITH i AS (
        SELECT count(*) FILTER (WHERE status = 'paid') AS paid, count(*) AS total,
               COALESCE(SUM(total_amount) FILTER (WHERE status='paid'),0) AS paid_amt,
               COALESCE(SUM(total_amount),0) AS total_amt
        FROM public.invoices
        WHERE created_by = p_user_id
          AND DATE(invoice_date) BETWEEN v_period_start AND v_period_end
      )
      SELECT CASE WHEN total_amt > 0 THEN ROUND((paid_amt / total_amt) * 100, 2) ELSE 0 END,
             jsonb_build_object('paid_amount', paid_amt, 'total_amount', total_amt, 'paid_count', paid, 'total_count', total)
      INTO v_actual, v_inputs FROM i;
      v_formula := '(paid_amount / total_amount) * 100';
    ELSE
      v_inputs := jsonb_build_object('source_module', v_metric.source_module, 'note','no computation rule yet');
    END IF;

    v_target := public.resolve_kpi_target(v_metric.metric_key, v_role, v_org);
    v_pct := CASE WHEN v_target > 0 THEN LEAST(ROUND((v_actual / v_target) * 100, 2), 200) ELSE 0 END;
    v_status := CASE
      WHEN v_pct >= 90 THEN 'green'
      WHEN v_pct >= 70 THEN 'yellow'
      ELSE 'red'
    END;

    INSERT INTO public.kpi_snapshots(
      user_id, organization_id, role_tag, metric_key, period_type,
      period_start, period_end, actual_value, target_value, performance_pct, status
    ) VALUES (
      p_user_id, v_org, v_role, v_metric.metric_key, 'monthly',
      v_period_start, v_period_end, v_actual, v_target, v_pct, v_status
    )
    ON CONFLICT (user_id, metric_key, period_type, period_start)
    DO UPDATE SET actual_value = EXCLUDED.actual_value,
                  target_value = EXCLUDED.target_value,
                  performance_pct = EXCLUDED.performance_pct,
                  status = EXCLUDED.status,
                  computed_at = now()
    RETURNING id INTO v_snap_id;

    INSERT INTO public.kpi_audit_log(
      snapshot_id, user_id, organization_id, role_tag, metric_key, source_module,
      period_start, period_end, actual_value, target_value, performance_pct,
      inputs, formula, computed_by
    ) VALUES (
      v_snap_id, p_user_id, v_org, v_role, v_metric.metric_key, v_metric.source_module,
      v_period_start, v_period_end, v_actual, v_target, v_pct,
      v_inputs, v_formula, auth.uid()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('snapshots_written', v_count, 'period_start', v_period_start, 'period_end', v_period_end);
END $$;

-- 6. generate_recommendations with signals
CREATE OR REPLACE FUNCTION public.generate_recommendations(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text; v_org uuid;
  v_snap record;
  v_severity text; v_reco text; v_signals jsonb;
  v_count int := 0;
BEGIN
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  SELECT organization_id INTO v_org FROM public.organization_members
   WHERE user_id = p_user_id AND is_active = true LIMIT 1;

  UPDATE public.kpi_recommendations
     SET status='expired', updated_at=now()
   WHERE user_id = p_user_id AND status = 'pending';

  FOR v_snap IN
    SELECT DISTINCT ON (s.metric_key) s.*, d.label, d.unit, d.source_module
    FROM public.kpi_snapshots s
    JOIN public.kpi_definitions d ON d.metric_key = s.metric_key
    WHERE s.user_id = p_user_id
    ORDER BY s.metric_key, s.period_start DESC
  LOOP
    IF v_snap.performance_pct >= 90 THEN
      v_severity := 'strong';
      v_reco := format('Keep momentum on %s — you are at %s%% of target. Document what is working.', v_snap.label, v_snap.performance_pct);
    ELSIF v_snap.performance_pct >= 70 THEN
      v_severity := 'moderate';
      v_reco := format('%s is at %s%% — review the bottom 3 cases this week and close the gap.', v_snap.label, v_snap.performance_pct);
    ELSE
      v_severity := 'critical';
      v_reco := CASE v_snap.metric_key
        WHEN 'on_time_delivery_rate' THEN 'Pre-plan tomorrow''s routes the night before and confirm pickup windows by 7am.'
        WHEN 'ticket_resolution_rate' THEN 'Triage the oldest 5 tickets first thing today and escalate any blocked items to your manager.'
        WHEN 'ar_collection_rate' THEN 'Call the top 3 unpaid customers today and offer a same-week settlement discount option.'
        ELSE format('%s dropped to %s%% — book a 15-min review with your manager today.', v_snap.label, v_snap.performance_pct)
      END;
    END IF;

    v_signals := jsonb_build_object(
      'metric_key', v_snap.metric_key,
      'metric_label', v_snap.label,
      'unit', v_snap.unit,
      'source_module', v_snap.source_module,
      'period_start', v_snap.period_start,
      'period_end', v_snap.period_end,
      'actual_value', v_snap.actual_value,
      'target_value', v_snap.target_value,
      'performance_pct', v_snap.performance_pct,
      'gap_pct', GREATEST(0, 100 - v_snap.performance_pct),
      'status', v_snap.status,
      'reason', CASE
        WHEN v_snap.performance_pct < 70 THEN 'Performance critically below target'
        WHEN v_snap.performance_pct < 90 THEN 'Performance moderately below target'
        ELSE 'Performance on or above target'
      END
    );

    INSERT INTO public.kpi_recommendations(
      user_id, organization_id, role_tag, metric_key, snapshot_id,
      severity, performance_pct, recommendation, action_type, signals
    ) VALUES (
      p_user_id, v_org, v_role, v_snap.metric_key, v_snap.id,
      v_severity, v_snap.performance_pct, v_reco, 'behavior', v_signals
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('recommendations_created', v_count);
END $$;