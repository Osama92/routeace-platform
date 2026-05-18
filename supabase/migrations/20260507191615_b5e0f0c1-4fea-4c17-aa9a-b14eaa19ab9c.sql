-- Add tenant_mode to organizations (root fix for triggers/edge functions)
DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD COLUMN tenant_mode TEXT NOT NULL DEFAULT 'LOGISTICS_COMPANY'
      CHECK (tenant_mode IN ('LOGISTICS_COMPANY', 'LOGISTICS_DEPARTMENT'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill from tenant_config
UPDATE public.organizations o
SET tenant_mode = tc.tenant_mode
FROM public.tenant_config tc
WHERE tc.organization_id = o.id
  AND tc.tenant_mode IS NOT NULL
  AND tc.tenant_mode IN ('LOGISTICS_COMPANY', 'LOGISTICS_DEPARTMENT');

-- Sync trigger: tenant_config -> organizations
CREATE OR REPLACE FUNCTION public.sync_tenant_mode_to_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.tenant_mode IS NOT NULL
     AND NEW.tenant_mode IN ('LOGISTICS_COMPANY', 'LOGISTICS_DEPARTMENT')
     AND NEW.organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET tenant_mode = NEW.tenant_mode
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenant_mode ON public.tenant_config;
CREATE TRIGGER trg_sync_tenant_mode
  AFTER INSERT OR UPDATE OF tenant_mode ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_mode_to_org();

CREATE INDEX IF NOT EXISTS idx_organizations_tenant_mode
  ON public.organizations(tenant_mode);