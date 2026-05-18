
-- ============== AUDIT LOGS: per-tenant scoping ==============
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.audit_logs
SET organization_id = public.get_user_organization(user_id)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);

CREATE OR REPLACE FUNCTION public.set_audit_log_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.organization_id := public.get_user_organization(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_audit_log_org_trigger ON public.audit_logs;
CREATE TRIGGER set_audit_log_org_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_org();

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Org admins can view their org audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'org_admin'::app_role))
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs in their org"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    organization_id IS NULL
    OR organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  )
);

DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_isolation"
ON public.audit_logs AS RESTRICTIVE FOR ALL
USING (
  organization_id IS NULL
  OR organization_id = public.get_user_organization(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  organization_id IS NULL
  OR organization_id = public.get_user_organization(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- ============== COMPANY BANK DETAILS ==============
CREATE TABLE IF NOT EXISTS public.company_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.company_bank_details(organization_id, bank_name, bank_account_name, bank_account_number)
SELECT DISTINCT ON (organization_id)
  organization_id, bank_name, bank_account_name, bank_account_number
FROM public.company_settings
WHERE organization_id IS NOT NULL
  AND (bank_name IS NOT NULL OR bank_account_name IS NOT NULL OR bank_account_number IS NOT NULL)
ORDER BY organization_id, updated_at DESC
ON CONFLICT (organization_id) DO NOTHING;

ALTER TABLE public.company_settings DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS bank_account_name;
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS bank_name;

ALTER TABLE public.company_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_bank_details_tenant_isolation"
ON public.company_bank_details AS RESTRICTIVE FOR ALL
USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "company_bank finance read"
ON public.company_bank_details FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "company_bank finance insert"
ON public.company_bank_details FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "company_bank finance update"
ON public.company_bank_details FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE TRIGGER update_company_bank_details_updated_at
BEFORE UPDATE ON public.company_bank_details
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== PARTNER SENSITIVE DETAILS ==============
CREATE TABLE IF NOT EXISTS public.partner_sensitive_details (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  director_nin text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.partner_sensitive_details(partner_id, organization_id, director_nin, bank_name, bank_account_name, bank_account_number)
SELECT id, organization_id, director_nin, bank_name, bank_account_name, bank_account_number
FROM public.partners
WHERE organization_id IS NOT NULL
ON CONFLICT (partner_id) DO NOTHING;

ALTER TABLE public.partners DROP COLUMN IF EXISTS director_nin;
ALTER TABLE public.partners DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE public.partners DROP COLUMN IF EXISTS bank_account_name;
ALTER TABLE public.partners DROP COLUMN IF EXISTS bank_name;

CREATE INDEX IF NOT EXISTS idx_partner_sensitive_org ON public.partner_sensitive_details(organization_id);

ALTER TABLE public.partner_sensitive_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_sensitive_tenant_isolation"
ON public.partner_sensitive_details AS RESTRICTIVE FOR ALL
USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "partner_sensitive finance read"
ON public.partner_sensitive_details FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "partner_sensitive finance insert"
ON public.partner_sensitive_details FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "partner_sensitive finance update"
ON public.partner_sensitive_details FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "partner_sensitive finance delete"
ON public.partner_sensitive_details FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE TRIGGER update_partner_sensitive_details_updated_at
BEFORE UPDATE ON public.partner_sensitive_details
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
