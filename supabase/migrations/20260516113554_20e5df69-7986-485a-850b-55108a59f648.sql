DROP POLICY IF EXISTS "Authenticated can upload vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update vehicle pictures" ON storage.objects;

CREATE POLICY "Logged-in users upload vehicle pictures"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'vehicle-pictures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Logged-in users update vehicle pictures"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'vehicle-pictures' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'vehicle-pictures' AND auth.uid() IS NOT NULL);