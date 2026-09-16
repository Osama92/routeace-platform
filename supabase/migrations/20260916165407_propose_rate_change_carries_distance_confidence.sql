-- ============================================================
-- propose_rate_card_change() must carry distance_source/confidence
-- ============================================================
-- Same gap fixed once before for distance_km and diesel_litres:
-- propose_rate_card_change() versions a rate by copying the row into a new
-- pending one, and never copied these two columns. Without this, versioning
-- an approved rate that was geocoded_backfill/low-confidence would silently
-- lose that flag, and the review signal would be gone the moment anyone
-- proposed a change.
-- ============================================================

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

  IF NOT public.is_org_member(auth.uid(), r.organization_id)
     AND NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot change a rate belonging to another organisation';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'finance_manager')
       OR public.has_role(auth.uid(), 'org_admin')
       OR public.has_role(auth.uid(), 'admin')
       OR public.is_super_admin(auth.uid())
       OR public.is_platform_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Only finance, an org admin or a super admin can propose a rate change';
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
    diesel_litres, distance_km, distance_source, distance_confidence,
    version, supersedes_id, review_note
  )
  VALUES (
    r.organization_id, r.card_type, r.customer_id, r.partner_id,
    r.pickup_address, r.pickup_lat, r.pickup_lng,
    r.destination_address, r.destination_lat, r.destination_lng,
    r.truck_type, p_new_amount, r.is_net, r.description,
    r.diesel_litres, r.distance_km, r.distance_source, r.distance_confidence,
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
