CREATE TABLE IF NOT EXISTS public.integration_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  state text NOT NULL UNIQUE,
  code_verifier text,
  redirect_after text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_state ON public.integration_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_user ON public.integration_oauth_states(user_id);

ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own oauth state"
  ON public.integration_oauth_states FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own oauth state"
  ON public.integration_oauth_states FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);