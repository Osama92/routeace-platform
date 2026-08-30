-- ============================================================
-- VEHICLE REPAIRS — make the existing repair log usable
-- ============================================================
-- vehicle_repairs already had the right shape: repair_type, description,
-- cost, mileage_at_repair, performed_by, repair_date. A working entry form
-- already existed on the vehicle's Repairs tab. The table has 0 rows
-- platform-wide for one reason:
--
--   Policy "Admin and operations can manage vehicle repairs"
--     USING role = ANY (ARRAY['admin', 'operations'])
--
-- Relma has ZERO users holding either role. The 7 people who should be
-- logging repairs — 3 finance managers, 2 org admins, a super admin and an
-- ops manager — were all locked out. The feature was built and never
-- reachable.
--
-- Fixed here:
--   1. organization_id added, so the table can be tenant-scoped at all.
--   2. Write access opened to the roles that actually exist.
--   3. Cost fields split into parts/labour so "what was changed" is
--      answerable, not just "what did it cost".
--   4. Repairs are restricted to OWNED vehicles. A vendor maintains their
--      own truck at their own expense; recording it as our cost would
--      overstate our maintenance spend and understate vendor margin.
--   5. An optional link to the expense row, so logging a repair can also
--      book the money without finance re-keying it.
-- ============================================================

-- ── 1. Tenancy ───────────────────────────────────────────────
ALTER TABLE public.vehicle_repairs
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Derive the owner from the vehicle. The table is empty today so this is a
-- no-op, but it keeps the migration correct if rows are added before it runs.
UPDATE public.vehicle_repairs r
SET organization_id = v.organization_id
FROM public.vehicles v
WHERE r.vehicle_id = v.id AND r.organization_id IS NULL;

DELETE FROM public.vehicle_repairs WHERE organization_id IS NULL;

ALTER TABLE public.vehicle_repairs ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_repairs_org_vehicle
  ON public.vehicle_repairs (organization_id, vehicle_id, repair_date DESC);

-- ── 2. Detail needed to answer "when was what changed" ───────
ALTER TABLE public.vehicle_repairs
  ADD COLUMN IF NOT EXISTS parts_replaced text,
  ADD COLUMN IF NOT EXISTS parts_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_breakdown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS downtime_days integer,
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS logged_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.vehicle_repairs.is_breakdown IS
  'True when the vehicle failed in service, false for planned/preventive work. Breakdown frequency is the reliability signal; scheduled servicing is not.';
COMMENT ON COLUMN public.vehicle_repairs.expense_id IS
  'The expense row this repair booked, when cost was recorded. Lets the money and the workshop record stay in step without double entry.';

-- ── 3. Stamp tenant + reject vendor trucks ───────────────────
-- Repairs are for OWNED vehicles only: a vendor maintains their own truck at
-- their own cost. Enforced in the database, not just hidden in the UI, so a
-- vendor repair cannot be recorded through any path.
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

  -- Keep the headline cost consistent with its parts. When a caller supplies
  -- a breakdown, cost is derived rather than trusted; when they supply only a
  -- total, it stands.
  IF COALESCE(NEW.parts_cost, 0) > 0 OR COALESCE(NEW.labour_cost, 0) > 0 THEN
    NEW.cost := COALESCE(NEW.parts_cost, 0) + COALESCE(NEW.labour_cost, 0);
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_vehicle_repair_before_write ON public.vehicle_repairs;
CREATE TRIGGER trg_vehicle_repair_before_write
  BEFORE INSERT OR UPDATE ON public.vehicle_repairs
  FOR EACH ROW EXECUTE FUNCTION public.vehicle_repair_before_write();

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.vehicle_repairs ENABLE ROW LEVEL SECURITY;

-- The policy that made this table unusable.
DROP POLICY IF EXISTS "Admin and operations can manage vehicle repairs" ON public.vehicle_repairs;

DROP POLICY IF EXISTS vehicle_repairs_tenant_gate ON public.vehicle_repairs;
CREATE POLICY vehicle_repairs_tenant_gate
  ON public.vehicle_repairs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  );

DROP POLICY IF EXISTS vehicle_repairs_read ON public.vehicle_repairs;
CREATE POLICY vehicle_repairs_read
  ON public.vehicle_repairs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Roles that actually exist in a logistics company, rather than 'operations'
-- which no user holds.
DROP POLICY IF EXISTS vehicle_repairs_write ON public.vehicle_repairs;
CREATE POLICY vehicle_repairs_write
  ON public.vehicle_repairs FOR ALL TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'ops_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'ops_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ── 5. Log a repair and book the money in one step ───────────
-- Two systems previously held half the picture each: Asset Operations knew
-- WHEN work happened, Expenses knew WHAT IT COST, and nothing joined them.
-- This records both from a single action so they cannot drift apart.
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
  v_org        uuid;
  v_owner      text;
  v_total      numeric := COALESCE(p_parts_cost, 0) + COALESCE(p_labour_cost, 0);
  v_expense_id uuid;
  v_repair_id  uuid;
  v_reg        text;
BEGIN
  SELECT organization_id, ownership_type, registration_number
    INTO v_org, v_owner, v_reg
  FROM public.vehicles WHERE id = p_vehicle_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF NOT public.is_org_member(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Cannot log a repair against another organisation''s vehicle';
  END IF;

  IF COALESCE(v_owner, 'owned') <> 'owned' THEN
    RAISE EXCEPTION 'Repairs can only be logged against owned vehicles.';
  END IF;

  -- Book the money first so the repair can reference it. Skipped when the
  -- repair genuinely cost nothing (warranty, goodwill, in-house labour).
  IF p_book_expense AND v_total > 0 THEN
    INSERT INTO public.expenses (
      organization_id, vehicle_id, category, amount, description,
      expense_date, approval_status, is_cogs
    )
    VALUES (
      v_org, p_vehicle_id, 'repairs', v_total,
      COALESCE(p_repair_type, 'Repair') || ' — ' || COALESCE(v_reg, 'vehicle')
        || COALESCE(' (' || NULLIF(p_parts_replaced, '') || ')', ''),
      p_repair_date, 'approved', true
    )
    RETURNING id INTO v_expense_id;
  END IF;

  INSERT INTO public.vehicle_repairs (
    vehicle_id, repair_date, repair_type, description, parts_replaced,
    parts_cost, labour_cost, cost, mileage_at_repair, performed_by,
    is_breakdown, downtime_days, expense_id
  )
  VALUES (
    p_vehicle_id, p_repair_date, p_repair_type, p_description, p_parts_replaced,
    COALESCE(p_parts_cost, 0), COALESCE(p_labour_cost, 0), v_total,
    p_mileage, p_performed_by, p_is_breakdown, p_downtime_days, v_expense_id
  )
  RETURNING id INTO v_repair_id;

  -- Keep the odometer moving forward if this reading is newer.
  IF p_mileage IS NOT NULL THEN
    UPDATE public.vehicles
    SET current_odometer = GREATEST(COALESCE(current_odometer, 0), p_mileage)
    WHERE id = p_vehicle_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'repair_id', v_repair_id, 'expense_id', v_expense_id, 'total_cost', v_total
  );
END $fn$;

-- ── 6. Service history + reliability for one vehicle ─────────
CREATE OR REPLACE FUNCTION public.get_vehicle_repair_insights(p_vehicle_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org       uuid;
  v_result    jsonb;
  v_first     date;
  v_last      date;
  v_breakdowns int;
  v_months    numeric;
BEGIN
  SELECT organization_id INTO v_org FROM public.vehicles WHERE id = p_vehicle_id;
  IF v_org IS NULL OR NOT public.is_org_member(auth.uid(), v_org) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT min(repair_date), max(repair_date),
         count(*) FILTER (WHERE is_breakdown)
    INTO v_first, v_last, v_breakdowns
  FROM public.vehicle_repairs WHERE vehicle_id = p_vehicle_id;

  -- Months of history, floored at 1 so a single-month record does not divide
  -- by zero and report an absurd rate.
  v_months := GREATEST(1, COALESCE(EXTRACT(EPOCH FROM (COALESCE(v_last, CURRENT_DATE) - COALESCE(v_first, CURRENT_DATE))) / 2592000.0, 0));

  SELECT jsonb_build_object(
    'ok', true,
    'total_spend', COALESCE(sum(cost), 0),
    'repair_count', count(*),
    'breakdown_count', v_breakdowns,
    'planned_count', count(*) FILTER (WHERE NOT is_breakdown),
    'total_downtime_days', COALESCE(sum(downtime_days), 0),
    'first_repair', v_first,
    'last_repair', v_last,
    -- Breakdowns per month: the reliability signal. Planned servicing is
    -- excluded because a well-maintained truck should have plenty of it.
    'breakdowns_per_month', round((v_breakdowns / v_months)::numeric, 2),
    'avg_repair_cost', CASE WHEN count(*) > 0 THEN round(avg(cost)::numeric) ELSE 0 END
  )
  INTO v_result
  FROM public.vehicle_repairs WHERE vehicle_id = p_vehicle_id;

  -- Repeat faults: the same repair type recurring within 90 days is either a
  -- bad fix or a failing component. This is what turns a list of records into
  -- something actionable.
  SELECT v_result || jsonb_build_object(
    'repeat_faults',
    COALESCE(jsonb_agg(jsonb_build_object(
      'repair_type', repair_type, 'occurrences', n, 'total_cost', spend
    )), '[]'::jsonb)
  )
  INTO v_result
  FROM (
    SELECT repair_type, count(*) AS n, sum(cost) AS spend
    FROM public.vehicle_repairs
    WHERE vehicle_id = p_vehicle_id
      AND repair_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY repair_type
    HAVING count(*) > 1
  ) rf;

  RETURN v_result;
END $fn$;

-- ── 7. "Leaking pots" — which owned trucks drain money ───────
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
    COALESCE(sum(r.cost), 0),
    count(r.id),
    count(r.id) FILTER (WHERE r.is_breakdown),
    COALESCE(sum(r.downtime_days), 0),
    max(r.repair_date),
    -- Only meaningful once the truck has recorded distance; NULL rather than
    -- a divide-by-zero or a fake 0.
    CASE WHEN COALESCE(v.lifetime_km, 0) > 0
         THEN round((COALESCE(sum(r.cost), 0) / v.lifetime_km)::numeric, 2)
    END
  FROM public.vehicles v
  LEFT JOIN public.vehicle_repairs r ON r.vehicle_id = v.id
  WHERE v.organization_id = p_organization_id
    AND COALESCE(v.ownership_type, 'owned') = 'owned'
  GROUP BY v.id, v.registration_number, v.truck_type, v.lifetime_km
  ORDER BY COALESCE(sum(r.cost), 0) DESC;
$fn$;

REVOKE EXECUTE ON FUNCTION public.log_vehicle_repair(uuid, date, text, text, text, numeric, numeric, integer, text, boolean, integer, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_vehicle_repair(uuid, date, text, text, text, numeric, numeric, integer, text, boolean, integer, boolean) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_vehicle_repair_insights(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_fleet_repair_leaderboard(uuid) TO authenticated;
