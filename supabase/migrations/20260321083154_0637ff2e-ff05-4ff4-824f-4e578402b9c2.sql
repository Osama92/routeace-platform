
-- Fix overly permissive INSERT on governance_audit_log and ai_decision_log
DROP POLICY IF EXISTS "System inserts governance_audit_log" ON public.governance_audit_log;
CREATE POLICY "Authenticated inserts governance_audit_log" ON public.governance_audit_log
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System inserts ai_decision_log" ON public.ai_decision_log;
CREATE POLICY "Authenticated inserts ai_decision_log" ON public.ai_decision_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
