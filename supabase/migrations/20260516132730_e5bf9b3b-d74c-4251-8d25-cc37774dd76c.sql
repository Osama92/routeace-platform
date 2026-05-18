REVOKE EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.profile_picture_error_category(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_profile_picture_storage_success() FROM anon;

GRANT EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_picture_error_category(text) TO authenticated;