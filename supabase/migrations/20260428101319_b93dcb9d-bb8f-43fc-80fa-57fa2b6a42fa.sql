-- Phase 3 (P6+P7): Multi-tenant scoping for operational + payroll tables
-- Add organization_id to staff, drivers, vehicles, dispatches, partners, staff_salaries, driver_salaries
-- Backfill from created_by -> owner's organization, set defaults, add RLS

-- 1. Add columns (nullable initially for backfill)
ALTER TABLE public.staff            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.drivers          ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.vehicles         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.dispatches       ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.partners         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.staff_salaries   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.driver_salaries  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 2. Backfill from created_by -> organization_members (owner's org)
WITH om AS (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, is_owner DESC, joined_at ASC
)
UPDATE public.staff s SET organization_id = om.organization_id
FROM om WHERE s.created_by = om.user_id AND s.organization_id IS NULL;

WITH om AS (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, is_owner DESC, joined_at ASC
)
UPDATE public.drivers d SET organization_id = om.organization_id
FROM om WHERE d.user_id = om.user_id AND d.organization_id IS NULL;

WITH om AS (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, is_owner DESC, joined_at ASC
), p AS (
  SELECT id, organization_id FROM public.partners WHERE organization_id IS NOT NULL
)
UPDATE public.vehicles v SET organization_id = COALESCE(p.organization_id, om.organization_id)
FROM public.partners pp
LEFT JOIN om ON om.user_id = pp.created_by
LEFT JOIN p ON p.id = pp.id
WHERE v.partner_id = pp.id AND v.organization_id IS NULL;

WITH om AS (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, is_owner DESC, joined_at ASC
)
UPDATE public.dispatches dp SET organization_id = om.organization_id
FROM om WHERE dp.created_by = om.user_id AND dp.organization_id IS NULL;

WITH om AS (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, is_owner DESC, joined_at ASC
)
UPDATE public.partners p SET organization_id = om.organization_id
FROM om WHERE p.created_by = om.user_id AND p.organization_id IS NULL;

-- staff_salaries / driver_salaries: backfill via staff/driver -> created_by -> org
UPDATE public.staff_salaries ss
SET organization_id = s.organization_id
FROM public.staff s
WHERE ss.staff_id = s.id AND ss.organization_id IS NULL AND s.organization_id IS NOT NULL;

UPDATE public.driver_salaries ds
SET organization_id = d.organization_id
FROM public.drivers d
WHERE ds.driver_id = d.id AND ds.organization_id IS NULL AND d.organization_id IS NOT NULL;

-- 3. Trigger: auto-populate organization_id from caller on insert
CREATE OR REPLACE FUNCTION public.set_organization_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
    ORDER BY is_owner DESC, joined_at ASC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_org_id ON public.staff;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.drivers;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.vehicles;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.dispatches;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.partners;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.staff_salaries;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.staff_salaries
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

DROP TRIGGER IF EXISTS trg_set_org_id ON public.driver_salaries;
CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.driver_salaries
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_staff_org           ON public.staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_org         ON public.drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org        ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_org      ON public.dispatches(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_org        ON public.partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_salaries_org  ON public.staff_salaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_driver_salaries_org ON public.driver_salaries(organization_id);

-- 5. RLS policies: members of the org (or super_admin) can read/write rows in their org
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['staff','drivers','vehicles','dispatches','partners','staff_salaries','driver_salaries']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_org_select" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_org_select" ON public.%I FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
      )$p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_org_insert" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_org_insert" ON public.%I FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (organization_id IS NULL)
        OR public.is_org_member(auth.uid(), organization_id)
      )$p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_org_update" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_org_update" ON public.%I FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
      )$p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_org_delete" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_org_delete" ON public.%I FOR DELETE TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
      )$p$, t, t);
  END LOOP;
END $$;