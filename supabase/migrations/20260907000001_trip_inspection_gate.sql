-- ============================================================
-- PRE-TRIP / POST-TRIP GATE FOR OWNED TRUCKS
-- ============================================================
-- An owned truck must pass a pre-trip inspection before it can be dispatched,
-- and its post-trip must be completed before it can be dispatched again. This
-- is what makes the maintenance record trustworthy: every trip a company truck
-- makes is bracketed by a check, so wear is attributable and a fault cannot be
-- passed silently to the next driver.
--
-- WHY THIS IS ENFORCED IN THE DATABASE
--
-- There are two live dispatch-creation paths — src/pages/Dispatch.tsx (the
-- main /dispatch page) and CreateDispatchDialog (rendered on the Ops Manager
-- and Dept dashboards). Today only the dialog checks inspections, and only as
-- a window.confirm the user can click through; Dispatch.tsx has no check at
-- all. A UI-level gate would therefore have to be written twice and would
-- still be bypassable. A BEFORE INSERT trigger covers every path, including
-- any future one.
--
-- SCOPE: owned vehicles only. A vendor maintains their own truck, so gating
-- their dispatches on our checklist would block work we have no standing to
-- inspect. Relma has 2 owned and 29 vendor trucks today.
--
-- EXISTING STATE THIS BUILDS ON
--   vehicle_inspections already has dispatch_id, blocked_dispatch, and the
--   pre_trip/post_trip vocabulary, with 35 real inspections and 1,085 items.
--   dispatch_id was never populated (0/35) and blocked_dispatch was never
--   enforced at the point of dispatch.
-- ============================================================

-- ── 1. Fields the trip gate needs ────────────────────────────
ALTER TABLE public.vehicle_inspections
  -- Diesel planned for THIS trip, captured at pre-trip. Defaults from the
  -- route's agreed litres where one exists, otherwise the operator enters it.
  ADD COLUMN IF NOT EXISTS diesel_litres_planned numeric,
  ADD COLUMN IF NOT EXISTS diesel_litres_actual numeric,
  -- Odometer at each end of the trip: the distance a truck actually covered
  -- between its own two checks is the only mileage figure that cannot drift.
  ADD COLUMN IF NOT EXISTS odometer_reading numeric,
  ADD COLUMN IF NOT EXISTS released_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_reason text;

COMMENT ON COLUMN public.vehicle_inspections.diesel_litres_planned IS
  'Diesel issued for this trip, recorded at pre-trip. Seeded from diesel_rate_config.diesel_liters_agreed for the route when one is configured.';
COMMENT ON COLUMN public.vehicle_inspections.release_reason IS
  'Why a super admin released this vehicle without a completed post-trip. Required for an override; surfaced in the compliance report.';

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_gate
  ON public.vehicle_inspections (vehicle_id, inspection_type, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_dispatch
  ON public.vehicle_inspections (dispatch_id) WHERE dispatch_id IS NOT NULL;

-- ── 2. Is this vehicle clear to dispatch? ─────────────────────
-- One function, so the trigger and the UI answer the question identically.
-- Returns a reason rather than a bare boolean: "blocked" with no explanation
-- is the kind of message that gets worked around rather than fixed.
CREATE OR REPLACE FUNCTION public.check_vehicle_trip_gate(p_vehicle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_owner      text;
  v_org        uuid;
  v_reg        text;
  v_open       record;
  v_pre        record;
BEGIN
  SELECT ownership_type, organization_id, registration_number
    INTO v_owner, v_org, v_reg
  FROM public.vehicles WHERE id = p_vehicle_id;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'vehicle_not_found',
                              'message', 'Vehicle not found.');
  END IF;

  -- Vendor trucks are outside this gate by design.
  IF COALESCE(v_owner, 'owned') <> 'owned' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'not_owned',
                              'message', 'Vendor-owned truck — trip checklists do not apply.');
  END IF;

  -- (a) An earlier trip still open: a dispatch that has a pre-trip but whose
  --     post-trip has not been completed. The truck stays locked until the
  --     trip it is already on is closed out.
  SELECT d.id, d.dispatch_number, d.status
    INTO v_open
  FROM public.dispatches d
  JOIN public.vehicle_inspections pre
    ON pre.dispatch_id = d.id
   AND pre.inspection_type = 'pre_trip'
   AND pre.completed_at IS NOT NULL
  WHERE d.vehicle_id = p_vehicle_id
    AND d.status NOT IN ('cancelled')
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_inspections post
      WHERE post.dispatch_id = d.id
        AND post.inspection_type = 'post_trip'
        AND post.completed_at IS NOT NULL
    )
    -- A released trip no longer holds the vehicle.
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_inspections rel
      WHERE rel.dispatch_id = d.id AND rel.released_at IS NOT NULL
    )
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF v_open.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'post_trip_outstanding',
      'message', format('%s has an outstanding post-trip check for dispatch %s. Complete it before assigning another trip.',
                        COALESCE(v_reg, 'This vehicle'), v_open.dispatch_number),
      'dispatch_id', v_open.id,
      'dispatch_number', v_open.dispatch_number
    );
  END IF;

  -- (b) A completed pre-trip that failed on a safety-critical item.
  SELECT id, inspector_notes, completed_at
    INTO v_pre
  FROM public.vehicle_inspections
  WHERE vehicle_id = p_vehicle_id
    AND blocked_dispatch = true
    AND completed_at IS NOT NULL
    AND released_at IS NULL
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_pre.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'failed_inspection',
      'message', format('%s failed a safety-critical check on %s and is grounded.',
                        COALESCE(v_reg, 'This vehicle'),
                        to_char(v_pre.completed_at, 'DD Mon YYYY')),
      'inspection_id', v_pre.id,
      'notes', v_pre.inspector_notes
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'clear',
                            'message', 'Cleared for dispatch.');
END $fn$;

-- ── 3. The gate itself ───────────────────────────────────────
-- BEFORE INSERT on dispatches, so every creation path is covered.
CREATE OR REPLACE FUNCTION public.enforce_trip_inspection_gate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_gate jsonb;
BEGIN
  -- No vehicle assigned yet: a dispatch can be raised and crewed later, and
  -- the gate applies when the vehicle is actually attached.
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_gate := public.check_vehicle_trip_gate(NEW.vehicle_id);

  IF (v_gate->>'allowed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '%', v_gate->>'message'
      USING ERRCODE = 'P0001', HINT = v_gate->>'reason';
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_enforce_trip_inspection_gate ON public.dispatches;
CREATE TRIGGER trg_enforce_trip_inspection_gate
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_inspection_gate();

-- Assigning a vehicle to an existing dispatch is the same decision as
-- assigning one at creation, so it passes through the same gate.
CREATE OR REPLACE FUNCTION public.enforce_trip_gate_on_assign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_gate jsonb;
BEGIN
  IF NEW.vehicle_id IS NOT NULL
     AND NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    v_gate := public.check_vehicle_trip_gate(NEW.vehicle_id);
    IF (v_gate->>'allowed')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION '%', v_gate->>'message'
        USING ERRCODE = 'P0001', HINT = v_gate->>'reason';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_enforce_trip_gate_on_assign ON public.dispatches;
CREATE TRIGGER trg_enforce_trip_gate_on_assign
  BEFORE UPDATE OF vehicle_id ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_gate_on_assign();

-- ── 4. Super admin release ───────────────────────────────────
-- A forgotten post-trip must not strand a truck indefinitely, but every
-- bypass is attributable. The reason is required, not optional.
CREATE OR REPLACE FUNCTION public.release_vehicle_trip_block(
  p_vehicle_id uuid,
  p_reason     text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org      uuid;
  v_released int := 0;
BEGIN
  SELECT organization_id INTO v_org FROM public.vehicles WHERE id = p_vehicle_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can release a vehicle from its trip block';
  END IF;

  IF NOT public.is_org_member(auth.uid(), v_org)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot release a vehicle in another organisation';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to release a vehicle';
  END IF;

  -- Clear an outstanding post-trip by marking the open pre-trip released.
  WITH open_trips AS (
    SELECT pre.id
    FROM public.dispatches d
    JOIN public.vehicle_inspections pre
      ON pre.dispatch_id = d.id AND pre.inspection_type = 'pre_trip'
    WHERE d.vehicle_id = p_vehicle_id
      AND d.status <> 'cancelled'
      AND pre.released_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_inspections post
        WHERE post.dispatch_id = d.id
          AND post.inspection_type = 'post_trip'
          AND post.completed_at IS NOT NULL
      )
  )
  UPDATE public.vehicle_inspections vi
  SET released_by = auth.uid(), released_at = now(), release_reason = p_reason
  FROM open_trips o
  WHERE vi.id = o.id;

  GET DIAGNOSTICS v_released = ROW_COUNT;

  -- Also clear a standing safety block on the same vehicle.
  UPDATE public.vehicle_inspections
  SET released_by = auth.uid(), released_at = now(), release_reason = p_reason
  WHERE vehicle_id = p_vehicle_id
    AND blocked_dispatch = true
    AND completed_at IS NOT NULL
    AND released_at IS NULL;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                approved_by, organization_id, reason)
  VALUES ('vehicle_trip_release', p_vehicle_id::text, 'approved', auth.uid(),
          auth.uid(), v_org, p_reason);

  RETURN jsonb_build_object('ok', true, 'released_inspections', v_released);
END $fn$;

-- ── 4b. Retire pre-existing blocks ───────────────────────────
-- 24 completed inspections across the 2 owned trucks already carry
-- blocked_dispatch = true, recorded while the flag was display-only and never
-- acted on. Switching the gate on without clearing them would ground the
-- entire owned fleet the moment this migration lands, for faults nobody was
-- ever asked to fix.
--
-- They are marked released rather than deleted: the inspection record and its
-- items stay intact, and the release reason says plainly why. Any NEW failure
-- after this migration blocks normally.
UPDATE public.vehicle_inspections
SET released_by = NULL,
    released_at = now(),
    release_reason = 'Pre-existing block cleared when the trip gate was introduced. Recorded before blocked_dispatch was enforced; not reviewed by a super admin.'
WHERE blocked_dispatch = true
  AND completed_at IS NOT NULL
  AND released_at IS NULL;

-- ── 5. Compliance reporting ──────────────────────────────────
-- One row per owned vehicle: is it clear, what is outstanding, and how
-- disciplined has the checking been.
CREATE OR REPLACE FUNCTION public.get_trip_compliance(p_organization_id uuid)
RETURNS TABLE (
  vehicle_id uuid,
  registration_number text,
  truck_type text,
  gate_allowed boolean,
  gate_reason text,
  gate_message text,
  open_dispatch_number text,
  pre_trips_30d bigint,
  post_trips_30d bigint,
  dispatches_30d bigint,
  missing_post_trips bigint,
  overrides_30d bigint,
  last_inspection timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    v.id,
    v.registration_number,
    v.truck_type,
    (public.check_vehicle_trip_gate(v.id)->>'allowed')::boolean,
    public.check_vehicle_trip_gate(v.id)->>'reason',
    public.check_vehicle_trip_gate(v.id)->>'message',
    public.check_vehicle_trip_gate(v.id)->>'dispatch_number',
    (SELECT count(*) FROM public.vehicle_inspections i
      WHERE i.vehicle_id = v.id AND i.inspection_type = 'pre_trip'
        AND i.completed_at >= now() - interval '30 days'),
    (SELECT count(*) FROM public.vehicle_inspections i
      WHERE i.vehicle_id = v.id AND i.inspection_type = 'post_trip'
        AND i.completed_at >= now() - interval '30 days'),
    (SELECT count(*) FROM public.dispatches d
      WHERE d.vehicle_id = v.id AND d.created_at >= now() - interval '30 days'
        AND d.status <> 'cancelled'),
    -- Trips that ran without being closed out. This is the compliance number
    -- that matters: it counts checks that were skipped, not checks that were done.
    (SELECT count(*) FROM public.dispatches d
      WHERE d.vehicle_id = v.id
        AND d.status = 'delivered'
        AND d.created_at >= now() - interval '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM public.vehicle_inspections post
          WHERE post.dispatch_id = d.id AND post.inspection_type = 'post_trip'
            AND post.completed_at IS NOT NULL)),
    (SELECT count(*) FROM public.vehicle_inspections i
      WHERE i.vehicle_id = v.id AND i.released_at >= now() - interval '30 days'),
    (SELECT max(i.completed_at) FROM public.vehicle_inspections i
      WHERE i.vehicle_id = v.id)
  FROM public.vehicles v
  WHERE v.organization_id = p_organization_id
    AND COALESCE(v.ownership_type, 'owned') = 'owned'
  ORDER BY v.registration_number;
$fn$;

REVOKE EXECUTE ON FUNCTION public.release_vehicle_trip_block(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_vehicle_trip_block(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.check_vehicle_trip_gate(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_trip_compliance(uuid) TO authenticated;
