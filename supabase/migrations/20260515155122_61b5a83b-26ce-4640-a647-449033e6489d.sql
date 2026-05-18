CREATE TABLE IF NOT EXISTS public.org_pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  diesel_rate numeric NOT NULL DEFAULT 1900,
  petrol_rate numeric NOT NULL DEFAULT 1150,
  default_vehicle text NOT NULL DEFAULT 'truck_20t',
  default_driver_allowance numeric NOT NULL DEFAULT 120000,
  default_levies numeric NOT NULL DEFAULT 170000,
  default_maintenance numeric NOT NULL DEFAULT 130000,
  target_margin_pct numeric NOT NULL DEFAULT 20,
  min_multiplier numeric NOT NULL DEFAULT 0.9,
  max_multiplier numeric NOT NULL DEFAULT 1.5,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pricing settings"
  ON public.org_pricing_settings FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins manage pricing settings"
  ON public.org_pricing_settings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_org_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    )
  );

CREATE POLICY "Admins update pricing settings"
  ON public.org_pricing_settings FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_org_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    )
  );

CREATE TRIGGER org_pricing_settings_updated_at
  BEFORE UPDATE ON public.org_pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();