
ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS instance_url text,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS client_secret text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_configs' AND column_name='integration_type') THEN
    UPDATE public.integration_configs SET provider = integration_type WHERE provider IS NULL AND integration_type IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'integration_configs_org_provider_unique'
  ) THEN
    ALTER TABLE public.integration_configs
      ADD CONSTRAINT integration_configs_org_provider_unique UNIQUE (organization_id, provider);
  END IF;
END $$;
