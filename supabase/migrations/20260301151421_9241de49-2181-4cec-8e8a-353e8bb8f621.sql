
-- KPI Period Snapshots for historical comparison
CREATE TABLE IF NOT EXISTS public.kpi_period_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  kpi_name TEXT NOT NULL,
  kpi_category TEXT NOT NULL DEFAULT 'financial',
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  previous_period_value NUMERIC DEFAULT 0,
  variance_absolute NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kpi_snapshots_tenant ON public.kpi_period_snapshots(tenant_id);
CREATE INDEX idx_kpi_snapshots_name_period ON public.kpi_period_snapshots(kpi_name, period_type, period_start);

ALTER TABLE public.kpi_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view KPI snapshots"
  ON public.kpi_period_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage KPI snapshots"
  ON public.kpi_period_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Revenue Contracts (IFRS 15)
CREATE TABLE IF NOT EXISTS public.revenue_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contract_type TEXT NOT NULL DEFAULT 'freight',
  total_contract_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  start_date DATE NOT NULL,
  end_date DATE,
  performance_obligation_type TEXT DEFAULT 'point_in_time',
  revenue_recognition_method TEXT DEFAULT 'completion',
  country TEXT DEFAULT 'NG',
  tax_jurisdiction TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view revenue contracts"
  ON public.revenue_contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage revenue contracts"
  ON public.revenue_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Performance Obligations
CREATE TABLE IF NOT EXISTS public.performance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.revenue_contracts(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  standalone_selling_price NUMERIC DEFAULT 0,
  allocation_percentage NUMERIC DEFAULT 100,
  fulfillment_status TEXT DEFAULT 'pending',
  completion_percentage NUMERIC DEFAULT 0,
  recognized_revenue NUMERIC DEFAULT 0,
  deferred_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view obligations"
  ON public.performance_obligations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage obligations"
  ON public.performance_obligations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Deferred Revenue Ledger
CREATE TABLE IF NOT EXISTS public.deferred_revenue_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contract_id UUID REFERENCES public.revenue_contracts(id) ON DELETE SET NULL,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  revenue_recognized NUMERIC NOT NULL DEFAULT 0,
  remaining_deferred NUMERIC NOT NULL DEFAULT 0,
  recognition_schedule JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deferred_revenue_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view deferred revenue"
  ON public.deferred_revenue_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage deferred revenue"
  ON public.deferred_revenue_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- Legal Entities (Multi-Entity Consolidation)
CREATE TABLE IF NOT EXISTS public.legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_id UUID REFERENCES public.legal_entities(id) ON DELETE SET NULL,
  entity_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'NG',
  base_currency TEXT NOT NULL DEFAULT 'NGN',
  functional_currency TEXT NOT NULL DEFAULT 'NGN',
  consolidation_method TEXT DEFAULT 'full',
  ownership_percentage NUMERIC DEFAULT 100,
  reporting_standard TEXT DEFAULT 'IFRS',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view entities"
  ON public.legal_entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage entities"
  ON public.legal_entities FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Intercompany Transactions
CREATE TABLE IF NOT EXISTS public.intercompany_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_entity_id UUID REFERENCES public.legal_entities(id),
  buyer_entity_id UUID REFERENCES public.legal_entities(id),
  transaction_type TEXT NOT NULL DEFAULT 'service',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  elimination_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intercompany_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view intercompany"
  ON public.intercompany_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage intercompany"
  ON public.intercompany_transactions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_finance_manager(auth.uid()));

-- VAT Rules (Global)
CREATE TABLE IF NOT EXISTS public.vat_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  default_rate NUMERIC NOT NULL DEFAULT 0,
  reverse_charge_flag BOOLEAN DEFAULT false,
  zero_rated_flag BOOLEAN DEFAULT false,
  reporting_frequency TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vat_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vat rules"
  ON public.vat_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage vat rules"
  ON public.vat_rules FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));
