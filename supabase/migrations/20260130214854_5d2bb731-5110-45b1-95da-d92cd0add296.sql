-- Customer portal users (separate from internal users)
CREATE TABLE public.customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    is_primary_contact BOOLEAN DEFAULT false,
    can_view_invoices BOOLEAN DEFAULT true,
    can_download_documents BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organization membership for multi-tenant access
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND is_active = true
  )
$$;

-- Customer users policies
CREATE POLICY "Customer users can view own record"
ON public.customer_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage customer users"
ON public.customer_users FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_org_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_org_admin(auth.uid()));

-- Organization members policies
CREATE POLICY "Org admins can manage their org members"
ON public.organization_members FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_org_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own org membership"
ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_customer_users_customer ON public.customer_users(customer_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);