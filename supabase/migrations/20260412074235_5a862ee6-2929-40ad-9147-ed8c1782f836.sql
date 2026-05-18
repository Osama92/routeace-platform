
-- ============================================================
-- SECURITY HARDENING: Fix critical RLS vulnerabilities
-- ============================================================

-- 1. BILLS: Drop permissive policies, add role-based
DROP POLICY IF EXISTS "Authenticated users can manage bills" ON public.bills;
DROP POLICY IF EXISTS "Auth users manage bills" ON public.bills;
DROP POLICY IF EXISTS "Anyone can manage bills" ON public.bills;

CREATE POLICY "Finance/admin can read bills" ON public.bills
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Finance/admin can insert bills" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance/admin can update bills" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admin can delete bills" ON public.bills
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- 2. BILL_ITEMS: Drop permissive policies, add role-based
DROP POLICY IF EXISTS "Authenticated users can manage bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Auth users manage bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "Anyone can manage bill_items" ON public.bill_items;

CREATE POLICY "Finance/admin can read bill_items" ON public.bill_items
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Finance/admin can insert bill_items" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance/admin can update bill_items" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admin can delete bill_items" ON public.bill_items
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- 3. PERIOD_CLOSINGS: Restrict to finance/admin
DROP POLICY IF EXISTS "Authenticated users can manage period closings" ON public.period_closings;
DROP POLICY IF EXISTS "Auth users manage period_closings" ON public.period_closings;

CREATE POLICY "Finance/admin can manage period_closings" ON public.period_closings
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 4. FINANCE_RECONCILIATION: Restrict to finance/admin
DROP POLICY IF EXISTS "Authenticated users can manage reconciliation" ON public.finance_reconciliation;
DROP POLICY IF EXISTS "Auth users manage finance_reconciliation" ON public.finance_reconciliation;

CREATE POLICY "Finance/admin can manage reconciliation" ON public.finance_reconciliation
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 5. SALES_ACCOUNTS: Restrict write to admin roles
DROP POLICY IF EXISTS "Auth users manage sales_accounts" ON public.sales_accounts;

CREATE POLICY "Auth users read sales_accounts" ON public.sales_accounts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/sales can write sales_accounts" ON public.sales_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Admin/sales can update sales_accounts" ON public.sales_accounts
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Admin can delete sales_accounts" ON public.sales_accounts
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- 6. DIESEL_RATE_CONFIG: Remove public read, restrict to auth roles
DROP POLICY IF EXISTS "Anyone can read diesel rates" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "Public can read diesel rates" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "Diesel rates are publicly readable" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "Auth users can create diesel rates" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "Auth users can update diesel rates" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "Auth users can delete diesel rates" ON public.diesel_rate_config;

CREATE POLICY "Auth users read diesel_rate_config" ON public.diesel_rate_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Finance/admin write diesel_rate_config" ON public.diesel_rate_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance/admin update diesel_rate_config" ON public.diesel_rate_config
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admin delete diesel_rate_config" ON public.diesel_rate_config
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- 7. TRIP_RATE_CONFIG: Remove public read
DROP POLICY IF EXISTS "Anyone can read trip rates" ON public.trip_rate_config;
DROP POLICY IF EXISTS "Public can read trip rates" ON public.trip_rate_config;
DROP POLICY IF EXISTS "Auth users can manage trip rates" ON public.trip_rate_config;
DROP POLICY IF EXISTS "Auth users can create trip rates" ON public.trip_rate_config;
DROP POLICY IF EXISTS "Auth users can update trip rates" ON public.trip_rate_config;
DROP POLICY IF EXISTS "Auth users can delete trip rates" ON public.trip_rate_config;

CREATE POLICY "Auth users read trip_rate_config" ON public.trip_rate_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Finance/admin write trip_rate_config" ON public.trip_rate_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance/admin update trip_rate_config" ON public.trip_rate_config
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admin delete trip_rate_config" ON public.trip_rate_config
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- 8. TRIP_PROFITABILITY: Restrict to finance/admin/ops
DROP POLICY IF EXISTS "Authenticated users can manage trip profitability" ON public.trip_profitability;
DROP POLICY IF EXISTS "Auth users manage trip_profitability" ON public.trip_profitability;

CREATE POLICY "Finance/admin/ops read trip_profitability" ON public.trip_profitability
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Finance/admin write trip_profitability" ON public.trip_profitability
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Finance/admin update trip_profitability" ON public.trip_profitability
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 9. AUTONOMOUS_DECISIONS: Restrict to admin/ops
DROP POLICY IF EXISTS "Authenticated users can manage autonomous decisions" ON public.autonomous_decisions;
DROP POLICY IF EXISTS "Auth users manage autonomous_decisions" ON public.autonomous_decisions;

CREATE POLICY "Admin/ops read autonomous_decisions" ON public.autonomous_decisions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Admin write autonomous_decisions" ON public.autonomous_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin update autonomous_decisions" ON public.autonomous_decisions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

-- 10. EDIT_REQUESTS: Restrict read to admin roles
DROP POLICY IF EXISTS "Auth users can read edit requests" ON public.edit_requests;
DROP POLICY IF EXISTS "Authenticated users can manage edit requests" ON public.edit_requests;

CREATE POLICY "Admin/org_admin read edit_requests" ON public.edit_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    auth.uid() = requested_by
  );

CREATE POLICY "Auth users create edit_requests" ON public.edit_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admin update edit_requests" ON public.edit_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin')
  );

-- 11. APPROVALS: Restrict to relevant roles
DROP POLICY IF EXISTS "Authenticated users can view approvals" ON public.approvals;
DROP POLICY IF EXISTS "Auth users manage approvals" ON public.approvals;

CREATE POLICY "Relevant roles read approvals" ON public.approvals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager') OR
    auth.uid() = requested_by
  );

CREATE POLICY "Auth users create approvals" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin/finance update approvals" ON public.approvals
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 12. USER_PRESENCE: Users see only their own record
DROP POLICY IF EXISTS "Authenticated users can manage user presence" ON public.user_presence;
DROP POLICY IF EXISTS "Auth users manage user_presence" ON public.user_presence;

CREATE POLICY "Users read own presence" ON public.user_presence
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users manage own presence" ON public.user_presence
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own presence" ON public.user_presence
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- NEW TABLE: Decision Simulations for the Simulation Engine
-- ============================================================
CREATE TABLE IF NOT EXISTS public.decision_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  simulation_type TEXT NOT NULL, -- fleet, finance, risk
  scenario_name TEXT NOT NULL,
  input_params JSONB NOT NULL DEFAULT '{}',
  results JSONB DEFAULT NULL,
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  recommendation TEXT DEFAULT NULL,
  profit_impact NUMERIC DEFAULT 0,
  cash_impact NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, completed, executed
  executed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own simulations" ON public.decision_simulations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users create simulations" ON public.decision_simulations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own simulations" ON public.decision_simulations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_decision_simulations_updated_at
  BEFORE UPDATE ON public.decision_simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
