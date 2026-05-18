DROP POLICY IF EXISTS "driver_docs_org_write" ON storage.objects;
DROP POLICY IF EXISTS "driver_docs_org_read" ON storage.objects;
DROP POLICY IF EXISTS "driver_docs_org_update" ON storage.objects;
DROP POLICY IF EXISTS "driver_docs_org_delete" ON storage.objects;

CREATE POLICY "driver_docs_org_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
        OR has_role(auth.uid(), 'operations'::app_role)
      )
    )
  )
);

CREATE POLICY "driver_docs_org_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
        OR has_role(auth.uid(), 'operations'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
      )
    )
  )
);

CREATE POLICY "driver_docs_org_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
        OR has_role(auth.uid(), 'operations'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
      )
    )
  )
);

CREATE POLICY "driver_docs_org_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (storage.foldername(name))[1] = get_user_organization(auth.uid())::text
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
      )
    )
  )
);