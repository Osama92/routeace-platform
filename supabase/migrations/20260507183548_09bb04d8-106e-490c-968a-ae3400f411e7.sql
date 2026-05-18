-- Add transporter location tracking columns
ALTER TABLE public.ld_transporter_jobs
  ADD COLUMN IF NOT EXISTS current_location TEXT,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Tighten POD storage: remove broad authenticated-read policy (org-scoped policy remains)
DROP POLICY IF EXISTS "Authenticated read PODs" ON storage.objects;