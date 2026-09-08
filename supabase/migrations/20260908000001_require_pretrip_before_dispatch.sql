-- ============================================================
-- A pre-trip check must EXIST BEFORE the dispatch is created
-- ============================================================
-- The previous implementation created the dispatch and then opened the
-- pre-trip dialog. That is the wrong order: closing the dialog left a live
-- dispatch with no check, which is exactly what the gate was meant to
-- prevent. Reported from the field — "dispatch is still being created before
-- the pre trip check is filled".
--
-- The correct sequence is: fill the pre-trip against the VEHICLE, then create
-- the dispatch, which claims that check. So an unclaimed pre-trip is now a
-- first-class thing — a vehicle can be checked and standing ready before
-- anyone knows which load it will take.
--
-- WHAT THIS ADDS TO THE EXISTING GATE
--   Existing (20260907000001): refuses a dispatch when a PREVIOUS trip has an
--   outstanding post-trip, or the truck failed a safety-critical check.
--   Added here: refuses a dispatch on an owned truck that has no completed,
--   unclaimed pre-trip waiting for it.
--
-- FRESHNESS: a pre-trip is valid for 24 hours. A check from last week says
-- nothing about the truck this morning, and letting one stand indefinitely
-- would turn the requirement into a formality satisfied once.
-- ============================================================

-- Which pre-trip, if any, is standing ready for this vehicle.
-- Unclaimed (no dispatch_id), completed, recent, and not a failure.
CREATE OR REPLACE FUNCTION public.find_open_pretrip(p_vehicle_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT id
  FROM public.vehicle_inspections
  WHERE vehicle_id = p_vehicle_id
    AND inspection_type = 'pre_trip'
    AND dispatch_id IS NULL
    AND completed_at IS NOT NULL
    AND completed_at > now() - interval '24 hours'
    AND blocked_dispatch = false
  ORDER BY completed_at DESC
  LIMIT 1;
$fn$;

-- Extends the existing gate. Order matters: an outstanding post-trip is
-- reported before a missing pre-trip, because closing out the last trip is
-- what the operator has to do first.
CREATE OR REPLACE FUNCTION public.check_vehicle_trip_gate(p_vehicle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_owner text;
  v_org   uuid;
  v_reg   text;
  v_open  record;
  v_pre   record;
  v_ready uuid;
BEGIN
  SELECT ownership_type, organization_id, registration_number
    INTO v_owner, v_org, v_reg
  FROM public.vehicles WHERE id = p_vehicle_id;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'vehicle_not_found',
                              'message', 'Vehicle not found.');
  END IF;

  IF COALESCE(v_owner, 'owned') <> 'owned' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'not_owned',
                              'message', 'Vendor-owned truck — trip checklists do not apply.');
  END IF;

  -- (a) A previous trip still open.
  SELECT d.id, d.dispatch_number INTO v_open
  FROM public.dispatches d
  JOIN public.vehicle_inspections pre
    ON pre.dispatch_id = d.id
   AND pre.inspection_type = 'pre_trip'
   AND pre.completed_at IS NOT NULL
  WHERE d.vehicle_id = p_vehicle_id
    AND d.status <> 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_inspections post
      WHERE post.dispatch_id = d.id
        AND post.inspection_type = 'post_trip'
        AND post.completed_at IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_inspections rel
      WHERE rel.dispatch_id = d.id AND rel.released_at IS NOT NULL)
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF v_open.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'post_trip_outstanding',
      'message', format('%s has an outstanding post-trip check for dispatch %s. Complete it before assigning another trip.',
                        COALESCE(v_reg, 'This vehicle'), v_open.dispatch_number),
      'dispatch_id', v_open.id, 'dispatch_number', v_open.dispatch_number);
  END IF;

  -- (b) A standing safety block.
  SELECT id, inspector_notes, completed_at INTO v_pre
  FROM public.vehicle_inspections
  WHERE vehicle_id = p_vehicle_id
    AND blocked_dispatch = true
    AND completed_at IS NOT NULL
    AND released_at IS NULL
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_pre.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'failed_inspection',
      'message', format('%s failed a safety-critical check on %s and is grounded.',
                        COALESCE(v_reg, 'This vehicle'),
                        to_char(v_pre.completed_at, 'DD Mon YYYY')),
      'inspection_id', v_pre.id, 'notes', v_pre.inspector_notes);
  END IF;

  -- (c) No pre-trip standing ready.
  v_ready := public.find_open_pretrip(p_vehicle_id);
  IF v_ready IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'pretrip_required',
      'message', format('%s needs a pre-trip check before it can be dispatched.',
                        COALESCE(v_reg, 'This vehicle')));
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'clear',
                            'message', 'Cleared for dispatch.',
                            'pretrip_id', v_ready);
END $fn$;

-- Claim the waiting pre-trip for the dispatch being created, so the
-- post-trip is owed against this specific trip. AFTER INSERT: the BEFORE
-- trigger has already proved a pre-trip exists.
CREATE OR REPLACE FUNCTION public.claim_pretrip_for_dispatch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_owner text;
  v_pre   uuid;
BEGIN
  IF NEW.vehicle_id IS NULL THEN RETURN NEW; END IF;

  SELECT ownership_type INTO v_owner FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF COALESCE(v_owner, 'owned') <> 'owned' THEN RETURN NEW; END IF;

  v_pre := public.find_open_pretrip(NEW.vehicle_id);
  IF v_pre IS NOT NULL THEN
    UPDATE public.vehicle_inspections
    SET dispatch_id = NEW.id
    WHERE id = v_pre AND dispatch_id IS NULL;
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_claim_pretrip_for_dispatch ON public.dispatches;
CREATE TRIGGER trg_claim_pretrip_for_dispatch
  AFTER INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.claim_pretrip_for_dispatch();

-- Assigning a vehicle to an existing dispatch claims a pre-trip the same way.
CREATE OR REPLACE FUNCTION public.claim_pretrip_on_assign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_owner text;
  v_pre   uuid;
BEGIN
  IF NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    SELECT ownership_type INTO v_owner FROM public.vehicles WHERE id = NEW.vehicle_id;
    IF COALESCE(v_owner, 'owned') = 'owned' THEN
      v_pre := public.find_open_pretrip(NEW.vehicle_id);
      IF v_pre IS NOT NULL THEN
        UPDATE public.vehicle_inspections
        SET dispatch_id = NEW.id
        WHERE id = v_pre AND dispatch_id IS NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_claim_pretrip_on_assign ON public.dispatches;
CREATE TRIGGER trg_claim_pretrip_on_assign
  AFTER UPDATE OF vehicle_id ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.claim_pretrip_on_assign();
