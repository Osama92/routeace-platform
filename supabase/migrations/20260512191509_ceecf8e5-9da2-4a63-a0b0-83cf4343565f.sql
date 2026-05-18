
-- Tighten SELECT: tenant-isolated for admins; super_admin can see all
DROP POLICY IF EXISTS "Admins read kpi_audit_log" ON public.kpi_audit_log;
CREATE POLICY "Admins read tenant kpi_audit_log"
  ON public.kpi_audit_log FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
      AND organization_id IS NOT NULL
      AND organization_id = public.get_user_organization(auth.uid())
    )
  );

-- Tighten INSERT: organization_id must match caller's org (or null only for super_admin)
DROP POLICY IF EXISTS "Authenticated inserts kpi_audit_log" ON public.kpi_audit_log;
CREATE POLICY "Tenant inserts kpi_audit_log"
  ON public.kpi_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      is_super_admin(auth.uid())
      OR organization_id = public.get_user_organization(auth.uid())
    )
  );

-- Helper RPC: append a Control Center KPI computation entry
CREATE OR REPLACE FUNCTION public.log_control_center_kpi(
  p_metric_key text,
  p_source_module text,
  p_period_start date,
  p_period_end date,
  p_actual numeric,
  p_target numeric,
  p_inputs jsonb DEFAULT '{}'::jsonb,
  p_formula text DEFAULT NULL,
  p_role_tag text DEFAULT 'control_center'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_id uuid;
  v_perf numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_org := public.get_user_organization(auth.uid());
  v_perf := CASE WHEN p_target IS NULL OR p_target = 0 THEN 0
                 ELSE round((p_actual / p_target) * 100, 2) END;
  INSERT INTO public.kpi_audit_log(
    user_id, organization_id, role_tag, metric_key, source_module,
    period_start, period_end, actual_value, target_value, performance_pct,
    inputs, formula, computed_by
  ) VALUES (
    auth.uid(), v_org, p_role_tag, p_metric_key, p_source_module,
    p_period_start, p_period_end, COALESCE(p_actual, 0), COALESCE(p_target, 0), v_perf,
    COALESCE(p_inputs, '{}'::jsonb), p_formula, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_control_center_kpi(text,text,date,date,numeric,numeric,jsonb,text,text) TO authenticated;
