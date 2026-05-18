DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END$$;

-- Re-grant anonymous EXECUTE only for the curated public allowlist
-- (these are intentionally callable by unauthenticated visitors).
DO $$
DECLARE
  fn text;
  allow text[] := ARRAY[
    'get_customer_invite_by_token',
    'get_delivery_csat_context',
    'rate_delivery_csat',
    'get_public_org_by_slug',
    'submit_public_support_ticket',
    'add_public_ticket_message',
    'get_public_ticket_messages',
    'get_public_ticket_status',
    'submit_support_csat'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY allow LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon',
        fn, r.args
      );
    END LOOP;
  END LOOP;
END$$;