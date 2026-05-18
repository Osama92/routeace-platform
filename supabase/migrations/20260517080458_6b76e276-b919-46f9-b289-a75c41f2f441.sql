-- Audit table for CFO brief log views
CREATE TABLE public.cfo_brief_log_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_log_id UUID NOT NULL REFERENCES public.cfo_brief_log(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_cfo_brief_audit_brief ON public.cfo_brief_log_access_audit(brief_log_id);
CREATE INDEX idx_cfo_brief_audit_org_time ON public.cfo_brief_log_access_audit(organization_id, accessed_at DESC);
CREATE INDEX idx_cfo_brief_audit_user_time ON public.cfo_brief_log_access_audit(user_id, accessed_at DESC);

ALTER TABLE public.cfo_brief_log_access_audit ENABLE ROW LEVEL SECURITY;

-- Users can record their own access
CREATE POLICY "Users insert own access record"
  ON public.cfo_brief_log_access_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Super admin can view all
CREATE POLICY "Super admin reads all audit"
  ON public.cfo_brief_log_access_audit
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Org-scoped privileged roles can view their org's audit records
CREATE POLICY "Org admins read org audit"
  ON public.cfo_brief_log_access_audit
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'org_admin'::app_role)
      OR has_role(auth.uid(), 'finance_manager'::app_role)
    )
  );

-- Immutability: block updates/deletes (no policies = denied; explicit trigger as defense-in-depth)
CREATE OR REPLACE FUNCTION public.prevent_cfo_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'cfo_brief_log_access_audit is append-only';
END;
$$;

CREATE TRIGGER trg_cfo_audit_no_update
  BEFORE UPDATE OR DELETE ON public.cfo_brief_log_access_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_cfo_audit_mutation();

-- RPC: record a brief view, deriving organization_id from the brief row
CREATE OR REPLACE FUNCTION public.log_cfo_brief_access(
  _brief_id UUID,
  _ip TEXT DEFAULT NULL,
  _agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _org UUID;
  _audit_id UUID;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tenant_id INTO _org FROM public.cfo_brief_log WHERE id = _brief_id;

  IF _org IS NULL AND NOT has_role(_user, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Brief not found or access denied';
  END IF;

  -- Enforce same access policy as cfo_brief_log SELECT
  IF NOT (
    has_role(_user, 'super_admin'::app_role)
    OR (
      _org = get_user_organization(_user)
      AND (
        has_role(_user, 'admin'::app_role)
        OR has_role(_user, 'org_admin'::app_role)
        OR has_role(_user, 'finance_manager'::app_role)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.cfo_brief_log_access_audit (brief_log_id, user_id, organization_id, ip_address, user_agent)
  VALUES (_brief_id, _user, _org, _ip, _agent)
  RETURNING id INTO _audit_id;

  RETURN _audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_cfo_brief_access(UUID, TEXT, TEXT) TO authenticated;