-- Fix invoices SELECT RLS so that:
-- 1. super_admin can see ALL invoices (needed for approval screen)
-- 2. org members see only their org's invoices (via organization_members, not profiles.id)
-- 3. UPDATE policy also allows super_admin (needed to write approval fields)

DROP POLICY IF EXISTS "Org members can view invoices" ON public.invoices;

CREATE POLICY "Org members can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR
    organization_id = (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- Also fix UPDATE so super_admin can write approval_status, first_approver_id, etc.
DROP POLICY IF EXISTS "Org members can update invoices" ON public.invoices;

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id = (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
        LIMIT 1
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations')
      )
    )
  );
