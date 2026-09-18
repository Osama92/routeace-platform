-- ============================================================
-- Claiming a pre-trip must also claim its fuel log
-- ============================================================
-- Root cause of a fuel log's "Sys. Est. (L)" staying blank, reported
-- repeatedly and previously mis-diagnosed as a UI/auto-select problem in
-- FleetComplianceHub.tsx. The real gap is structural:
--
--   1. Pre-trip check is filled BEFORE the dispatch exists (the "unclaimed
--      pre-trip" pattern — see 20260908000001_require_pretrip_before_dispatch.sql).
--      TripChecklistDialog.tsx is passed dispatchId="" at this point, so the
--      fuel_logs row it inserts for the diesel issued always gets
--      dispatch_id = NULL. This is correct and unavoidable — the dispatch
--      genuinely does not exist yet.
--   2. The dispatch is created moments later. claim_pretrip_for_dispatch()
--      (AFTER INSERT on dispatches) claims the matching vehicle_inspections
--      row by setting its dispatch_id — but it only ever touched
--      vehicle_inspections. fuel_logs was never claimed alongside it.
--
-- So every pre-trip-before-dispatch fuel log — which is the NORMAL path,
-- not an edge case — stayed permanently unlinked, regardless of how the
-- dispatch was created (main /dispatch page or CreateDispatchDialog), which
-- is exactly what was reported: "it needs to be fixed either the dispatch
-- is manual or not."
--
-- Fix: both triggers that claim a pre-trip now also claim the matching
-- unclaimed fuel_logs row for the same vehicle. Matched the same way the
-- pre-trip itself is found — most recent, unclaimed, for that vehicle —
-- since a fuel log written in the same submit as the pre-trip has no other
-- way to be identified as "belonging" to it.
-- ============================================================

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

    -- Claim the most recent unlinked fuel log for this vehicle — the one
    -- the pre-trip's own diesel-issued entry created. Scoped to the last 24h
    -- to match find_open_pretrip's own freshness window, so an old unrelated
    -- unlinked log is never mistakenly claimed.
    UPDATE public.fuel_logs
    SET dispatch_id = NEW.id
    WHERE id = (
      SELECT id FROM public.fuel_logs
      WHERE vehicle_id = NEW.vehicle_id
        AND dispatch_id IS NULL
        AND created_at > now() - interval '24 hours'
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END $fn$;

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

        UPDATE public.fuel_logs
        SET dispatch_id = NEW.id
        WHERE id = (
          SELECT id FROM public.fuel_logs
          WHERE vehicle_id = NEW.vehicle_id
            AND dispatch_id IS NULL
            AND created_at > now() - interval '24 hours'
          ORDER BY created_at DESC
          LIMIT 1
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

-- ── Backfill: existing unclaimed fuel logs from a pre-trip that already
--    matched a dispatch (vehicle_inspections.dispatch_id is set) but whose
--    fuel_logs row was never updated, since the old trigger never did this.
--    Matched by vehicle + created within a few minutes of the inspection's
--    completion, which is how tight a pre-trip submit's own fuel log write
--    actually is (same request, sequential inserts).
UPDATE public.fuel_logs fl
SET dispatch_id = vi.dispatch_id
FROM public.vehicle_inspections vi
WHERE fl.dispatch_id IS NULL
  AND fl.vehicle_id = vi.vehicle_id
  AND vi.inspection_type = 'pre_trip'
  AND vi.dispatch_id IS NOT NULL
  AND vi.completed_at IS NOT NULL
  AND fl.created_at BETWEEN vi.completed_at - interval '5 minutes' AND vi.completed_at + interval '5 minutes';
