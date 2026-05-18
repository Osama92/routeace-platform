REVOKE ALL ON FUNCTION public.refresh_staff_status_for_user(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_staff_status_for_user(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_staff_status_for_user(uuid, uuid) FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM anon;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_staff_status_from_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_profile() FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_staff_from_org_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_staff_from_org_member() FROM anon;
REVOKE ALL ON FUNCTION public.sync_staff_from_org_member() FROM authenticated;