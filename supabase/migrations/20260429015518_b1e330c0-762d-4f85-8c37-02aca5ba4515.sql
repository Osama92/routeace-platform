-- Replace recursive approval policies with SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION public.can_manage_organization(_actor_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_actor_id, 'super_admin'::public.app_role)
    OR public.has_role(_actor_id, 'core_founder'::public.app_role)
    OR public.has_role(_actor_id, 'core_cofounder'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = _actor_id
        AND om.organization_id = _organization_id
        AND om.is_active = true
        AND (
          om.is_owner = true
          OR public.has_role(_actor_id, 'admin'::public.app_role)
          OR public.has_role(_actor_id, 'org_admin'::public.app_role)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_user_profile(_actor_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_actor_id, 'super_admin'::public.app_role)
    OR public.has_role(_actor_id, 'core_founder'::public.app_role)
    OR public.has_role(_actor_id, 'core_cofounder'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members target_member
      JOIN public.organization_members actor_member
        ON actor_member.organization_id = target_member.organization_id
      WHERE target_member.user_id = _target_user_id
        AND actor_member.user_id = _actor_id
        AND actor_member.is_active = true
        AND target_member.is_active = true
        AND (
          actor_member.is_owner = true
          OR public.has_role(_actor_id, 'admin'::public.app_role)
          OR public.has_role(_actor_id, 'org_admin'::public.app_role)
        )
    );
$$;

DROP POLICY IF EXISTS "Privileged users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Privileged users can update relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Privileged users can view relevant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Privileged users can manage relevant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Privileged users can manage relevant org members" ON public.organization_members;

CREATE POLICY "Privileged users can view relevant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_manage_user_profile(auth.uid(), user_id)
);

CREATE POLICY "Privileged users can update relevant profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.can_manage_user_profile(auth.uid(), user_id))
WITH CHECK (public.can_manage_user_profile(auth.uid(), user_id));

CREATE POLICY "Privileged users can view relevant roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_manage_user_profile(auth.uid(), user_id)
);

CREATE POLICY "Privileged users can manage relevant roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.can_manage_user_profile(auth.uid(), user_id))
WITH CHECK (public.can_manage_user_profile(auth.uid(), user_id));

CREATE POLICY "Privileged users can manage relevant org members"
ON public.organization_members
FOR ALL
TO authenticated
USING (public.can_manage_organization(auth.uid(), organization_id))
WITH CHECK (public.can_manage_organization(auth.uid(), organization_id));