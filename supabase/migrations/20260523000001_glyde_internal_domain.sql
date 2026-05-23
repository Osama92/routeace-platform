-- ---------------------------------------------------------------------------
-- Glyde internal domain access control
-- ---------------------------------------------------------------------------
-- is_glyde_internal(user_id) returns TRUE if the user's auth email ends with
-- @glydeservicesng.com. Reads from auth.users (not public.profiles) so the
-- result cannot be influenced by user-editable data. Runs as SECURITY DEFINER
-- so RLS on auth.users is bypassed — service role is the only caller.
--
-- Security guarantees:
--   - auth.users.email is owned by Supabase Auth; users can only change it
--     via the verified email-change flow (new address must be confirmed).
--   - Function is not exposed to public schema, only to service_role.
--   - Domain check is lowercase-normalised to prevent capitalisation tricks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_glyde_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email)
    INTO v_email
    FROM auth.users
   WHERE id = p_user_id
   LIMIT 1;

  RETURN v_email LIKE '%@glydeservicesng.com';
END;
$$;

-- Revoke public execute; only service_role (and superuser) may call this.
REVOKE EXECUTE ON FUNCTION public.is_glyde_internal(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_glyde_internal(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Back-fill: ensure existing glydeservicesng.com org members have the
-- unlimited plan tier set in tenant_config so the UI also reflects it.
-- ---------------------------------------------------------------------------
UPDATE public.tenant_config tc
SET
  ai_credits_total = 2147483647,   -- max int — effectively unlimited
  plan_tier        = 'enterprise',
  updated_at       = now()
FROM auth.users u
WHERE tc.user_id = u.id
  AND lower(u.email) LIKE '%@glydeservicesng.com';
