-- Add core team roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_founder';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_builder';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_product';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_engineer';

-- Create core_team_members table for internal team management
CREATE TABLE IF NOT EXISTS public.core_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  core_role TEXT NOT NULL CHECK (core_role IN ('core_founder', 'core_builder', 'core_product', 'core_engineer')),
  display_name TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.core_team_members ENABLE ROW LEVEL SECURITY;

-- Only core team members can view core team data
CREATE POLICY "Core team can view members" ON public.core_team_members
  FOR SELECT USING (
    public.is_internal_team(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text LIKE 'core_%')
  );

-- Only core_founder can manage team members
CREATE POLICY "Core founder can manage members" ON public.core_team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'core_founder')
  );

-- Create core_access_logs for audit trail
CREATE TABLE IF NOT EXISTS public.core_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  core_role TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.core_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Core team can view access logs" ON public.core_access_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text LIKE 'core_%')
  );

CREATE POLICY "System can insert access logs" ON public.core_access_logs
  FOR INSERT WITH CHECK (true);

-- Create function to check if user is core team
CREATE OR REPLACE FUNCTION public.is_core_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND (role::text LIKE 'core_%' OR role = 'internal_team')
  )
$$;

-- Create function to get core role
CREATE OR REPLACE FUNCTION public.get_core_role(_user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id 
  AND (role::text LIKE 'core_%' OR role = 'internal_team')
  LIMIT 1
$$;