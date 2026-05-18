-- =========================================================
-- Part 1: Vault-backed encrypted storage for integration secrets
-- =========================================================

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS secrets_vault_id uuid;

-- Drop the unused plaintext columns (verified 0 rows used them)
ALTER TABLE public.integrations DROP COLUMN IF EXISTS api_key;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS api_secret;

-- Writer: admin-only RPC to set/rotate secrets (atomic; replaces existing vault entry)
CREATE OR REPLACE FUNCTION public.set_integration_secrets(
  _integration_id uuid,
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
  FROM public.integrations
  WHERE id = _integration_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'integration not found';
  END IF;

  IF NOT (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (has_role(auth.uid(), 'admin'::app_role) AND v_org = get_user_organization(auth.uid()))
    OR (has_role(auth.uid(), 'org_admin'::app_role) AND v_org = get_user_organization(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _secrets::text);
  ELSE
    v_new := vault.create_secret(_secrets::text, 'integration_' || _integration_id::text);
    UPDATE public.integrations
       SET secrets_vault_id = v_new,
           updated_at = now()
     WHERE id = _integration_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_integration_secrets(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_integration_secrets(uuid, jsonb) TO authenticated;

-- Reader: service-role only. Edge functions call this with the service client.
CREATE OR REPLACE FUNCTION public.get_integration_secrets(_integration_id uuid)
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

  SELECT secrets_vault_id INTO v_vid FROM public.integrations WHERE id = _integration_id;
  IF v_vid IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT decrypted_secret INTO v_plain FROM vault.decrypted_secrets WHERE id = v_vid;
  IF v_plain IS NULL OR v_plain = '' THEN RETURN '{}'::jsonb; END IF;

  RETURN v_plain::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_integration_secrets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_secrets(uuid) TO service_role;

-- One-shot migration: extract any existing plaintext secrets from config -> vault, scrub config
DO $$
DECLARE
  r record;
  v_secrets jsonb;
  v_cleaned jsonb;
  v_vid uuid;
  k text;
  secret_keys text[] := ARRAY[
    'api_key','api_secret','client_secret','access_token','refresh_token',
    'webhook_secret','password','token','private_key','secret_key'
  ];
BEGIN
  FOR r IN SELECT id, name, config, secrets_vault_id FROM public.integrations WHERE config IS NOT NULL
  LOOP
    IF r.secrets_vault_id IS NOT NULL THEN CONTINUE; END IF;
    v_secrets := '{}'::jsonb;
    v_cleaned := r.config;

    FOREACH k IN ARRAY secret_keys LOOP
      IF v_cleaned ? k AND length(coalesce(v_cleaned ->> k, '')) > 0 THEN
        v_secrets := v_secrets || jsonb_build_object(k, v_cleaned -> k);
        v_cleaned := v_cleaned - k;
      END IF;
    END LOOP;

    IF v_secrets <> '{}'::jsonb THEN
      v_vid := vault.create_secret(v_secrets::text, 'integration_' || r.id::text);
      UPDATE public.integrations
         SET secrets_vault_id = v_vid,
             config = v_cleaned,
             updated_at = now()
       WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- Part 2: Lock down profile-pictures & vehicle-pictures buckets
-- =========================================================

UPDATE storage.buckets
   SET public = false
 WHERE id IN ('profile-pictures','vehicle-pictures');

-- Profile pictures: any authenticated user can read (needed for avatars across the app)
DROP POLICY IF EXISTS "authenticated read all profile pictures" ON storage.objects;
CREATE POLICY "authenticated read all profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Vehicle pictures: super admin OR same-org members
DROP POLICY IF EXISTS "Org members read vehicle pictures" ON storage.objects;
CREATE POLICY "Org members read vehicle pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-pictures'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = (get_user_organization(auth.uid()))::text
  )
);