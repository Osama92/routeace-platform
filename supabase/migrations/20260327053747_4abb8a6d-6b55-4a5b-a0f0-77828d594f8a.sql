
-- Billing Plans
CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'subscription', -- subscription, per_drop, per_api_call, hybrid
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_per_drop NUMERIC DEFAULT NULL,
  price_per_api_call NUMERIC DEFAULT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  included_drops INTEGER DEFAULT 0,
  included_api_calls INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT NULL,
  max_vehicles INTEGER DEFAULT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing Accounts (per tenant)
CREATE TABLE public.billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_id UUID REFERENCES public.billing_plans(id),
  billing_currency TEXT NOT NULL DEFAULT 'NGN',
  billing_email TEXT,
  payment_gateway TEXT DEFAULT 'paystack', -- paystack, flutterwave, stripe
  auto_pay_enabled BOOLEAN DEFAULT false,
  wallet_balance NUMERIC NOT NULL DEFAULT 0,
  prepaid_mode BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage Events (metered billing)
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id UUID REFERENCES public.billing_accounts(id),
  event_type TEXT NOT NULL, -- drop, api_call, route_optimization, ai_credit
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  reference_id TEXT, -- dispatch_id, api_request_id, etc.
  reference_type TEXT, -- dispatch, api_request, route, ai_action
  currency TEXT NOT NULL DEFAULT 'NGN',
  billing_period TEXT, -- 2026-03
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing Invoices (generated monthly)
CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id UUID REFERENCES public.billing_accounts(id),
  invoice_number TEXT NOT NULL,
  billing_period TEXT NOT NULL, -- 2026-03
  subscription_amount NUMERIC NOT NULL DEFAULT 0,
  usage_amount NUMERIC NOT NULL DEFAULT 0,
  api_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending, paid, overdue, cancelled
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_gateway TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing Payments
CREATE TABLE public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_invoice_id UUID REFERENCES public.billing_invoices(id),
  billing_account_id UUID REFERENCES public.billing_accounts(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_method TEXT, -- card, bank_transfer, wallet, mobile_money
  payment_gateway TEXT, -- paystack, flutterwave, stripe
  gateway_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed, refunded
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revenue Snapshots (daily aggregation)
CREATE TABLE public.revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  mrr NUMERIC NOT NULL DEFAULT 0,
  usage_revenue NUMERIC NOT NULL DEFAULT 0,
  api_revenue NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  active_accounts INTEGER NOT NULL DEFAULT 0,
  arpu NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, currency)
);

-- Enable RLS
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: billing_plans readable by all authenticated
CREATE POLICY "Anyone can read active plans" ON public.billing_plans FOR SELECT TO authenticated USING (is_active = true);

-- billing_accounts: admin/finance/super_admin
CREATE POLICY "Admins manage billing accounts" ON public.billing_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- usage_events: admin/finance
CREATE POLICY "Admins view usage events" ON public.usage_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "System inserts usage events" ON public.usage_events FOR INSERT TO authenticated WITH CHECK (true);

-- billing_invoices: admin/finance
CREATE POLICY "Admins manage billing invoices" ON public.billing_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- billing_payments: admin/finance
CREATE POLICY "Admins manage billing payments" ON public.billing_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- revenue_snapshots: admin/finance
CREATE POLICY "Admins view revenue snapshots" ON public.revenue_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- Seed default plans
INSERT INTO public.billing_plans (plan_code, plan_name, pricing_model, base_price, price_per_drop, currency, included_drops, billing_cycle) VALUES
  ('free_ng', 'Free (Nigeria)', 'per_drop', 0, 50, 'NGN', 100, 'monthly'),
  ('starter_ng', 'Starter (Nigeria)', 'hybrid', 15000, 50, 'NGN', 500, 'monthly'),
  ('growth_ng', 'Growth (Nigeria)', 'hybrid', 25000, 40, 'NGN', 2000, 'monthly'),
  ('enterprise_ng', 'Enterprise (Nigeria)', 'subscription', 60000, 0, 'NGN', 0, 'monthly'),
  ('free_global', 'Free (Global)', 'per_drop', 0, 0.05, 'USD', 100, 'monthly'),
  ('growth_global', 'Growth (Global)', 'per_drop', 0, 0.04, 'USD', 0, 'monthly'),
  ('scale_global', 'Scale (Global)', 'per_drop', 0, 0.035, 'USD', 0, 'monthly'),
  ('enterprise_global', 'Enterprise (Global)', 'hybrid', 0, 0, 'USD', 0, 'monthly');

-- Insert API-specific plans  
INSERT INTO public.billing_plans (plan_code, plan_name, pricing_model, base_price, price_per_api_call, currency, included_api_calls, billing_cycle) VALUES
  ('api_starter', 'API Starter', 'per_api_call', 0, 0.02, 'USD', 1000, 'monthly'),
  ('api_growth', 'API Growth', 'per_api_call', 49, 0.01, 'USD', 10000, 'monthly'),
  ('api_enterprise', 'API Enterprise', 'per_api_call', 199, 0.005, 'USD', 100000, 'monthly');
