
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
      AND (qual ILIKE '%expense-receipts%' OR qual ILIKE '%company-assets%')
      AND qual NOT ILIKE '%foldername%'
      AND qual NOT ILIKE '%has_role%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END$$;

-- Re-assert tight read policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;

CREATE POLICY "Authenticated users can read company assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'company-assets');

-- Make company-assets bucket non-public so URLs require auth
UPDATE storage.buckets SET public = false WHERE id = 'company-assets';
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';
