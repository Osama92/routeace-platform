
-- 1. Link transporter to partner record
ALTER TABLE public.ld_transporters
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ld_transporters_partner_id ON public.ld_transporters(partner_id);

-- 2. Trigger to auto-create partner when transporter is approved
CREATE OR REPLACE FUNCTION public.auto_create_partner_on_transporter_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  IF NEW.onboarding_status = 'approved'
     AND (OLD.onboarding_status IS DISTINCT FROM 'approved')
     AND NEW.partner_id IS NULL THEN

    INSERT INTO public.partners (
      organization_id, partner_type, company_name,
      contact_name, contact_email, contact_phone,
      cac_number, notes, approval_status,
      approved_by, approved_at, created_by, is_verified
    ) VALUES (
      NEW.organization_id, 'vendor', NEW.company_name,
      COALESCE(NEW.contact_name, NEW.company_name),
      COALESCE(NEW.email, NEW.contact_email, NEW.company_name || '@noemail.local'),
      COALESCE(NEW.phone, '0000000000'),
      NEW.cac_number, NEW.notes, 'approved',
      NEW.approved_by, COALESCE(NEW.approved_at, now()),
      NEW.added_by, true
    )
    RETURNING id INTO v_partner_id;

    NEW.partner_id := v_partner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ld_transporter_to_partner ON public.ld_transporters;
CREATE TRIGGER trg_ld_transporter_to_partner
BEFORE UPDATE ON public.ld_transporters
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_partner_on_transporter_approval();

-- 3. Yearly vendor targets
CREATE TABLE IF NOT EXISTS public.vendor_yearly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  target_year integer NOT NULL,
  otd_target_percent numeric(5,2) DEFAULT 0,
  trucks_deployed_target integer DEFAULT 0,
  cost_per_kg_target numeric(12,2) DEFAULT 0,
  cost_per_delivery_target numeric(14,2) DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, target_year)
);

CREATE INDEX IF NOT EXISTS idx_vendor_yearly_targets_org ON public.vendor_yearly_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_yearly_targets_vendor ON public.vendor_yearly_targets(vendor_id);

ALTER TABLE public.vendor_yearly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyt_select_org_members" ON public.vendor_yearly_targets;
CREATE POLICY "vyt_select_org_members"
  ON public.vendor_yearly_targets FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "vyt_insert_managers" ON public.vendor_yearly_targets;
CREATE POLICY "vyt_insert_managers"
  ON public.vendor_yearly_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vyt_update_managers" ON public.vendor_yearly_targets;
CREATE POLICY "vyt_update_managers"
  ON public.vendor_yearly_targets FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vyt_delete_admins" ON public.vendor_yearly_targets;
CREATE POLICY "vyt_delete_admins"
  ON public.vendor_yearly_targets FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
  );

CREATE TRIGGER update_vendor_yearly_targets_updated_at
BEFORE UPDATE ON public.vendor_yearly_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Backfill: for any already-approved transporters without partner_id, create partner
DO $$
DECLARE
  r record;
  v_pid uuid;
BEGIN
  FOR r IN
    SELECT * FROM public.ld_transporters
    WHERE onboarding_status = 'approved' AND partner_id IS NULL
  LOOP
    INSERT INTO public.partners (
      organization_id, partner_type, company_name,
      contact_name, contact_email, contact_phone,
      cac_number, notes, approval_status,
      approved_by, approved_at, created_by, is_verified
    ) VALUES (
      r.organization_id, 'vendor', r.company_name,
      COALESCE(r.contact_name, r.company_name),
      COALESCE(r.email, r.contact_email, r.company_name || '@noemail.local'),
      COALESCE(r.phone, '0000000000'),
      r.cac_number, r.notes, 'approved',
      r.approved_by, COALESCE(r.approved_at, now()),
      r.added_by, true
    )
    RETURNING id INTO v_pid;

    UPDATE public.ld_transporters SET partner_id = v_pid WHERE id = r.id;
  END LOOP;
END $$;
