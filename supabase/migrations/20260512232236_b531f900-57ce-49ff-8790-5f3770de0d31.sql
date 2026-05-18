-- Restrict OAuth/API token visibility to org admins + super admins only.
-- Non-admin org members must not be able to read client_secret, access_token, refresh_token.
DROP POLICY IF EXISTS integration_configs_org_view ON public.integration_configs;

CREATE POLICY integration_configs_admin_view
  ON public.integration_configs
  FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );