-- ── Invoice & Bill dispatch-first flow ───────────────────────────────────────
-- 1. waybill_number on invoices  (display only — pulled from waybills table)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS waybill_number TEXT;

-- 2. dispatch_id on bills  (links a vendor bill to its source trip)
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS dispatch_id UUID
    REFERENCES public.dispatches(id) ON DELETE SET NULL;

-- 3. Index for fast "unbilled dispatches" lookup
CREATE INDEX IF NOT EXISTS idx_bills_dispatch_id
  ON public.bills(dispatch_id)
  WHERE dispatch_id IS NOT NULL;

-- 4. drop_charge on dispatch_dropoffs  (per-stop revenue charge; nullable)
ALTER TABLE public.dispatch_dropoffs
  ADD COLUMN IF NOT EXISTS drop_charge NUMERIC(12,2);
