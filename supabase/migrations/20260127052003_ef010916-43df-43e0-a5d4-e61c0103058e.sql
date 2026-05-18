-- Create storage bucket for company assets (signatures, logos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read company assets
CREATE POLICY "Public can view company assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-assets');

-- Allow admins to upload company assets
CREATE POLICY "Admins can upload company assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-assets' AND 
  auth.role() = 'authenticated'
);

-- Allow admins to update company assets
CREATE POLICY "Admins can update company assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-assets' AND 
  auth.role() = 'authenticated'
);

-- Allow admins to delete company assets
CREATE POLICY "Admins can delete company assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-assets' AND 
  auth.role() = 'authenticated'
);