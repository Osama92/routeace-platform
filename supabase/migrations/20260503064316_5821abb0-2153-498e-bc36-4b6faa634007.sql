DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'rilwan_oladipupo@yahoo.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.organization_members WHERE user_id = v_user_id;
  DELETE FROM public.tenant_config WHERE user_id = v_user_id;
  DELETE FROM public.billing_accounts WHERE tenant_id IN (SELECT id FROM public.organizations WHERE owner_user_id = v_user_id);
  DELETE FROM public.organizations WHERE owner_user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;