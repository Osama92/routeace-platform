-- ============================================================
-- AUDIT A2 — CORRECTED EXPOSURE TEST
-- Run ON ITS OWN. Read-only.
--
-- WHY THIS REPLACES QUERY A:
-- Query A tested whether a policy NAMED 'tenant_isolation_gate'
-- existed. That was the wrong test — several tables are correctly
-- scoped using a different helper (e.g. is_org_member(auth.uid(),
-- organization_id)) under a different policy name. Query A therefore
-- reported ~30 false positives.
--
-- This version tests BEHAVIOUR: does the table have at least one
-- SELECT-capable policy whose USING clause actually references a
-- tenant predicate (organization_id / get_user_organization /
-- is_org_member)?
--
-- Any row returned here has an organization_id column but NO policy
-- that filters on it — genuine cross-tenant exposure.
--
-- EXPECTED RESULT: zero rows.
-- ============================================================

WITH org_tables AS (
  SELECT DISTINCT c.table_name
  FROM information_schema.columns c
  JOIN pg_tables t
    ON t.schemaname = 'public' AND t.tablename = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name  = 'organization_id'
    AND t.rowsecurity  = true
),
scoped AS (
  SELECT DISTINCT p.tablename
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('ALL','SELECT')
    AND (
      COALESCE(p.qual,'') ILIKE '%organization_id%'
      OR COALESCE(p.qual,'') ILIKE '%get_user_organization%'
      OR COALESCE(p.qual,'') ILIKE '%is_org_member%'
      OR COALESCE(p.qual,'') ILIKE '%is_platform_owner%'
    )
)
SELECT
  o.table_name,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=o.table_name) AS policy_count,
  (SELECT string_agg(p.policyname, ' | ')
     FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=o.table_name
       AND p.cmd IN ('ALL','SELECT')) AS select_policies
FROM org_tables o
WHERE o.table_name NOT IN (SELECT tablename FROM scoped)
ORDER BY o.table_name;
