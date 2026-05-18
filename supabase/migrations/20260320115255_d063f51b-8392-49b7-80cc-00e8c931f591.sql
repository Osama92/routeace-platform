
-- Finance Reconciliation Batches
CREATE TABLE public.reconciliation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_type TEXT NOT NULL DEFAULT 'daily',
  source_system TEXT NOT NULL,
  comparison_system TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  matched_value NUMERIC DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  unmatched_value NUMERIC DEFAULT 0,
  exception_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_id UUID,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Settlement Obligations
CREATE TABLE public.settlement_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_type TEXT NOT NULL,
  partner_id UUID REFERENCES public.partner_accounts(id),
  customer_tenant_id UUID REFERENCES public.partner_customers(id),
  source_invoice_id UUID,
  source_payment_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  reserve_amount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'accrued',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  batch_id TEXT,
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suspense Cases
CREATE TABLE public.suspense_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type TEXT NOT NULL,
  source_system TEXT,
  impacted_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  customer_id UUID,
  partner_id UUID,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  sla_due_date DATE,
  assigned_to UUID,
  root_cause TEXT,
  resolution_notes TEXT,
  resulting_ledger_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Finance Periods
CREATE TABLE public.finance_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  close_checklist JSONB DEFAULT '[]'::jsonb,
  unresolved_exceptions INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finance Anomaly Events
CREATE TABLE public.finance_anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  impacted_value NUMERIC DEFAULT 0,
  source_system TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  investigated_by UUID,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Finance Approval Requests
CREATE TABLE public.finance_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  evidence_notes TEXT,
  linked_entity_id TEXT,
  linked_entity_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspense_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_anomaly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Finance roles manage reconciliation_batches" ON public.reconciliation_batches
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance roles manage settlement_obligations" ON public.settlement_obligations
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance roles manage suspense_cases" ON public.suspense_cases
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance roles manage finance_periods" ON public.finance_periods
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance roles manage finance_anomaly_events" ON public.finance_anomaly_events
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance roles manage finance_approval_requests" ON public.finance_approval_requests
  FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Trigger
CREATE TRIGGER update_settlement_obligations_updated_at
  BEFORE UPDATE ON public.settlement_obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
