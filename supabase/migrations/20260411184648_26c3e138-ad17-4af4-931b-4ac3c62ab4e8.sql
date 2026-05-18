
-- Enhance bills table
ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'due_on_receipt',
  ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;

-- Bill line items table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  item_details text NOT NULL DEFAULT '',
  account text,
  tonnage text,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  vat_type text NOT NULL DEFAULT 'no_vat',
  customer_id uuid REFERENCES public.customers(id),
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bill items"
  ON public.bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Finance reconciliation table
CREATE TABLE IF NOT EXISTS public.finance_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  matched_entity_type text,
  matched_entity_id uuid,
  match_status text NOT NULL DEFAULT 'unmatched',
  match_confidence numeric DEFAULT 0,
  matched_by uuid,
  amount numeric DEFAULT 0,
  matched_amount numeric DEFAULT 0,
  discrepancy numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage reconciliation"
  ON public.finance_reconciliation FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Period closings table
CREATE TABLE IF NOT EXISTS public.period_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL DEFAULT 'monthly',
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  checklist jsonb DEFAULT '[]'::jsonb,
  total_revenue numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  closed_by uuid,
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.period_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage period closings"
  ON public.period_closings FOR ALL TO authenticated USING (true) WITH CHECK (true);
