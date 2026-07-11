-- Link fuel_logs to dispatches so that estimated fuel from dispatch creation
-- is synced into the fuel tracking system and feeds the ROI/savings page.

DO $$ BEGIN
  ALTER TABLE public.fuel_logs
    ADD COLUMN dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_fuel_logs_dispatch_id ON public.fuel_logs(dispatch_id);

-- Mark dispatch-linked fuel logs so we can distinguish estimated vs actual fills
DO $$ BEGIN
  ALTER TABLE public.fuel_logs ADD COLUMN is_dispatch_estimate BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
