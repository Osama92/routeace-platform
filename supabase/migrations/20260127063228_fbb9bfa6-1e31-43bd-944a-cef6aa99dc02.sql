-- Create invoice line items table for extra drops and detailed line items
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'service', -- 'service', 'extra_drop', 'fuel_surcharge', 'toll_fee', 'other'
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  dispatch_id UUID REFERENCES public.dispatches(id),
  dropoff_address TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoice line items"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoice line items"
  ON public.invoice_line_items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete invoice line items"
  ON public.invoice_line_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add index for invoice lookup
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- Add invoice_locked column to prevent editing synced invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS locked_reason TEXT;