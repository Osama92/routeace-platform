-- ============================================================
-- GOODWILL: one further free month for existing organisations
-- ============================================================
-- Decided by the platform owner. Two groups, treated differently on purpose.
--
-- 1. EXPIRED FREE ORGS (23). All had already lapsed, between 14 and 29 Aug.
--    Their new expiry is dated from TODAY, not from their old expiry —
--    extending 14 Aug by 30 days would land on 13 Sept, a date already in the
--    past, handing them an "extension" that was mostly already spent.
--    Status returns to 'trial' so the platform treats them as inside a paid
--    window again and the free-plan banner stops showing.
--
-- 2. ACTIVE TRIAL ORGS (3). Not yet expired (6 Sept – 22 Oct). These get 30
--    days added to their EXISTING end date, so nobody loses the time they
--    still had left.
--
-- Deliberately excluded: organisations already on a permanent plan
-- (subscription_expires_at far in the future). Adding a month to 2099-12-31
-- is meaningless, and rewriting a paid customer's expiry is not a change to
-- make casually.
--
-- has_used_trial is left ALONE. It records that the organisation has consumed
-- its original trial, which stays true; this is a goodwill extension, not a
-- new trial, and clearing it would let them claim another one later.
-- ============================================================

-- Snapshot the previous values so this can be audited or reversed.
CREATE TABLE IF NOT EXISTS public.subscription_grant_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  previous_status text,
  previous_expires_at timestamptz,
  new_status text,
  new_expires_at timestamptz
);

ALTER TABLE public.subscription_grant_log ENABLE ROW LEVEL SECURITY;

-- Platform-level record: only platform owners read it, and nothing writes to
-- it from the application.
DROP POLICY IF EXISTS subscription_grant_log_owner_read ON public.subscription_grant_log;
CREATE POLICY subscription_grant_log_owner_read
  ON public.subscription_grant_log FOR SELECT TO authenticated
  USING (public.is_platform_owner(auth.uid()));

-- ── Group 1: expired free organisations → one month from today ──
WITH targets AS (
  SELECT id, subscription_status, subscription_expires_at
  FROM public.organizations
  WHERE subscription_status = 'free'
    -- Guard against re-running: skip anything already carrying a future date.
    AND (subscription_expires_at IS NULL OR subscription_expires_at < now())
)
INSERT INTO public.subscription_grant_log
  (organization_id, reason, previous_status, previous_expires_at, new_status, new_expires_at)
SELECT id, 'Goodwill: one further free month (expired free plan)',
       subscription_status, subscription_expires_at,
       'trial', (now() + interval '30 days')
FROM targets;

UPDATE public.organizations
SET subscription_status  = 'trial',
    subscription_expires_at = now() + interval '30 days'
WHERE subscription_status = 'free'
  AND (subscription_expires_at IS NULL OR subscription_expires_at < now());

-- ── Group 2: live trials → 30 days on top of what remains ───────
-- Excludes anything dated beyond a year out, which marks a permanent or
-- negotiated plan rather than a trial.
WITH targets AS (
  SELECT id, subscription_status, subscription_expires_at
  FROM public.organizations
  WHERE subscription_status = 'trial'
    AND subscription_expires_at >= now()
    AND subscription_expires_at < now() + interval '365 days'
)
INSERT INTO public.subscription_grant_log
  (organization_id, reason, previous_status, previous_expires_at, new_status, new_expires_at)
SELECT id, 'Goodwill: one further free month (added to live trial)',
       subscription_status, subscription_expires_at,
       'trial', subscription_expires_at + interval '30 days'
FROM targets;

UPDATE public.organizations
SET subscription_expires_at = subscription_expires_at + interval '30 days'
WHERE subscription_status = 'trial'
  AND subscription_expires_at >= now()
  AND subscription_expires_at < now() + interval '365 days';

-- ── ROLLBACK ─────────────────────────────────────────────────
-- Every change is recorded in subscription_grant_log with its previous
-- values. To undo this grant entirely:
--
--   UPDATE public.organizations o
--   SET subscription_status = g.previous_status,
--       subscription_expires_at = g.previous_expires_at
--   FROM public.subscription_grant_log g
--   WHERE g.organization_id = o.id
--     AND g.reason LIKE 'Goodwill: one further free month%';
