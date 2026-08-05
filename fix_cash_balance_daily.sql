-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- (CLI push is blocked by an older non-idempotent migration.)
--
-- Fixes cash_balance_daily: it had a GLOBAL UNIQUE(snapshot_date)
-- constraint, meaning only ONE organization across the entire platform
-- could ever save a cash balance for any given date — every other org's
-- save would silently collide/fail. Replaces it with a composite
-- (organization_id, snapshot_date) unique constraint so each org has
-- its own independent daily snapshot.
--
-- Needed for: Cashflow Forecasting AI page's new "Set/Update Cash
-- Balance" feature (src/pages/CashflowForecasting.tsx).
-- ============================================================

ALTER TABLE public.cash_balance_daily
  DROP CONSTRAINT IF EXISTS cash_balance_daily_snapshot_date_key;

DO $$ BEGIN
  ALTER TABLE public.cash_balance_daily
    ADD CONSTRAINT cash_balance_daily_org_date_unique
    UNIQUE (organization_id, snapshot_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verify:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.cash_balance_daily'::regclass;
