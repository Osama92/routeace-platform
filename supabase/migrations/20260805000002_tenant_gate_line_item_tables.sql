-- ============================================================
-- SECURITY: tenant isolation for child/line-item tables
-- ============================================================
-- tenant_isolation_gate (migration 20260512222741) is applied only to
-- tables that HAVE an organization_id column. bill_items and
-- invoice_line_items have none — they inherit tenancy from their parent
-- (bills.organization_id / invoices.organization_id).
--
-- Their existing policies are ROLE-ONLY, e.g.:
--     USING (has_role(auth.uid(),'finance_manager') OR ...)
-- which contains no tenant predicate at all. A finance_manager in Org A
-- can therefore read line items belonging to Org B by querying the table
-- directly (the normal UI always filters by a parent id it already has
-- access to, so this is an exploitable gap rather than an active leak —
-- but it must not remain open).
--
-- Fix: add a RESTRICTIVE gate that resolves tenancy through the parent
-- row. RESTRICTIVE policies AND with existing permissive ones, so the
-- role checks still apply on top of this.
-- ============================================================

-- ── bill_items ────────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation_gate_via_parent ON public.bill_items;
CREATE POLICY tenant_isolation_gate_via_parent ON public.bill_items
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND (
          b.organization_id IS NULL
          OR b.organization_id = public.get_user_organization(auth.uid())
        )
    )
  )
  WITH CHECK (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND (
          b.organization_id IS NULL
          OR b.organization_id = public.get_user_organization(auth.uid())
        )
    )
  );

-- ── invoice_line_items ────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation_gate_via_parent ON public.invoice_line_items;
CREATE POLICY tenant_isolation_gate_via_parent ON public.invoice_line_items
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          i.organization_id IS NULL
          OR i.organization_id = public.get_user_organization(auth.uid())
        )
    )
  )
  WITH CHECK (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          i.organization_id IS NULL
          OR i.organization_id = public.get_user_organization(auth.uid())
        )
    )
  );

-- Supporting indexes so the EXISTS sub-selects stay cheap.
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
  ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON public.invoice_line_items(invoice_id);
