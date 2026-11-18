-- ============================================================
-- release_vehicle_trip_block must cover ALL THREE gate reasons
-- ============================================================
-- 20260908000001 added a third way check_vehicle_trip_gate() can refuse a
-- dispatch — reason 'pretrip_required', when no fresh (<24h), unclaimed
-- pre-trip is standing ready for the vehicle — but never updated
-- release_vehicle_trip_block() to clear it. The function still only clears
-- (a) an outstanding post-trip and (b) a standing blocked_dispatch flag.
--
-- Reported from the field: a super admin released FST590YL from the UI,
-- release_vehicle_trip_block() returned success, but the vehicle stayed
-- locked — because its actual block was reason (c), which this function
-- silently did nothing for. v_released correctly reported 0 rows touched
-- for that case; the caller just never surfaced that as "this didn't help."
--
-- FIX: when no post-trip/safety-block row exists to release (the first two
-- UPDATEs together touched zero rows) AND the vehicle still has no fresh
-- unclaimed pre-trip, insert one on the super admin's attestation — the same
-- "I am vouching for this truck" act a pre-trip inspector normally performs,
-- just performed by the person authorising the override instead. It is a
-- REAL pre-trip (not a released/no-op placeholder), because find_open_pretrip()
-- requires completed_at + blocked_dispatch=false + no dispatch_id yet, and
-- teaching that query to also recognise a "released but otherwise absent"
-- row would duplicate the same exemption logic in two places. The override
-- is still fully attributable: inspector_id is the releasing super admin,
-- inspector_notes records the reason, and the existing approvals row (logged
-- once below, same as before) covers all three reasons, not just the first
-- two.
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_vehicle_trip_block(
  p_vehicle_id uuid,
  p_reason     text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org        uuid;
  v_released   int := 0;
  v_pretrip_id uuid;
  v_actions    text[] := ARRAY[]::text[];
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

  -- (a) Clear an outstanding post-trip by marking the open pre-trip released.
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
  IF v_released > 0 THEN
    v_actions := array_append(v_actions, 'post_trip_outstanding');
  END IF;

  -- (b) Also clear a standing safety block on the same vehicle.
  WITH safety_blocks AS (
    SELECT id FROM public.vehicle_inspections
    WHERE vehicle_id = p_vehicle_id
      AND blocked_dispatch = true
      AND completed_at IS NOT NULL
      AND released_at IS NULL
  )
  UPDATE public.vehicle_inspections vi
  SET released_by = auth.uid(), released_at = now(), release_reason = p_reason
  FROM safety_blocks s
  WHERE vi.id = s.id;

  IF FOUND THEN
    v_actions := array_append(v_actions, 'failed_inspection');
  END IF;

  -- (c) No fresh unclaimed pre-trip standing ready — the reason
  -- find_open_pretrip() would still refuse the vehicle even after (a)/(b)
  -- above. Only act here if the gate is STILL closed for this reason, so a
  -- release that already succeeded via (a)/(b) does not insert a redundant
  -- pre-trip record.
  IF (public.check_vehicle_trip_gate(p_vehicle_id)->>'reason') = 'pretrip_required' THEN
    INSERT INTO public.vehicle_inspections (
      organization_id, vehicle_id, inspection_type, status, overall_score,
      inspector_id, inspector_notes, blocked_dispatch, completed_at
    ) VALUES (
      v_org, p_vehicle_id, 'pre_trip', 'passed', 100,
      auth.uid(),
      'Administrative pre-trip override by super admin release: ' || p_reason,
      false, now()
    )
    RETURNING id INTO v_pretrip_id;
    v_actions := array_append(v_actions, 'pretrip_required');
  END IF;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                approved_by, organization_id, reason)
  VALUES ('vehicle_trip_release', p_vehicle_id::text, 'approved', auth.uid(),
          auth.uid(), v_org, p_reason);

  RETURN jsonb_build_object(
    'ok', true,
    'released_inspections', v_released,
    'actions', to_jsonb(v_actions),
    'pretrip_override_id', v_pretrip_id
  );
END $fn$;

GRANT EXECUTE ON FUNCTION public.release_vehicle_trip_block(uuid, text) TO authenticated;
