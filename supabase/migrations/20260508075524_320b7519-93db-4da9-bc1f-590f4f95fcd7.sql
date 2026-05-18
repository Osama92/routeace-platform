
-- Allow anonymous inserts only into a public-intake/<org_id>/ folder
CREATE POLICY "anon upload public-intake support attachments" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'public-intake'
    AND EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id::text = (storage.foldername(name))[2]
        AND is_active = true
    )
  );

-- Allow org members to read/move public-intake files for their org
CREATE POLICY "org members read public-intake support attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'public-intake'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );
