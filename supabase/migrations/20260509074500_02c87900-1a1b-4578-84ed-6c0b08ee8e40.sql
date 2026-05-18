-- 1. Driver verification metadata columns (no-op if already present)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- 2. SECURITY DEFINER helper so any authenticated user can log
--    an intel-scope violation event (insert RLS otherwise blocks them).
CREATE OR REPLACE FUNCTION public.record_intel_scope_violation(
  p_route text,
  p_attempted_module text,
  p_view_scope text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.security_events (event_type, user_id, severity, details)
  VALUES (
    'intel_scope_violation',
    v_uid,
    'high',
    jsonb_build_object(
      'route', p_route,
      'attempted_module', p_attempted_module,
      'view_scope', p_view_scope
    ) || COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_intel_scope_violation(text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_intel_scope_violation(text, text, text, jsonb) TO authenticated;