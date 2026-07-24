-- Fix: super_admin user (relmahaulageandlogistics@gmail.com) has a valid user_roles row
-- but is missing from platform_owners. The tenant_isolation_gate RESTRICTIVE policy
-- on all org-scoped tables requires is_platform_owner() OR same-org membership.
-- Since super_admin is a platform-level role with no organization_id, they need
-- to be in platform_owners to pass the gate.
--
-- This migration ONLY inserts into platform_owners. No existing data is modified.

INSERT INTO public.platform_owners (user_id, notes)
SELECT id, 'Super Admin — platform owner access'
FROM auth.users
WHERE email = 'relmahaulageandlogistics@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
