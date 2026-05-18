
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant to anon ONLY for intentionally public functions
GRANT EXECUTE ON FUNCTION public.get_public_org_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text, text, text, text, text, text, text, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_messages(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.add_public_ticket_message(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_support_csat(uuid, integer, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_csat_context(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rate_delivery_csat(uuid, integer, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_initial_super_admin(uuid) TO anon;
