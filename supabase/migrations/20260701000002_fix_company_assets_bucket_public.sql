-- Ensure company-assets bucket is public so logo/signature URLs load in browser and PDF export
UPDATE storage.buckets SET public = true WHERE id = 'company-assets';

-- Drop and recreate the select policy to allow truly public (unauthenticated) reads
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view company assets" ON storage.objects;

CREATE POLICY "Public can view company assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');
