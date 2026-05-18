-- Add image_url column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create vehicle-pictures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-pictures', 'vehicle-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Authenticated users can upload vehicle pictures
CREATE POLICY "Authenticated users can upload vehicle pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-pictures');

-- RLS policy: Anyone can view vehicle pictures (public bucket)
CREATE POLICY "Public can view vehicle pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-pictures');

-- RLS policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update vehicle pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-pictures');

-- RLS policy: Authenticated users can delete vehicle pictures
CREATE POLICY "Authenticated users can delete vehicle pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-pictures');