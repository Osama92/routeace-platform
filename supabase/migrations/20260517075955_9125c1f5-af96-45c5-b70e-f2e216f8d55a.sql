DROP POLICY IF EXISTS "Logged-in users upload vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Logged-in users update vehicle pictures" ON storage.objects;

CREATE POLICY "Org members upload vehicle pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-pictures'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
  )
);

CREATE POLICY "Org members update vehicle pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-pictures'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'vehicle-pictures'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
  )
);