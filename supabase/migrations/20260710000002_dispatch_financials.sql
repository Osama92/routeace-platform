-- ── Dispatch ↔ Finance Integration ────────────────────────────────────────────
-- Creates dispatch_financials (one-to-one with dispatches) so the finance team
-- can record vendor cost and client revenue against each completed dispatch.
-- A DB trigger auto-creates a pending_finance row when a dispatch is delivered.
-- ROI and profit are computed columns — always accurate, never stale.

-- ── 1. finance_status on dispatches ──────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.dispatches ADD COLUMN finance_status TEXT
    NOT NULL DEFAULT 'not_applicable'
    CHECK (finance_status IN ('not_applicable','pending_finance','finance_complete'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for finance queue queries
CREATE INDEX IF NOT EXISTS idx_dispatches_finance_status
  ON public.dispatches(organization_id, finance_status)
  WHERE finance_status = 'pending_finance';

-- ── 2. dispatch_financials table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_financials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id         UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Finance team inputs
  vendor_cost         NUMERIC(14,2),          -- payout to vendor/driver/3PL
  client_revenue      NUMERIC(14,2),          -- amount charged to client
  currency_code       TEXT NOT NULL DEFAULT 'NGN',

  -- Optional references — link to existing invoice / bill if one was raised
  invoice_id          UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  bill_id             UUID REFERENCES public.bills(id) ON DELETE SET NULL,

  -- Finance workflow
  finance_status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (finance_status IN ('pending','complete','flagged')),
  notes               TEXT,

  -- Computed profit / ROI (stored for report performance)
  gross_profit        NUMERIC(14,2) GENERATED ALWAYS AS
                        (client_revenue - vendor_cost) STORED,
  roi_pct             NUMERIC(8,2)  GENERATED ALWAYS AS (
                        CASE WHEN vendor_cost IS NOT NULL AND vendor_cost > 0
                          THEN ROUND(((client_revenue - vendor_cost) / vendor_cost * 100)::numeric, 2)
                          ELSE NULL
                        END
                      ) STORED,

  -- Audit
  entered_by          UUID REFERENCES auth.users(id),
  entered_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT dispatch_financials_dispatch_unique UNIQUE (dispatch_id)
);

ALTER TABLE public.dispatch_financials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_dispatch_financials_updated_at
  BEFORE UPDATE ON public.dispatch_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dispatch_financials_org
  ON public.dispatch_financials(organization_id, finance_status);

CREATE INDEX IF NOT EXISTS idx_dispatch_financials_dispatch
  ON public.dispatch_financials(dispatch_id);

-- ── 3. RLS policies ───────────────────────────────────────────────────────────
-- Finance managers + admins can do everything; ops roles can SELECT only.

CREATE POLICY "Org members can view dispatch financials"
  ON public.dispatch_financials FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Finance team can insert dispatch financials"
  ON public.dispatch_financials FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin','super_admin','org_admin','finance_manager')
    )
  );

CREATE POLICY "Finance team can update dispatch financials"
  ON public.dispatch_financials FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin','super_admin','org_admin','finance_manager')
    )
  );

CREATE POLICY "Admins can delete dispatch financials"
  ON public.dispatch_financials FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin','super_admin','org_admin')
    )
  );

-- ── 4. Trigger: auto-create pending_finance row on delivery ──────────────────
CREATE OR REPLACE FUNCTION public.handle_dispatch_delivered()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Only act when status transitions TO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN

    -- Set finance_status on the dispatch itself
    NEW.finance_status := 'pending_finance';

    -- Insert a placeholder row in dispatch_financials (ignore if already exists)
    INSERT INTO public.dispatch_financials (dispatch_id, organization_id, finance_status)
    VALUES (NEW.id, NEW.organization_id, 'pending')
    ON CONFLICT (dispatch_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_delivered_finance_trigger ON public.dispatches;

CREATE TRIGGER dispatch_delivered_finance_trigger
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_dispatch_delivered();

-- ── 5. Backfill existing delivered dispatches ─────────────────────────────────
-- Sets finance_status = 'pending_finance' and inserts a placeholder row for
-- any dispatch that was already delivered before this migration ran.

UPDATE public.dispatches
SET finance_status = 'pending_finance'
WHERE status = 'delivered'
  AND finance_status = 'not_applicable';

INSERT INTO public.dispatch_financials (dispatch_id, organization_id, finance_status)
SELECT id, organization_id, 'pending'
FROM public.dispatches
WHERE status = 'delivered'
  AND organization_id IS NOT NULL
ON CONFLICT (dispatch_id) DO NOTHING;
