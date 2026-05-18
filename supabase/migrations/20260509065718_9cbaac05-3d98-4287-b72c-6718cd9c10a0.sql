-- Phase 13: distributed rate-limit table for AI/data edge functions.
-- Per-instance in-memory limiter still runs first (cheapest), with this
-- DB layer as the cross-instance backstop. Window is rolling per (bucket,identifier).

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  bucket TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, identifier)
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access; only service_role (used by edge functions) reads/writes.
DROP POLICY IF EXISTS "service role only" ON public.edge_rate_limits;
CREATE POLICY "service role only" ON public.edge_rate_limits FOR ALL
USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx
  ON public.edge_rate_limits (window_start);

-- Atomic increment helper. Returns the post-increment count and window_start.
CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_bucket TEXT,
  p_identifier TEXT,
  p_window_seconds INTEGER
) RETURNS TABLE(out_count INTEGER, out_window_start TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_threshold TIMESTAMPTZ := v_now - make_interval(secs => p_window_seconds);
BEGIN
  INSERT INTO public.edge_rate_limits AS r (bucket, identifier, window_start, count)
  VALUES (p_bucket, p_identifier, v_now, 1)
  ON CONFLICT (bucket, identifier) DO UPDATE
    SET count = CASE WHEN r.window_start < v_threshold THEN 1 ELSE r.count + 1 END,
        window_start = CASE WHEN r.window_start < v_threshold THEN v_now ELSE r.window_start END
  RETURNING r.count, r.window_start INTO out_count, out_window_start;
  RETURN NEXT;
END;
$$;

-- Lock down: only service role may execute.
REVOKE ALL ON FUNCTION public.bump_rate_limit(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(TEXT, TEXT, INTEGER) TO service_role;