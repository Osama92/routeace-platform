
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  source_ip text,
  country_code text,
  target_endpoint text,
  status text NOT NULL DEFAULT 'detected',
  action_taken text,
  user_id uuid,
  user_email text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read security_events" ON public.security_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_core_team(auth.uid())
  );

CREATE POLICY "System insert security_events" ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
