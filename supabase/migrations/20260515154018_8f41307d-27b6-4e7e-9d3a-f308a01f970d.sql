-- 1. Vehicle category on vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS vehicle_category text;

-- Backfill from existing vehicle_type / truck_type
UPDATE public.vehicles
SET vehicle_category = CASE
  WHEN lower(coalesce(vehicle_type,'')) IN ('bike','motorbike','motorcycle') THEN 'bike'
  WHEN lower(coalesce(vehicle_type,'')) IN ('van','van_diesel','van_petrol','pickup','bus') THEN 'van'
  WHEN lower(coalesce(truck_type,'')) IN ('15t','15_ton','truck_15t') THEN 'truck_15t'
  WHEN lower(coalesce(truck_type,'')) IN ('20t','20_ton','truck_20t') THEN 'truck_20t'
  WHEN lower(coalesce(vehicle_type,'')) IN ('trailer','hgv','30t') THEN 'trailer'
  WHEN lower(coalesce(vehicle_type,'')) IN ('truck','heavy_truck') THEN 'truck_20t'
  ELSE 'van'
END
WHERE vehicle_category IS NULL;

ALTER TABLE public.vehicles
  ALTER COLUMN vehicle_category SET DEFAULT 'van',
  ALTER COLUMN vehicle_category SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_vehicle_category_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_vehicle_category_check
      CHECK (vehicle_category IN ('bike','van','truck_15t','truck_20t','trailer'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_org_category
  ON public.vehicles(organization_id, vehicle_category);

-- 2. Preferred category on drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS preferred_vehicle_category text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_preferred_vehicle_category_check'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_preferred_vehicle_category_check
      CHECK (preferred_vehicle_category IS NULL OR preferred_vehicle_category IN ('bike','van','truck_15t','truck_20t','trailer'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drivers_org_category
  ON public.drivers(organization_id, preferred_vehicle_category);

-- 3. Job notifications table
CREATE TABLE IF NOT EXISTS public.driver_job_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  dispatch_id uuid,
  vehicle_category text NOT NULL CHECK (vehicle_category IN ('bike','van','truck_15t','truck_20t','trailer')),
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','read','accepted','rejected','expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_djn_org ON public.driver_job_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_djn_driver ON public.driver_job_notifications(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_djn_dispatch ON public.driver_job_notifications(dispatch_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_djn_updated_at ON public.driver_job_notifications;
CREATE TRIGGER trg_djn_updated_at
  BEFORE UPDATE ON public.driver_job_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS
ALTER TABLE public.driver_job_notifications ENABLE ROW LEVEL SECURITY;

-- Org members (ops managers, admins, support) can read all org notifications
DROP POLICY IF EXISTS "Org members read job notifications" ON public.driver_job_notifications;
CREATE POLICY "Org members read job notifications"
  ON public.driver_job_notifications FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Drivers read their OWN notifications only
DROP POLICY IF EXISTS "Drivers read own job notifications" ON public.driver_job_notifications;
CREATE POLICY "Drivers read own job notifications"
  ON public.driver_job_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_job_notifications.driver_id
        AND d.user_id = auth.uid()
    )
  );

-- Super admins read all
DROP POLICY IF EXISTS "Super admins read all job notifications" ON public.driver_job_notifications;
CREATE POLICY "Super admins read all job notifications"
  ON public.driver_job_notifications FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Org members (ops/admin) create notifications for their org
DROP POLICY IF EXISTS "Org members insert job notifications" ON public.driver_job_notifications;
CREATE POLICY "Org members insert job notifications"
  ON public.driver_job_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Org members can update notifications in their org (ops actions: cancel, expire)
DROP POLICY IF EXISTS "Org members update job notifications" ON public.driver_job_notifications;
CREATE POLICY "Org members update job notifications"
  ON public.driver_job_notifications FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Drivers can update their own notifications (accept/reject/read)
DROP POLICY IF EXISTS "Drivers update own job notifications" ON public.driver_job_notifications;
CREATE POLICY "Drivers update own job notifications"
  ON public.driver_job_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_job_notifications.driver_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_job_notifications.driver_id
        AND d.user_id = auth.uid()
    )
  );

-- No DELETE policy: notifications are immutable history. Super admins via service role only.
