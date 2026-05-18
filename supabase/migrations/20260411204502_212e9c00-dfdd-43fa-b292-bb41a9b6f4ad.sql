-- Add split tracking columns to commission_ledger if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_ledger' AND column_name = 'split_percent_routeace') THEN
    ALTER TABLE public.commission_ledger ADD COLUMN split_percent_routeace integer NOT NULL DEFAULT 80;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_ledger' AND column_name = 'split_percent_reseller') THEN
    ALTER TABLE public.commission_ledger ADD COLUMN split_percent_reseller integer NOT NULL DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_ledger' AND column_name = 'currency') THEN
    ALTER TABLE public.commission_ledger ADD COLUMN currency text NOT NULL DEFAULT 'NGN';
  END IF;
END $$;

-- Set reseller_lock_until for existing orgs that don't have it
UPDATE public.organizations 
SET reseller_lock_until = created_at + interval '6 months'
WHERE reseller_lock_until IS NULL;

-- Create trigger to auto-set reseller_lock_until on new orgs
CREATE OR REPLACE FUNCTION public.set_reseller_lock_on_org_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reseller_lock_until IS NULL THEN
    NEW.reseller_lock_until := NEW.created_at + interval '6 months';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reseller_lock ON public.organizations;
CREATE TRIGGER trg_set_reseller_lock
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reseller_lock_on_org_create();