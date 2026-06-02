-- Fix invoice INSERT/UPDATE/DELETE RLS policies to use user_roles table
-- instead of auth.jwt() ->> 'user_role' JWT claim, which is unreliable
-- (not guaranteed to be present in all JWT tokens).

-- ── INSERT ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can insert invoices" ON public.invoices;

CREATE POLICY "Org members can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations', 'dispatcher')
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can update invoices" ON public.invoices;

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations')
    )
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org admins can delete invoices" ON public.invoices;

CREATE POLICY "Org admins can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ── invoice_line_items ────────────────────────────────────────────────────────
-- Tighten line-items INSERT to require the parent invoice belongs to the caller's org
DROP POLICY IF EXISTS "Authenticated users can insert invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Org members can insert invoice line items" ON public.invoice_line_items;

CREATE POLICY "Org members can insert invoice line items"
  ON public.invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.organization_members om ON om.organization_id = i.organization_id
      WHERE i.id = invoice_line_items.invoice_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );
