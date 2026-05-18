-- ERP connections (one per org per provider)
CREATE TABLE IF NOT EXISTS public.erp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  realm_id TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  refresh_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  connected_by UUID,
  last_sync_at TIMESTAMPTZ,
  last_sync_direction TEXT,
  last_error TEXT,
  oauth_state TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_erp_connections_org ON public.erp_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_erp_connections_state ON public.erp_connections(oauth_state) WHERE oauth_state IS NOT NULL;

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_erp_connections_updated_at
BEFORE UPDATE ON public.erp_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.erp_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: super_admin OR (same-org member AND finance_manager/org_admin)
CREATE POLICY "erp_connections_select_authorized"
ON public.erp_connections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
    )
  )
);

-- INSERT: same constraint; connected_by must be the caller
CREATE POLICY "erp_connections_insert_authorized"
ON public.erp_connections
FOR INSERT
TO authenticated
WITH CHECK (
  connected_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      organization_id = public.get_user_organization(auth.uid())
      AND (
        public.has_role(auth.uid(), 'finance_manager')
        OR public.has_role(auth.uid(), 'org_admin')
      )
    )
  )
);

-- UPDATE: same constraint
CREATE POLICY "erp_connections_update_authorized"
ON public.erp_connections
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
    )
  )
);

-- DELETE: super_admin or org_admin only
CREATE POLICY "erp_connections_delete_authorized"
ON public.erp_connections
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    organization_id = public.get_user_organization(auth.uid())
    AND public.has_role(auth.uid(), 'org_admin')
  )
);

-- =============== ERP sync log (append-only) ===============
CREATE TABLE IF NOT EXISTS public.erp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('push','pull')),
  entity TEXT NOT NULL,
  local_id TEXT,
  remote_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','error','skipped')),
  error TEXT,
  payload_summary JSONB,
  triggered_by UUID,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_log_org_run ON public.erp_sync_log(organization_id, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_provider ON public.erp_sync_log(provider, run_at DESC);

ALTER TABLE public.erp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_sync_log_select_authorized"
ON public.erp_sync_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
    )
  )
);

CREATE POLICY "erp_sync_log_insert_authorized"
ON public.erp_sync_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
    )
  )
);

-- Block updates and deletes (immutable audit)
CREATE OR REPLACE FUNCTION public.prevent_erp_sync_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'erp_sync_log is append-only; updates and deletes are not permitted';
END;
$$;

CREATE TRIGGER block_erp_sync_log_update
BEFORE UPDATE ON public.erp_sync_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_erp_sync_log_mutation();

CREATE TRIGGER block_erp_sync_log_delete
BEFORE DELETE ON public.erp_sync_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_erp_sync_log_mutation();