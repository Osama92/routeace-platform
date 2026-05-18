-- Add POD columns to dispatches
DO $$ BEGIN
  ALTER TABLE public.dispatches ADD COLUMN pod_photo_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dispatches ADD COLUMN pod_notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dispatches ADD COLUMN pod_confirmed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ld_transporters
CREATE TABLE IF NOT EXISTS public.ld_transporters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name      TEXT NOT NULL,
  contact_name      TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  cac_number        TEXT,
  vehicle_types     TEXT[] DEFAULT '{}',
  coverage_areas    TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (onboarding_status IN ('pending_approval','approved','rejected','suspended')),
  added_by          UUID REFERENCES auth.users(id),
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_transporters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read own transporters" ON public.ld_transporters;
CREATE POLICY "Org members read own transporters"
  ON public.ld_transporters FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Logistics Manager add transporters" ON public.ld_transporters;
CREATE POLICY "Logistics Manager add transporters"
  ON public.ld_transporters FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role::text IN ('super_admin','admin','org_admin')
    )
  );

DROP POLICY IF EXISTS "Managers update transporters" ON public.ld_transporters;
CREATE POLICY "Managers update transporters"
  ON public.ld_transporters FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role::text IN ('super_admin','admin','org_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Transporter reads own record" ON public.ld_transporters;
CREATE POLICY "Transporter reads own record"
  ON public.ld_transporters FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ld_transporters_org
  ON public.ld_transporters(organization_id, onboarding_status);
CREATE INDEX IF NOT EXISTS idx_ld_transporters_user
  ON public.ld_transporters(user_id);

-- ld_transporter_jobs
CREATE TABLE IF NOT EXISTS public.ld_transporter_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transporter_id      UUID NOT NULL REFERENCES public.ld_transporters(id) ON DELETE CASCADE,
  dispatch_id         UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','accepted','pickup_confirmed','in_transit','delivered','pod_uploaded','disputed','cancelled')),
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at         TIMESTAMPTZ,
  pickup_confirmed_at TIMESTAMPTZ,
  pickup_lat          DECIMAL(10,7),
  pickup_lng          DECIMAL(10,7),
  delivered_at        TIMESTAMPTZ,
  pod_photo_url       TEXT,
  pod_notes           TEXT,
  pod_uploaded_at     TIMESTAMPTZ,
  dispute_reason      TEXT,
  agreed_rate         NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dispatch_id, transporter_id)
);
ALTER TABLE public.ld_transporter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read transporter jobs" ON public.ld_transporter_jobs;
CREATE POLICY "Org members read transporter jobs"
  ON public.ld_transporter_jobs FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Transporter reads own jobs" ON public.ld_transporter_jobs;
CREATE POLICY "Transporter reads own jobs"
  ON public.ld_transporter_jobs FOR SELECT TO authenticated
  USING (
    transporter_id IN (
      SELECT id FROM public.ld_transporters WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Ops create transporter jobs" ON public.ld_transporter_jobs;
CREATE POLICY "Ops create transporter jobs"
  ON public.ld_transporter_jobs FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
      AND role::text IN ('super_admin','admin','org_admin','ops_manager','dispatcher')
    )
  );

DROP POLICY IF EXISTS "Transporter updates own jobs" ON public.ld_transporter_jobs;
CREATE POLICY "Transporter updates own jobs"
  ON public.ld_transporter_jobs FOR UPDATE TO authenticated
  USING (
    transporter_id IN (
      SELECT id FROM public.ld_transporters WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    transporter_id IN (
      SELECT id FROM public.ld_transporters WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members update transporter jobs" ON public.ld_transporter_jobs;
CREATE POLICY "Org members update transporter jobs"
  ON public.ld_transporter_jobs FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
      AND role::text IN ('super_admin','admin','org_admin','ops_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_ld_trans_jobs_org
  ON public.ld_transporter_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ld_trans_jobs_transporter
  ON public.ld_transporter_jobs(transporter_id, status);
CREATE INDEX IF NOT EXISTS idx_ld_trans_jobs_dispatch
  ON public.ld_transporter_jobs(dispatch_id);

-- Auto-sync trigger
CREATE OR REPLACE FUNCTION public.sync_transporter_pod_to_dispatch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pod_uploaded' AND NEW.pod_photo_url IS NOT NULL THEN
    UPDATE public.dispatches
    SET
      pod_confirmed     = true,
      pod_photo_url     = NEW.pod_photo_url,
      pod_notes         = NEW.pod_notes,
      pod_confirmed_at  = NEW.pod_uploaded_at,
      status            = 'delivered',
      actual_delivery   = COALESCE(actual_delivery, NEW.delivered_at, now()),
      updated_at        = now()
    WHERE id = NEW.dispatch_id;
  END IF;
  IF NEW.status = 'pickup_confirmed' AND (OLD.status IS DISTINCT FROM 'pickup_confirmed') THEN
    UPDATE public.dispatches
    SET
      status        = 'picked_up',
      actual_pickup = COALESCE(actual_pickup, NEW.pickup_confirmed_at, now()),
      updated_at    = now()
    WHERE id = NEW.dispatch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_transporter_pod ON public.ld_transporter_jobs;
CREATE TRIGGER trg_sync_transporter_pod
  AFTER UPDATE ON public.ld_transporter_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transporter_pod_to_dispatch();

-- POD photos storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('transporter-pod-photos', 'transporter-pod-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Transporters upload PODs" ON storage.objects;
CREATE POLICY "Transporters upload PODs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'transporter-pod-photos');

DROP POLICY IF EXISTS "Authenticated read PODs" ON storage.objects;
CREATE POLICY "Authenticated read PODs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'transporter-pod-photos');