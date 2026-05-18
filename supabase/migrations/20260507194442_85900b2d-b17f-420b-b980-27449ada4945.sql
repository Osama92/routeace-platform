-- 1. Add link_type to invite tokens
DO $$ BEGIN
  ALTER TABLE public.transporter_invite_tokens
    ADD COLUMN link_type TEXT NOT NULL DEFAULT 'access'
      CHECK (link_type IN ('new', 'access'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. Add document columns
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN vehicle_count INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN self_registered BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN cac_document_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN insurance_document_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN mou_document_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN letter_of_intent_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN truck_photos_urls TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN rates_proposal_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN contact_email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN cac_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 3. Create private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('transporter-onboarding-docs', 'transporter-onboarding-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies
DROP POLICY IF EXISTS "Authenticated users upload onboarding docs" ON storage.objects;
CREATE POLICY "Authenticated users upload onboarding docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'transporter-onboarding-docs');

DROP POLICY IF EXISTS "Org members read onboarding docs" ON storage.objects;
CREATE POLICY "Org members read onboarding docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'transporter-onboarding-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role access onboarding docs" ON storage.objects;
CREATE POLICY "Service role access onboarding docs"
  ON storage.objects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
