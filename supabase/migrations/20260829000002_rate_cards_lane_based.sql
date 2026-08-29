-- ============================================================
-- RATE CARDS — lane-based, two-sided, approval-gated
-- ============================================================
-- Replaces the zone model (trip_rate_config, hardcoded to
-- within_ibadan / outside_ibadan) with real lanes: pickup -> destination.
--
-- TWO SIDES, TWO MONEY FLOWS
--
--   card_type = 'client'  What the logistics company CHARGES the customer
--                         it is delivering for. Revenue in. Priced PER
--                         CUSTOMER, because each client negotiates its own
--                         price on the same lane.
--
--   card_type = 'vendor'  What the logistics company PAYS a 3rd party
--                         vendor whose truck is registered under it.
--                         Cost out. Priced per vendor.
--
-- HOW A DISPATCH RESOLVES
--   Owned truck   -> client rate only (nothing to pay out; the truck is ours)
--   Vendor truck  -> client rate AS REVENUE *and* vendor rate AS COST.
--                    The margin is the difference. This is what makes
--                    per-trip profitability real.
--
-- trip_rate_config is deliberately LEFT IN PLACE. DriverPayroll reads it,
-- and breaking payroll to build this would be a poor trade. It can be
-- retired separately once payroll is migrated.
--
-- GOVERNANCE — same as the Rate Card work already shipped:
--   finance_manager / org_admin / admin  propose (rows land 'pending')
--   super_admin / platform_owner         approve or reject
--   everyone else in the org             read approved rates only
-- Editing an approved rate never mutates it; it creates a new pending
-- version and the live rate keeps pricing dispatches until the replacement
-- is approved. Past dispatches therefore never change price retroactively.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  card_type text NOT NULL CHECK (card_type IN ('client', 'vendor')),

  -- Exactly one of these is set, enforced by rate_cards_party_check below.
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  partner_id  uuid REFERENCES public.partners(id)  ON DELETE CASCADE,

  -- The lane. Addresses come from the same AddressAutocomplete component
  -- dispatch uses, so the strings match what a dispatcher will pick.
  -- lat/lng are stored so lane matching can be improved later (proximity
  -- rather than exact string) without finance re-entering anything.
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  destination_address text NOT NULL,
  destination_lat numeric,
  destination_lng numeric,

  truck_type text NOT NULL,
  rate_amount numeric NOT NULL CHECK (rate_amount >= 0),
  is_net boolean NOT NULL DEFAULT true,
  description text,

  -- Approval workflow
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  review_note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A client rate belongs to a customer; a vendor rate belongs to a partner.
-- Neither may carry the other's party, which would make the rate ambiguous
-- at resolution time.
ALTER TABLE public.rate_cards DROP CONSTRAINT IF EXISTS rate_cards_party_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_party_check CHECK (
    (card_type = 'client' AND customer_id IS NOT NULL AND partner_id IS NULL)
    OR
    (card_type = 'vendor' AND partner_id IS NOT NULL AND customer_id IS NULL)
  );

-- One APPROVED rate per commercial key. Partial, so pending and superseded
-- versions of the same lane coexist while a change awaits review.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_cards_approved
  ON public.rate_cards (
    organization_id, card_type,
    COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(partner_id,  '00000000-0000-0000-0000-000000000000'::uuid),
    lower(trim(pickup_address)),
    lower(trim(destination_address)),
    truck_type
  )
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_rate_cards_org_status
  ON public.rate_cards (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_cards_lane
  ON public.rate_cards (organization_id, card_type, truck_type)
  WHERE status = 'approved';

-- ── Stamp tenant + submitter; force new rows to 'pending' ────
-- A caller cannot set another org's id, and cannot self-approve by writing
-- status='approved' on insert. Approval happens only through
-- approve_rate_card().
CREATE OR REPLACE FUNCTION public.rate_cards_before_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.get_user_organization(auth.uid());
    END IF;
    NEW.status       := 'pending';
    NEW.approved_by  := NULL;
    NEW.approved_at  := NULL;
    NEW.submitted_by := COALESCE(NEW.submitted_by, auth.uid());
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_rate_cards_before_write ON public.rate_cards;
CREATE TRIGGER trg_rate_cards_before_write
  BEFORE INSERT OR UPDATE ON public.rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.rate_cards_before_write();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

-- Hard tenant boundary. Platform owners retain cross-org visibility;
-- super_admin alone does NOT, because those accounts belong to individual
-- customer organisations.
DROP POLICY IF EXISTS rate_cards_tenant_gate ON public.rate_cards;
CREATE POLICY rate_cards_tenant_gate
  ON public.rate_cards
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_owner(auth.uid())
  );

-- Everyone in the org can read. Dispatch needs approved lanes, and the
-- lane picker deliberately shows no amounts.
DROP POLICY IF EXISTS rate_cards_read ON public.rate_cards;
CREATE POLICY rate_cards_read
  ON public.rate_cards FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS rate_cards_finance_insert ON public.rate_cards;
CREATE POLICY rate_cards_finance_insert
  ON public.rate_cards FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Finance edits only rates that are not yet live. Changing an approved rate
-- goes through propose_rate_card_change(), which versions it instead.
DROP POLICY IF EXISTS rate_cards_finance_update ON public.rate_cards;
CREATE POLICY rate_cards_finance_update
  ON public.rate_cards FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS rate_cards_finance_delete ON public.rate_cards;
CREATE POLICY rate_cards_finance_delete
  ON public.rate_cards FOR DELETE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status IN ('pending', 'rejected')
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ── Approve / reject ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_rate_card(p_rate_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.rate_cards;
BEGIN
  SELECT * INTO r FROM public.rate_cards WHERE id = p_rate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rate not found';
  END IF;

  IF NOT (public.is_super_admin(auth.uid()) OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only a super admin can approve a rate';
  END IF;

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot approve a rate belonging to another organisation';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending rate can be approved (this one is %)', r.status;
  END IF;

  -- Retire whatever this replaces. Superseded rows are kept, not deleted, so
  -- what a past dispatch was priced at stays recoverable.
  IF r.supersedes_id IS NOT NULL THEN
    UPDATE public.rate_cards SET status = 'superseded'
    WHERE id = r.supersedes_id AND status = 'approved';
  ELSE
    UPDATE public.rate_cards SET status = 'superseded'
    WHERE organization_id = r.organization_id
      AND card_type = r.card_type
      AND COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(r.customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(r.partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND lower(trim(pickup_address)) = lower(trim(r.pickup_address))
      AND lower(trim(destination_address)) = lower(trim(r.destination_address))
      AND truck_type = r.truck_type
      AND status = 'approved'
      AND id <> r.id;
  END IF;

  UPDATE public.rate_cards
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_rate_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                approved_by, organization_id, reason)
  VALUES ('rate_card', p_rate_id::text, 'approved', r.submitted_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'rate_id', p_rate_id, 'status', 'approved');
END $fn$;

CREATE OR REPLACE FUNCTION public.reject_rate_card(p_rate_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.rate_cards;
BEGIN
  SELECT * INTO r FROM public.rate_cards WHERE id = p_rate_id;
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

  UPDATE public.rate_cards
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      review_note = COALESCE(p_note, review_note)
  WHERE id = p_rate_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                rejected_by, organization_id, reason)
  VALUES ('rate_card', p_rate_id::text, 'rejected', r.submitted_by,
          auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'rate_id', p_rate_id, 'status', 'rejected');
END $fn$;

-- ── Propose a change to a live rate ─────────────────────────
CREATE OR REPLACE FUNCTION public.propose_rate_card_change(
  p_rate_id uuid,
  p_new_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r      public.rate_cards;
  new_id uuid;
BEGIN
  SELECT * INTO r FROM public.rate_cards WHERE id = p_rate_id;
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

  IF EXISTS (
    SELECT 1 FROM public.rate_cards
    WHERE supersedes_id = p_rate_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A change to this rate is already awaiting approval';
  END IF;

  INSERT INTO public.rate_cards (
    organization_id, card_type, customer_id, partner_id,
    pickup_address, pickup_lat, pickup_lng,
    destination_address, destination_lat, destination_lng,
    truck_type, rate_amount, is_net, description,
    version, supersedes_id, review_note
  )
  VALUES (
    r.organization_id, r.card_type, r.customer_id, r.partner_id,
    r.pickup_address, r.pickup_lat, r.pickup_lng,
    r.destination_address, r.destination_lat, r.destination_lng,
    r.truck_type, p_new_amount, r.is_net, r.description,
    r.version + 1, r.id, p_note
  )
  RETURNING id INTO new_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                organization_id, reason)
  VALUES ('rate_card', new_id::text, 'pending', auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'new_rate_id', new_id, 'status', 'pending');
END $fn$;

-- ── Lanes offered to dispatch ───────────────────────────────
-- APPROVED CLIENT lanes only, and deliberately WITHOUT rate_amount:
-- the dispatcher picks a lane, never sees what it is worth.
-- Filtering by customer is what makes per-customer pricing work.
CREATE OR REPLACE FUNCTION public.get_dispatch_lanes(
  p_organization_id uuid,
  p_customer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  pickup_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  destination_address text,
  destination_lat numeric,
  destination_lng numeric,
  truck_type text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT DISTINCT
    rc.pickup_address, rc.pickup_lat, rc.pickup_lng,
    rc.destination_address, rc.destination_lat, rc.destination_lng,
    rc.truck_type
  FROM public.rate_cards rc
  WHERE rc.organization_id = p_organization_id
    AND rc.card_type = 'client'
    AND rc.status = 'approved'
    AND (p_customer_id IS NULL OR rc.customer_id = p_customer_id)
  ORDER BY rc.pickup_address, rc.destination_address, rc.truck_type;
$fn$;

-- ── Resolve the money for one dispatch ──────────────────────
-- Returns the client rate (revenue) and, when the truck belongs to a vendor,
-- the vendor rate (cost). Callers with finance permission use this to
-- populate dispatch_financials; the dispatch UI never calls it.
CREATE OR REPLACE FUNCTION public.resolve_dispatch_rates(
  p_organization_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_pickup text,
  p_destination text,
  p_truck_type text
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ownership   text;
  v_partner_id  uuid;
  v_client_rate numeric;
  v_client_id   uuid;
  v_vendor_rate numeric;
  v_vendor_id   uuid;
BEGIN
  SELECT ownership_type, partner_id INTO v_ownership, v_partner_id
  FROM public.vehicles WHERE id = p_vehicle_id;

  -- Client rate: what we charge this customer for this lane. Applies
  -- regardless of whose truck runs it — the customer owes the same either way.
  SELECT rate_amount, id INTO v_client_rate, v_client_id
  FROM public.rate_cards
  WHERE organization_id = p_organization_id
    AND card_type = 'client'
    AND customer_id = p_customer_id
    AND status = 'approved'
    AND lower(trim(pickup_address)) = lower(trim(p_pickup))
    AND lower(trim(destination_address)) = lower(trim(p_destination))
    AND truck_type = p_truck_type
  LIMIT 1;

  -- Vendor rate: only when the truck actually belongs to a vendor. An owned
  -- truck has nothing to pay out.
  IF v_ownership IS DISTINCT FROM 'owned' AND v_partner_id IS NOT NULL THEN
    SELECT rate_amount, id INTO v_vendor_rate, v_vendor_id
    FROM public.rate_cards
    WHERE organization_id = p_organization_id
      AND card_type = 'vendor'
      AND partner_id = v_partner_id
      AND status = 'approved'
      AND lower(trim(pickup_address)) = lower(trim(p_pickup))
      AND lower(trim(destination_address)) = lower(trim(p_destination))
      AND truck_type = p_truck_type
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'client_revenue',  v_client_rate,
    'client_rate_id',  v_client_id,
    'vendor_cost',     v_vendor_rate,
    'vendor_rate_id',  v_vendor_id,
    'ownership_type',  v_ownership,
    'partner_id',      v_partner_id,
    -- Surfaced so finance can see WHY a figure is missing rather than
    -- silently booking zero.
    'missing_client_rate', (v_client_rate IS NULL),
    'missing_vendor_rate', (v_ownership IS DISTINCT FROM 'owned'
                            AND v_partner_id IS NOT NULL
                            AND v_vendor_rate IS NULL),
    'vendor_unassigned',   (v_ownership IS DISTINCT FROM 'owned'
                            AND v_partner_id IS NULL)
  );
END $fn$;

REVOKE EXECUTE ON FUNCTION public.approve_rate_card(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_rate_card(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.propose_rate_card_change(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_rate_card(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_rate_card(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_rate_card_change(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dispatch_lanes(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispatch_rates(uuid, uuid, uuid, text, text, text) TO authenticated;

-- ── Vendor assignment on vehicles ───────────────────────────
-- vehicles.partner_id already exists but is NULL on every row, so no vendor
-- truck can resolve a vendor rate. No schema change needed — the gap is
-- data entry, handled in the Fleet UI (required field for vendor/leased
-- trucks, plus a banner listing unassigned ones).
-- This index supports that banner query.
CREATE INDEX IF NOT EXISTS idx_vehicles_partner
  ON public.vehicles (organization_id, ownership_type, partner_id);
