-- Relax vehicle-pictures storage policies to allow any authenticated user to upload/update
-- (previously required admin/super_admin/org_admin/ops_manager — broke new sign-ups
-- whose role rows weren't yet assigned, producing "new row violates RLS").

DROP POLICY IF EXISTS "Ops/admin can upload vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Ops/admin can update vehicle pictures" ON storage.objects;

CREATE POLICY "Authenticated can upload vehicle pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-pictures');

CREATE POLICY "Authenticated can update vehicle pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-pictures')
  WITH CHECK (bucket_id = 'vehicle-pictures');