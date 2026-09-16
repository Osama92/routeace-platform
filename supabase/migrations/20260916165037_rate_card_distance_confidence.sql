-- ============================================================
-- Confidence flag for backfilled rate card distances
-- ============================================================
-- 347 of 348 approved client rate cards had no coordinates at all — only
-- free-text addresses. Pickups tend to be specific facility addresses;
-- destinations are frequently a bare town or region name ("Warri", "Ilaje",
-- "ZAKIBIAM"). Geocoding a bare town name is usually fine for a road-distance
-- estimate, but some (like "Ilaje", an entire LGA with multiple towns) are
-- genuinely ambiguous and could resolve to the wrong place.
--
-- Rather than silently trust every geocode, this records HOW confident the
-- match was, so a low-confidence one can be reviewed and corrected instead
-- of quietly feeding a wrong distance into dispatch and the fuel estimate.
-- ============================================================

ALTER TABLE public.rate_cards
  ADD COLUMN IF NOT EXISTS distance_source text,
  ADD COLUMN IF NOT EXISTS distance_confidence text;

ALTER TABLE public.rate_cards
  DROP CONSTRAINT IF EXISTS rate_cards_distance_source_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_distance_source_check
  CHECK (distance_source IS NULL OR distance_source IN ('manual', 'auto_calculated', 'geocoded_backfill'));

ALTER TABLE public.rate_cards
  DROP CONSTRAINT IF EXISTS rate_cards_distance_confidence_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_distance_confidence_check
  CHECK (distance_confidence IS NULL OR distance_confidence IN ('high', 'low'));

COMMENT ON COLUMN public.rate_cards.distance_source IS
  'How distance_km was populated: manual entry, auto_calculated (address picked from autocomplete, both ends had coordinates), or geocoded_backfill (one-off backfill of pre-existing text-only addresses).';
COMMENT ON COLUMN public.rate_cards.distance_confidence IS
  'Only meaningful for geocoded_backfill. low means Google''s geocode returned multiple candidate locations or a non-precise match (e.g. a region name like "Ilaje" rather than a specific place) — the distance may be wrong and should be checked.';
