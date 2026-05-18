
-- Add photo/license/NIN columns to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS profile_picture_url text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_document_url text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS nin_document_url text;

-- Fix vehicle RLS: allow ops_manager to manage vehicles
DROP POLICY IF EXISTS "Admin/Operations can manage vehicles" ON public.vehicles;
CREATE POLICY "Admin/Ops can manage vehicles" ON public.vehicles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'operations'::app_role) OR
  public.has_role(auth.uid(), 'ops_manager'::app_role) OR
  public.has_role(auth.uid(), 'org_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'operations'::app_role) OR
  public.has_role(auth.uid(), 'ops_manager'::app_role) OR
  public.has_role(auth.uid(), 'org_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also update SELECT policy to include ops_manager
DROP POLICY IF EXISTS "Role-restricted vehicle access" ON public.vehicles;
CREATE POLICY "Role-restricted vehicle access" ON public.vehicles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'operations'::app_role) OR
  public.has_role(auth.uid(), 'dispatcher'::app_role) OR
  public.has_role(auth.uid(), 'ops_manager'::app_role) OR
  public.has_role(auth.uid(), 'org_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix drivers RLS: ensure ops_manager can insert drivers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Ops manager can manage drivers') THEN
    CREATE POLICY "Ops manager can manage drivers" ON public.drivers
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'ops_manager'::app_role) OR
      public.has_role(auth.uid(), 'org_admin'::app_role) OR
      public.has_role(auth.uid(), 'super_admin'::app_role)
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'ops_manager'::app_role) OR
      public.has_role(auth.uid(), 'org_admin'::app_role) OR
      public.has_role(auth.uid(), 'super_admin'::app_role)
    );
  END IF;
END $$;
