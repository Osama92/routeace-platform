REVOKE ALL ON FUNCTION public.can_manage_organization(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_organization(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_manage_user_profile(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_user_profile(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_user_profile(uuid, uuid) TO authenticated;