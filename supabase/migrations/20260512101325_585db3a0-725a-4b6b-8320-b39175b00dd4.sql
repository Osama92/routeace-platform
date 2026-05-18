
REVOKE EXECUTE ON FUNCTION public.assert_no_open_rls_policies() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_initial_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_intel_scope_violation(text, text, text, jsonb) FROM anon;

DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicle pictures" ON storage.objects;
