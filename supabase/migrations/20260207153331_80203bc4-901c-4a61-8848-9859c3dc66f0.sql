-- =====================================================
-- FULL PLATFORM MULTI-TENANT ARCHITECTURE (ADDITIONS)
-- Organizations, Subscriptions, Reseller Ecosystem
-- =====================================================

-- 1. Subscription Tier Enum (if not exists)
DO $$ BEGIN
    CREATE TYPE public.subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Organizations Table (Primary Tenant Entity)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_user_id UUID NOT NULL,
    subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    white_label_enabled BOOLEAN NOT NULL DEFAULT false,
    custom_branding JSONB DEFAULT '{}',
    industry TEXT,
    fleet_size TEXT,
    country TEXT DEFAULT 'Nigeria',
    currency TEXT DEFAULT 'NGN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Add missing columns to organization_members if they don't exist
ALTER TABLE public.organization_members 
    ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS invited_by UUID,
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Organization Invitations Table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Reseller Relationships Table (White-label chain)
CREATE TABLE IF NOT EXISTS public.reseller_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    parent_reseller_id UUID REFERENCES public.reseller_relationships(id),
    custom_pricing JSONB DEFAULT '{}',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    routeace_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(reseller_org_id, client_org_id)
);

ALTER TABLE public.reseller_relationships ENABLE ROW LEVEL SECURITY;

-- 6. Commission Ledger (Payment Tracking)
CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_relationship_id UUID REFERENCES public.reseller_relationships(id) ON DELETE SET NULL,
    source_org_id UUID REFERENCES public.organizations(id) NOT NULL,
    reseller_org_id UUID REFERENCES public.organizations(id),
    transaction_type TEXT NOT NULL,
    gross_amount DECIMAL(15,2) NOT NULL,
    reseller_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    routeace_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NGN',
    description TEXT,
    reference_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

-- 7. Reseller Payouts
CREATE TABLE IF NOT EXISTS public.reseller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payout_reference TEXT,
    bank_details JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;

-- 8. Subscription Plans (Reference table)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier public.subscription_tier NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency TEXT NOT NULL DEFAULT 'NGN',
    features JSONB NOT NULL DEFAULT '[]',
    max_users INTEGER,
    max_vehicles INTEGER,
    white_label_enabled BOOLEAN NOT NULL DEFAULT false,
    api_access BOOLEAN NOT NULL DEFAULT false,
    reseller_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plans (if not exist)
INSERT INTO public.subscription_plans (tier, name, price_monthly, price_yearly, features, max_users, max_vehicles, white_label_enabled, api_access, reseller_enabled) 
VALUES
('starter', 'Starter', 0, 0, '["Basic dispatch", "Up to 5 vehicles", "Email support"]', 1, 5, false, false, false),
('professional', 'Professional', 5000, 50000, '["Unlimited vehicles", "Team management", "Zoho/QuickBooks sync", "Priority support"]', 10, 50, false, true, false),
('enterprise', 'Enterprise', 10000, 100000, '["Everything in Pro", "White-label branding", "Reseller capabilities", "Dedicated support", "Custom integrations"]', null, null, true, true, true)
ON CONFLICT (tier) DO NOTHING;

-- =====================================================
-- RLS POLICIES (Drop if exists then create)
-- =====================================================

-- Organizations
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('super_admin', 'core_founder', 'core_cofounder')
        )
    );

DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization"
    ON public.organizations FOR UPDATE
    USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Members
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
CREATE POLICY "Members can view their org members"
    ON public.organization_members FOR SELECT
    USING (
        organization_id IN (
            SELECT om2.organization_id FROM public.organization_members om2
            WHERE om2.user_id = auth.uid() AND om2.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('super_admin', 'core_founder', 'core_cofounder')
        )
    );

DROP POLICY IF EXISTS "Users can insert their own membership" ON public.organization_members;
CREATE POLICY "Users can insert their own membership"
    ON public.organization_members FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
CREATE POLICY "Org owners can update members"
    ON public.organization_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.is_owner = true
            AND om.is_active = true
        )
    );

-- Organization Invitations
DROP POLICY IF EXISTS "Org members can view invitations" ON public.organization_invitations;
CREATE POLICY "Org members can view invitations"
    ON public.organization_invitations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Org admins can create invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can create invitations"
    ON public.organization_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_invitations.organization_id
            AND om.user_id = auth.uid()
            AND (om.is_owner = true OR om.role IN ('admin', 'org_admin', 'super_admin'))
            AND om.is_active = true
        )
    );

-- Reseller Relationships
DROP POLICY IF EXISTS "Resellers can view their relationships" ON public.reseller_relationships;
CREATE POLICY "Resellers can view their relationships"
    ON public.reseller_relationships FOR SELECT
    USING (
        reseller_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_owner = true
        )
        OR
        client_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_owner = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('core_founder', 'core_cofounder')
        )
    );

DROP POLICY IF EXISTS "Enterprise owners can create reseller relationships" ON public.reseller_relationships;
CREATE POLICY "Enterprise owners can create reseller relationships"
    ON public.reseller_relationships FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.organization_members om ON o.id = om.organization_id
            WHERE o.id = reseller_relationships.reseller_org_id
            AND om.user_id = auth.uid()
            AND om.is_owner = true
            AND o.subscription_tier = 'enterprise'
        )
    );

-- Commission Ledger
DROP POLICY IF EXISTS "Org owners can view their commissions" ON public.commission_ledger;
CREATE POLICY "Org owners can view their commissions"
    ON public.commission_ledger FOR SELECT
    USING (
        source_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_owner = true
        )
        OR
        reseller_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_owner = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('core_founder', 'core_cofounder')
        )
    );

-- Reseller Payouts
DROP POLICY IF EXISTS "Resellers can view their payouts" ON public.reseller_payouts;
CREATE POLICY "Resellers can view their payouts"
    ON public.reseller_payouts FOR SELECT
    USING (
        reseller_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND is_owner = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('core_founder', 'core_cofounder')
        )
    );

-- Subscription Plans (public read)
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
$$;

-- Function to check if user is org owner
CREATE OR REPLACE FUNCTION public.is_org_owner(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = p_user_id 
        AND organization_id = p_org_id
        AND is_owner = true
        AND is_active = true
    );
$$;

-- Function to calculate RouteAce commission (20%)
CREATE OR REPLACE FUNCTION public.calculate_commission(
    p_gross_amount DECIMAL,
    p_reseller_rate DECIMAL DEFAULT 80.00
)
RETURNS TABLE(reseller_amount DECIMAL, routeace_amount DECIMAL)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY SELECT 
        ROUND(p_gross_amount * (p_reseller_rate / 100), 2) as reseller_amount,
        ROUND(p_gross_amount * ((100 - p_reseller_rate) / 100), 2) as routeace_amount;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_organization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_timestamp ON public.organizations;
CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organization_timestamp();

DROP TRIGGER IF EXISTS update_organization_members_timestamp ON public.organization_members;
CREATE TRIGGER update_organization_members_timestamp
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organization_timestamp();

DROP TRIGGER IF EXISTS update_reseller_relationships_timestamp ON public.reseller_relationships;
CREATE TRIGGER update_reseller_relationships_timestamp
    BEFORE UPDATE ON public.reseller_relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organization_timestamp();