ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS vehicle_quota integer NOT NULL DEFAULT 0;