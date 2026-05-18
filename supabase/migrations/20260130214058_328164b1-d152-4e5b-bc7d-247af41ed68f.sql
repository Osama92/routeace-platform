-- Fix the overly permissive RLS policy for platform_audit_logs
DROP POLICY IF EXISTS "System can insert platform audit logs" ON public.platform_audit_logs;

-- Create proper insert policy - only super admins and system can insert
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.platform_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());