
-- ============================================================
-- 1) STAFF: split bank & tax fields into restricted table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_sensitive_details (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  organization_id uuid,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  tax_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_sensitive_details ENABLE ROW LEVEL SECURITY;

-- Backfill from staff
INSERT INTO public.staff_sensitive_details (staff_id, organization_id, bank_name, bank_account_name, bank_account_number, tax_id)
SELECT id, organization_id, bank_name, bank_account_name, bank_account_number, tax_id
FROM public.staff
WHERE bank_name IS NOT NULL OR bank_account_name IS NOT NULL OR bank_account_number IS NOT NULL OR tax_id IS NOT NULL
ON CONFLICT (staff_id) DO NOTHING;

-- Restrict SELECT to finance/admin roles
CREATE POLICY "staff_sensitive_select_finance_admin"
ON public.staff_sensitive_details FOR SELECT TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "staff_sensitive_modify_finance_admin"
ON public.staff_sensitive_details FOR ALL TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "staff_sensitive_tenant_isolation"
ON public.staff_sensitive_details AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

-- Drop sensitive columns from staff
ALTER TABLE public.staff
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS tax_id;

-- ============================================================
-- 2) DRIVERS: split tax_id & nin_document_url into restricted table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_sensitive_details (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  organization_id uuid,
  tax_id text,
  nin_document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_sensitive_details ENABLE ROW LEVEL SECURITY;

INSERT INTO public.driver_sensitive_details (driver_id, organization_id, tax_id, nin_document_url)
SELECT id, organization_id, tax_id, nin_document_url
FROM public.drivers
WHERE tax_id IS NOT NULL OR nin_document_url IS NOT NULL
ON CONFLICT (driver_id) DO NOTHING;

CREATE POLICY "driver_sensitive_select_finance_admin"
ON public.driver_sensitive_details FOR SELECT TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "driver_sensitive_modify_finance_admin"
ON public.driver_sensitive_details FOR ALL TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "driver_sensitive_tenant_isolation"
ON public.driver_sensitive_details AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

ALTER TABLE public.drivers
  DROP COLUMN IF EXISTS tax_id,
  DROP COLUMN IF EXISTS nin_document_url;

-- ============================================================
-- 3) CASHFLOW TABLES: add organization_id + tenant isolation
-- ============================================================
ALTER TABLE public.cashflow_forecasts    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.cash_balance_daily    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.cash_flow_projections ADD COLUMN IF NOT EXISTS organization_id uuid;

CREATE POLICY "cashflow_forecasts_tenant_isolation"
ON public.cashflow_forecasts AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "cash_balance_daily_tenant_isolation"
ON public.cash_balance_daily AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

CREATE POLICY "cash_flow_projections_tenant_isolation"
ON public.cash_flow_projections AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.is_platform_owner(auth.uid()));

-- Auto-fill organization_id on insert
CREATE OR REPLACE FUNCTION public.set_organization_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_org_id_cashflow_forecasts ON public.cashflow_forecasts;
CREATE TRIGGER set_org_id_cashflow_forecasts BEFORE INSERT ON public.cashflow_forecasts
FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS set_org_id_cash_balance_daily ON public.cash_balance_daily;
CREATE TRIGGER set_org_id_cash_balance_daily BEFORE INSERT ON public.cash_balance_daily
FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS set_org_id_cash_flow_projections ON public.cash_flow_projections;
CREATE TRIGGER set_org_id_cash_flow_projections BEFORE INSERT ON public.cash_flow_projections
FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

-- ============================================================
-- 4) PRIVATE BUCKET FOR DRIVER DOCUMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "driver_docs_org_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "driver_docs_org_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);
