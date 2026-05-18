DROP POLICY IF EXISTS "Organization members can read tenant config" ON public.tenant_config;

CREATE POLICY "Organization members can read tenant config"
ON public.tenant_config
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = tenant_config.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
  )
);