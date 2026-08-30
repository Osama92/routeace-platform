-- ============================================================
-- FIX: the goodwill month did not lift the dispatch quota
-- ============================================================
-- Creating a dispatch failed with "Monthly dispatch quota exceeded
-- (55 of 10 used)". Relma had already run 55 dispatches this month against a
-- cap of 10.
--
-- Subscription state lives in TWO places:
--   organizations.subscription_status / subscription_expires_at
--   tenant_config.plan_tier / max_monthly_dispatches   <- what the quota
--                                                         trigger reads
--
-- 20260830000003 updated only `organizations`, so every organisation got its
-- extra month of access while tenant_config still said plan_tier='free' with
-- max_monthly_dispatches=10. The trigger check_dispatch_quota() reads
-- tenant_config, so the grant restored the banner state but not the ability
-- to actually work.
--
-- This syncs tenant_config for the organisations that received the grant.
-- 'starter' rather than a higher tier: it matches what these organisations
-- held before their trial lapsed, so this restores what they had rather than
-- quietly upgrading them.
-- ============================================================

UPDATE public.tenant_config tc
SET plan_tier = 'starter',
    max_monthly_dispatches = 500
FROM public.subscription_grant_log g
WHERE g.organization_id = tc.organization_id
  AND g.reason LIKE 'Goodwill: one further free month%'
  AND COALESCE(tc.max_monthly_dispatches, 0) < 500;

-- Organisations that received the grant but have no tenant_config row at all
-- would otherwise fall through the trigger's NULL check and be unlimited by
-- accident. Give them the same explicit allowance.
INSERT INTO public.tenant_config (organization_id, plan_tier, max_monthly_dispatches)
SELECT DISTINCT g.organization_id, 'starter', 500
FROM public.subscription_grant_log g
WHERE g.reason LIKE 'Goodwill: one further free month%'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_config tc WHERE tc.organization_id = g.organization_id
  );
