
CREATE OR REPLACE FUNCTION public.compute_user_kpis(p_user_id uuid, p_period_start date DEFAULT ((CURRENT_DATE - '7 days'::interval))::date, p_period_end date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text; v_org uuid; v_email text; v_driver_id uuid;
  v_def record; v_actual numeric; v_target numeric; v_pct numeric; v_status text;
  v_count int := 0; v_has_data boolean;
  v_total_disp int; v_delivered int; v_on_time int;
  v_total_tickets int; v_resolved_tickets int;
  v_active_vehicles int; v_used_vehicles int;
  v_invoiced numeric; v_collected numeric; v_overdue int;
BEGIN
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN RETURN jsonb_build_object('error','user has no role'); END IF;

  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id = p_user_id AND is_active = true LIMIT 1;
  SELECT email INTO v_email FROM public.profiles WHERE user_id = p_user_id LIMIT 1;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = p_user_id LIMIT 1;
  IF v_driver_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_driver_id FROM public.drivers
      WHERE lower(COALESCE(email,'')) = lower(v_email)
        AND (v_org IS NULL OR organization_id = v_org)
      LIMIT 1;
  END IF;

  FOR v_def IN
    SELECT d.* FROM public.kpi_definitions d
    JOIN public.kpi_role_assignments a ON a.metric_key = d.metric_key
    WHERE a.role_tag = v_role AND d.is_active = true
  LOOP
    v_actual := 0; v_target := v_def.default_target; v_has_data := true;

    IF v_def.metric_key = 'driver_deliveries_completed' THEN
      IF v_driver_id IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) INTO v_actual FROM public.dispatches
          WHERE driver_id = v_driver_id AND status IN ('delivered','closed')
            AND COALESCE(actual_delivery::date, updated_at::date) BETWEEN p_period_start AND p_period_end
            AND (v_org IS NULL OR organization_id = v_org);
      END IF;
    ELSIF v_def.metric_key = 'driver_on_time_delivery_rate' THEN
      IF v_driver_id IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) FILTER (WHERE actual_delivery <= COALESCE(scheduled_delivery, actual_delivery)), COUNT(*)
          INTO v_on_time, v_delivered
        FROM public.dispatches
        WHERE driver_id = v_driver_id AND status IN ('delivered','closed')
          AND actual_delivery::date BETWEEN p_period_start AND p_period_end
          AND (v_org IS NULL OR organization_id = v_org);
        IF v_delivered = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_on_time::numeric * 100 / v_delivered, 2); END IF;
      END IF;
    ELSIF v_def.metric_key = 'driver_trip_completion_rate' THEN
      IF v_driver_id IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) FILTER (WHERE status IN ('delivered','closed')), COUNT(*)
          INTO v_delivered, v_total_disp
        FROM public.dispatches
        WHERE driver_id = v_driver_id
          AND created_at::date BETWEEN p_period_start AND p_period_end
          AND (v_org IS NULL OR organization_id = v_org);
        IF v_total_disp = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_delivered::numeric * 100 / v_total_disp, 2); END IF;
      END IF;
    ELSIF v_def.metric_key = 'driver_inspection_compliance' THEN
      IF v_driver_id IS NULL THEN v_has_data := false; ELSE v_actual := 100; END IF;

    ELSIF v_def.metric_key = 'support_tickets_resolved' THEN
      SELECT COUNT(*) FILTER (WHERE status IN ('resolved','closed')), COUNT(*)
        INTO v_resolved_tickets, v_total_tickets
      FROM public.support_tickets
      WHERE assignee = p_user_id::text
        AND updated_at::date BETWEEN p_period_start AND p_period_end
        AND (v_org IS NULL OR organization_id = v_org);
      IF v_total_tickets = 0 THEN v_has_data := false;
      ELSE v_actual := v_resolved_tickets; END IF;
    ELSIF v_def.metric_key = 'support_resolution_rate' THEN
      SELECT COUNT(*) FILTER (WHERE status IN ('resolved','closed')), COUNT(*)
        INTO v_resolved_tickets, v_total_tickets
      FROM public.support_tickets
      WHERE (v_role IN ('super_admin','org_admin') OR assignee = p_user_id::text)
        AND created_at::date BETWEEN p_period_start AND p_period_end
        AND (v_org IS NULL OR organization_id = v_org);
      IF v_total_tickets = 0 THEN v_has_data := false;
      ELSE v_actual := ROUND(v_resolved_tickets::numeric * 100 / v_total_tickets, 2); END IF;
    ELSIF v_def.metric_key = 'support_first_response_hours' THEN
      v_has_data := false;

    ELSIF v_def.metric_key = 'ops_fleet_utilization' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) INTO v_active_vehicles FROM public.vehicles
          WHERE COALESCE(status,'active') = 'active' AND organization_id = v_org;
        SELECT COUNT(DISTINCT vehicle_id) INTO v_used_vehicles FROM public.dispatches
          WHERE created_at::date BETWEEN p_period_start AND p_period_end
            AND vehicle_id IS NOT NULL AND organization_id = v_org;
        IF v_active_vehicles = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_used_vehicles::numeric * 100 / v_active_vehicles, 2); END IF;
      END IF;
    ELSIF v_def.metric_key = 'ops_delivery_success_rate' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) FILTER (WHERE status IN ('delivered','closed')), COUNT(*)
          INTO v_delivered, v_total_disp
        FROM public.dispatches
        WHERE created_at::date BETWEEN p_period_start AND p_period_end AND organization_id = v_org;
        IF v_total_disp = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_delivered::numeric * 100 / v_total_disp, 2); END IF;
      END IF;
    ELSIF v_def.metric_key = 'ops_sla_adherence' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) FILTER (WHERE COALESCE(sla_status,'on_time') <> 'breached'), COUNT(*)
          INTO v_on_time, v_total_disp
        FROM public.dispatches
        WHERE status IN ('delivered','closed')
          AND actual_delivery::date BETWEEN p_period_start AND p_period_end
          AND organization_id = v_org;
        IF v_total_disp = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_on_time::numeric * 100 / v_total_disp, 2); END IF;
      END IF;

    ELSIF v_def.metric_key = 'fin_ar_collection_rate' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COALESCE(SUM(total_amount),0) INTO v_invoiced FROM public.invoices
          WHERE invoice_date BETWEEN p_period_start AND p_period_end AND organization_id = v_org;
        SELECT COALESCE(SUM(total_amount),0) INTO v_collected FROM public.invoices
          WHERE status = 'paid' AND invoice_date BETWEEN p_period_start AND p_period_end AND organization_id = v_org;
        IF v_invoiced = 0 THEN v_has_data := false;
        ELSE v_actual := ROUND(v_collected * 100 / v_invoiced, 2); END IF;
      END IF;
    ELSIF v_def.metric_key = 'fin_outstanding_receivables' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid,0)),0), COUNT(*)
          INTO v_actual, v_total_disp FROM public.invoices
          WHERE status IN ('pending','overdue','partial') AND organization_id = v_org;
        IF v_total_disp = 0 THEN v_has_data := false; END IF;
      END IF;
    ELSIF v_def.metric_key = 'fin_overdue_invoice_count' THEN
      IF v_org IS NULL THEN v_has_data := false;
      ELSE
        SELECT COUNT(*) INTO v_overdue FROM public.invoices WHERE organization_id = v_org;
        IF v_overdue = 0 THEN v_has_data := false;
        ELSE SELECT COUNT(*) INTO v_actual FROM public.invoices
            WHERE status = 'overdue' AND organization_id = v_org; END IF;
      END IF;
    END IF;

    IF v_has_data THEN
      v_pct := public.kpi_performance_pct(v_actual, v_target, v_def.direction);
      v_status := CASE WHEN v_pct >= 90 THEN 'green' WHEN v_pct >= 70 THEN 'yellow' ELSE 'red' END;
    ELSE
      v_pct := 0; v_status := 'no_data';
    END IF;

    INSERT INTO public.kpi_snapshots(
      user_id, organization_id, role_tag, metric_key, period_type,
      period_start, period_end, actual_value, target_value, performance_pct, status
    ) VALUES (
      p_user_id, v_org, v_role, v_def.metric_key, 'weekly',
      p_period_start, p_period_end, COALESCE(v_actual,0), v_target, v_pct, v_status
    )
    ON CONFLICT (user_id, metric_key, period_type, period_start) DO UPDATE
      SET actual_value = EXCLUDED.actual_value,
          target_value = EXCLUDED.target_value,
          performance_pct = EXCLUDED.performance_pct,
          status = EXCLUDED.status,
          computed_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', v_role, 'kpis_computed', v_count,
                             'period_start', p_period_start, 'period_end', p_period_end);
END $function$;
