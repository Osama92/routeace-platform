-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR — closes the confirmed
-- cross-tenant gap on bill_items / invoice_line_items.
--
-- Confirmed live exposure (Query 4 of audit_tenant_isolation.sql):
--     bill_items         82 rows across 2 organizations
--     invoice_line_items 88 rows across 5 organizations
--
-- Neither table has an organization_id column, so the platform's
-- tenant_isolation_gate (which only targets tables that have one)
-- never applied. Their policies are role-only — a finance_manager
-- in one org can read another org's line items via a direct query.
--
-- Fix: RESTRICTIVE gate resolving tenancy through the parent
-- bills/invoices row. RESTRICTIVE policies AND with the existing
-- permissive role checks, so role permissions still apply on top.
--
-- Safe to run more than once.
-- ============================================================

BEGIN;

-- ── bill_items ────────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation_gate_via_parent ON public.bill_items;
CREATE POLICY tenant_isolation_gate_via_parent ON public.bill_items
  AS RESTRICTIVE FOR ALL TO public
  USING (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND (b.organization_id IS NULL
             OR b.organization_id = public.get_user_organization(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND (b.organization_id IS NULL
             OR b.organization_id = public.get_user_organization(auth.uid()))
    )
  );

-- ── invoice_line_items ────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation_gate_via_parent ON public.invoice_line_items;
CREATE POLICY tenant_isolation_gate_via_parent ON public.invoice_line_items
  AS RESTRICTIVE FOR ALL TO public
  USING (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (i.organization_id IS NULL
             OR i.organization_id = public.get_user_organization(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (i.organization_id IS NULL
             OR i.organization_id = public.get_user_organization(auth.uid()))
    )
  );

-- Keep the EXISTS sub-selects cheap.
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
  ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON public.invoice_line_items(invoice_id);

COMMIT;


-- ============================================================
-- VERIFY — both rows must come back gate_applied = true
-- ============================================================
SELECT
  t.tablename,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename  = t.tablename
      AND p.policyname = 'tenant_isolation_gate_via_parent'
  ) AS gate_applied,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=t.tablename) AS total_policies
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN ('bill_items','invoice_line_items');


-- ============================================================
-- OPTIONAL SANITY CHECK (run while logged in as a normal,
-- non-platform-owner user — NOT via the service role, which
-- bypasses RLS by design and will always show every row).
--
-- Before the fix this returned line items across several orgs.
-- After the fix it must only ever return your own org's rows.
-- ============================================================
-- SELECT count(*) AS visible_bill_items,
--        count(DISTINCT b.organization_id) AS visible_orgs
-- FROM public.bill_items bi
-- JOIN public.bills b ON b.id = bi.bill_id;
