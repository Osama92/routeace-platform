-- Add missing SELECT and DELETE RLS policies for invoice_line_items.
-- Without these, editing an invoice fails silently:
--   DELETE is blocked (no rows removed) then re-INSERT duplicates/conflicts.

-- SELECT: org members can read line items for their invoices
DROP POLICY IF EXISTS "Org members can select invoice line items" ON public.invoice_line_items;
CREATE POLICY "Org members can select invoice line items"
  ON public.invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.organization_members om ON om.organization_id = i.organization_id
      WHERE i.id = invoice_line_items.invoice_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- DELETE: org members with finance/admin roles can delete line items
DROP POLICY IF EXISTS "Org members can delete invoice line items" ON public.invoice_line_items;
CREATE POLICY "Org members can delete invoice line items"
  ON public.invoice_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.organization_members om ON om.organization_id = i.organization_id
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE i.id = invoice_line_items.invoice_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND ur.role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations')
    )
  );

-- UPDATE: same scope as DELETE (needed for future in-place edits)
DROP POLICY IF EXISTS "Org members can update invoice line items" ON public.invoice_line_items;
CREATE POLICY "Org members can update invoice line items"
  ON public.invoice_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.organization_members om ON om.organization_id = i.organization_id
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE i.id = invoice_line_items.invoice_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND ur.role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations')
    )
  );
