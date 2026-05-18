-- Create super_admin_settings table for platform configuration
CREATE TABLE public.super_admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create ip_allowlist table for super admin security
CREATE TABLE public.ip_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ip_address INET NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, ip_address)
);

-- Create mfa_requirements table
CREATE TABLE public.mfa_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_method TEXT CHECK (mfa_method IN ('totp', 'hardware_token', 'sms')),
    hardware_token_id TEXT,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform_audit_logs for super admin actions
CREATE TABLE public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    performed_by UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create organization_subscriptions for billing management
CREATE TABLE public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.partner_tiers(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'past_due')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    monthly_amount NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT,
    last_payment_at TIMESTAMP WITH TIME ZONE,
    next_billing_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.super_admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create function to check IP allowlist for super admins
CREATE OR REPLACE FUNCTION public.check_super_admin_ip(_user_id uuid, _ip_address inet)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN NOT public.is_super_admin(_user_id) THEN true
    WHEN NOT EXISTS (SELECT 1 FROM public.ip_allowlist WHERE user_id = _user_id AND is_active = true) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.ip_allowlist 
      WHERE user_id = _user_id 
        AND ip_address = _ip_address 
        AND is_active = true
    )
  END
$$;

-- RLS Policies for super_admin_settings
CREATE POLICY "Super admins can manage platform settings"
ON public.super_admin_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS Policies for ip_allowlist
CREATE POLICY "Super admins can manage IP allowlist"
ON public.ip_allowlist
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS Policies for mfa_requirements
CREATE POLICY "Users can view own MFA settings"
ON public.mfa_requirements
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage MFA requirements"
ON public.mfa_requirements
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update MFA requirements"
ON public.mfa_requirements
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete MFA requirements"
ON public.mfa_requirements
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for platform_audit_logs
CREATE POLICY "Super admins can view platform audit logs"
ON public.platform_audit_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "System can insert platform audit logs"
ON public.platform_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for organization_subscriptions
CREATE POLICY "Super admins can view subscriptions"
ON public.organization_subscriptions
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage subscriptions"
ON public.organization_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update subscriptions"
ON public.organization_subscriptions
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_ip_allowlist_user ON public.ip_allowlist(user_id);
CREATE INDEX idx_platform_audit_logs_action ON public.platform_audit_logs(action, created_at DESC);
CREATE INDEX idx_organization_subscriptions_partner ON public.organization_subscriptions(partner_id);
CREATE INDEX idx_organization_subscriptions_status ON public.organization_subscriptions(status);