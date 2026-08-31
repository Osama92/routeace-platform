-- ============================================================
-- 1. Record WHERE a dispatch's money came from
-- 2. Route vehicle repairs through super admin approval
-- ============================================================

-- ── 1. Provenance on dispatch_financials ─────────────────────
-- Finance Entry lets anyone overwrite vendor_cost and client_revenue. When
-- the figure came from an APPROVED rate card that silently defeats the
-- approval trail: a rate reviewed by a super admin can be replaced by a typed
-- number with no record of the change.
--
-- Locking the fields outright is wrong though — when no rate resolves (no
-- lane for the customer, or a vendor truck with no vendor assigned) the value
-- is 0 and finance MUST be able to correct it. So the UI needs to know which
-- of the two it is looking at, per field.
ALTER TABLE public.dispatch_financials
  ADD COLUMN IF NOT EXISTS revenue_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS cost_source    text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS client_rate_card_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_rate_card_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL;

ALTER TABLE public.dispatch_financials
  DROP CONSTRAINT IF EXISTS dispatch_financials_revenue_source_check;
ALTER TABLE public.dispatch_financials
  ADD CONSTRAINT dispatch_financials_revenue_source_check
  CHECK (revenue_source IN ('rate_card', 'manual'));

ALTER TABLE public.dispatch_financials
  DROP CONSTRAINT IF EXISTS dispatch_financials_cost_source_check;
ALTER TABLE public.dispatch_financials
  ADD CONSTRAINT dispatch_financials_cost_source_check
  CHECK (cost_source IN ('rate_card', 'manual', 'owned_fleet'));

COMMENT ON COLUMN public.dispatch_financials.revenue_source IS
  'rate_card = came from an approved client rate card and must not be edited in Finance Entry. manual = typed by finance because no rate resolved.';
COMMENT ON COLUMN public.dispatch_financials.cost_source IS
  'rate_card = from an approved vendor rate card. owned_fleet = own truck, so there is no vendor to pay. manual = typed by finance.';

-- Existing rows were all hand-entered before rate cards existed, so the
-- 'manual' default is already correct for them. Nothing to backfill.

-- ── 2. Repair approval ───────────────────────────────────────
-- Repairs book money against the fleet. They now follow the same shape as
-- rate cards: recorded immediately (the work happened and the operational
-- record matters) but not counted as cost until a super admin approves.
ALTER TABLE public.vehicle_repairs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.vehicle_repairs
  DROP CONSTRAINT IF EXISTS vehicle_repairs_status_check;
ALTER TABLE public.vehicle_repairs
  ADD CONSTRAINT vehicle_repairs_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_vehicle_repairs_status
  ON public.vehicle_repairs (organization_id, status);

-- A new repair always starts pending regardless of what the client sends.
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

  IF TG_OP = 'INSERT' THEN
    NEW.status      := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  IF COALESCE(NEW.parts_cost, 0) > 0 OR COALESCE(NEW.labour_cost, 0) > 0 THEN
    NEW.cost := COALESCE(NEW.parts_cost, 0) + COALESCE(NEW.labour_cost, 0);
  END IF;

  RETURN NEW;
END $fn$;

-- Approving is what books the expense. Until then the repair is a record of
-- work done, not a cost in the accounts, so an unapproved or rejected repair
-- never reaches the ledger.
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
    RAISE EXCEPTION 'Only a super admin can approve a repair';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot approve a repair belonging to another organisation';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending repair can be approved (this one is %)', r.status;
  END IF;

  SELECT registration_number INTO v_reg FROM public.vehicles WHERE id = r.vehicle_id;

  -- Book the money only now, and only if there is money and it has not
  -- already been booked.
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

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                approved_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 'approved', r.logged_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id, 'expense_id', v_expense_id);
END $fn$;

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
    RAISE EXCEPTION 'Only a super admin can reject a repair';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot reject a repair belonging to another organisation';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending repair can be rejected (this one is %)', r.status;
  END IF;

  UPDATE public.vehicle_repairs
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_repair_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                rejected_by, organization_id, reason)
  VALUES ('vehicle_repair', p_repair_id::text, 'rejected', r.logged_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'repair_id', p_repair_id);
END $fn$;

-- log_vehicle_repair no longer books the expense on entry: that happens at
-- approval. It records the work and leaves the money pending.
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
  p_book_expense  boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org       uuid;
  v_owner     text;
  v_total     numeric := COALESCE(p_parts_cost, 0) + COALESCE(p_labour_cost, 0);
  v_repair_id uuid;
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

  INSERT INTO public.vehicle_repairs (
    vehicle_id, repair_date, repair_type, description, parts_replaced,
    parts_cost, labour_cost, cost, mileage_at_repair, performed_by,
    is_breakdown, downtime_days
  )
  VALUES (
    p_vehicle_id, p_repair_date, p_repair_type, p_description, p_parts_replaced,
    COALESCE(p_parts_cost, 0), COALESCE(p_labour_cost, 0), v_total,
    p_mileage, p_performed_by, p_is_breakdown, p_downtime_days
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

-- Only approved repairs count as fleet spend.
CREATE OR REPLACE FUNCTION public.get_fleet_repair_leaderboard(p_organization_id uuid)
RETURNS TABLE (
  vehicle_id uuid,
  registration_number text,
  truck_type text,
  total_spend numeric,
  repair_count bigint,
  breakdown_count bigint,
  total_downtime_days bigint,
  last_repair date,
  cost_per_km numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    v.id,
    v.registration_number,
    v.truck_type,
    COALESCE(sum(r.cost) FILTER (WHERE r.status = 'approved'), 0),
    count(r.id) FILTER (WHERE r.status = 'approved'),
    count(r.id) FILTER (WHERE r.status = 'approved' AND r.is_breakdown),
    COALESCE(sum(r.downtime_days) FILTER (WHERE r.status = 'approved'), 0),
    max(r.repair_date) FILTER (WHERE r.status = 'approved'),
    CASE WHEN COALESCE(v.lifetime_km, 0) > 0
         THEN round((COALESCE(sum(r.cost) FILTER (WHERE r.status = 'approved'), 0) / v.lifetime_km)::numeric, 2)
    END
  FROM public.vehicles v
  LEFT JOIN public.vehicle_repairs r ON r.vehicle_id = v.id
  WHERE v.organization_id = p_organization_id
    AND COALESCE(v.ownership_type, 'owned') = 'owned'
  GROUP BY v.id, v.registration_number, v.truck_type, v.lifetime_km
  ORDER BY COALESCE(sum(r.cost) FILTER (WHERE r.status = 'approved'), 0) DESC;
$fn$;

REVOKE EXECUTE ON FUNCTION public.approve_vehicle_repair(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_vehicle_repair(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_vehicle_repair(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reject_vehicle_repair(uuid, text) TO authenticated;
