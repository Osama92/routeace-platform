-- Restore Supabase default explicit grants (matches prior ACL: authenticated + service_role explicit)
DO $$
DECLARE
  r record;
  v_sig text;
  v_keep_anon text[] := ARRAY[
    'add_public_ticket_message','get_delivery_csat_context','get_public_org_by_slug',
    'get_public_ticket_messages','get_public_ticket_status','submit_public_support_ticket'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    v_sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    IF r.proname = ANY(v_keep_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', v_sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', v_sig);
    END IF;
  END LOOP;
END$$;