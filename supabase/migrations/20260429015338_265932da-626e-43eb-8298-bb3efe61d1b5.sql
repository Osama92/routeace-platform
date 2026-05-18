-- Fix approval visibility and processing for Super Admin / Org Admin roles

-- PROFILES: allow privileged users to see pending profiles they are responsible for.
DROP POLICY IF EXISTS "Admins and operations can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Privileged users can view relevant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = profiles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
);

CREATE POLICY "Privileged users can update relevant profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = profiles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = profiles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
);

-- USER_ROLES: allow approval screens to resolve the role of users in scope.
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Privileged users can view relevant roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = user_roles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
);

CREATE POLICY "Privileged users can manage relevant roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = user_roles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members target_member
    JOIN public.organization_members actor_member
      ON actor_member.organization_id = target_member.organization_id
    WHERE target_member.user_id = user_roles.user_id
      AND actor_member.user_id = auth.uid()
      AND actor_member.is_active = true
      AND target_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
);

-- ORGANIZATION_MEMBERS: tighten admin management to the actor's own organization unless Super Admin/Core.
DROP POLICY IF EXISTS "Org admins can manage their org members" ON public.organization_members;

CREATE POLICY "Privileged users can manage relevant org members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members actor_member
    WHERE actor_member.user_id = auth.uid()
      AND actor_member.organization_id = organization_members.organization_id
      AND actor_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'core_founder'::public.app_role)
  OR public.has_role(auth.uid(), 'core_cofounder'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.organization_members actor_member
    WHERE actor_member.user_id = auth.uid()
      AND actor_member.organization_id = organization_members.organization_id
      AND actor_member.is_active = true
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
        OR actor_member.is_owner = true
      )
  )
);