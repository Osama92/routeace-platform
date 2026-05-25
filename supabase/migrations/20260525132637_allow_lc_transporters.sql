-- Allow Logistics Company (LC) tenants to register vendors/3PL transporters.
-- Previously the trigger required tenant_mode = 'LOGISTICS_DEPARTMENT'.
-- Both LC and LD share the same ld_transporters table for vendor management.

-- 1. Remove the tenant_mode restriction from the transporter insert/update trigger
CREATE OR REPLACE FUNCTION public.validate_ld_transporter_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the organisation actually exists (any tenant mode allowed)
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Remove the tenant_mode restriction from the invite token insert/update trigger
CREATE OR REPLACE FUNCTION public.validate_transporter_invite_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the organisation actually exists (any tenant mode allowed)
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Update storage policy to allow both LC and LD tenants to upload transporter docs via invite link
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
      -- tenant_mode restriction removed: both LC and LD can use invite links
  )
);
