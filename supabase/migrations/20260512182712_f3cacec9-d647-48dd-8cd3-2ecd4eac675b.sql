
-- 1. Add organization_id columns
ALTER TABLE public.sla_policies ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.sla_contracts ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.sla_breach_records ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.sla_settings ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2. Backfill organization_id from related records
UPDATE public.sla_contracts c
SET organization_id = cu.organization_id
FROM public.customers cu
WHERE c.customer_id = cu.id AND c.organization_id IS NULL;

UPDATE public.sla_breach_records b
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE b.dispatch_id = d.id AND b.organization_id IS NULL;

UPDATE public.sla_breach_records b
SET organization_id = cu.organization_id
FROM public.customers cu
WHERE b.customer_id = cu.id AND b.organization_id IS NULL;

-- 3. Indexes for tenant scoping
CREATE INDEX IF NOT EXISTS idx_sla_policies_org ON public.sla_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_contracts_org ON public.sla_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_breach_org ON public.sla_breach_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_settings_org ON public.sla_settings(organization_id);

-- 4. Trigger to auto-populate organization_id from signed-in user
CREATE OR REPLACE FUNCTION public.set_sla_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.organization_id := public.get_user_organization(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sla_policies_set_org ON public.sla_policies;
CREATE TRIGGER trg_sla_policies_set_org
BEFORE INSERT ON public.sla_policies
FOR EACH ROW EXECUTE FUNCTION public.set_sla_organization_id();

DROP TRIGGER IF EXISTS trg_sla_contracts_set_org ON public.sla_contracts;
CREATE TRIGGER trg_sla_contracts_set_org
BEFORE INSERT ON public.sla_contracts
FOR EACH ROW EXECUTE FUNCTION public.set_sla_organization_id();

DROP TRIGGER IF EXISTS trg_sla_breach_set_org ON public.sla_breach_records;
CREATE TRIGGER trg_sla_breach_set_org
BEFORE INSERT ON public.sla_breach_records
FOR EACH ROW EXECUTE FUNCTION public.set_sla_organization_id();

DROP TRIGGER IF EXISTS trg_sla_settings_set_org ON public.sla_settings;
CREATE TRIGGER trg_sla_settings_set_org
BEFORE INSERT ON public.sla_settings
FOR EACH ROW EXECUTE FUNCTION public.set_sla_organization_id();

-- 5. Replace RLS policies with tenant-scoped versions
-- sla_policies
DROP POLICY IF EXISTS "Admins can manage SLA policies" ON public.sla_policies;
DROP POLICY IF EXISTS "Ops managers can view SLA policies" ON public.sla_policies;

CREATE POLICY "Tenant: view SLA policies"
ON public.sla_policies FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Tenant: manage SLA policies"
ON public.sla_policies FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_ops_manager(auth.uid()))
    AND organization_id = public.get_user_organization(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_ops_manager(auth.uid()))
    AND (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()))
  )
);

-- sla_contracts
DROP POLICY IF EXISTS "Admins can manage SLA contracts" ON public.sla_contracts;
DROP POLICY IF EXISTS "Ops and finance can view SLA contracts" ON public.sla_contracts;

CREATE POLICY "Tenant: view SLA contracts"
ON public.sla_contracts FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Tenant: manage SLA contracts"
ON public.sla_contracts FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_ops_manager(auth.uid()) OR is_finance_manager(auth.uid()))
    AND organization_id = public.get_user_organization(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_ops_manager(auth.uid()) OR is_finance_manager(auth.uid()))
    AND (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()))
  )
);

-- sla_breach_records
DROP POLICY IF EXISTS "Admins can manage breach records" ON public.sla_breach_records;
DROP POLICY IF EXISTS "Finance can view breach records" ON public.sla_breach_records;
DROP POLICY IF EXISTS "Ops can view and flag breaches" ON public.sla_breach_records;

CREATE POLICY "Tenant: view breach records"
ON public.sla_breach_records FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Tenant: manage breach records"
ON public.sla_breach_records FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_ops_manager(auth.uid()) OR is_finance_manager(auth.uid()))
    AND organization_id = public.get_user_organization(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()))
);

-- sla_settings
DROP POLICY IF EXISTS "Admins can manage SLA settings" ON public.sla_settings;

CREATE POLICY "Tenant: view SLA settings"
ON public.sla_settings FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Tenant: manage SLA settings"
ON public.sla_settings FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    (is_super_admin(auth.uid()) OR is_org_admin(auth.uid()))
    AND organization_id = public.get_user_organization(auth.uid())
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()))
);
