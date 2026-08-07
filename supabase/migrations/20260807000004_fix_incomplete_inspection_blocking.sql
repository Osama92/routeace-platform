-- ============================================================
-- Incomplete inspections must not block dispatch (bug #30)
-- ============================================================
-- FleetInspectionEngine set blocked_dispatch = hasCriticalFail without
-- checking whether the checklist was actually finished. An inspector who
-- opened an inspection, marked one safety-critical item as poor, and did
-- not complete the remaining items left the vehicle permanently blocked
-- on an unfinished assessment.
--
-- Live data showed all 28 inspections with blocked_dispatch = true,
-- including 8 still in_progress — and no inspection had ever reached
-- 'passed', which is what surfaced as "inspection showing FAILED and
-- IN PROGRESS".
--
-- A block is a safety decision and must rest on a completed inspection.
-- This clears the flag for inspections that were never finished
-- (completed_at IS NULL / status = 'in_progress'). Genuine failures on
-- completed inspections keep their block.
--
-- The frontend is fixed in the same change (blocked_dispatch is now
-- allChecked && hasCriticalFail), so this only repairs historical rows.
-- ============================================================

UPDATE public.vehicle_inspections
SET blocked_dispatch = false,
    updated_at = now()
WHERE blocked_dispatch = true
  AND (status = 'in_progress' OR completed_at IS NULL);

-- Guard the invariant at the database level so no future write path can
-- reintroduce it, regardless of which client performs the insert.
CREATE OR REPLACE FUNCTION public.enforce_inspection_block_requires_completion()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.blocked_dispatch = true
     AND (NEW.completed_at IS NULL OR NEW.status = 'in_progress')
  THEN
    NEW.blocked_dispatch := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_inspection_block_requires_completion ON public.vehicle_inspections;
CREATE TRIGGER trg_inspection_block_requires_completion
  BEFORE INSERT OR UPDATE OF blocked_dispatch, status, completed_at
  ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inspection_block_requires_completion();
