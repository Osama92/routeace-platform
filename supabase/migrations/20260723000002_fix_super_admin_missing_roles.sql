-- Fix: super_admin user has no user_roles row and no platform_owners row.
-- Both is_super_admin() and is_platform_owner() return false, blocking all RLS
-- policies that use them (including tenant_isolation_gate and enforce_org_isolation).
--
-- Strategy:
-- 1. Update is_super_admin() to ALSO accept users whose JWT raw_app_meta_data
--    contains "role":"super_admin" — so it works even if user_roles row is missing.
-- 2. Back-fill user_roles for any auth user whose app_metadata.role = 'super_admin'.
-- 3. Back-fill platform_owners for the same set (they need cross-tenant access).

-- Step 1: Patch is_super_admin to check JWT claims as a fallback
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Primary check: explicit row in user_roles
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    -- Fallback: JWT app_metadata.role = 'super_admin' (set via Supabase dashboard)
    (
      _user_id = auth.uid()
      AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        OR (auth.jwt() ->> 'role') = 'super_admin'
      )
    )
$$;

-- Step 2: Back-fill user_roles for any auth.users who have role=super_admin in app_metadata
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  'super_admin'::app_role
FROM auth.users
WHERE
  raw_app_meta_data ->> 'role' = 'super_admin'
  OR raw_user_meta_data ->> 'role' = 'super_admin'
ON CONFLICT DO NOTHING;

-- Step 3: Back-fill platform_owners for the same users (needed for tenant_isolation_gate)
INSERT INTO public.platform_owners (user_id, notes)
SELECT
  id,
  'Auto-seeded from super_admin role metadata'
FROM auth.users
WHERE
  raw_app_meta_data ->> 'role' = 'super_admin'
  OR raw_user_meta_data ->> 'role' = 'super_admin'
ON CONFLICT DO NOTHING;

-- Step 4: If no rows matched the metadata approach (role might be stored differently),
-- also check email-based known super admins from founding admin migration
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  'super_admin'::app_role
FROM auth.users
WHERE email IN ('shilaymindz@gmail.com', 'danielolashile@gmail.com', 'dhayo213@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.users.id AND ur.role = 'super_admin'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_owners (user_id, notes)
SELECT
  id,
  'Auto-seeded: founding super admin by email'
FROM auth.users
WHERE email IN ('shilaymindz@gmail.com', 'danielolashile@gmail.com', 'dhayo213@gmail.com')
ON CONFLICT DO NOTHING;
