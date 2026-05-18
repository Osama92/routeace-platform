DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN dept_plan TEXT CHECK (dept_plan IN ('foundation','growth','enterprise')); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN dept_industry TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN dept_erp_system TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.organizations ADD COLUMN dept_team_size INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;