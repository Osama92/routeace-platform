-- Allow authenticated org members to upload and read driver documents and profile pictures.
-- These buckets had no policies, causing RLS violations on insert.

-- ── profile-pictures bucket ───────────────────────────────────────────────────
CREATE POLICY "Org members can upload profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can view profile pictures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can update profile pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can delete profile pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- ── driver-documents bucket ───────────────────────────────────────────────────
CREATE POLICY "Org members can upload driver documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can view driver documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can update driver documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can delete driver documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );
