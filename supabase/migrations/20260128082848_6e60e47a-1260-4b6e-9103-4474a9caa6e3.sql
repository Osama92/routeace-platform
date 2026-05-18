-- Fix permissive INSERT policies for audit/logging tables
-- These policies allow edge functions to insert logs but we make them more secure
-- by restricting to authenticated users or service role operations

-- api_request_logs: Used by edge functions for API logging
DROP POLICY IF EXISTS "Edge functions can insert API logs" ON public.api_request_logs;

-- Edge functions use service role key which bypasses RLS, so this policy 
-- is for authenticated admin users who might also log API requests
CREATE POLICY "Authorized API log insertion" 
ON public.api_request_logs 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- security_events: Used by edge functions for security event logging  
DROP POLICY IF EXISTS "Edge functions can insert security events" ON public.security_events;

-- Same pattern - admin users can insert, edge functions bypass RLS
CREATE POLICY "Authorized security event insertion" 
ON public.security_events 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- vendor_truck_actuals: Used by trigger for automatic capture
DROP POLICY IF EXISTS "System can insert actuals" ON public.vendor_truck_actuals;

-- Allow admin/operations to insert actuals, trigger will use SECURITY DEFINER
CREATE POLICY "Authorized vendor actuals insertion" 
ON public.vendor_truck_actuals 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role)
);