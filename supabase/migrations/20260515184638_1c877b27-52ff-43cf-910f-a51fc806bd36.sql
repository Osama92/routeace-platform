
-- Drop the over-permissive ALL-command policy that allowed self-escalation
DROP POLICY IF EXISTS "Privileged users can manage relevant roles" ON public.user_roles;

-- Helper: which roles count as "elevated" platform roles
CREATE OR REPLACE FUNCTION public.is_elevated_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _role IN ('super_admin'::public.app_role, 'admin'::public.app_role, 'org_admin'::public.app_role);
$$;

-- INSERT: cannot target self; elevated roles only by super_admin; otherwise must be a manager of the target
CREATE POLICY "Privileged users can insert manageable roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id <> auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR (
      NOT public.is_elevated_role(role)
      AND public.can_manage_user_profile(auth.uid(), user_id)
    )
  )
);

-- UPDATE: same rules on both old and new rows
CREATE POLICY "Privileged users can update manageable roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  user_id <> auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR (
      NOT public.is_elevated_role(role)
      AND public.can_manage_user_profile(auth.uid(), user_id)
    )
  )
)
WITH CHECK (
  user_id <> auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR (
      NOT public.is_elevated_role(role)
      AND public.can_manage_user_profile(auth.uid(), user_id)
    )
  )
);

-- DELETE: cannot remove a role from self; elevated roles only by super_admin
CREATE POLICY "Privileged users can delete manageable roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  user_id <> auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR (
      NOT public.is_elevated_role(role)
      AND public.can_manage_user_profile(auth.uid(), user_id)
    )
  )
);
