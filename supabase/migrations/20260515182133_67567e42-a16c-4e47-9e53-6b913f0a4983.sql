ALTER TABLE public.tenant_config
  ADD COLUMN IF NOT EXISTS show_demo_previews boolean NOT NULL DEFAULT false;