-- ============================================================
-- Link vehicle_repairs back to the prediction that caused them
-- ============================================================
-- Business Impact's "Maintenance Shifted" card wants to claim a specific
-- breakdown was predicted and avoided (predicted cost vs. actual planned
-- cost), not just "planned repairs are cheaper than breakdowns on average".
-- That claim needs a real chain: maintenance_predictions -> (user clicks
-- "Schedule Service" in PredictiveMaintenance.tsx) -> maintenance_schedules
-- (already carries prediction_id, already populated: 2 real rows in
-- production) -> vehicle_repairs (the actual work, once logged and
-- approved). The last link never existed — a repair had no way to reference
-- the schedule or prediction that triggered it, and nothing ever marked a
-- schedule 'completed' or a prediction 'resolved'. This migration closes
-- that loop so the chain becomes traceable going forward. It does NOT
-- backfill anything: the 176 existing predictions and 2 existing schedules
-- were never linked to a repair at logging time, so there is no way to
-- honestly reconstruct that link after the fact.
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────
ALTER TABLE public.vehicle_repairs
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.maintenance_schedules(id),
  ADD COLUMN IF NOT EXISTS prediction_id UUID REFERENCES public.maintenance_predictions(id);

COMMENT ON COLUMN public.vehicle_repairs.schedule_id IS
  'The maintenance_schedules row this repair fulfils, if the user linked one at logging time. Optional — most repairs are not the result of an AI prediction.';
COMMENT ON COLUMN public.vehicle_repairs.prediction_id IS
  'Denormalized from schedule_id.prediction_id at insert time, for fast querying without a join. Only ever set when schedule_id is set.';

CREATE INDEX IF NOT EXISTS idx_vehicle_repairs_prediction ON public.vehicle_repairs(prediction_id) WHERE prediction_id IS NOT NULL;

-- ── 2. log_vehicle_repair gains an optional schedule link ───────────────
CREATE OR REPLACE FUNCTION public.log_vehicle_repair(
  p_vehicle_id    uuid,
  p_repair_date   date,
  p_repair_type   text,
  p_description   text DEFAULT NULL,
  p_parts_replaced text DEFAULT NULL,
  p_parts_cost    numeric DEFAULT 0,
  p_labour_cost   numeric DEFAULT 0,
  p_mileage       integer DEFAULT NULL,
  p_performed_by  text DEFAULT NULL,
  p_is_breakdown  boolean DEFAULT false,
  p_downtime_days integer DEFAULT NULL,
  p_book_expense  boolean DEFAULT true,
  p_schedule_id   uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org         uuid;
  v_owner       text;
  v_total       numeric := COALESCE(p_parts_cost, 0) + COALESCE(p_labour_cost, 0);
  v_repair_id   uuid;
  v_prediction  uuid;
BEGIN
  SELECT organization_id, ownership_type INTO v_org, v_owner
  FROM public.vehicles WHERE id = p_vehicle_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF NOT public.is_org_member(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Cannot log a repair against a vehicle in another organisation';
  END IF;

  IF COALESCE(v_owner, 'owned') <> 'owned' THEN
    RAISE EXCEPTION 'Repairs can only be logged against owned vehicles.';
  END IF;

  IF p_schedule_id IS NOT NULL THEN
    SELECT prediction_id INTO v_prediction
    FROM public.maintenance_schedules
    WHERE id = p_schedule_id AND vehicle_id = p_vehicle_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Scheduled service not found for this vehicle';
    END IF;
  END IF;

  INSERT INTO public.vehicle_repairs (
    vehicle_id, repair_date, repair_type, description, parts_replaced,
    parts_cost, labour_cost, cost, mileage_at_repair, performed_by,
    is_breakdown, downtime_days, schedule_id, prediction_id
  )
  VALUES (
    p_vehicle_id, p_repair_date, p_repair_type, p_description, p_parts_replaced,
    COALESCE(p_parts_cost, 0), COALESCE(p_labour_cost, 0), v_total,
    p_mileage, p_performed_by, p_is_breakdown, p_downtime_days,
    p_schedule_id, v_prediction
  )
  RETURNING id INTO v_repair_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                organization_id, reason)
  VALUES ('vehicle_repair', v_repair_id::text, 'pending', auth.uid(), v_org, p_description);

  IF p_mileage IS NOT NULL THEN
    UPDATE public.vehicles
    SET current_odometer = GREATEST(COALESCE(current_odometer, 0), p_mileage)
    WHERE id = p_vehicle_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'repair_id', v_repair_id, 'total_cost', v_total, 'status', 'pending'
  );
END $fn$;

-- ── 3. Final approval closes the loop: schedule -> completed, ──
--      prediction -> resolved. Only when this repair was actually linked
--      to one — most repairs never were and this is a no-op for them.
CREATE OR REPLACE FUNCTION public.approve_vehicle_repair(p_repair_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r            public.vehicle_repairs;
  v_reg        text;
  v_expense_id uuid;
BEGIN
  SELECT * INTO r FROM public.vehicle_repairs WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can give final approval on a repair';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot approve a repair belonging to another organisation';
  END IF;

  IF r.status NOT IN ('pending_finance', 'pending_super_admin') THEN
    RAISE EXCEPTION 'Only a pending repair can be approved (this one is %)', r.status;
  END IF;

  SELECT registration_number INTO v_reg FROM public.vehicles WHERE id = r.vehicle_id;

  IF COALESCE(r.cost, 0) > 0 AND r.expense_id IS NULL THEN
    INSERT INTO public.expenses (
      organization_id, vehicle_id, category, amount, description,
      expense_date, approval_status, is_cogs
    )
    VALUES (
      r.organization_id, r.vehicle_id, 'repairs', r.cost,
      COALESCE(r.repair_type, 'Repair') || ' - ' || COALESCE(v_reg, 'vehicle')
        || COALESCE(' (' || NULLIF(r.parts_replaced, '') || ')', ''),
      r.repair_date, 'approved', true
    )
    RETURNING id INTO v_expense_id;
  END IF;

  UPDATE public.vehicle_repairs
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
      review_note = COALESCE(p_note, review_note),
      expense_id = COALESCE(expense_id, v_expense_id)
  WHERE id = p_repair_id;

  IF r.schedule_id IS NOT NULL THEN
    UPDATE public.maintenance_schedules
    SET schedule_status = 'completed',
        actual_cost = r.cost,
        completed_at = now()
    WHERE id = r.schedule_id;
  END IF;

  IF r.prediction_id IS NOT NULL THEN
    UPDATE public.maintenance_predictions
    SET resolved_at = now(),
        resolved_by = auth.uid()
    WHERE id = r.prediction_id AND resolved_at IS NULL;
  END IF;

  INSERT INTO public.approvals (entity_type, entity_id, approval_level, status,
                                requested_by, approved_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 2, 'approved',
          r.logged_by, auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id, 'expense_id', v_expense_id);
END $fn$;

GRANT EXECUTE ON FUNCTION public.log_vehicle_repair(uuid, date, text, text, text, numeric, numeric, integer, text, boolean, integer, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_vehicle_repair(uuid, text) TO authenticated;

-- ── 4. Real avoided-cost, only for repairs traceable to a resolved ──
--      prediction. This is what "Maintenance Shifted" in Business Impact
--      should treat as REAL, distinct from the fleet-average estimate.
CREATE OR REPLACE FUNCTION public.get_predicted_maintenance_savings(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH verified AS (
    SELECT
      r.id, r.cost AS planned_cost, r.repair_date,
      (
        SELECT avg(br.cost)
        FROM public.vehicle_repairs br
        WHERE br.organization_id = r.organization_id
          AND br.is_breakdown = true
          AND br.status = 'approved'
      ) AS avg_breakdown_cost
    FROM public.vehicle_repairs r
    WHERE r.organization_id = p_organization_id
      AND r.status = 'approved'
      AND r.prediction_id IS NOT NULL
      AND r.is_breakdown = false
      AND r.repair_date > current_date - (p_days || ' days')::interval
  )
  SELECT jsonb_build_object(
    'verified_count', count(*),
    'total_planned_cost', coalesce(sum(planned_cost), 0),
    'total_avoided_cost', coalesce(sum(GREATEST(avg_breakdown_cost - planned_cost, 0)) FILTER (WHERE avg_breakdown_cost IS NOT NULL), 0),
    'period_days', p_days
  )
  FROM verified;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_predicted_maintenance_savings(uuid, integer) TO authenticated;
