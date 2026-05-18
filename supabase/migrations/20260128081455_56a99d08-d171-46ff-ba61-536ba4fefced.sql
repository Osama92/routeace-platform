-- ===========================================
-- ROUTEACE SECURITY HARDENING MIGRATION (v2)
-- Fixes public data exposure on sensitive tables
-- ===========================================

-- 1. PARTNERS TABLE - Contains bank details, NIN, TIN
DROP POLICY IF EXISTS "Anyone can view partners" ON public.partners;
DROP POLICY IF EXISTS "Public can view partners" ON public.partners;

CREATE POLICY "Role-restricted partner access" 
ON public.partners 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'dispatcher'::app_role)
);

-- 2. DRIVERS TABLE - Contains salary, tax ID, license
DROP POLICY IF EXISTS "Anyone can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Public can view drivers" ON public.drivers;

CREATE POLICY "Role-restricted driver access" 
ON public.drivers 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'dispatcher'::app_role) OR
  (user_id = auth.uid())
);

-- 3. STAFF TABLE - Contains HR data, salary, bank details (no user_id, use email match)
DROP POLICY IF EXISTS "Anyone can view staff" ON public.staff;
DROP POLICY IF EXISTS "Public can view staff" ON public.staff;

CREATE POLICY "Role-restricted staff access" 
ON public.staff 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 4. DRIVER_SALARIES TABLE - Contains payroll data
DROP POLICY IF EXISTS "Anyone can view driver salaries" ON public.driver_salaries;
DROP POLICY IF EXISTS "Public can view driver_salaries" ON public.driver_salaries;

CREATE POLICY "Role-restricted driver salary access" 
ON public.driver_salaries 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = driver_salaries.driver_id 
    AND d.user_id = auth.uid()
  )
);

-- 5. STAFF_SALARIES TABLE - Contains employee payroll (use email match via staff table)
DROP POLICY IF EXISTS "Anyone can view staff salaries" ON public.staff_salaries;
DROP POLICY IF EXISTS "Public can view staff_salaries" ON public.staff_salaries;

CREATE POLICY "Role-restricted staff salary access" 
ON public.staff_salaries 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_salaries.staff_id 
    AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 6. INVOICES TABLE - Contains financial data
DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public can view invoices" ON public.invoices;

CREATE POLICY "Role-restricted invoice access" 
ON public.invoices 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'support'::app_role)
);

-- 7. EXPENSES TABLE - Contains cost data
DROP POLICY IF EXISTS "Anyone can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public can view expenses" ON public.expenses;

CREATE POLICY "Role-restricted expense access" 
ON public.expenses 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role)
);

-- 8. VEHICLES TABLE - Contains fleet details
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public can view vehicles" ON public.vehicles;

CREATE POLICY "Role-restricted vehicle access" 
ON public.vehicles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'dispatcher'::app_role)
);

-- 9. VENDOR_PAYABLES TABLE - Contains payment obligations
DROP POLICY IF EXISTS "Anyone can view vendor payables" ON public.vendor_payables;
DROP POLICY IF EXISTS "Public can view vendor_payables" ON public.vendor_payables;

CREATE POLICY "Role-restricted vendor payables access" 
ON public.vendor_payables 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role)
);

-- 10. HISTORICAL_INVOICE_DATA TABLE - Contains business intelligence
DROP POLICY IF EXISTS "Anyone can view historical data" ON public.historical_invoice_data;
DROP POLICY IF EXISTS "Public can view historical_invoice_data" ON public.historical_invoice_data;

CREATE POLICY "Role-restricted historical data access" 
ON public.historical_invoice_data 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role)
);

-- 11. DISPATCHES TABLE - Restrict to authenticated users with roles
DROP POLICY IF EXISTS "Authenticated users can view dispatches" ON public.dispatches;

CREATE POLICY "Role-restricted dispatch view" 
ON public.dispatches 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'dispatcher'::app_role) OR
  has_role(auth.uid(), 'support'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = dispatches.driver_id 
    AND d.user_id = auth.uid()
  )
);

-- 12. CUSTOMERS TABLE - Require authentication with role check
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

CREATE POLICY "Role-restricted customer access" 
ON public.customers 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'dispatcher'::app_role) OR
  has_role(auth.uid(), 'support'::app_role)
);

-- ===========================================
-- PARTNER API INFRASTRUCTURE
-- ===========================================

-- API Keys table for external partner access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API keys" 
ON public.api_keys 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- API Request logs for auditing
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_ip TEXT,
  user_agent TEXT,
  request_body_size INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API logs" 
ON public.api_request_logs 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert API logs" 
ON public.api_request_logs 
FOR INSERT 
WITH CHECK (true);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  bucket_window TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  UNIQUE(api_key_id, bucket_window)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service manages rate limits" 
ON public.rate_limit_buckets 
FOR ALL 
WITH CHECK (true);

-- Security event logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_partner_id ON public.api_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_key_window ON public.rate_limit_buckets(api_key_id, bucket_window);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);