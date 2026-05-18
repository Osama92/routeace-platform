-- Fix profile picture validation so valid Storage uploads are not rejected before metadata is populated.
-- Bucket-level file_size_limit and allowed_mime_types continue enforcing server-side limits.
CREATE OR REPLACE FUNCTION public.is_valid_profile_picture_object(
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
    AND (storage.foldername(_name))[1] = auth.uid()::text
    AND lower(COALESCE(storage.extension(_name), '')) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
$$;

CREATE OR REPLACE FUNCTION public.log_profile_picture_upload_event(
  _action text,
  _outcome text,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL,
  _file_size_bytes bigint DEFAULT NULL,
  _mime_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _safe_action text;
  _safe_outcome text;
  _safe_mime text;
  _safe_size bigint;
  _safe_error_code text;
  _safe_category text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  _safe_action := CASE
    WHEN _action IN ('upload_attempt', 'upload_success', 'upload_denied', 'upload_error', 'delete_success') THEN _action
    ELSE 'upload_error'
  END;

  _safe_outcome := CASE
    WHEN _outcome IN ('success', 'denied', 'validation_failed', 'error') THEN _outcome
    ELSE 'error'
  END;

  _safe_mime := CASE
    WHEN lower(COALESCE(_mime_type, '')) IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN lower(_mime_type)
    ELSE NULL
  END;

  _safe_size := CASE
    WHEN _file_size_bytes BETWEEN 0 AND 5242880 THEN _file_size_bytes
    ELSE NULL
  END;

  _safe_error_code := left(NULLIF(trim(_error_code), ''), 64);
  _safe_category := CASE
    WHEN _safe_action = 'upload_attempt' AND _safe_outcome = 'success' THEN NULL
    ELSE public.profile_picture_error_category(_error_message)
  END;

  INSERT INTO public.profile_picture_upload_audit (
    user_id,
    action,
    outcome,
    error_code,
    error_category,
    file_size_bytes,
    mime_type
  ) VALUES (
    auth.uid(),
    _safe_action,
    _safe_outcome,
    _safe_error_code,
    _safe_category,
    _safe_size,
    _safe_mime
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) TO authenticated;