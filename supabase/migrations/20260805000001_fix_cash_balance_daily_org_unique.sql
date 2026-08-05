-- ============================================================
-- Fix cash_balance_daily: global UNIQUE(snapshot_date) prevents
-- more than one organization from ever saving a balance for the
-- same date. Replace with a composite (organization_id, snapshot_date)
-- unique constraint so each org has its own daily snapshot.
-- ============================================================

ALTER TABLE public.cash_balance_daily
  DROP CONSTRAINT IF EXISTS cash_balance_daily_snapshot_date_key;

DO $$ BEGIN
  ALTER TABLE public.cash_balance_daily
    ADD CONSTRAINT cash_balance_daily_org_date_unique
    UNIQUE (organization_id, snapshot_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
