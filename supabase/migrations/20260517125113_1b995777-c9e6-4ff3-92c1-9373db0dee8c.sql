-- Add vault-backed secret storage to integration_configs and remove plaintext columns

-- 1. Add vault reference column
ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS secrets_vault_id uuid;

-- 2. Authenticated users can set secrets for integration_configs they manage
CREATE OR REPLACE FUNCTION public.set_integration_config_secrets(
  _integration_config_id uuid,
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
  FROM public.integration_configs
  WHERE id = _integration_config_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'integration config not found';
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
    v_new := vault.create_secret(_secrets::text, 'integration_config_' || _integration_config_id::text);
    UPDATE public.integration_configs
       SET secrets_vault_id = v_new,
           updated_at = now()
     WHERE id = _integration_config_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_integration_config_secrets(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_integration_config_secrets(uuid, jsonb) TO authenticated;

-- 3. Service-role only reader for edge functions
CREATE OR REPLACE FUNCTION public.get_integration_config_secrets(_integration_config_id uuid)
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

  SELECT secrets_vault_id INTO v_vid FROM public.integration_configs WHERE id = _integration_config_id;
  IF v_vid IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT decrypted_secret INTO v_plain FROM vault.decrypted_secrets WHERE id = v_vid;
  IF v_plain IS NULL OR v_plain = '' THEN RETURN '{}'::jsonb; END IF;

  RETURN v_plain::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_integration_config_secrets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_config_secrets(uuid) TO service_role;

-- 4. Service-role writer for OAuth callback edge functions
CREATE OR REPLACE FUNCTION public.set_integration_config_secrets_service(
  _integration_config_id uuid,
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
  FROM public.integration_configs
  WHERE id = _integration_config_id;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _secrets::text);
  ELSE
    v_new := vault.create_secret(_secrets::text, 'integration_config_' || _integration_config_id::text);
    UPDATE public.integration_configs
       SET secrets_vault_id = v_new,
           updated_at = now()
     WHERE id = _integration_config_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_integration_config_secrets_service(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_integration_config_secrets_service(uuid, jsonb) TO service_role;

-- 5. Scrub any existing plaintext secrets (table currently has 0 active rows; this is a safety measure)
UPDATE public.integration_configs
   SET client_secret = NULL,
       access_token = NULL,
       refresh_token = NULL;
