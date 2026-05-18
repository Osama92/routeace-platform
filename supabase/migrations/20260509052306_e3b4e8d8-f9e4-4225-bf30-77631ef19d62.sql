
-- 1. Pin search_path on mutable functions
ALTER FUNCTION public.block_kpi_audit_mutation() SET search_path = public;
ALTER FUNCTION public.block_leave_audit_mutation() SET search_path = public;
ALTER FUNCTION public.block_payroll_finding_edit() SET search_path = public;
ALTER FUNCTION public.block_payslip_audit_mutation() SET search_path = public;
ALTER FUNCTION public.block_payslip_mutation() SET search_path = public;
ALTER FUNCTION public.block_workforce_audit_mutation() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.slugify(text) SET search_path = public;

-- 2. Replace always-true INSERT policies with authenticated-only checks
DROP POLICY IF EXISTS "System inserts alerts" ON public.breakdown_alerts;
CREATE POLICY "Authenticated inserts breakdown_alerts"
  ON public.breakdown_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System inserts kpi_audit_log" ON public.kpi_audit_log;
CREATE POLICY "Authenticated inserts kpi_audit_log"
  ON public.kpi_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
