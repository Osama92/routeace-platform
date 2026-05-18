-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;

-- Recreate without self-referencing subquery, using security-definer helper
CREATE POLICY "Members can view their org members"
ON public.organization_members
FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'core_founder'::app_role, 'core_cofounder'::app_role])
  )
);

-- Performance index for membership lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_org_members_user_active
ON public.organization_members(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_org_members_org_user
ON public.organization_members(organization_id, user_id);