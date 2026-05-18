-- Role permissions matrix table
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_key TEXT NOT NULL,
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role, permission_key)
);

-- Payout approval workflow table
CREATE TABLE public.payout_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_type TEXT NOT NULL CHECK (payout_type IN ('driver_salary', 'vendor_payment', 'expense', 'bonus')),
    reference_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'pending_finance' CHECK (status IN ('pending_finance', 'pending_org_admin', 'approved', 'rejected')),
    finance_approved_by UUID REFERENCES auth.users(id),
    finance_approved_at TIMESTAMP WITH TIME ZONE,
    finance_notes TEXT,
    org_admin_approved_by UUID REFERENCES auth.users(id),
    org_admin_approved_at TIMESTAMP WITH TIME ZONE,
    org_admin_notes TEXT,
    rejected_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Device binding for drivers
CREATE TABLE public.driver_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('android', 'ios', 'web')),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_location_lat NUMERIC(10,7),
    last_location_lng NUMERIC(10,7),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(driver_id, device_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_devices ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'org_admin'
  )
$$;

-- Helper function to check if user is finance manager
CREATE OR REPLACE FUNCTION public.is_finance_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'finance_manager'
  )
$$;

-- Helper function to check if user is ops manager
CREATE OR REPLACE FUNCTION public.is_ops_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'ops_manager'
  )
$$;

-- RLS Policies
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Finance managers can view payout approvals"
ON public.payout_approvals FOR SELECT TO authenticated
USING (public.is_finance_manager(auth.uid()) OR public.is_org_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance managers can create payout approvals"
ON public.payout_approvals FOR INSERT TO authenticated
WITH CHECK (public.is_finance_manager(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance and org admins can update payout approvals"
ON public.payout_approvals FOR UPDATE TO authenticated
USING (public.is_finance_manager(auth.uid()) OR public.is_org_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_finance_manager(auth.uid()) OR public.is_org_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage driver devices"
ON public.driver_devices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_org_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_org_admin(auth.uid()));

CREATE POLICY "Drivers can view own devices"
ON public.driver_devices FOR SELECT TO authenticated
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_payout_approvals_status ON public.payout_approvals(status);
CREATE INDEX idx_driver_devices_driver ON public.driver_devices(driver_id);