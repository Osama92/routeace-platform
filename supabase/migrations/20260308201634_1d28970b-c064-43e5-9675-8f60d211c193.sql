
-- Industry team members tables for all remaining industries
-- Following the same pattern as fmcg_team_members and liquor_team_members

-- Pharma OS
CREATE TABLE public.pharma_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pharma_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pharma_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own pharma role" ON public.pharma_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own pharma role" ON public.pharma_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own pharma role" ON public.pharma_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all pharma" ON public.pharma_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Agri OS
CREATE TABLE public.agri_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  agri_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agri_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own agri role" ON public.agri_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own agri role" ON public.agri_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own agri role" ON public.agri_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all agri" ON public.agri_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Building Materials OS
CREATE TABLE public.building_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  building_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.building_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own building role" ON public.building_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own building role" ON public.building_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own building role" ON public.building_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all building" ON public.building_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Cosmetics OS
CREATE TABLE public.cosmetics_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  cosmetics_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cosmetics_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own cosmetics role" ON public.cosmetics_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own cosmetics role" ON public.cosmetics_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cosmetics role" ON public.cosmetics_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all cosmetics" ON public.cosmetics_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- BFSI OS
CREATE TABLE public.bfsi_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  bfsi_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.bfsi_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own bfsi role" ON public.bfsi_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own bfsi role" ON public.bfsi_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bfsi role" ON public.bfsi_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all bfsi" ON public.bfsi_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Auto-Ancillary OS
CREATE TABLE public.auto_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.auto_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own auto role" ON public.auto_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own auto role" ON public.auto_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own auto role" ON public.auto_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all auto" ON public.auto_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Consumer Goods OS
CREATE TABLE public.consumer_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  consumer_role TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.consumer_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own consumer role" ON public.consumer_team_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own consumer role" ON public.consumer_team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own consumer role" ON public.consumer_team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins read all consumer" ON public.consumer_team_members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
