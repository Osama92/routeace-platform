
-- ============ dept_budgets ============
CREATE TABLE IF NOT EXISTS public.dept_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_year INTEGER NOT NULL,
  budget_period TEXT NOT NULL CHECK (budget_period IN ('monthly','quarterly','annual')),
  period_label TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, budget_year, period_label, category)
);
ALTER TABLE public.dept_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_budgets" ON public.dept_budgets FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "finance_and_above_write_budgets" ON public.dept_budgets FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'finance_manager')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE TRIGGER trg_dept_budgets_updated_at BEFORE UPDATE ON public.dept_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_dept_budgets_org ON public.dept_budgets(organization_id, budget_year);

-- ============ delivery_exceptions ============
CREATE TABLE IF NOT EXISTS public.delivery_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL,
  dispatch_number TEXT,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'vehicle_breakdown','road_closure','accident','theft_or_loss',
    'recipient_absent','incorrect_address','weather','customs_hold',
    'driver_unavailable','overloading','other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  sla_impact_hours NUMERIC DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_exceptions" ON public.delivery_exceptions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "org_members_manage_exceptions" ON public.delivery_exceptions FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE TRIGGER trg_delivery_exceptions_updated_at BEFORE UPDATE ON public.delivery_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_del_exc_org ON public.delivery_exceptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_del_exc_dispatch ON public.delivery_exceptions(dispatch_id);

-- ============ inbound_receipts ============
CREATE TABLE IF NOT EXISTS public.inbound_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL DEFAULT ('GRN-' || UPPER(substring(gen_random_uuid()::text, 1, 8))),
  supplier_name TEXT NOT NULL,
  purchase_order_ref TEXT,
  warehouse_id UUID,
  warehouse_name TEXT,
  expected_date DATE,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected','partial','received','discrepancy','rejected')),
  total_items INTEGER DEFAULT 0,
  received_items INTEGER DEFAULT 0,
  discrepancy_notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inbound_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_inbound" ON public.inbound_receipts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ops_manage_inbound" ON public.inbound_receipts FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE TRIGGER trg_inbound_receipts_updated_at BEFORE UPDATE ON public.inbound_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_inbound_org ON public.inbound_receipts(organization_id, status);

-- ============ vendor_partners onboarding columns ============
DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN onboarding_status TEXT DEFAULT 'pending'
  CHECK (onboarding_status IN ('pending','under_review','approved','rejected','suspended'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN registration_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN insurance_expiry DATE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN compliance_score INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN approved_by UUID REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN approved_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.vendor_partners ADD COLUMN rejection_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_partners_org ON public.vendor_partners(organization_id, onboarding_status);
