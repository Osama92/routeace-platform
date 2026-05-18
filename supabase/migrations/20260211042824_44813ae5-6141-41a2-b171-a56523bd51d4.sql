
-- Billing ledger for tracking tenant billing (drops, monthly fees, reseller splits)
CREATE TABLE public.tenant_billing_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  reseller_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  billing_period TEXT NOT NULL, -- e.g. '2026-02'
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_type IN ('monthly', 'per_drop', 'mixed')),
  drops INTEGER NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  drop_fee_rate NUMERIC(8,2) NOT NULL DEFAULT 50, -- ₦50 default
  drop_fee_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  routeace_cut_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  routeace_cut_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reseller_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_tenant_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 7.5,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_with_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'overdue')),
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_billing_ledger ENABLE ROW LEVEL SECURITY;

-- Super admins and org owners can see their own billing
CREATE POLICY "Users can view own org billing"
  ON public.tenant_billing_ledger FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR
    reseller_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- Only super admins can insert/update billing records
CREATE POLICY "Super admins manage billing"
  ON public.tenant_billing_ledger FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Add business_type to organizations if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='business_type') THEN
    ALTER TABLE public.organizations ADD COLUMN business_type TEXT DEFAULT 'mixed' CHECK (business_type IN ('heavy_truck', 'bikes_vans', 'mixed'));
  END IF;
END $$;

-- Add reseller fields to organizations  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='max_reseller_licenses') THEN
    ALTER TABLE public.organizations ADD COLUMN max_reseller_licenses INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='reseller_lock_until') THEN
    ALTER TABLE public.organizations ADD COLUMN reseller_lock_until TIMESTAMPTZ;
  END IF;
END $$;
