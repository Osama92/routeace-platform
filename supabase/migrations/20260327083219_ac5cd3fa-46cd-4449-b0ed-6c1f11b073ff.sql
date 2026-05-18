
-- VAT transaction ledger
CREATE TABLE public.vat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('output', 'input')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('invoice', 'expense', 'manual')),
  reference_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  country_code TEXT NOT NULL DEFAULT 'NG',
  currency_code TEXT DEFAULT 'NGN',
  description TEXT,
  period_month INTEGER,
  period_year INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax filing reports
CREATE TABLE public.tax_filing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'NG',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_output_vat NUMERIC DEFAULT 0,
  total_input_vat NUMERIC DEFAULT 0,
  net_vat_payable NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid', 'overdue')),
  filing_deadline DATE,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Operational KPI snapshots
CREATE TABLE public.operational_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  total_deliveries INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  otd_rate NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  previous_period_revenue NUMERIC DEFAULT 0,
  mom_growth_pct NUMERIC DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  total_dispatches INTEGER DEFAULT 0,
  avg_cost_per_km NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.vat_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_filing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Auth read vat_transactions" ON public.vat_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read tax_filing_reports" ON public.tax_filing_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read kpi_snapshots" ON public.operational_kpi_snapshots FOR SELECT TO authenticated USING (true);

-- Write policies
CREATE POLICY "Admin write vat_transactions" ON public.vat_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Admin write tax_filing_reports" ON public.tax_filing_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Admin write kpi_snapshots" ON public.operational_kpi_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- Indexes
CREATE INDEX idx_vat_tx_country ON public.vat_transactions(country_code);
CREATE INDEX idx_vat_tx_period ON public.vat_transactions(period_year, period_month);
CREATE INDEX idx_vat_tx_type ON public.vat_transactions(transaction_type);
CREATE INDEX idx_tax_filing_country ON public.tax_filing_reports(country_code, period_start);
CREATE INDEX idx_kpi_snap_date ON public.operational_kpi_snapshots(snapshot_date, period_type);
