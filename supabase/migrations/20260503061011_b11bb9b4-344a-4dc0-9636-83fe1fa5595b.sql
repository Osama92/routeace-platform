DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_plan TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_industry TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_erp_system TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_team_size INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_operating_regions TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD COLUMN dept_warehouse_count TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenant_config ADD CONSTRAINT tenant_config_dept_plan_check CHECK (dept_plan IN ('foundation', 'growth', 'enterprise') OR dept_plan IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;