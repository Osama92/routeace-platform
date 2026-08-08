-- ============================================================
-- WEBSITE VISITOR ANALYTICS (RouteAce Core)
-- ============================================================
-- Tracks marketing-site traffic (/, /ng, /global, /about, ...) so Core
-- can report daily / weekly / monthly visitors.
--
-- PRIVACY MODEL
-- No cookies, no persistent identifier, no raw IP stored. A visitor is
-- identified by an anonymous hash:
--     sha256(ip + user_agent + daily_salt)
-- The salt rotates every day, so the hash cannot be used to follow a
-- person across days and cannot be reversed to an IP. This keeps the
-- feature outside cookie-consent territory under GDPR/NDPR while still
-- giving accurate DAILY unique counts.
--
-- Consequence to be aware of: a visitor returning tomorrow counts as a
-- new daily unique. Weekly/monthly "unique" figures are therefore
-- unique-visitor-days, not deduplicated people. That is stated in the UI
-- rather than quietly presented as something it is not.
--
-- WRITE PATH
-- Only the service role may insert, via the track-pageview edge function.
-- There is deliberately no public INSERT policy: a client-writable table
-- can be scripted to inflate the numbers.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.website_pageviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash  text NOT NULL,
  path          text NOT NULL,
  referrer_host text,
  referrer_type text,            -- direct | search | social | referral
  country_code  text,
  device_type   text,            -- mobile | tablet | desktop
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  view_date     date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'UTC')::date) STORED,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Query patterns: counts by day, by path, by referrer, by country.
CREATE INDEX IF NOT EXISTS idx_pageviews_date        ON public.website_pageviews (view_date DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_visitor_day ON public.website_pageviews (view_date, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_pageviews_path        ON public.website_pageviews (path);
CREATE INDEX IF NOT EXISTS idx_pageviews_referrer    ON public.website_pageviews (referrer_type);

ALTER TABLE public.website_pageviews ENABLE ROW LEVEL SECURITY;

-- Service role writes (edge function only).
DROP POLICY IF EXISTS "service_role_writes_pageviews" ON public.website_pageviews;
CREATE POLICY "service_role_writes_pageviews"
  ON public.website_pageviews FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Core/platform staff read. This is platform-wide marketing data, not
-- tenant data, so it is intentionally NOT organization-scoped — access is
-- restricted by role instead.
DROP POLICY IF EXISTS "core_reads_pageviews" ON public.website_pageviews;
CREATE POLICY "core_reads_pageviews"
  ON public.website_pageviews FOR SELECT TO authenticated
  USING (
    public.is_platform_owner(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'core_founder')
    OR public.has_role(auth.uid(), 'core_builder')
    OR public.has_role(auth.uid(), 'core_product')
    OR public.has_role(auth.uid(), 'core_engineer')
  );


-- ── Rotating daily salt ──────────────────────────────────────
-- Kept in its own table so the edge function never has to ship a secret
-- and the value genuinely changes each day.
CREATE TABLE IF NOT EXISTS public.analytics_daily_salt (
  salt_date date PRIMARY KEY DEFAULT CURRENT_DATE,
  salt      text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_daily_salt ENABLE ROW LEVEL SECURITY;

-- The salt must never be readable by clients — it would allow rebuilding
-- the hash for a known IP.
DROP POLICY IF EXISTS "salt_service_role_only" ON public.analytics_daily_salt;
CREATE POLICY "salt_service_role_only"
  ON public.analytics_daily_salt FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_daily_analytics_salt()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_salt text;
BEGIN
  INSERT INTO public.analytics_daily_salt (salt_date)
  VALUES (CURRENT_DATE)
  ON CONFLICT (salt_date) DO NOTHING;

  SELECT salt INTO v_salt
  FROM public.analytics_daily_salt
  WHERE salt_date = CURRENT_DATE;

  RETURN v_salt;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_daily_analytics_salt() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_daily_analytics_salt() TO service_role;


-- ── Reporting ────────────────────────────────────────────────
-- Single round trip for the Core dashboard.
CREATE OR REPLACE FUNCTION public.get_website_analytics(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_from   date := CURRENT_DATE - (p_days - 1);
BEGIN
  -- Caller must be Core/platform staff. SECURITY DEFINER bypasses RLS, so
  -- the check is repeated here rather than relied on from the policy.
  IF NOT (
    public.is_platform_owner(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'core_founder')
    OR public.has_role(auth.uid(), 'core_builder')
    OR public.has_role(auth.uid(), 'core_product')
    OR public.has_role(auth.uid(), 'core_engineer')
  ) THEN
    RAISE EXCEPTION 'Not authorised to read website analytics';
  END IF;

  SELECT jsonb_build_object(
    'today', jsonb_build_object(
      'visitors',  (SELECT count(DISTINCT visitor_hash) FROM website_pageviews WHERE view_date = CURRENT_DATE),
      'pageviews', (SELECT count(*)                     FROM website_pageviews WHERE view_date = CURRENT_DATE)
    ),
    'week', jsonb_build_object(
      'visitors',  (SELECT count(DISTINCT visitor_hash) FROM website_pageviews WHERE view_date >= CURRENT_DATE - 6),
      'pageviews', (SELECT count(*)                     FROM website_pageviews WHERE view_date >= CURRENT_DATE - 6)
    ),
    'month', jsonb_build_object(
      'visitors',  (SELECT count(DISTINCT visitor_hash) FROM website_pageviews WHERE view_date >= CURRENT_DATE - 29),
      'pageviews', (SELECT count(*)                     FROM website_pageviews WHERE view_date >= CURRENT_DATE - 29)
    ),
    'daily', COALESCE((
      SELECT jsonb_agg(d ORDER BY d->>'date')
      FROM (
        SELECT jsonb_build_object(
                 'date',      view_date,
                 'visitors',  count(DISTINCT visitor_hash),
                 'pageviews', count(*)
               ) AS d
        FROM website_pageviews
        WHERE view_date >= v_from
        GROUP BY view_date
      ) x
    ), '[]'::jsonb),
    'top_pages', COALESCE((
      SELECT jsonb_agg(p ORDER BY (p->>'pageviews')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'path',      path,
                 'pageviews', count(*),
                 'visitors',  count(DISTINCT visitor_hash)
               ) AS p
        FROM website_pageviews
        WHERE view_date >= v_from
        GROUP BY path
        ORDER BY count(*) DESC
        LIMIT 10
      ) x
    ), '[]'::jsonb),
    'sources', COALESCE((
      SELECT jsonb_agg(s ORDER BY (s->>'visitors')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'type',      COALESCE(referrer_type, 'direct'),
                 'host',      referrer_host,
                 'visitors',  count(DISTINCT visitor_hash),
                 'pageviews', count(*)
               ) AS s
        FROM website_pageviews
        WHERE view_date >= v_from
        GROUP BY COALESCE(referrer_type, 'direct'), referrer_host
        ORDER BY count(DISTINCT visitor_hash) DESC
        LIMIT 10
      ) x
    ), '[]'::jsonb),
    'countries', COALESCE((
      SELECT jsonb_agg(c ORDER BY (c->>'visitors')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'country',  COALESCE(country_code, 'unknown'),
                 'visitors', count(DISTINCT visitor_hash)
               ) AS c
        FROM website_pageviews
        WHERE view_date >= v_from
        GROUP BY COALESCE(country_code, 'unknown')
        ORDER BY count(DISTINCT visitor_hash) DESC
        LIMIT 10
      ) x
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(dv ORDER BY (dv->>'visitors')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'device',   COALESCE(device_type, 'unknown'),
                 'visitors', count(DISTINCT visitor_hash)
               ) AS dv
        FROM website_pageviews
        WHERE view_date >= v_from
        GROUP BY COALESCE(device_type, 'unknown')
      ) x
    ), '[]'::jsonb),
    -- Signup conversion: organisations created in the window against
    -- unique visitors in the same window. Visitors are anonymous by
    -- design, so this is a funnel RATE, not a per-visitor attribution.
    'conversion', (
      SELECT jsonb_build_object(
        'visitors', v.visitors,
        'signups',  s.signups,
        'rate_pct', CASE WHEN v.visitors > 0
                         THEN round((s.signups::numeric / v.visitors) * 100, 2)
                         ELSE 0 END
      )
      FROM (SELECT count(DISTINCT visitor_hash) AS visitors
              FROM website_pageviews WHERE view_date >= v_from) v,
           (SELECT count(*) AS signups
              FROM organizations WHERE created_at::date >= v_from) s
    ),
    'range_days',   p_days,
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_website_analytics(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_website_analytics(int) TO authenticated, service_role;
