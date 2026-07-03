-- Platform error log — captures client-side JS errors and edge function errors
-- so the engineering team can debug issues users encounter in real time.
CREATE TABLE IF NOT EXISTS public.platform_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who encountered it
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- What went wrong
  error_type    TEXT NOT NULL DEFAULT 'client',  -- 'client' | 'edge_function' | 'api'
  severity      TEXT NOT NULL DEFAULT 'error',   -- 'error' | 'warning' | 'critical'
  message       TEXT NOT NULL,
  stack         TEXT,
  -- Where it happened
  component     TEXT,   -- React component name if available
  page_url      TEXT,   -- window.location.href at time of error
  route         TEXT,   -- React Router pathname
  -- Context
  extra         JSONB,  -- any additional metadata (form state, IDs, etc.)
  -- When
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_errors_occurred_at ON public.platform_errors (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_errors_user_id     ON public.platform_errors (user_id);
CREATE INDEX IF NOT EXISTS idx_platform_errors_org_id      ON public.platform_errors (organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_errors_severity    ON public.platform_errors (severity);
CREATE INDEX IF NOT EXISTS idx_platform_errors_error_type  ON public.platform_errors (error_type);

ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can INSERT their own errors (needed for client reporter)
CREATE POLICY "Users can report errors"
  ON public.platform_errors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only core team (service role) can SELECT — enforced via adminSupabase in the dashboard
CREATE POLICY "Service role reads all errors"
  ON public.platform_errors FOR SELECT
  TO service_role
  USING (true);
