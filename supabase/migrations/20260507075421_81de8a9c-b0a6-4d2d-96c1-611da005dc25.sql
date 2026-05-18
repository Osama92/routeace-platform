
ALTER TABLE public.outbound_requests
  ADD COLUMN IF NOT EXISTS pod_status TEXT NOT NULL DEFAULT 'pending_upload',
  ADD COLUMN IF NOT EXISTS pod_uploaded_url TEXT,
  ADD COLUMN IF NOT EXISTS pod_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pod_uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS pod_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pod_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS transporter_notified_at TIMESTAMPTZ;

ALTER TABLE public.outbound_requests
  DROP CONSTRAINT IF EXISTS outbound_requests_pod_status_check;
ALTER TABLE public.outbound_requests
  ADD CONSTRAINT outbound_requests_pod_status_check
  CHECK (pod_status IN ('pending_upload','uploaded','archived'));

CREATE INDEX IF NOT EXISTS idx_outbound_pod_status ON public.outbound_requests(pod_status);

CREATE OR REPLACE FUNCTION public.sync_pod_to_outbound()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.pod_photo_url IS NOT NULL)
     AND (OLD.pod_photo_url IS DISTINCT FROM NEW.pod_photo_url) THEN
    UPDATE public.outbound_requests o
       SET pod_uploaded_url = NEW.pod_photo_url,
           pod_uploaded_at  = COALESCE(NEW.pod_uploaded_at, now()),
           pod_status       = 'uploaded'
      FROM public.dispatches d
     WHERE d.id = NEW.dispatch_id
       AND o.id = ANY(COALESCE(d.source_outbound_ids, ARRAY[]::UUID[]));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_pod_to_outbound ON public.ld_transporter_jobs;
CREATE TRIGGER trg_sync_pod_to_outbound
  AFTER UPDATE ON public.ld_transporter_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_pod_to_outbound();
