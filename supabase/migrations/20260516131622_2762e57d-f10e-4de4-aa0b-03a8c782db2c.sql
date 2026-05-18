DROP POLICY IF EXISTS "profile pictures are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "authenticated users read own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "admins read profile pictures" ON storage.objects;

CREATE POLICY "authenticated users read own profile pictures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "admins read profile pictures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role)
  )
);

REVOKE EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_valid_driver_profile_picture_object(text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_picture_error_category(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_profile_picture_storage_success() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_driver_profile_picture_object(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_picture_error_category(text) TO authenticated;