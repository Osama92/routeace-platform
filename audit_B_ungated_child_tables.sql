-- ============================================================
-- AUDIT QUERY B
-- Run this file ON ITS OWN. Read-only.
--
-- Tables with RLS enabled that have NO organization_id column, so
-- tenant_isolation_gate could never be applied to them.
--
-- bill_items and invoice_line_items were exactly this case — child
-- tables inheriting tenancy from a parent row — and are now fixed
-- with parent-resolving gates (they will show has_any_gate = true).
--
-- This query reveals whether any OTHER tenant-bearing child tables
-- are still in that position and need the same treatment.
--
-- Many rows here will be legitimately global (lookup, config, and
-- platform-level tables such as tax_rates) and need no tenant gate.
-- Send the full list and I will classify each one.
-- ============================================================

SELECT
  t.tablename,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t.tablename) AS policy_count,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename  = t.tablename
      AND p.policyname LIKE 'tenant_isolation_gate%'
  ) AS has_any_gate
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name   = t.tablename
      AND c.column_name  = 'organization_id'
  )
ORDER BY has_any_gate, t.tablename;
