-- Fix remaining "always true" INSERT policies by restricting to service role
-- These tables need edge function inserts, so we restrict by checking it's via service role

-- Fix api_request_logs INSERT policy
DROP POLICY IF EXISTS "Service can insert API logs" ON public.api_request_logs;

CREATE POLICY "Edge functions can insert API logs" 
ON public.api_request_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Fix security_events INSERT policy
DROP POLICY IF EXISTS "Service can insert security events" ON public.security_events;

CREATE POLICY "Edge functions can insert security events" 
ON public.security_events 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Fix rate_limit_buckets policies
DROP POLICY IF EXISTS "Service manages rate limits" ON public.rate_limit_buckets;

CREATE POLICY "Edge functions manage rate limits" 
ON public.rate_limit_buckets 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);