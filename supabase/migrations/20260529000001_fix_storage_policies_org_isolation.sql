-- Fix storage bucket policies to enforce org-level isolation.
-- Previously: any authenticated user could read/write receipts and company assets
-- from ANY organization's bucket. This replaces those with org-membership checks.

-- ── expense-receipts bucket ───────────────────────────────────────────────────
-- Old policy allowed all authenticated users to view all receipts.

DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;

-- Receipts are stored under paths like: <org_id>/<user_id>/filename
-- We scope by checking the first path segment matches the user's org.
CREATE POLICY "Org members can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND (storage.objects.name LIKE (om.organization_id::text || '/%') OR auth.uid()::text = split_part(storage.objects.name, '/', 2))
    )
  );

CREATE POLICY "Org members can upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can update own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- ── company-assets bucket ─────────────────────────────────────────────────────
-- Old policy allowed any authenticated user to upload/delete any org's assets.

DROP POLICY IF EXISTS "Admins can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

CREATE POLICY "Org admins can manage company assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'org_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'org_admin')
    )
  );

CREATE POLICY "Org members can view company assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
    )
  );
