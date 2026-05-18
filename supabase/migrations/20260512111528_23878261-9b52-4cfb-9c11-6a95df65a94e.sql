-- Phase 14e-revert: restore default GRANT EXECUTE TO PUBLIC on public SECURITY DEFINER functions
-- These functions are required by RLS policies and trigger logic; locking them down further
-- breaks legitimate authenticated access. Keep anon explicitly revoked except for the
-- public-facing RPC whitelist which were already granted to anon.
DO $$
DECLARE
  r record;
  v_sig text;
  v_keep_anon text[] := ARRAY[
    'add_public_ticket_message',
    'get_delivery_csat_context',
    'get_public_org_by_slug',
    'get_public_ticket_messages',
    'get_public_ticket_status',
    'submit_public_support_ticket'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    v_sig := format('public.%I(%s)', r.proname, r.args);
    -- Restore PUBLIC execute (covers authenticated via inheritance, matching prior behavior)
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', v_sig);
    -- Remove the explicit authenticated grant we added (cleanup; PUBLIC covers it)
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', v_sig);
    -- Keep anon explicitly revoked for non-public RPCs
    IF NOT (r.proname = ANY(v_keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', v_sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', v_sig);
    END IF;
  END LOOP;
END$$;