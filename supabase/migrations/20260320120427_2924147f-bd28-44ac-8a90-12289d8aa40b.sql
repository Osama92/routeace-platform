
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.organization_members;

-- Only allow membership creation via valid, unexpired invitation
CREATE POLICY "Users can join via invitation"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_owner = false
    AND EXISTS (
      SELECT 1 FROM public.organization_invitations
      WHERE organization_id = organization_members.organization_id
        AND email = auth.email()
        AND accepted_at IS NULL
        AND expires_at > now()
    )
  );

-- Allow super_admin or org owners to add members directly
CREATE POLICY "Admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.is_org_owner(auth.uid(), organization_id)
  );
