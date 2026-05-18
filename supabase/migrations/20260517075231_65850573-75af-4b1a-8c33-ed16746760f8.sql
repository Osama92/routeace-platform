
-- 1. erp_connections: restrict SELECT of plaintext OAuth tokens to org_admin/super_admin only
DROP POLICY IF EXISTS "erp_connections_select_authorized" ON public.erp_connections;
CREATE POLICY "erp_connections_select_admin_only"
ON public.erp_connections FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

-- 2. integrations: split policies — SELECT only for super_admin/org_admin; manage for same set
DROP POLICY IF EXISTS "Org admins manage their integrations" ON public.integrations;
DROP POLICY IF EXISTS "Super admin manages integrations" ON public.integrations;

CREATE POLICY "integrations_select_admin_only"
ON public.integrations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

CREATE POLICY "integrations_modify_admin_only"
ON public.integrations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

CREATE POLICY "integrations_update_admin_only"
ON public.integrations FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

CREATE POLICY "integrations_delete_admin_only"
ON public.integrations FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

-- 3. partner_webhooks: add tenant isolation via partner.organization_id
DROP POLICY IF EXISTS "Super admin manages webhooks" ON public.partner_webhooks;

CREATE POLICY "partner_webhooks_super_admin"
ON public.partner_webhooks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "partner_webhooks_tenant_isolation"
ON public.partner_webhooks AS RESTRICTIVE FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_webhooks.partner_id
      AND p.organization_id = get_user_organization(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_webhooks.partner_id
      AND p.organization_id = get_user_organization(auth.uid())
  )
);

-- 4. integration_configs: restrict SELECT to super_admin / org_admin only (drop plain admin)
DROP POLICY IF EXISTS "integration_configs_admin_view" ON public.integration_configs;
CREATE POLICY "integration_configs_admin_view"
ON public.integration_configs FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    organization_id IS NOT NULL
    AND is_org_member(auth.uid(), organization_id)
    AND has_role(auth.uid(), 'org_admin'::app_role)
  )
);

-- 5. api_keys: add tenant isolation via partner.organization_id
DROP POLICY IF EXISTS "Admins or Super Admins manage API keys" ON public.api_keys;

CREATE POLICY "api_keys_super_admin_all"
ON public.api_keys FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "api_keys_org_admin_scoped"
ON public.api_keys FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = api_keys.partner_id
      AND p.organization_id = get_user_organization(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = api_keys.partner_id
      AND p.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "api_keys_tenant_isolation"
ON public.api_keys AS RESTRICTIVE FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = api_keys.partner_id
        AND p.organization_id = get_user_organization(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = api_keys.partner_id
        AND p.organization_id = get_user_organization(auth.uid())
    )
  )
);
