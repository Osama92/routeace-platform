
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS integrations_org_name_uidx
  ON public.integrations (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

CREATE INDEX IF NOT EXISTS integrations_org_idx ON public.integrations (organization_id);

-- Wipe leaked leadership/support emails on legacy global notifications row so tenants don't see another company's emails
UPDATE public.integrations
   SET config = COALESCE(config, '{}'::jsonb) - 'leadership_email' - 'support_email',
       updated_at = now()
 WHERE name = 'notifications'
   AND organization_id IS NULL;

-- Expand RLS so org members (org_admin / admin / finance_manager) can manage their own org's integrations
DROP POLICY IF EXISTS "Org admins manage their integrations" ON public.integrations;
CREATE POLICY "Org admins manage their integrations"
  ON public.integrations
  FOR ALL
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = public.integrations.organization_id
        AND om.is_active = true
        AND (
          has_role(auth.uid(), 'super_admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'finance_manager'::app_role)
        )
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = public.integrations.organization_id
        AND om.is_active = true
        AND (
          has_role(auth.uid(), 'super_admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'finance_manager'::app_role)
        )
    )
  );
