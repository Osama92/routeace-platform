
-- 1. Platform owner registry (true cross-tenant observability is restricted to this list)
CREATE TABLE IF NOT EXISTS public.platform_owners (
  user_id uuid PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
ALTER TABLE public.platform_owners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = _user_id);
$$;

DROP POLICY IF EXISTS "Platform owners self-select" ON public.platform_owners;
CREATE POLICY "Platform owners self-select" ON public.platform_owners
  FOR SELECT USING (user_id = auth.uid() OR public.is_platform_owner(auth.uid()));
DROP POLICY IF EXISTS "Only platform owners manage owners" ON public.platform_owners;
CREATE POLICY "Only platform owners manage owners" ON public.platform_owners
  FOR ALL USING (public.is_platform_owner(auth.uid()))
           WITH CHECK (public.is_platform_owner(auth.uid()));

-- Seed founder
INSERT INTO public.platform_owners(user_id, notes)
VALUES ('81f3065a-a97c-4e4b-af28-9671537600d9','Founding platform owner (Rilwan)')
ON CONFLICT DO NOTHING;

-- 2. Restrictive tenant gate on every table that has organization_id.
--    RESTRICTIVE policies are AND-combined with existing permissive ones, so this
--    cannot be bypassed by legacy role-only policies.
DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.schemaname = c.table_schema AND t.tablename = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.rowsecurity = true
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation_gate ON %I.%I',
      r.table_schema, r.table_name
    );
    EXECUTE format($f$
      CREATE POLICY tenant_isolation_gate ON %I.%I
      AS RESTRICTIVE
      FOR ALL
      TO public
      USING (
        organization_id IS NULL
        OR organization_id = public.get_user_organization(auth.uid())
        OR public.is_platform_owner(auth.uid())
      )
      WITH CHECK (
        organization_id IS NULL
        OR organization_id = public.get_user_organization(auth.uid())
        OR public.is_platform_owner(auth.uid())
      )
    $f$, r.table_schema, r.table_name);
  END LOOP;
END
$do$;

-- 3. Special-case: organization_members itself uses organization_id but a user
--    must be able to see their own membership row even before get_user_organization
--    returns. Replace the gate with a self-or-same-org rule.
DROP POLICY IF EXISTS tenant_isolation_gate ON public.organization_members;
CREATE POLICY tenant_isolation_gate ON public.organization_members
  AS RESTRICTIVE FOR ALL TO public
  USING (
    user_id = auth.uid()
    OR organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  );
