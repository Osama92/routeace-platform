
-- Liquor OS team members registry (mirrors fmcg_team_members)
CREATE TABLE public.liquor_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  liquor_role TEXT NOT NULL DEFAULT 'retailer_store_manager',
  display_name TEXT,
  email TEXT,
  organization_id UUID,
  territory TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liquor_team_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can read own liquor role"
  ON public.liquor_team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own record
CREATE POLICY "Users can insert own liquor role"
  ON public.liquor_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own record
CREATE POLICY "Users can update own liquor role"
  ON public.liquor_team_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admins can read all
CREATE POLICY "Super admins can read all liquor members"
  ON public.liquor_team_members
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage all
CREATE POLICY "Super admins can manage all liquor members"
  ON public.liquor_team_members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
