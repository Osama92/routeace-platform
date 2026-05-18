CREATE OR REPLACE FUNCTION public.log_profile_picture_storage_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _owner_folder text;
  _audit_user uuid;
BEGIN
  IF NEW.bucket_id = 'profile-pictures' THEN
    _owner_folder := (storage.foldername(NEW.name))[1];
    _audit_user := CASE
      WHEN _owner_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN _owner_folder::uuid
      ELSE auth.uid()
    END;

    IF _audit_user IS NOT NULL THEN
      INSERT INTO public.profile_picture_upload_audit (
        user_id,
        action,
        outcome,
        file_size_bytes,
        mime_type
      ) VALUES (
        _audit_user,
        'upload_success',
        'success',
        CASE
          WHEN (NEW.metadata->>'size') ~ '^[0-9]+$' THEN (NEW.metadata->>'size')::bigint
          ELSE NULL
        END,
        CASE
          WHEN lower(COALESCE(NEW.metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN lower(NEW.metadata->>'mimetype')
          ELSE NULL
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_driver_profile_picture_object(
  _bucket_id text,
  _name text,
  _metadata jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    _bucket_id = 'profile-pictures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(_name))[1] = 'drivers'
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
    )
    AND COALESCE((_metadata->>'size')::bigint, 0) BETWEEN 1 AND 5242880
    AND lower(COALESCE(_metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
    AND lower(COALESCE(storage.extension(_name), '')) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
$$;

DROP POLICY IF EXISTS "privileged users upload driver profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "privileged users replace driver profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "privileged users delete driver profile pictures" ON storage.objects;

CREATE POLICY "privileged users upload driver profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (public.is_valid_driver_profile_picture_object(bucket_id, name, metadata));

CREATE POLICY "privileged users replace driver profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'drivers'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
  )
)
WITH CHECK (public.is_valid_driver_profile_picture_object(bucket_id, name, metadata));

CREATE POLICY "privileged users delete driver profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'drivers'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
  )
);

REVOKE EXECUTE ON FUNCTION public.is_valid_driver_profile_picture_object(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_driver_profile_picture_object(text, text, jsonb) TO authenticated;