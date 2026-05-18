
-- 1) Add vault reference column
ALTER TABLE public.partner_webhooks
  ADD COLUMN IF NOT EXISTS secrets_vault_id uuid;

-- 2) Backfill: move any existing plaintext secret into Vault
DO $$
DECLARE
  r record;
  v_new uuid;
BEGIN
  FOR r IN
    SELECT id, secret
    FROM public.partner_webhooks
    WHERE secret IS NOT NULL
      AND secret <> ''
      AND secrets_vault_id IS NULL
  LOOP
    v_new := vault.create_secret(r.secret, 'partner_webhook_' || r.id::text);
    UPDATE public.partner_webhooks
       SET secrets_vault_id = v_new
     WHERE id = r.id;
  END LOOP;
END $$;

-- 3) Drop the plaintext secret column
ALTER TABLE public.partner_webhooks DROP COLUMN IF EXISTS secret;

-- 4) Admin-only setter (super_admin or partner-owning org_admin)
CREATE OR REPLACE FUNCTION public.set_partner_webhook_secret(
  _webhook_id uuid,
  _secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner uuid;
  v_existing uuid;
  v_new uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RAISE EXCEPTION 'secret must be at least 16 characters';
  END IF;

  SELECT partner_id, secrets_vault_id
    INTO v_partner, v_existing
  FROM public.partner_webhooks
  WHERE id = _webhook_id;

  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'webhook not found';
  END IF;

  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, _secret);
  ELSE
    v_new := vault.create_secret(_secret, 'partner_webhook_' || _webhook_id::text);
    UPDATE public.partner_webhooks
       SET secrets_vault_id = v_new
     WHERE id = _webhook_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_partner_webhook_secret(uuid, text) FROM PUBLIC, anon;

-- 5) Service-role-only reader for delivery jobs
CREATE OR REPLACE FUNCTION public.get_partner_webhook_secret(_webhook_id uuid)
RETURNS text
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

  SELECT secrets_vault_id INTO v_vid
  FROM public.partner_webhooks
  WHERE id = _webhook_id;

  IF v_vid IS NULL THEN RETURN NULL; END IF;

  SELECT decrypted_secret INTO v_plain
  FROM vault.decrypted_secrets
  WHERE id = v_vid;

  RETURN v_plain;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_webhook_secret(uuid) FROM PUBLIC, anon, authenticated;
