
ALTER TABLE public.outbound_requests
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS customer_id_external TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS picklist_number TEXT,
  ADD COLUMN IF NOT EXISTS waybill_number TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS transporter_id UUID,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

UPDATE public.outbound_requests
   SET picklist_number = COALESCE(picklist_number, REPLACE(request_number, 'OBR-', 'PICK-')),
       waybill_number  = COALESCE(waybill_number,  REPLACE(request_number, 'OBR-', 'PICK-'))
 WHERE picklist_number IS NULL OR waybill_number IS NULL;

CREATE OR REPLACE FUNCTION public.set_outbound_picklist_waybill()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.picklist_number IS NULL OR NEW.picklist_number = '' THEN
    NEW.picklist_number := 'PICK-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;
  IF NEW.waybill_number IS NULL OR NEW.waybill_number = '' THEN
    NEW.waybill_number := NEW.picklist_number;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_outbound_picklist_waybill ON public.outbound_requests;
CREATE TRIGGER trg_outbound_picklist_waybill
  BEFORE INSERT ON public.outbound_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_outbound_picklist_waybill();

CREATE INDEX IF NOT EXISTS idx_outbound_requests_picklist ON public.outbound_requests(picklist_number);
CREATE INDEX IF NOT EXISTS idx_outbound_requests_waybill  ON public.outbound_requests(waybill_number);
CREATE INDEX IF NOT EXISTS idx_outbound_requests_dispatch ON public.outbound_requests(linked_dispatch_id);

ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS transporter_id UUID,
  ADD COLUMN IF NOT EXISTS transporter_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_outbound_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_dispatches_transporter ON public.dispatches(transporter_id);

ALTER TABLE public.waybills
  ADD COLUMN IF NOT EXISTS uploaded_waybill_url TEXT,
  ADD COLUMN IF NOT EXISTS pod_status TEXT NOT NULL DEFAULT 'pending_upload',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transporter_id UUID,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE public.waybills
  DROP CONSTRAINT IF EXISTS waybills_pod_status_check;
ALTER TABLE public.waybills
  ADD CONSTRAINT waybills_pod_status_check
  CHECK (pod_status IN ('pending_upload','uploaded','archived'));

CREATE INDEX IF NOT EXISTS idx_waybills_pod_status ON public.waybills(pod_status);
CREATE INDEX IF NOT EXISTS idx_waybills_transporter ON public.waybills(transporter_id);

INSERT INTO storage.buckets (id, name, public)
  VALUES ('waybill-pods', 'waybill-pods', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Org members read pod files" ON storage.objects;
CREATE POLICY "Org members read pod files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'waybill-pods'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Org members upload pod files" ON storage.objects;
CREATE POLICY "Org members upload pod files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'waybill-pods'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE INDEX IF NOT EXISTS idx_routes_endpoints
  ON public.routes (lower(origin), lower(destination));
