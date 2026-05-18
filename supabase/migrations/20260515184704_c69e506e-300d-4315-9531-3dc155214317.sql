
CREATE OR REPLACE FUNCTION public.is_elevated_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT _role IN ('super_admin'::public.app_role, 'admin'::public.app_role, 'org_admin'::public.app_role);
$$;
