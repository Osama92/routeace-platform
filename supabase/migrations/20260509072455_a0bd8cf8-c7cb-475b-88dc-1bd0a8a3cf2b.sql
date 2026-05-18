
CREATE TABLE IF NOT EXISTS public.intelligence_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  organization_id UUID,
  view_scope TEXT NOT NULL CHECK (view_scope IN ('LD','LC')),
  module TEXT NOT NULL CHECK (module IN ('driver_intelligence','fleet_intelligence')),
  ownership_scope TEXT CHECK (ownership_scope IN ('internal','third_party','mixed','none')),
  internal_count INTEGER DEFAULT 0,
  third_party_count INTEGER DEFAULT 0,
  record_count INTEGER DEFAULT 0,
  route TEXT,
  metadata JSONB,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_access_user ON public.intelligence_access_logs(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_access_org ON public.intelligence_access_logs(organization_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_access_module ON public.intelligence_access_logs(module, view_scope, accessed_at DESC);

ALTER TABLE public.intelligence_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own intelligence access logs"
  ON public.intelligence_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all intelligence access logs"
  ON public.intelligence_access_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins view org intelligence access logs"
  ON public.intelligence_access_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('org_admin','admin','super_admin')
    )
  );
