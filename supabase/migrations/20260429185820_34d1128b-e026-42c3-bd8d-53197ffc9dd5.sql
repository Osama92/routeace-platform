-- 1. Updated trigger: allow service-role calls (no auth.uid), an explicit bypass GUC, or admins.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass text;
BEGIN
  -- Service-role / migration context: no authenticated user → allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Explicit per-transaction bypass set by force_approve_user_profile()
  BEGIN
    v_bypass := current_setting('app.allow_profile_approval', true);
  EXCEPTION WHEN OTHERS THEN v_bypass := NULL;
  END;
  IF v_bypass = 'on' THEN
    RETURN NEW;
  END IF;

  -- Admins / super admins always allowed
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Everyone else: silently revert sensitive fields
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    NEW.approved_at := OLD.approved_at;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Bypass-safe approval helper (uses transaction-scoped custom GUC)
CREATE OR REPLACE FUNCTION public.force_approve_user_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_profile_approval', 'on', true);
  UPDATE public.profiles
     SET approval_status = 'approved',
         is_active       = true,
         approved_at     = now()
   WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_approve_user_profile(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_approve_user_profile(uuid) TO authenticated;

-- 3. One-time cleanup of stuck users (runs in migration with no auth.uid → trigger allows)
UPDATE public.profiles p
   SET approval_status = 'approved',
       is_active       = true,
       approved_at     = now()
 WHERE p.approval_status = 'pending'
   AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id)
   AND EXISTS (
     SELECT 1 FROM public.organization_members om
      WHERE om.user_id = p.user_id AND om.is_active = true
   );