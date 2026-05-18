DO $$ BEGIN
  ALTER TABLE public.customers
    ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE public.partners SET approval_status = 'active'
  WHERE approval_status IS NULL OR approval_status NOT IN ('pending_coo','pending_sa','active','rejected');

ALTER TABLE public.partners ALTER COLUMN approval_status SET DEFAULT 'active';
ALTER TABLE public.partners ALTER COLUMN approval_status SET NOT NULL;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.partners'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%approval_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.partners DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_approval_status_check
  CHECK (approval_status IN ('pending_coo','pending_sa','active','rejected'));

ALTER TABLE public.partners
  ADD CONSTRAINT partners_approval_status_check
  CHECK (approval_status IN ('pending_coo','pending_sa','active','rejected'));

CREATE INDEX IF NOT EXISTS idx_customers_approval_status
  ON public.customers(organization_id, approval_status)
  WHERE approval_status != 'active';

CREATE INDEX IF NOT EXISTS idx_partners_approval_status
  ON public.partners(organization_id, approval_status)
  WHERE approval_status != 'active';

INSERT INTO public.approval_policies (entity_type, approval_levels_required, roles_allowed)
SELECT 'customer', 2, ARRAY['support','org_admin','super_admin']
WHERE NOT EXISTS (SELECT 1 FROM public.approval_policies WHERE entity_type='customer' AND organization_id IS NULL);

INSERT INTO public.approval_policies (entity_type, approval_levels_required, roles_allowed)
SELECT 'partner', 2, ARRAY['ops_manager','org_admin','super_admin']
WHERE NOT EXISTS (SELECT 1 FROM public.approval_policies WHERE entity_type='partner' AND organization_id IS NULL);
