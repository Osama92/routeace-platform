-- Replace policy that queries auth.users directly (causing 42501 permission denied)
DROP POLICY IF EXISTS "Staff self read" ON public.staff;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

CREATE POLICY "Staff self read"
ON public.staff
FOR SELECT
USING (email IS NOT NULL AND email = public.current_user_email());
