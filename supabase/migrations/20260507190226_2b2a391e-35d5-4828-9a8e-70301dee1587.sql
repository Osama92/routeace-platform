CREATE POLICY "Org members read own PODs"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'transporter-pod-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );