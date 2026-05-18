-- Remove cross-tenant SELECT on profile-pictures bucket and replace with org-scoped reads
DROP POLICY IF EXISTS "authenticated read all profile pictures" ON storage.objects;

-- Same-org member can read user profile pictures (folder[1] = user_id of profile owner)
CREATE POLICY "same-org members read user profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] <> 'drivers'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members me
    JOIN public.organization_members them
      ON them.organization_id = me.organization_id
    WHERE me.user_id = auth.uid()
      AND them.user_id::text = (storage.foldername(name))[1]
  )
);

-- Same-org member can read driver profile pictures (folder[1]='drivers', folder[2]=driver_id)
CREATE POLICY "same-org members read driver profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'drivers'
  AND EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.id::text = (storage.foldername(name))[2]
      AND d.organization_id = public.get_user_organization(auth.uid())
  )
);