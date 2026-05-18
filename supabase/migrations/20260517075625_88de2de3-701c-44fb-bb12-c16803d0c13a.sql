DROP POLICY IF EXISTS "Admins read brief log" ON public.cfo_brief_log;

CREATE POLICY "Admins read brief log"
ON public.cfo_brief_log
FOR SELECT
TO authenticated
USING (
  (
    has_role(auth.uid(), 'super_admin'::app_role)
  )
  OR (
    tenant_id IS NOT NULL
    AND tenant_id = get_user_organization(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'finance_manager'::app_role)
      OR has_role(auth.uid(), 'org_admin'::app_role)
    )
  )
);