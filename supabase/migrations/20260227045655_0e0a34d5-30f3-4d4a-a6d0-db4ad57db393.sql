
-- Fix overly permissive RLS policies on stablecoin tables

DROP POLICY IF EXISTS "Authenticated users can view stablecoin transactions" ON public.stablecoin_transactions;
CREATE POLICY "Role-gated view stablecoin transactions" ON public.stablecoin_transactions
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can view business wallets" ON public.stablecoin_business_wallets;
CREATE POLICY "Role-gated view business wallets" ON public.stablecoin_business_wallets
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can view compliance log" ON public.stablecoin_compliance_log;
CREATE POLICY "Role-gated view compliance log" ON public.stablecoin_compliance_log
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can view conversion log" ON public.fiat_conversion_log;
CREATE POLICY "Role-gated view conversion log" ON public.fiat_conversion_log
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can manage fraud flags" ON public.fraud_flags;
CREATE POLICY "Admins can manage fraud flags" ON public.fraud_flags
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated insert delay predictions" ON public.approval_delay_predictions;
CREATE POLICY "Admin insert delay predictions" ON public.approval_delay_predictions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service can insert risk scores" ON public.approval_risk_scores;
CREATE POLICY "Admin insert risk scores" ON public.approval_risk_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Add ERP Chart of Accounts entries for crypto
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_group, normal_balance, description, is_system)
VALUES 
  ('1150', 'Digital Asset Wallet', 'asset', 'Current Assets', 'Dr', 'Stablecoin holdings in custodial wallets', true),
  ('1160', 'Stablecoin Receivable', 'asset', 'Current Assets', 'Dr', 'Pending stablecoin payments awaiting AML clearance', true),
  ('6150', 'Blockchain Gas Fees', 'expense', 'Operating Expenses', 'Dr', 'Network transaction fees for blockchain settlements', true),
  ('4250', 'FX Gain/Loss - Crypto', 'revenue', 'Other Income', 'Cr', 'FX gains/losses from stablecoin conversions', true)
ON CONFLICT DO NOTHING;

-- Fix search_path on functions
ALTER FUNCTION public.calculate_sla_deadline SET search_path = public;
ALTER FUNCTION public.calculate_commission SET search_path = public;
ALTER FUNCTION public.update_organization_timestamp SET search_path = public;
