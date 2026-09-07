-- ============================================================
-- Agreed diesel litres on the rate card lane
-- ============================================================
-- The pre-trip check captures the diesel issued for a trip. That figure
-- should default from the lane rather than being typed from memory every
-- time, so the same route consistently gets the same allowance and a
-- variance actually means something.
--
-- The rate card is the right home for it: lanes already live there with an
-- approval trail, and diesel_rate_config -- the only other place in the
-- schema with an agreed-litres field -- has 0 rows, no organization_id, and
-- is matched by fuzzy substring on origin/destination text.
--
-- Litres are OPTIONAL. A lane with no agreed figure falls back to the
-- distance-based estimate the dispatch form already computes, so this
-- changes nothing until finance fills it in.
--
-- Deliberately NOT approval-gated separately: litres travel with the lane
-- they belong to, and a rate card row already requires super admin approval
-- before dispatch can use it. Adding a second approval on the same row would
-- mean a lane could be live at one figure while its fuel allowance was not.
-- ============================================================

ALTER TABLE public.rate_cards
  ADD COLUMN IF NOT EXISTS diesel_litres numeric;

COMMENT ON COLUMN public.rate_cards.diesel_litres IS
  'Agreed diesel litres for this lane and truck type. Seeds the pre-trip check for owned trucks. Optional -- when absent the dispatch falls back to its distance-based estimate.';

ALTER TABLE public.rate_cards
  DROP CONSTRAINT IF EXISTS rate_cards_diesel_litres_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_diesel_litres_check
  CHECK (diesel_litres IS NULL OR diesel_litres >= 0);

-- ── Litres for a trip ────────────────────────────────────────
-- Returns the agreed litres for a lane, or NULL when none is configured so
-- the caller can fall back rather than being handed a fabricated zero.
--
-- Matched on the CLIENT rate card: the lane is defined by where the goods go
-- and which truck carries them, not by who is paid. An owned truck has no
-- vendor rate at all, and it is exactly owned trucks this feeds.
CREATE OR REPLACE FUNCTION public.get_lane_diesel_litres(
  p_organization_id uuid,
  p_customer_id     uuid,
  p_pickup          text,
  p_destination     text,
  p_truck_type      text
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT rc.diesel_litres
  FROM public.rate_cards rc
  WHERE rc.organization_id = p_organization_id
    AND rc.card_type = 'client'
    AND rc.status = 'approved'
    AND rc.diesel_litres IS NOT NULL
    AND rc.truck_type = p_truck_type
    AND btrim(lower(rc.pickup_address)) = btrim(lower(p_pickup))
    AND btrim(lower(rc.destination_address)) = btrim(lower(p_destination))
    -- A lane priced for this specific customer wins over a general one.
    AND (rc.customer_id = p_customer_id OR rc.customer_id IS NULL)
  ORDER BY (rc.customer_id IS NOT NULL) DESC
  LIMIT 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_lane_diesel_litres(uuid, uuid, text, text, text) TO authenticated;
