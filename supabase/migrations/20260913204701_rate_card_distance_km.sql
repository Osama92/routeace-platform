-- ============================================================
-- Agreed distance on the rate card lane
-- ============================================================
-- The dispatch form already lets a dispatcher pick a lane from the
-- customer's approved rate cards (get_dispatch_lanes), and that picker
-- auto-fills distance FROM A SAVED ROUTE when one happens to match by
-- coordinates. When it doesn't -- a lane with no matching saved route --
-- distance stays empty, so the fuel estimate and dispatch.distance_km stay
-- empty too. Recording distance on the rate card lane itself closes that
-- gap: the lane is the thing being priced, so it is the right place for the
-- distance that prices it to live, independent of whether a route happens to
-- exist for it.
--
-- CONVENTION -- READ THIS BEFORE TOUCHING DISTANCE ANYWHERE IN THIS SCHEMA:
-- This column is ONE-WAY, matching dispatches.distance_km. This does NOT
-- match routes.distance_km, which is stored as a ROUND TRIP (see the comment
-- at Dispatch.tsx's lane-select handler, which halves routes.distance_km for
-- exactly this reason before putting it in formData.distance_km). A rate
-- card lane has no "to & fro" toggle of its own -- that decision belongs to
-- the dispatch being created against it, via its existing returnTrip switch.
-- So: store one-way here, let the dispatch form double it same as it already
-- does for a hand-typed distance. Never store a round-trip figure in this
-- column.
--
-- Litres are OPTIONAL, same reasoning as diesel_litres added earlier: a lane
-- with no distance recorded falls back to whatever the dispatch form already
-- resolves (a matched saved route, or manual entry), so this changes nothing
-- until finance fills it in.
-- ============================================================

ALTER TABLE public.rate_cards
  ADD COLUMN IF NOT EXISTS distance_km numeric;

COMMENT ON COLUMN public.rate_cards.distance_km IS
  'One-way distance for this lane (matches dispatches.distance_km''s convention, NOT routes.distance_km which is round-trip). Seeds dispatch distance and the fuel estimate when no saved route matches the lane. Optional -- absent, the dispatch form falls back to a matched route or manual entry.';

ALTER TABLE public.rate_cards
  DROP CONSTRAINT IF EXISTS rate_cards_distance_km_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_distance_km_check
  CHECK (distance_km IS NULL OR distance_km >= 0);

-- ── Lanes offered to dispatch: now carries distance_km ────────
-- Same shape as before, with distance_km added so the picker can fall back
-- to it when no saved route matches. Still deliberately WITHOUT rate_amount.
-- DROP first: Postgres refuses CREATE OR REPLACE when the RETURNS TABLE
-- shape changes (adding a column changes the OUT-parameter row type).
DROP FUNCTION IF EXISTS public.get_dispatch_lanes(uuid, uuid);

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
  truck_type text,
  distance_km numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT DISTINCT
    rc.pickup_address, rc.pickup_lat, rc.pickup_lng,
    rc.destination_address, rc.destination_lat, rc.destination_lng,
    rc.truck_type, rc.distance_km
  FROM public.rate_cards rc
  WHERE rc.organization_id = p_organization_id
    AND rc.card_type = 'client'
    AND rc.status = 'approved'
    AND (p_customer_id IS NULL OR rc.customer_id = p_customer_id)
  ORDER BY rc.pickup_address, rc.destination_address, rc.truck_type;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_dispatch_lanes(uuid, uuid) TO authenticated;

-- ── Distance for a trip, for the surfaces with no lane picker ──
-- CreateDispatchDialog.tsx (Ops Manager / Dept dashboards) has no lane
-- picker -- it matches an address the same way get_lane_diesel_litres
-- already does for litres. Same matching rules, same NULL-safe fallback.
CREATE OR REPLACE FUNCTION public.get_lane_distance_km(
  p_organization_id uuid,
  p_customer_id     uuid,
  p_pickup          text,
  p_destination     text,
  p_truck_type      text
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT rc.distance_km
  FROM public.rate_cards rc
  WHERE rc.organization_id = p_organization_id
    AND rc.card_type = 'client'
    AND rc.status = 'approved'
    AND rc.distance_km IS NOT NULL
    AND rc.truck_type = p_truck_type
    AND btrim(lower(rc.pickup_address)) = btrim(lower(p_pickup))
    AND btrim(lower(rc.destination_address)) = btrim(lower(p_destination))
    AND (rc.customer_id = p_customer_id OR rc.customer_id IS NULL)
  ORDER BY (rc.customer_id IS NOT NULL) DESC
  LIMIT 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_lane_distance_km(uuid, uuid, text, text, text) TO authenticated;

-- ── Carry distance_km (and diesel_litres) through a proposed change ──
-- propose_rate_card_change() versions a rate by copying the row into a new
-- pending one. It was written before diesel_litres existed and never copied
-- it, so a versioned rate silently lost its fuel allowance; the same bug
-- would now apply to distance_km too. Fixed here for both while rebuilding
-- this function, rather than adding distance_km on top of a known gap.
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
    diesel_litres, distance_km,
    version, supersedes_id, review_note
  )
  VALUES (
    r.organization_id, r.card_type, r.customer_id, r.partner_id,
    r.pickup_address, r.pickup_lat, r.pickup_lng,
    r.destination_address, r.destination_lat, r.destination_lng,
    r.truck_type, p_new_amount, r.is_net, r.description,
    r.diesel_litres, r.distance_km,
    r.version + 1, r.id, p_note
  )
  RETURNING id INTO new_id;

  INSERT INTO public.approvals (entity_type, entity_id, status, requested_by,
                                organization_id, reason)
  VALUES ('rate_card', new_id::text, 'pending', auth.uid(), r.organization_id, p_note);

  RETURN jsonb_build_object('ok', true, 'new_rate_id', new_id, 'status', 'pending');
END $fn$;

REVOKE EXECUTE ON FUNCTION public.propose_rate_card_change(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_rate_card_change(uuid, numeric, text) TO authenticated;
