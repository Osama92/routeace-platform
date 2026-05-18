-- Ensure profile picture bucket exists and enforce server-side upload limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Private audit log for profile picture uploads. No file paths, emails, or image contents are stored.
CREATE TABLE IF NOT EXISTS public.profile_picture_upload_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  outcome text NOT NULL,
  error_code text,
  error_category text,
  file_size_bytes bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_picture_upload_audit_action_chk
    CHECK (action IN ('upload_attempt', 'upload_success', 'upload_denied', 'upload_error', 'delete_success')),
  CONSTRAINT profile_picture_upload_audit_outcome_chk
    CHECK (outcome IN ('success', 'denied', 'validation_failed', 'error')),
  CONSTRAINT profile_picture_upload_audit_mime_type_chk
    CHECK (mime_type IS NULL OR mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  CONSTRAINT profile_picture_upload_audit_file_size_chk
    CHECK (file_size_bytes IS NULL OR (file_size_bytes >= 0 AND file_size_bytes <= 5242880))
);

ALTER TABLE public.profile_picture_upload_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view profile picture upload audit" ON public.profile_picture_upload_audit;
DROP POLICY IF EXISTS "No direct profile picture audit writes" ON public.profile_picture_upload_audit;

CREATE POLICY "Admins can view profile picture upload audit"
ON public.profile_picture_upload_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "No direct profile picture audit writes"
ON public.profile_picture_upload_audit
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.profile_picture_error_category(_message text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _message IS NULL OR length(trim(_message)) = 0 THEN NULL
    WHEN _message ILIKE '%row-level security%' OR _message ILIKE '%unauthorized%' OR _message ILIKE '%403%' THEN 'policy_denial'
    WHEN _message ILIKE '%mime%' OR _message ILIKE '%content%type%' OR _message ILIKE '%image%' THEN 'invalid_file_type'
    WHEN _message ILIKE '%size%' OR _message ILIKE '%too large%' OR _message ILIKE '%payload%' THEN 'file_too_large'
    ELSE 'storage_error'
  END
$$;

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
    AND COALESCE((_metadata->>'size')::bigint, 0) BETWEEN 1 AND 5242880
    AND lower(COALESCE(_metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
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
    left(NULLIF(trim(_error_code), ''), 64),
    public.profile_picture_error_category(_error_message),
    _safe_size,
    _safe_mime
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_profile_picture_storage_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF NEW.bucket_id = 'profile-pictures' THEN
    INSERT INTO public.profile_picture_upload_audit (
      user_id,
      action,
      outcome,
      file_size_bytes,
      mime_type
    ) VALUES (
      COALESCE(NULLIF((storage.foldername(NEW.name))[1], '')::uuid, auth.uid()),
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_picture_storage_success_audit ON storage.objects;
CREATE TRIGGER profile_picture_storage_success_audit
AFTER INSERT ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id = 'profile-pictures')
EXECUTE FUNCTION public.log_profile_picture_storage_success();

DROP POLICY IF EXISTS "profile_pictures_insert_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "profile_pictures_update_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "profile_pictures_delete_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

CREATE POLICY "profile pictures are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "authenticated users upload own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (public.is_valid_profile_picture_object(bucket_id, name, metadata));

CREATE POLICY "authenticated users replace own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (public.is_valid_profile_picture_object(bucket_id, name, metadata));

CREATE POLICY "authenticated users delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

GRANT EXECUTE ON FUNCTION public.log_profile_picture_upload_event(text, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_profile_picture_object(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_picture_error_category(text) TO authenticated;