CREATE OR REPLACE FUNCTION public.get_public_org_by_slug(p_slug text)
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.slug
  FROM public.organizations o
  WHERE o.slug = lower(trim(p_slug))
    AND o.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_org_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_by_slug(text) TO anon, authenticated;