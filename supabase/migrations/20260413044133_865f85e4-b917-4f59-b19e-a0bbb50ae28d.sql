
-- Fix fuel_variance_reports INSERT policy
DROP POLICY "System can insert fuel variance" ON public.fuel_variance_reports;
CREATE POLICY "Admins can insert fuel variance" ON public.fuel_variance_reports FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Fix fuel_fraud_flags INSERT policy
DROP POLICY "System can insert fraud flags" ON public.fuel_fraud_flags;
CREATE POLICY "Admins can insert fraud flags" ON public.fuel_fraud_flags FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'finance_manager') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix fuel_risk_scores ALL policy
DROP POLICY "System can manage fuel risk scores" ON public.fuel_risk_scores;
CREATE POLICY "Admins can manage fuel risk scores" ON public.fuel_risk_scores FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);
CREATE POLICY "Admins can update fuel risk scores" ON public.fuel_risk_scores FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'org_admin')
  OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);
