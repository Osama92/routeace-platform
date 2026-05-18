
-- Drop the redundant permissive self-update policy (no WITH CHECK)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Trigger function: block non-privileged users from mutating governance fields on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_field_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean := false;
BEGIN
  -- Skip checks for service role / no auth context (backend updates)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- If caller can manage this profile via the admin helper, allow anything
  BEGIN
    is_privileged := public.can_manage_user_profile(auth.uid(), NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    is_privileged := false;
  END;

  IF is_privileged THEN
    RETURN NEW;
  END IF;

  -- Non-privileged self-update: forbid changing governance fields
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at      IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by      IS DISTINCT FROM OLD.approved_by
     OR NEW.is_active        IS DISTINCT FROM OLD.is_active
     OR NEW.suspended_at     IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by     IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
  THEN
    RAISE EXCEPTION 'Not authorized to modify governance fields on profile'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privileged_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_privileged_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privileged_field_self_update();
