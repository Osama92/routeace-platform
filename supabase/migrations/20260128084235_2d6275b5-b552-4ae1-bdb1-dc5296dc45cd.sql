-- FIX SECURITY WARNINGS FROM STATE MACHINE MIGRATION

-- 1. Fix SECURITY DEFINER view - recreate as regular view
DROP VIEW IF EXISTS public.dispatch_dead_states;

CREATE VIEW public.dispatch_dead_states 
WITH (security_invoker = true)
AS
SELECT 
  d.id,
  d.dispatch_number,
  d.status,
  d.created_at,
  d.updated_at,
  EXTRACT(EPOCH FROM (now() - d.updated_at)) / 3600 AS hours_in_state,
  st.sla_hours,
  CASE 
    WHEN st.sla_hours IS NOT NULL AND EXTRACT(EPOCH FROM (now() - d.updated_at)) / 3600 > st.sla_hours THEN TRUE
    ELSE FALSE
  END AS is_stale
FROM dispatches d
LEFT JOIN dispatch_state_transitions st 
  ON st.from_state::TEXT = d.status
WHERE d.status NOT IN ('delivered', 'closed', 'invoiced', 'cancelled')
  AND d.updated_at < now() - interval '24 hours';

GRANT SELECT ON public.dispatch_dead_states TO authenticated;

-- 2. Fix RLS Policy Always True on dispatch_state_history INSERT
DROP POLICY IF EXISTS "System can insert state history" ON public.dispatch_state_history;

CREATE POLICY "Authenticated users can insert state history"
ON public.dispatch_state_history FOR INSERT TO authenticated
WITH CHECK (
  -- Only allow inserts if user has appropriate role or is the one making the change
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'dispatcher'::app_role) OR
  has_role(auth.uid(), 'driver'::app_role) OR
  changed_by = auth.uid()
);

-- 3. Fix RLS Policy Always True on financial_audit_log INSERT
DROP POLICY IF EXISTS "System inserts financial audit" ON public.financial_audit_log;

CREATE POLICY "Role-restricted financial audit insert"
ON public.financial_audit_log FOR INSERT TO authenticated
WITH CHECK (
  -- Only roles that can modify financial records can insert audit logs
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  changed_by = auth.uid()
);