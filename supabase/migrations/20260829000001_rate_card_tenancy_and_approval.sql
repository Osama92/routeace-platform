-- ============================================================
-- RATE CARD — tenant scoping + finance-proposes / super-admin-approves
-- ============================================================
-- The rate card (trip_rate_config) holds delivery/freight rates: zone,
-- pickup location, truck type, driver type and the rate charged.
--
-- THREE PROBLEMS FIXED HERE
--
-- 1. NO TENANCY. The table had no organization_id and its only RLS policy
--    was is_super_admin(auth.uid()). There are 16 super_admin accounts
--    spanning 15 organisations — these are customer administrators, not
--    platform staff. Every one of them could read AND WRITE all 10 rates.
--    Commercial pricing was shared across tenants.
--
-- 2. NO APPROVAL CONTROL. Any of those accounts could change a rate with
--    no review. Rates now carry an explicit status; only 'approved' rates
--    are usable by dispatch.
--
-- 3. NO VERSION HISTORY. Editing a rate overwrote it, so what a past
--    dispatch was actually priced at could not be recovered. Edits now
--    create a new pending version and leave the approved one serving
--    existing dispatches.
--
-- ROLES
--   finance_manager / org_admin  — create and edit rates (creates 'pending')
--   super_admin / platform_owner — approve or reject
--   everyone else in the org     — read approved rates only
--
-- LEGACY DATA NOTE
--   The 10 pre-existing rows were created 2026-05-19, before tenancy was
--   enforced. They carry no customer_id, partner_id or route_id, so NOTHING
--   IN THE DATA identifies their owner. They are assigned to the busiest
--   organisation (Relma Haulage: 114 dispatches; next highest is 5) whose
--   Ibadan routes match these zones. This is an INFERENCE, recorded here so
--   it can be reversed — see the rollback note at the foot of this file.
-- ============================================================

-- ── 1. Tenancy ───────────────────────────────────────────────
ALTER TABLE public.trip_rate_config
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Prefer real evidence where it exists (a linked customer/partner/route
-- tells us the owner). All 10 current rows have none, so they fall through
-- to the inference below, but this ordering keeps the migration correct if
-- rows are added before it runs.
UPDATE public.trip_rate_config t
SET organization_id = c.organization_id
FROM public.customers c
WHERE t.customer_id = c.id AND t.organization_id IS NULL;

UPDATE public.trip_rate_config t
SET organization_id = p.organization_id
FROM public.partners p
WHERE t.partner_id = p.id AND t.organization_id IS NULL;

UPDATE public.trip_rate_config t
SET organization_id = r.organization_id
FROM public.routes r
WHERE t.route_id = r.id AND t.organization_id IS NULL;

-- Remaining orphans -> the organisation with the most dispatches.
-- Deliberately data-driven rather than a hardcoded UUID, so this behaves
-- sensibly if run against a restored copy or a different environment.
UPDATE public.trip_rate_config
SET organization_id = (
  SELECT d.organization_id
  FROM public.dispatches d
  WHERE d.organization_id IS NOT NULL
  GROUP BY d.organization_id
  ORDER BY count(*) DESC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Any row still unowned (empty database) is removed rather than left
-- visible to everyone — an unowned pricing row is exactly the leak fixed here.
DELETE FROM public.trip_rate_config WHERE organization_id IS NULL;

ALTER TABLE public.trip_rate_config ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_rate_org ON public.trip_rate_config (organization_id);

-- ── 2. Approval state + versioning ───────────────────────────
ALTER TABLE public.trip_rate_config
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES public.trip_rate_config(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.trip_rate_config
  DROP CONSTRAINT IF EXISTS trip_rate_config_status_check;
ALTER TABLE public.trip_rate_config
  ADD CONSTRAINT trip_rate_config_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'superseded'));

-- Existing rows are already in use for driver payroll; marking them pending
-- would empty the rate card overnight. approved_by stays NULL to record that
-- no human approved them — they are grandfathered, not reviewed.
UPDATE public.trip_rate_config
SET status = 'approved',
    approved_at = COALESCE(approved_at, created_at),
    review_note = COALESCE(review_note, 'Grandfathered: predates the approval workflow. Not reviewed by a super admin.')
WHERE status = 'pending';

-- Only one approved rate per commercial key. Partial so pending/rejected
-- versions can coexist while awaiting review.
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_rate_approved
  ON public.trip_rate_config (
    organization_id, zone, truck_type, driver_type,
    COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(partner_id,  '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_trip_rate_status ON public.trip_rate_config (organization_id, status);

-- ── 3. Stamp tenant + submitter automatically ────────────────
-- The caller cannot set another org's id, and cannot self-approve by
-- writing status='approved' directly on insert.
CREATE OR REPLACE FUNCTION public.trip_rate_before_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.get_user_organization(auth.uid());
    END IF;

    -- A new rate always starts pending, regardless of what was submitted.
    -- Approval happens only through approve_trip_rate().
    NEW.status        := 'pending';
    NEW.approved_by   := NULL;
    NEW.approved_at   := NULL;
    NEW.submitted_by  := COALESCE(NEW.submitted_by, auth.uid());
    NEW.submitted_at  := COALESCE(NEW.submitted_at, now());
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_trip_rate_before_write ON public.trip_rate_config;
CREATE TRIGGER trg_trip_rate_before_write
  BEFORE INSERT ON public.trip_rate_config
  FOR EACH ROW EXECUTE FUNCTION public.trip_rate_before_write();

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.trip_rate_config ENABLE ROW LEVEL SECURITY;

-- Replace the old cross-tenant policy.
DROP POLICY IF EXISTS trip_rate_config_super_admin ON public.trip_rate_config;

-- Hard tenant boundary. Platform owners (2 accounts) retain cross-org
-- visibility; super_admin alone deliberately does NOT, because those 16
-- accounts belong to 15 different customer organisations.
DROP POLICY IF EXISTS trip_rate_tenant_gate ON public.trip_rate_config;
CREATE POLICY trip_rate_tenant_gate
  ON public.trip_rate_config
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  );

-- Everyone in the org can read (dispatch needs the approved rate).
DROP POLICY IF EXISTS trip_rate_read ON public.trip_rate_config;
CREATE POLICY trip_rate_read
  ON public.trip_rate_config FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Finance and org admins propose rates.
DROP POLICY IF EXISTS trip_rate_finance_insert ON public.trip_rate_config;
CREATE POLICY trip_rate_finance_insert
  ON public.trip_rate_config FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Finance may edit only rates that are NOT yet approved. Changing an
-- approved rate goes through propose_trip_rate_change(), which creates a
-- new version instead of mutating the live one.
DROP POLICY IF EXISTS trip_rate_finance_update ON public.trip_rate_config;
CREATE POLICY trip_rate_finance_update
  ON public.trip_rate_config FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status IN ('pending', 'rejected')
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (status IN ('pending', 'rejected'));

DROP POLICY IF EXISTS trip_rate_finance_delete ON public.trip_rate_config;
CREATE POLICY trip_rate_finance_delete
  ON public.trip_rate_config FOR DELETE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status IN ('pending', 'rejected')
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ── 5. Approve / reject (SECURITY DEFINER, super admin only) ─
-- Status transitions happen ONLY here, so no UPDATE policy can be used to
-- self-approve.
CREATE OR REPLACE FUNCTION public.approve_trip_rate(p_rate_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.trip_rate_config;
BEGIN
  SELECT * INTO r FROM public.trip_rate_config WHERE id = p_rate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rate not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can approve a rate';
  END IF;

  -- A super admin may only approve within their own organisation.
  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot approve a rate belonging to another organisation';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending rate can be approved (this one is %)', r.status;
  END IF;

  -- Retire the rate this one replaces. Past dispatches keep pointing at the
  -- superseded row, so what they were priced at stays recoverable.
  IF r.supersedes_id IS NOT NULL THEN
    UPDATE public.trip_rate_config
    SET status = 'superseded'
    WHERE id = r.supersedes_id AND status = 'approved';
  ELSE
    -- Direct replacement of an equivalent live rate, if one exists.
    UPDATE public.trip_rate_config
    SET status = 'superseded'
    WHERE organization_id = r.organization_id
      AND zone = r.zone
      AND truck_type = r.truck_type
      AND driver_type = r.driver_type
      AND COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(r.customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(r.partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'approved'
      AND id <> r.id;
  END IF;

  UPDATE public.trip_rate_config
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_rate_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                approved_by, organization_id, reason)
  VALUES ('rate_card', p_rate_id::text, 'approved', r.submitted_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'rate_id', p_rate_id, 'status', 'approved');
END $fn$;

CREATE OR REPLACE FUNCTION public.reject_trip_rate(p_rate_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.trip_rate_config;
BEGIN
  SELECT * INTO r FROM public.trip_rate_config WHERE id = p_rate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rate not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can reject a rate';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot reject a rate belonging to another organisation';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending rate can be rejected (this one is %)', r.status;
  END IF;

  UPDATE public.trip_rate_config
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_rate_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                rejected_by, organization_id, reason)
  VALUES ('rate_card', p_rate_id::text, 'rejected', r.submitted_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'rate_id', p_rate_id, 'status', 'rejected');
END $fn$;

-- ── 6. Propose a change to a live rate ───────────────────────
-- Clones the approved rate into a new pending version. The live rate keeps
-- serving dispatch until a super admin approves the replacement.
CREATE OR REPLACE FUNCTION public.propose_trip_rate_change(
  p_rate_id uuid,
  p_new_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r       public.trip_rate_config;
  new_id  uuid;
BEGIN
  SELECT * INTO r FROM public.trip_rate_config WHERE id = p_rate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rate not found';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id) THEN
    RAISE EXCEPTION 'Cannot change a rate belonging to another organisation';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'finance_manager')
       OR public.has_role(auth.uid(), 'org_admin')
       OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only finance or an org admin can propose a rate change';
  END IF;

  IF p_new_amount IS NULL OR p_new_amount < 0 THEN
    RAISE EXCEPTION 'Rate amount must be zero or greater';
  END IF;

  -- One open proposal per rate, so the queue cannot fill with duplicates.
  IF EXISTS (
    SELECT 1 FROM public.trip_rate_config
    WHERE supersedes_id = p_rate_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A change to this rate is already awaiting approval';
  END IF;

  INSERT INTO public.trip_rate_config (
    organization_id, zone, pickup_location, truck_type, driver_type,
    rate_amount, is_net, description, route_id, partner_id, customer_id,
    version, supersedes_id, review_note
  )
  VALUES (
    r.organization_id, r.zone, r.pickup_location, r.truck_type, r.driver_type,
    p_new_amount, r.is_net, r.description, r.route_id, r.partner_id, r.customer_id,
    r.version + 1, r.id, p_note
  )
  RETURNING id INTO new_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                organization_id, reason)
  VALUES ('rate_card', new_id::text, 'pending', auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'new_rate_id', new_id, 'status', 'pending');
END $fn$;

-- ── 7. The rate dispatch should use ──────────────────────────
-- Approved rates only. Most specific match wins: a customer-specific rate
-- beats a partner rate, which beats the org default.
CREATE OR REPLACE FUNCTION public.get_dispatch_rate(
  p_organization_id uuid,
  p_zone text,
  p_truck_type text,
  p_driver_type text DEFAULT 'owned',
  p_customer_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL
)
RETURNS TABLE (rate_id uuid, rate_amount numeric, is_net boolean, match_level text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT t.id, t.rate_amount, t.is_net,
         CASE
           WHEN t.customer_id IS NOT NULL THEN 'customer'
           WHEN t.partner_id  IS NOT NULL THEN 'partner'
           ELSE 'organisation'
         END
  FROM public.trip_rate_config t
  WHERE t.organization_id = p_organization_id
    AND t.status = 'approved'
    AND t.zone = p_zone
    AND t.truck_type = p_truck_type
    AND t.driver_type = p_driver_type
    AND (t.customer_id IS NULL OR t.customer_id = p_customer_id)
    AND (t.partner_id  IS NULL OR t.partner_id  = p_partner_id)
  ORDER BY (t.customer_id IS NOT NULL) DESC,
           (t.partner_id  IS NOT NULL) DESC
  LIMIT 1;
$fn$;

REVOKE EXECUTE ON FUNCTION public.approve_trip_rate(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_trip_rate(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.propose_trip_rate_change(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_trip_rate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_trip_rate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_trip_rate_change(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dispatch_rate(uuid, text, text, text, uuid, uuid) TO authenticated;

-- ── ROLLBACK ─────────────────────────────────────────────────
-- The legacy-owner assignment in section 1 is an inference, not a recorded
-- fact. To undo just that part:
--   UPDATE public.trip_rate_config SET organization_id = NULL
--   WHERE review_note LIKE 'Grandfathered:%';
-- To undo the whole migration, drop the four functions above, drop the
-- policies, and DROP the added columns.

-- ── 8. Remove the pre-tenancy uniqueness rule ────────────────
-- trip_rate_config_truck_type_zone_key was UNIQUE (truck_type, zone),
-- written when the table was single-tenant. It has two consequences that are
-- wrong now:
--   * two organisations could never both hold a "trailer / outside_ibadan"
--     rate — the second tenant to configure one would be rejected;
--   * versioning is impossible, because a pending replacement shares the
--     truck_type and zone of the rate it supersedes.
-- uq_trip_rate_approved (section 2) already enforces the rule that actually
-- matters: ONE APPROVED rate per org + zone + truck type + driver type
-- + customer + partner, while allowing pending and superseded versions to
-- coexist.
ALTER TABLE public.trip_rate_config
  DROP CONSTRAINT IF EXISTS trip_rate_config_truck_type_zone_key;
