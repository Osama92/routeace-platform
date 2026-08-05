-- ============================================================
-- AUDIT A3 — FINAL CONFIRMATION
-- Run ON ITS OWN. Read-only. This is the last security query.
--
-- A2 flagged 3 tables. Source review shows all three are protected
-- by a valid model other than org-scoping:
--
--   platform_errors      TO service_role USING (true)   -- not user-reachable
--   push_subscriptions   USING (user_id = auth.uid())   -- user-scoped (stricter)
--   trial_notifications  TO service_role USING (true)   -- not user-reachable
--
-- This query proves that claim from the live database rather than
-- from the migration files: it lists every policy on those tables
-- that is readable by the `authenticated` or `public` role.
--
-- EXPECTED RESULT: only push_subscriptions rows, each with a
-- using_clause of (user_id = auth.uid()).
--
-- If platform_errors or trial_notifications appear with a role of
-- {authenticated} or {public} and a permissive USING (true), that
-- WOULD be real exposure and I need to know.
-- ============================================================

SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  p.permissive,
  p.roles::text AS granted_to,
  p.qual        AS using_clause
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('platform_errors','push_subscriptions','trial_notifications')
  AND p.cmd IN ('ALL','SELECT')
  -- only policies actually reachable by a logged-in end user
  AND (p.roles::text ILIKE '%authenticated%' OR p.roles::text ILIKE '%public%')
ORDER BY p.tablename, p.policyname;
