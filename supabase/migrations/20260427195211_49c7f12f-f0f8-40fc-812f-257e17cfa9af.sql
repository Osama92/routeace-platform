-- Hard delete the stuck signup so the user can re-register cleanly via the company-signup flow.
DO $$
DECLARE
  v_uid uuid := '1646029c-6ea6-420c-adda-75be6223a0e6';
BEGIN
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.organization_members WHERE user_id = v_uid;
  DELETE FROM public.tenant_config WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE user_id = v_uid;
  -- auth.users cascade will drop sessions/identities
  DELETE FROM auth.users WHERE id = v_uid;
END $$;