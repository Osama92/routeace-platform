DROP POLICY IF EXISTS "Public invite uploads transporter docs" ON storage.objects;

CREATE POLICY "Public invite uploads transporter docs"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'transporter-onboarding-docs'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[2] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.transporter_invite_tokens tit
    JOIN public.organizations o ON o.id = tit.organization_id
    WHERE tit.organization_id::text = (storage.foldername(name))[1]
      AND tit.token = (storage.foldername(name))[2]
      AND tit.is_active = true
      AND (tit.expires_at IS NULL OR tit.expires_at > now())
      AND (tit.max_uses IS NULL OR tit.uses_count < tit.max_uses)
      AND COALESCE(tit.link_type, 'access') = 'new'
      AND o.tenant_mode = 'LOGISTICS_DEPARTMENT'
  )
);

CREATE OR REPLACE FUNCTION public.validate_ld_transporter_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = NEW.organization_id
      AND tenant_mode = 'LOGISTICS_DEPARTMENT'
  ) THEN
    RAISE EXCEPTION 'LD Transporters require a LOGISTICS_DEPARTMENT organisation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ld_transporter ON public.ld_transporters;
CREATE TRIGGER trg_validate_ld_transporter
  BEFORE INSERT OR UPDATE OF organization_id ON public.ld_transporters
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ld_transporter_org();

CREATE OR REPLACE FUNCTION public.validate_transporter_invite_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = NEW.organization_id
      AND tenant_mode = 'LOGISTICS_DEPARTMENT'
  ) THEN
    RAISE EXCEPTION 'Transporter invite tokens require a LOGISTICS_DEPARTMENT organisation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transporter_invite ON public.transporter_invite_tokens;
CREATE TRIGGER trg_validate_transporter_invite
  BEFORE INSERT OR UPDATE OF organization_id ON public.transporter_invite_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transporter_invite_org();