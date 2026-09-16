-- ============================================================
-- Two-stage approval for vehicle repairs
-- ============================================================
-- Previous shape: logged -> 'pending' -> super_admin approves/rejects ->
-- 'approved'/'rejected'. Finance had read-only visibility, no edit.
--
-- New shape, per explicit instruction:
--   logged -> 'pending_finance'
--          -> finance reviews, MAY EDIT parts_cost/labour_cost, approves ->
--             'pending_super_admin'
--          -> super_admin gives final approval -> 'approved' (books expense)
--
-- Either stage can reject, which is terminal — a rejected repair is dead,
-- not resubmitted; log a new one. super_admin can also act directly on a
-- 'pending_finance' repair, skipping finance's stage — consistent with
-- super_admin outranking finance_manager everywhere else in this platform.
--
-- The original logged figures are preserved (original_cost etc.) separate
-- from the live cost/parts_cost/labour_cost columns, so a super admin at
-- stage 2 can see what finance changed, not just what it changed TO.
-- ============================================================

-- ── 1. Schema ──────────────────────────────────────────────
ALTER TABLE public.vehicle_repairs
  ADD COLUMN IF NOT EXISTS original_cost numeric,
  ADD COLUMN IF NOT EXISTS original_parts_cost numeric,
  ADD COLUMN IF NOT EXISTS original_labour_cost numeric,
  ADD COLUMN IF NOT EXISTS finance_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS finance_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS finance_note text;

COMMENT ON COLUMN public.vehicle_repairs.original_cost IS
  'Cost as first logged, before any finance revision. Immutable after INSERT. Lets the super admin at final approval see what changed, not just the current figure.';

-- Drop the OLD constraint before remapping — 'pending_finance' would
-- violate it, since it only allowed 'pending'/'approved'/'rejected'.
ALTER TABLE public.vehicle_repairs
  DROP CONSTRAINT IF EXISTS vehicle_repairs_status_check;

-- Remap existing rows now that no constraint blocks it. Old 'pending' meant
-- "awaiting the only approval step there was", which maps to the new stage
-- 1: nothing has been reviewed by anyone yet.
UPDATE public.vehicle_repairs
SET status = 'pending_finance'
WHERE status = 'pending';

-- Now the new constraint can be added safely.
ALTER TABLE public.vehicle_repairs
  ADD CONSTRAINT vehicle_repairs_status_check
  CHECK (status IN ('pending_finance', 'pending_super_admin', 'approved', 'rejected'));

-- ── 2. A new repair starts at stage 1, and its original figures are frozen ──
CREATE OR REPLACE FUNCTION public.vehicle_repair_before_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org   uuid;
  v_owner text;
BEGIN
  SELECT organization_id, ownership_type INTO v_org, v_owner
  FROM public.vehicles WHERE id = NEW.vehicle_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF COALESCE(v_owner, 'owned') <> 'owned' THEN
    RAISE EXCEPTION 'Repairs can only be logged against owned vehicles. This truck belongs to a vendor, who maintains it at their own cost.';
  END IF;

  NEW.organization_id := v_org;
  NEW.logged_by := COALESCE(NEW.logged_by, auth.uid());

  IF COALESCE(NEW.parts_cost, 0) > 0 OR COALESCE(NEW.labour_cost, 0) > 0 THEN
    NEW.cost := COALESCE(NEW.parts_cost, 0) + COALESCE(NEW.labour_cost, 0);
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status       := 'pending_finance';
    NEW.approved_by  := NULL;
    NEW.approved_at  := NULL;
    NEW.original_cost        := NEW.cost;
    NEW.original_parts_cost  := NEW.parts_cost;
    NEW.original_labour_cost := NEW.labour_cost;
  END IF;

  RETURN NEW;
END $fn$;

-- ── 3. Stage 1: finance reviews, may revise the cost, sends it on ──
-- Editing here is the whole point of this stage — finance can correct a
-- mechanic's figure before it goes to the super admin. original_* is left
-- untouched so the revision is visible, not overwritten.
CREATE OR REPLACE FUNCTION public.finance_review_repair(
  p_repair_id uuid,
  p_parts_cost numeric DEFAULT NULL,
  p_labour_cost numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.vehicle_repairs;
  v_parts  numeric;
  v_labour numeric;
BEGIN
  SELECT * INTO r FROM public.vehicle_repairs WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair not found';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'finance_manager'::app_role)
       OR public.is_super_admin(auth.uid())
       OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only finance or a super admin can review a repair';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot review a repair belonging to another organisation';
  END IF;

  IF r.status <> 'pending_finance' THEN
    RAISE EXCEPTION 'Only a repair awaiting finance review can be reviewed (this one is %)', r.status;
  END IF;

  v_parts  := COALESCE(p_parts_cost, r.parts_cost);
  v_labour := COALESCE(p_labour_cost, r.labour_cost);

  IF v_parts < 0 OR v_labour < 0 THEN
    RAISE EXCEPTION 'Cost cannot be negative';
  END IF;

  UPDATE public.vehicle_repairs
  SET parts_cost = v_parts,
      labour_cost = v_labour,
      cost = v_parts + v_labour,
      status = 'pending_super_admin',
      finance_reviewed_by = auth.uid(),
      finance_reviewed_at = now(),
      finance_note = p_note
  WHERE id = p_repair_id;

  INSERT INTO public.approvals (entity_type, entity_id, approval_level, status,
                                requested_by, approved_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 1, 'approved',
          r.logged_by, auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id, 'status', 'pending_super_admin');
END $fn$;

-- ── 4. Stage 1 rejection: terminal, same as stage 2 ─────────
CREATE OR REPLACE FUNCTION public.finance_reject_repair(p_repair_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.vehicle_repairs;
BEGIN
  SELECT * INTO r FROM public.vehicle_repairs WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair not found';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'finance_manager'::app_role)
       OR public.is_super_admin(auth.uid())
       OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only finance or a super admin can reject a repair';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot reject a repair belonging to another organisation';
  END IF;

  IF r.status <> 'pending_finance' THEN
    RAISE EXCEPTION 'Only a repair awaiting finance review can be rejected at this stage (this one is %)', r.status;
  END IF;

  UPDATE public.vehicle_repairs
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_repair_id;

  INSERT INTO public.approvals (entity_type, entity_id, approval_level, status,
                                requested_by, rejected_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 1, 'rejected',
          r.logged_by, auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id);
END $fn$;

-- ── 5. Stage 2: super admin's final approval (books the expense) ──
-- super_admin may act here from EITHER 'pending_finance' or
-- 'pending_super_admin' — the top tier is never blocked from acting because
-- a lower tier has not reviewed yet, matching every other approval flow in
-- this platform.
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

  INSERT INTO public.approvals (entity_type, entity_id, approval_level, status,
                                requested_by, approved_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 2, 'approved',
          r.logged_by, auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id, 'expense_id', v_expense_id);
END $fn$;

-- ── 6. Stage 2 rejection: also reachable from either stage ──
CREATE OR REPLACE FUNCTION public.reject_vehicle_repair(p_repair_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.vehicle_repairs;
BEGIN
  SELECT * INTO r FROM public.vehicle_repairs WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can reject a repair at final approval';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot reject a repair belonging to another organisation';
  END IF;

  IF r.status NOT IN ('pending_finance', 'pending_super_admin') THEN
    RAISE EXCEPTION 'Only a pending repair can be rejected (this one is %)', r.status;
  END IF;

  UPDATE public.vehicle_repairs
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_repair_id;

  INSERT INTO public.approvals (entity_type, entity_id, approval_level, status,
                                requested_by, rejected_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 2, 'rejected',
          r.logged_by, auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id);
END $fn$;

-- ── 7. Backfill original_* for pre-existing rows ────────────
-- Backfill original_* for existing approved/rejected rows so the column is
-- never NULL for a repair that already has a real cost — the finance-review
-- diff only matters going forward, but a NULL here would render as "0 ->
-- current" instead of just showing the current figure once the UI checks it.
UPDATE public.vehicle_repairs
SET original_cost = cost,
    original_parts_cost = parts_cost,
    original_labour_cost = labour_cost
WHERE original_cost IS NULL;

-- ── 8. Grants ──────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.finance_review_repair(uuid, numeric, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finance_reject_repair(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_vehicle_repair(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_vehicle_repair(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.finance_review_repair(uuid, numeric, numeric, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.finance_reject_repair(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_vehicle_repair(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reject_vehicle_repair(uuid, text) TO authenticated;
