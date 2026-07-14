-- ── Fix 1: Add vat_type to bills table ───────────────────────────────────────
-- The Bills.tsx UI writes vat_type to bills but the column was only on bill_items.
DO $$ BEGIN
  ALTER TABLE public.bills ADD COLUMN vat_type TEXT NOT NULL DEFAULT 'no_vat';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Fix 2: Add "met" to dispatches.sla_status constraint ─────────────────────
-- "met" = delivered on time (actual_delivery <= sla_deadline).
-- The UI already uses this value extensively; the DB constraint was too narrow.
ALTER TABLE public.dispatches
  DROP CONSTRAINT IF EXISTS dispatches_sla_status_check;

ALTER TABLE public.dispatches
  ADD CONSTRAINT dispatches_sla_status_check
  CHECK (sla_status IN ('on_track', 'at_risk', 'breached', 'met'));

-- ── Fix 3: Update breach trigger to set sla_status = 'met' on on-time delivery ─
-- Previously the trigger only set 'breached'; on-time deliveries stayed 'on_track'.
-- Now they correctly flip to 'met' so compliance rate and dashboards work.
CREATE OR REPLACE FUNCTION public.handle_dispatch_delivered()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Only act when status transitions TO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN

    -- Finance row (existing logic)
    NEW.finance_status := 'pending_finance';

    INSERT INTO public.dispatch_financials (dispatch_id, organization_id, finance_status)
    VALUES (NEW.id, NEW.organization_id, 'pending')
    ON CONFLICT (dispatch_id) DO NOTHING;

    -- SLA status resolution
    IF NEW.sla_deadline IS NOT NULL AND NEW.actual_delivery IS NOT NULL THEN
      IF NEW.actual_delivery <= NEW.sla_deadline THEN
        NEW.sla_status := 'met';
      ELSE
        NEW.sla_status := 'breached';
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;
