-- ============================================================
-- WAYBILL: inherit vehicle / driver / organization from dispatch
-- ============================================================
-- Bug #66 — "Generate Waybill" then errors with "Failed to fetch vehicle
-- details", and the printed manifest shows "Not assigned".
--
-- Root cause: waybills has vehicle_id, driver_id and organization_id
-- columns, but neither insert path populates them:
--   * WaybillGenerator.tsx sets only waybill_number, plan_id,
--     route_summary, total_drops, generated_by, status — no dispatch_id
--     either, because dispatch_plans carries no vehicle.
--   * ConvertToDispatchDialog.tsx sets dispatch_id but not vehicle_id,
--     driver_id or organization_id.
--
-- Fixing this in the database rather than in each component means both
-- paths (and any future one) are covered, and the waybill can never be
-- written without its tenant.
--
-- Resolution order for the vehicle/driver:
--   1. whatever the caller explicitly supplied (never overridden)
--   2. the linked dispatch, when dispatch_id is present
-- organization_id additionally falls back to the creating user's org so
-- a waybill is never left untenanted.
--
-- Note: dispatch_plans has no vehicle, so plan-generated waybills can
-- only inherit once a dispatch is linked. Those correctly remain
-- unassigned until then, rather than showing a misleading vehicle.
-- ============================================================

CREATE OR REPLACE FUNCTION public.waybill_inherit_dispatch_context()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD;
BEGIN
  IF NEW.dispatch_id IS NOT NULL
     AND (NEW.vehicle_id IS NULL OR NEW.driver_id IS NULL OR NEW.organization_id IS NULL)
  THEN
    SELECT vehicle_id, driver_id, organization_id
    INTO d
    FROM public.dispatches
    WHERE id = NEW.dispatch_id;

    IF FOUND THEN
      NEW.vehicle_id      := COALESCE(NEW.vehicle_id,      d.vehicle_id);
      NEW.driver_id       := COALESCE(NEW.driver_id,       d.driver_id);
      NEW.organization_id := COALESCE(NEW.organization_id, d.organization_id);
    END IF;
  END IF;

  -- Last resort: tenant from the creating user, so the row is never
  -- orphaned outside tenant_isolation_gate.
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization(auth.uid());
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_waybill_inherit_dispatch_context ON public.waybills;
CREATE TRIGGER trg_waybill_inherit_dispatch_context
  BEFORE INSERT OR UPDATE OF dispatch_id
  ON public.waybills
  FOR EACH ROW EXECUTE FUNCTION public.waybill_inherit_dispatch_context();
