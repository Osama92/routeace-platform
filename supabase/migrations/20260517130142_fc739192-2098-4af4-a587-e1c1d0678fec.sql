-- 1. erp_connections: Vault-backed token storage
ALTER TABLE public.erp_connections
  ADD COLUMN IF NOT EXISTS secrets_vault_id uuid;

-- Authenticated admin writer
CREATE OR REPLACE FUNCTION public.set_erp_connection_secrets(
  _connection_id uuid,
  _secrets jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_existing uuid;
  v_new uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _secrets IS NULL OR jsonb_typeof(_secrets) <> 'object' THEN
    RAISE EXCEPTION 'invalid secrets payload';
  END IF;

  SELECT organization_id, secrets_vault_id
    INTO v_org, v_existing
  FROM public.erp_connections
  WHERE id = _connection_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'erp connection not found';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND v_org = public.get_user_organization(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _secrets::text);
  ELSE
    v_new := vault.create_secret(_secrets::text, 'erp_connection_' || _connection_id::text);
    UPDATE public.erp_connections
       SET secrets_vault_id = v_new,
           updated_at = now()
     WHERE id = _connection_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_erp_connection_secrets(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_erp_connection_secrets(uuid, jsonb) TO authenticated;

-- Service-role reader
CREATE OR REPLACE FUNCTION public.get_erp_connection_secrets(_connection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vid uuid;
  v_plain text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;

  SELECT secrets_vault_id INTO v_vid FROM public.erp_connections WHERE id = _connection_id;
  IF v_vid IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT decrypted_secret INTO v_plain FROM vault.decrypted_secrets WHERE id = v_vid;
  IF v_plain IS NULL OR v_plain = '' THEN RETURN '{}'::jsonb; END IF;

  RETURN v_plain::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_erp_connection_secrets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_erp_connection_secrets(uuid) TO service_role;

-- Service-role writer (for OAuth callback / token refresh)
CREATE OR REPLACE FUNCTION public.set_erp_connection_secrets_service(
  _connection_id uuid,
  _secrets jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_new uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;
  IF _secrets IS NULL OR jsonb_typeof(_secrets) <> 'object' THEN
    RAISE EXCEPTION 'invalid secrets payload';
  END IF;

  SELECT secrets_vault_id INTO v_existing
  FROM public.erp_connections
  WHERE id = _connection_id;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _secrets::text);
  ELSE
    v_new := vault.create_secret(_secrets::text, 'erp_connection_' || _connection_id::text);
    UPDATE public.erp_connections
       SET secrets_vault_id = v_new,
           updated_at = now()
     WHERE id = _connection_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_erp_connection_secrets_service(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_erp_connection_secrets_service(uuid, jsonb) TO service_role;

-- 2. Drop plaintext token columns from erp_connections (no live data)
ALTER TABLE public.erp_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- 3. Drop plaintext secret columns from integration_configs (already migrated to Vault)
ALTER TABLE public.integration_configs
  DROP COLUMN IF EXISTS client_secret,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;
