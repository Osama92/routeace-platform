
-- Vendor invoices uploaded for AI reconciliation
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_number text,
  invoice_date date,
  amount numeric(14,2),
  currency text DEFAULT 'NGN',
  pdf_url text NOT NULL,
  pdf_path text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_via text NOT NULL DEFAULT 'admin' CHECK (uploaded_via IN ('admin','vendor')),
  parsed_data jsonb DEFAULT '{}'::jsonb,
  extracted_waybills text[] DEFAULT '{}',
  extracted_dispatches text[] DEFAULT '{}',
  matched_dispatch_ids uuid[] DEFAULT '{}',
  matched_waybill_ids uuid[] DEFAULT '{}',
  match_score numeric(5,2) DEFAULT 0,
  match_status text NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending','processing','matched','partial','unmatched','error')),
  match_details jsonb DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  finance_email_sent_at timestamptz,
  finance_email_to text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_org ON public.vendor_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_partner ON public.vendor_invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON public.vendor_invoices(approval_status, match_status);

CREATE TRIGGER update_vendor_invoices_updated_at
  BEFORE UPDATE ON public.vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current user's vendor partner_id
CREATE OR REPLACE FUNCTION public.current_vendor_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.partner_id
  FROM public.ld_transporters t
  WHERE t.user_id = auth.uid()
    AND t.partner_id IS NOT NULL
  LIMIT 1
$$;

-- Helper: org membership for current user
CREATE OR REPLACE FUNCTION public.current_user_in_org(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = _org AND om.is_active = true
  )
$$;

-- Vendor: can view & insert own invoices only
CREATE POLICY "Vendor sees own invoices"
ON public.vendor_invoices FOR SELECT TO authenticated
USING (partner_id = public.current_vendor_partner_id());

CREATE POLICY "Vendor uploads own invoices"
ON public.vendor_invoices FOR INSERT TO authenticated
WITH CHECK (
  partner_id = public.current_vendor_partner_id()
  AND uploaded_via = 'vendor'
);

-- Org staff (admin/finance/ops) can manage invoices for their organization
CREATE POLICY "Org staff view org invoices"
ON public.vendor_invoices FOR SELECT TO authenticated
USING (
  public.current_user_in_org(organization_id)
  AND (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'org_admin'::app_role)
    OR has_role(auth.uid(),'ops_manager'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
    OR has_role(auth.uid(),'operations'::app_role)
  )
);

CREATE POLICY "Org staff insert org invoices"
ON public.vendor_invoices FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_in_org(organization_id)
  AND (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'org_admin'::app_role)
    OR has_role(auth.uid(),'ops_manager'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  )
);

CREATE POLICY "Org staff update org invoices"
ON public.vendor_invoices FOR UPDATE TO authenticated
USING (
  public.current_user_in_org(organization_id)
  AND (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'org_admin'::app_role)
    OR has_role(auth.uid(),'ops_manager'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  )
);

-- Storage bucket for vendor invoice PDFs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-invoices', 'vendor-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path = {organization_id}/{partner_id}/{filename}
CREATE POLICY "Vendor upload own invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vendor-invoices'
  AND (storage.foldername(name))[2] = public.current_vendor_partner_id()::text
);

CREATE POLICY "Vendor read own invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vendor-invoices'
  AND (
    (storage.foldername(name))[2] = public.current_vendor_partner_id()::text
    OR (
      public.current_user_in_org(((storage.foldername(name))[1])::uuid)
      AND (
        has_role(auth.uid(),'admin'::app_role)
        OR has_role(auth.uid(),'super_admin'::app_role)
        OR has_role(auth.uid(),'org_admin'::app_role)
        OR has_role(auth.uid(),'ops_manager'::app_role)
        OR has_role(auth.uid(),'finance_manager'::app_role)
        OR has_role(auth.uid(),'operations'::app_role)
      )
    )
  )
);

CREATE POLICY "Org staff upload invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vendor-invoices'
  AND public.current_user_in_org(((storage.foldername(name))[1])::uuid)
  AND (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'org_admin'::app_role)
    OR has_role(auth.uid(),'ops_manager'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  )
);
