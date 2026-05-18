REVOKE ALL ON FUNCTION public.is_customer_user_for_customer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_customer_user_for_customer(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_customer_user_for_customer(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_customer_user_for_dispatch(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_customer_user_for_dispatch(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_customer_user_for_dispatch(uuid, uuid) TO authenticated;