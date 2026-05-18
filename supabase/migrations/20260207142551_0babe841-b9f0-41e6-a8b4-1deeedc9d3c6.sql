-- Create internal observability tables for product/tech intelligence
CREATE TABLE IF NOT EXISTS public.platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value DECIMAL NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  tenant_hash TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;

-- Only internal_team can view platform analytics
CREATE POLICY "Internal team can view all platform analytics" 
ON public.platform_analytics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'internal_team'));

-- Create role change requests table for approval workflow
CREATE TABLE IF NOT EXISTS public.role_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  previous_role TEXT,
  requested_role TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view role change requests
CREATE POLICY "Admins can view role change requests" 
ON public.role_change_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'org_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  requested_by = auth.uid() OR
  user_id = auth.uid()
);

-- Users can create role change requests for themselves
CREATE POLICY "Users can create role change requests" 
ON public.role_change_requests
FOR INSERT
TO authenticated
WITH CHECK (requested_by = auth.uid());

-- Super Admin and Org Admin can update role requests
CREATE POLICY "Super Admin can update role requests" 
ON public.role_change_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'org_admin')
);

-- Create user access log if not exists (for audit trail)
CREATE TABLE IF NOT EXISTS public.user_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  previous_role TEXT,
  new_role TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_access_log ENABLE ROW LEVEL SECURITY;

-- Admins can view access logs
CREATE POLICY "Admins can view access logs" 
ON public.user_access_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'org_admin') OR
  public.has_role(auth.uid(), 'admin')
);

-- Anyone authenticated can insert access logs (for logging purposes)
CREATE POLICY "Authenticated users can insert access logs" 
ON public.user_access_log
FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());

-- Function to check if user is internal team
CREATE OR REPLACE FUNCTION public.is_internal_team(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'internal_team'
  )
$$;