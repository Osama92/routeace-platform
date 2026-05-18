
-- Create bills table for structured vendor payables
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL DEFAULT '',
  vendor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  due_date DATE,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  linked_asset_id UUID,
  linked_expense_id UUID,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  created_by UUID,
  currency_code TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can manage bills
CREATE POLICY "Authenticated users can view bills"
  ON public.bills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create bills"
  ON public.bills FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update bills"
  ON public.bills FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete bills"
  ON public.bills FOR DELETE TO authenticated USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Generate bill number
CREATE OR REPLACE FUNCTION public.generate_bill_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
    NEW.bill_number := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_bill_number_trigger
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_bill_number();
