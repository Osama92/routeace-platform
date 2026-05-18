
-- 1. Link rate cards to dispatches & invoices
ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS vendor_rate_card_id uuid REFERENCES public.vendor_rate_cards(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vendor_rate_card_id uuid REFERENCES public.vendor_rate_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- 2. AI cost comparisons log
CREATE TABLE IF NOT EXISTS public.vendor_rate_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  dispatch_id uuid REFERENCES public.dispatches(id) ON DELETE CASCADE,
  route_from text NOT NULL,
  route_to text NOT NULL,
  vehicle_type text NOT NULL,
  cheapest_vendor_id uuid REFERENCES public.vendor_rate_cards(id) ON DELETE SET NULL,
  cheapest_rate_ngn numeric NOT NULL,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendation text,
  ai_model text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_rate_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read comparisons"
  ON public.vendor_rate_comparisons FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Authorized roles write comparisons"
  ON public.vendor_rate_comparisons FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'ops_manager'::app_role)
      OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    )
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

-- 3. Auto-invoice idempotency log
CREATE TABLE IF NOT EXISTS public.vendor_auto_invoice_log (
  dispatch_id uuid PRIMARY KEY REFERENCES public.dispatches(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_auto_invoice_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read auto-invoice log"
  ON public.vendor_auto_invoice_log FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 4. Trigger function: auto-create invoice on POD confirm when rate card linked
CREATE OR REPLACE FUNCTION public.auto_invoice_on_pod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_card public.vendor_rate_cards%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number text;
BEGIN
  IF NEW.pod_confirmed = true
     AND (OLD.pod_confirmed IS NULL OR OLD.pod_confirmed = false)
     AND NEW.vendor_rate_card_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendor_auto_invoice_log WHERE dispatch_id = NEW.id)
  THEN
    SELECT * INTO v_rate_card FROM public.vendor_rate_cards WHERE id = NEW.vendor_rate_card_id;

    IF v_rate_card.id IS NOT NULL THEN
      v_invoice_number := 'AUTO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8);

      INSERT INTO public.invoices (
        invoice_number, customer_id, dispatch_id, amount, total_amount,
        status, organization_id, vendor_rate_card_id, auto_generated, invoice_date, notes
      ) VALUES (
        v_invoice_number, NEW.customer_id, NEW.id, v_rate_card.rate_ngn, v_rate_card.rate_ngn,
        'pending', NEW.organization_id, v_rate_card.id, true, CURRENT_DATE,
        'Auto-generated from rate card ' || v_rate_card.vendor_name
      ) RETURNING id INTO v_invoice_id;

      INSERT INTO public.vendor_auto_invoice_log (dispatch_id, invoice_id, organization_id)
      VALUES (NEW.id, v_invoice_id, NEW.organization_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_on_pod ON public.dispatches;
CREATE TRIGGER trg_auto_invoice_on_pod
  AFTER UPDATE OF pod_confirmed ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_on_pod();

-- 5. Helpful index
CREATE INDEX IF NOT EXISTS idx_vendor_rate_cards_route_vehicle
  ON public.vendor_rate_cards (organization_id, route_from, route_to, vehicle_type, status);
