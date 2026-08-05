-- ============================================================
-- AUDIT QUERY A — THE CRITICAL ONE
-- Run this file ON ITS OWN. Read-only.
--
-- Finds tables that HAVE an organization_id column but are NOT
-- protected: either RLS is switched off, or the tenant_isolation_gate
-- policy is missing.
--
-- Any row returned here is an OUTRIGHT UNPROTECTED tenant table —
-- one organization's data readable by another. This outranks every
-- other issue on the platform.
--
-- EXPECTED RESULT: zero rows ("no rows returned").
-- ============================================================

SELECT
  c.table_name,
  t.rowsecurity AS rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename  = c.table_name
      AND p.policyname = 'tenant_isolation_gate'
  ) AS has_gate,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.table_name) AS policy_count
FROM information_schema.columns c
JOIN pg_tables t
  ON t.schemaname = 'public' AND t.tablename = c.table_name
WHERE c.table_schema = 'public'
  AND c.column_name  = 'organization_id'
  AND (
    t.rowsecurity = false
    OR NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename  = c.table_name
        AND p.policyname = 'tenant_isolation_gate'
    )
  )
ORDER BY t.rowsecurity, c.table_name;
