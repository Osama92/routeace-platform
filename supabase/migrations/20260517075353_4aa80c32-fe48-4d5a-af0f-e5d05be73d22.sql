
-- Lenders
CREATE TABLE public.loan_lenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  lender_type text NOT NULL DEFAULT 'company' CHECK (lender_type IN ('individual','company')),
  contact_name text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loan_lenders_org ON public.loan_lenders(organization_id);

ALTER TABLE public.loan_lenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loan_lenders_select" ON public.loan_lenders
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loan_lenders_insert" ON public.loan_lenders
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loan_lenders_update" ON public.loan_lenders
  FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loan_lenders_delete" ON public.loan_lenders
  FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loan_lenders_tenant_isolation" ON public.loan_lenders
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_platform_owner(auth.uid()))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_platform_owner(auth.uid()));

CREATE TRIGGER update_loan_lenders_updated_at
  BEFORE UPDATE ON public.loan_lenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Loans
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lender_id uuid NOT NULL REFERENCES public.loan_lenders(id) ON DELETE RESTRICT,
  principal_amount numeric(15,2) NOT NULL,
  annual_interest_rate numeric(5,2) NOT NULL DEFAULT 0,
  tenure_months integer NOT NULL,
  start_date date NOT NULL,
  wht_rate numeric(5,2) NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','repaid','defaulted','restructured')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loans_org ON public.loans(organization_id);
CREATE INDEX idx_loans_lender ON public.loans(lender_id);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_select" ON public.loans
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loans_insert" ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loans_update" ON public.loans
  FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loans_delete" ON public.loans
  FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "loans_tenant_isolation" ON public.loans
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_platform_owner(auth.uid()))
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_platform_owner(auth.uid()));

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
