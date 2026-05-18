
-- Cash Transactions: unified source of truth for all financial movements
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL, -- 'inflow' or 'outflow'
  category TEXT NOT NULL, -- 'invoice_payment', 'expense', 'loan_received', 'loan_repayment', 'factoring', 'refund', 'other'
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  reference_type TEXT, -- 'invoice', 'expense', 'loan', 'ar_payment', etc.
  reference_id UUID,
  customer_id UUID REFERENCES public.customers(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily cash balance snapshots
CREATE TABLE public.cash_balance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  total_inflow NUMERIC NOT NULL DEFAULT 0,
  total_outflow NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash flow projections (rolling forecast)
CREATE TABLE public.cash_flow_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_date DATE NOT NULL,
  projected_inflow NUMERIC NOT NULL DEFAULT 0,
  projected_outflow NUMERIC NOT NULL DEFAULT 0,
  net_flow NUMERIC NOT NULL DEFAULT 0,
  cumulative_balance NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.8,
  source TEXT, -- 'ar_expected', 'ap_due', 'recurring_expense', 'loan_repayment'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client financial profiles
CREATE TABLE public.client_financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  payment_term_days INTEGER DEFAULT 30,
  avg_monthly_revenue NUMERIC DEFAULT 0,
  avg_margin_percent NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 50,
  payment_behavior TEXT DEFAULT 'normal', -- 'fast', 'normal', 'slow', 'delinquent'
  total_lifetime_revenue NUMERIC DEFAULT 0,
  total_outstanding NUMERIC DEFAULT 0,
  last_payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factoring transactions
CREATE TABLE public.factoring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  invoice_amount NUMERIC NOT NULL,
  advance_rate NUMERIC NOT NULL DEFAULT 0.85,
  fee_rate NUMERIC NOT NULL DEFAULT 0.025,
  net_proceeds NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'funded', 'settled'
  funded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_balance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factoring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies: finance roles + admin access
CREATE POLICY "Finance and admin can manage cash_transactions" ON public.cash_transactions
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance and admin can manage cash_balance_daily" ON public.cash_balance_daily
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance and admin can manage cash_flow_projections" ON public.cash_flow_projections
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance and admin can manage client_financial_profiles" ON public.client_financial_profiles
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance and admin can manage factoring_transactions" ON public.factoring_transactions
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- Trigger for updated_at on client_financial_profiles
CREATE TRIGGER update_client_financial_profiles_updated_at
  BEFORE UPDATE ON public.client_financial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
