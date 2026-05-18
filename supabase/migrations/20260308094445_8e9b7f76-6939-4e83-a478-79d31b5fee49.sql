
-- FMCG team members table for industry-specific role segregation
CREATE TABLE public.fmcg_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fmcg_role TEXT NOT NULL DEFAULT 'sales_representative',
  display_name TEXT,
  email TEXT,
  organization_id UUID,
  territory TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.fmcg_team_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can read own fmcg role"
ON public.fmcg_team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own record (during signup)
CREATE POLICY "Users can insert own fmcg role"
ON public.fmcg_team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins/super_admins can manage all records
CREATE POLICY "Admins can manage all fmcg members"
ON public.fmcg_team_members
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'org_admin')
);
