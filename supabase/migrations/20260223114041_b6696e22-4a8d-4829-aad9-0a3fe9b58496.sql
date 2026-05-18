
-- Chart of Accounts with parent-child hierarchy
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','cogs','expense','other_income','other_expense')),
  parent_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  account_group VARCHAR(100),
  normal_balance VARCHAR(2) NOT NULL DEFAULT 'Dr' CHECK (normal_balance IN ('Dr','Cr')),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  currency_code VARCHAR(10) DEFAULT 'NGN',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CoA" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage CoA" ON public.chart_of_accounts FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Tax Rates table
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(10) NOT NULL,
  tax_type VARCHAR(20) NOT NULL CHECK (tax_type IN ('VAT','WHT','CIT','GST','PAYE')),
  tax_name VARCHAR(100) NOT NULL,
  rate_percentage NUMERIC(6,3) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view tax rates" ON public.tax_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage tax rates" ON public.tax_rates FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Tax Ledger for VAT netting, WHT tracking
CREATE TABLE public.tax_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('input','output')),
  related_type VARCHAR(50),
  related_id UUID,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate_applied NUMERIC(6,3),
  period VARCHAR(20),
  vendor_name VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','filed','paid','credit')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tax_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tax ledger" ON public.tax_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage tax ledger" ON public.tax_ledger FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Journal Entries (proper double-entry)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(30),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  account_code VARCHAR(20),
  account_name VARCHAR(255),
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  currency_code VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view journal entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage journal entries" ON public.journal_entries FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Cashflow forecasts
CREATE TABLE public.cashflow_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operating','investing','financing')),
  subcategory VARCHAR(100),
  projected_inflow NUMERIC(15,2) DEFAULT 0,
  projected_outflow NUMERIC(15,2) DEFAULT 0,
  actual_inflow NUMERIC(15,2) DEFAULT 0,
  actual_outflow NUMERIC(15,2) DEFAULT 0,
  confidence_score INTEGER DEFAULT 50,
  ai_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cashflow_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view forecasts" ON public.cashflow_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage forecasts" ON public.cashflow_forecasts FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager')
);
