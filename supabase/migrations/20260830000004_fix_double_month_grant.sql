-- ============================================================
-- FIX: the goodwill grant gave 60 days to 23 organisations
-- ============================================================
-- 20260830000003 ran two UPDATEs in sequence:
--
--   1. free + expired  -> status 'trial', expiry = now() + 30 days
--   2. trial + not yet expired -> expiry = expiry + 30 days
--
-- Statement 1 flipped 23 organisations to 'trial' with a future date, which
-- made every one of them match statement 2's WHERE clause. They were
-- extended a second time and ended on 2026-10-29 — 60 days, not the 30 that
-- was intended. The duplicate rows in subscription_grant_log are what
-- exposed it: 49 log entries for 26 organisations.
--
-- The lesson for future grants: a single UPDATE whose predicate is changed
-- by an earlier UPDATE in the same migration is not safe. Either capture the
-- target ids first, or order the statements so the second cannot re-match
-- the first's rows.
--
-- This resets the affected organisations to exactly 30 days from the moment
-- the grant ran, taken from their own log entry rather than a hardcoded date,
-- so the correction is exact per organisation.
--
-- The 3 genuine live trials are untouched: they were correctly extended once
-- and never matched statement 1.
-- ============================================================

UPDATE public.organizations o
SET subscription_expires_at = (
      SELECT min(g.granted_at)
      FROM public.subscription_grant_log g
      WHERE g.organization_id = o.id
        AND g.reason LIKE '%expired free plan%'
    ) + interval '30 days'
WHERE EXISTS (
  SELECT 1 FROM public.subscription_grant_log g
  WHERE g.organization_id = o.id
    AND g.reason LIKE '%expired free plan%'
);

-- Remove the spurious second log entry so the audit trail reflects one grant
-- per organisation, matching what they actually received.
DELETE FROM public.subscription_grant_log g
WHERE g.reason LIKE '%added to live trial%'
  AND EXISTS (
    SELECT 1 FROM public.subscription_grant_log g2
    WHERE g2.organization_id = g.organization_id
      AND g2.reason LIKE '%expired free plan%'
  );
