
-- Extensions for scheduled background sync
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Extend integration_configs for scheduler
ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_interval_seconds INTEGER NOT NULL DEFAULT 60;

-- Waybill templates table
CREATE TABLE IF NOT EXISTS public.waybill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf','jpg','png','xlsx','docx')),
  file_path TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waybill_templates_org ON public.waybill_templates(organization_id);
ALTER TABLE public.waybill_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read waybill templates" ON public.waybill_templates;
CREATE POLICY "Org members read waybill templates" ON public.waybill_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = waybill_templates.organization_id));

DROP POLICY IF EXISTS "Org members insert waybill templates" ON public.waybill_templates;
CREATE POLICY "Org members insert waybill templates" ON public.waybill_templates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = waybill_templates.organization_id));

DROP POLICY IF EXISTS "Org members update waybill templates" ON public.waybill_templates;
CREATE POLICY "Org members update waybill templates" ON public.waybill_templates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = waybill_templates.organization_id));

DROP POLICY IF EXISTS "Org members delete waybill templates" ON public.waybill_templates;
CREATE POLICY "Org members delete waybill templates" ON public.waybill_templates FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = waybill_templates.organization_id));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('waybill-templates', 'waybill-templates', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Org members read waybill template files" ON storage.objects;
CREATE POLICY "Org members read waybill template files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'waybill-templates' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Org members upload waybill template files" ON storage.objects;
CREATE POLICY "Org members upload waybill template files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'waybill-templates' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Org members delete waybill template files" ON storage.objects;
CREATE POLICY "Org members delete waybill template files" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'waybill-templates' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );
