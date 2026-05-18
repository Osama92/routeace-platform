
-- 1. Add new columns to invoices table
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR DEFAULT 'RA',
  ADD COLUMN IF NOT EXISTS invoice_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_by UUID,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_charge DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_vat_rate DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_vat_amount DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due DECIMAL,
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR DEFAULT 'NGN';

-- 2. Add new columns to invoice_line_items table
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS tonnage VARCHAR,
  ADD COLUMN IF NOT EXISTS vat_rate DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate DECIMAL DEFAULT 0;

-- 3. Create accounts_receivable table
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  amount_due DECIMAL NOT NULL DEFAULT 0,
  amount_paid DECIMAL NOT NULL DEFAULT 0,
  balance DECIMAL NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency_code VARCHAR DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create accounts_payable table
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name VARCHAR NOT NULL,
  reference_number VARCHAR,
  amount_due DECIMAL NOT NULL DEFAULT 0,
  amount_paid DECIMAL NOT NULL DEFAULT 0,
  balance DECIMAL NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  category VARCHAR,
  notes TEXT,
  currency_code VARCHAR DEFAULT 'NGN',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create accounting_ledger for double-entry
CREATE TABLE IF NOT EXISTS public.accounting_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR NOT NULL, -- 'invoice', 'payment', 'expense', 'journal'
  reference_id UUID,
  account_name VARCHAR NOT NULL, -- 'accounts_receivable', 'revenue', 'cash', 'vat_payable', etc.
  account_type VARCHAR NOT NULL, -- 'asset', 'liability', 'revenue', 'expense', 'equity'
  debit DECIMAL NOT NULL DEFAULT 0,
  credit DECIMAL NOT NULL DEFAULT 0,
  description TEXT,
  currency_code VARCHAR DEFAULT 'NGN',
  posted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create AR payment tracking
CREATE TABLE IF NOT EXISTS public.ar_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ar_id UUID REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  amount DECIMAL NOT NULL,
  payment_method VARCHAR,
  payment_reference VARCHAR,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable RLS on new tables
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payments ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for accounts_receivable
CREATE POLICY "Authenticated users can view AR" ON public.accounts_receivable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage AR" ON public.accounts_receivable FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 9. RLS policies for accounts_payable
CREATE POLICY "Authenticated users can view AP" ON public.accounts_payable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage AP" ON public.accounts_payable FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 10. RLS policies for accounting_ledger
CREATE POLICY "Authenticated users can view ledger" ON public.accounting_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage ledger" ON public.accounting_ledger FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 11. RLS policies for ar_payments
CREATE POLICY "Authenticated users can view payments" ON public.ar_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Finance can manage payments" ON public.ar_payments FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 12. Function to auto-create AR on invoice posting
CREATE OR REPLACE FUNCTION public.create_ar_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when is_posted changes to true
  IF NEW.is_posted = TRUE AND (OLD.is_posted = FALSE OR OLD.is_posted IS NULL) THEN
    -- Create AR entry
    INSERT INTO public.accounts_receivable (
      invoice_id, customer_id, amount_due, balance, status, posting_date, due_date, currency_code
    ) VALUES (
      NEW.id, NEW.customer_id, NEW.total_amount, NEW.total_amount, 'unpaid', 
      COALESCE(NEW.invoice_date, CURRENT_DATE), NEW.due_date, COALESCE(NEW.currency_code, 'NGN')
    )
    ON CONFLICT DO NOTHING;

    -- Create double-entry ledger entries
    -- Dr Accounts Receivable
    INSERT INTO public.accounting_ledger (
      entry_date, reference_type, reference_id, account_name, account_type, debit, description, currency_code, posted_by
    ) VALUES (
      COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'accounts_receivable', 'asset',
      NEW.total_amount, 'Invoice ' || NEW.invoice_number || ' posted', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
    );

    -- Cr Revenue
    INSERT INTO public.accounting_ledger (
      entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
    ) VALUES (
      COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'revenue', 'revenue',
      COALESCE(NEW.subtotal, NEW.amount), 'Invoice ' || NEW.invoice_number || ' revenue', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
    );

    -- Cr VAT Payable (if tax > 0)
    IF COALESCE(NEW.tax_amount, 0) > 0 THEN
      INSERT INTO public.accounting_ledger (
        entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
      ) VALUES (
        COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'vat_payable', 'liability',
        NEW.tax_amount, 'Invoice ' || NEW.invoice_number || ' VAT', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
      );
    END IF;

    -- Cr Shipping VAT Payable (if shipping vat > 0)
    IF COALESCE(NEW.shipping_vat_amount, 0) > 0 THEN
      INSERT INTO public.accounting_ledger (
        entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
      ) VALUES (
        COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'vat_payable', 'liability',
        NEW.shipping_vat_amount, 'Invoice ' || NEW.invoice_number || ' Shipping VAT', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
      );
    END IF;

    -- Update invoice balance_due
    NEW.balance_due := NEW.total_amount;
    NEW.status := 'pending';
    NEW.posted_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 13. Create trigger for AR creation
CREATE TRIGGER trigger_create_ar_on_post
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ar_on_post();

-- 14. Updated at triggers
CREATE TRIGGER update_ar_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ap_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
