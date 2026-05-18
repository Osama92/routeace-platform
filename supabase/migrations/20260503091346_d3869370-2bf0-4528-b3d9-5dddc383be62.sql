
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod-photos', 'pod-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract org_id (first folder) and dispatch_id (second folder)
-- path layout: {organization_id}/{dispatch_id}/{filename}

DROP POLICY IF EXISTS "Drivers upload POD for assigned dispatch" ON storage.objects;
CREATE POLICY "Drivers upload POD for assigned dispatch"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pod-photos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id::text = (storage.foldername(name))[2]
        AND d.organization_id::text = (storage.foldername(name))[1]
        AND (
          d.driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
          OR public.has_role(auth.uid(), 'org_admin'::app_role)
          OR public.has_role(auth.uid(), 'ops_manager'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Org members read POD photos" ON storage.objects;
CREATE POLICY "Org members read POD photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pod-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins delete POD photos" ON storage.objects;
CREATE POLICY "Admins delete POD photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pod-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'org_admin'::app_role))
  );
