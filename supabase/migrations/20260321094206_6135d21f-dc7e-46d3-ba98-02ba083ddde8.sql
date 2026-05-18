-- Add INSERT trigger for create_ar_on_post so auto-posted invoices create AR records
CREATE OR REPLACE FUNCTION public.create_ar_on_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle INSERT: if invoice is already posted on creation
  IF TG_OP = 'INSERT' AND NEW.is_posted = TRUE THEN
    -- Create AR entry
    INSERT INTO public.accounts_receivable (
      invoice_id, customer_id, amount_due, balance, status, posting_date, due_date, currency_code
    ) VALUES (
      NEW.id, NEW.customer_id, NEW.total_amount, NEW.total_amount, 'unpaid', 
      COALESCE(NEW.invoice_date, CURRENT_DATE), NEW.due_date, COALESCE(NEW.currency_code, 'NGN')
    )
    ON CONFLICT DO NOTHING;

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

    -- Cr VAT Payable
    IF COALESCE(NEW.tax_amount, 0) > 0 THEN
      INSERT INTO public.accounting_ledger (
        entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
      ) VALUES (
        COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'vat_payable', 'liability',
        NEW.tax_amount, 'Invoice ' || NEW.invoice_number || ' VAT', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
      );
    END IF;

    NEW.balance_due := NEW.total_amount;
    NEW.posted_at := now();
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE: original logic
  IF TG_OP = 'UPDATE' AND NEW.is_posted = TRUE AND (OLD.is_posted = FALSE OR OLD.is_posted IS NULL) THEN
    INSERT INTO public.accounts_receivable (
      invoice_id, customer_id, amount_due, balance, status, posting_date, due_date, currency_code
    ) VALUES (
      NEW.id, NEW.customer_id, NEW.total_amount, NEW.total_amount, 'unpaid', 
      COALESCE(NEW.invoice_date, CURRENT_DATE), NEW.due_date, COALESCE(NEW.currency_code, 'NGN')
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.accounting_ledger (
      entry_date, reference_type, reference_id, account_name, account_type, debit, description, currency_code, posted_by
    ) VALUES (
      COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'accounts_receivable', 'asset',
      NEW.total_amount, 'Invoice ' || NEW.invoice_number || ' posted', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
    );

    INSERT INTO public.accounting_ledger (
      entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
    ) VALUES (
      COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'revenue', 'revenue',
      COALESCE(NEW.subtotal, NEW.amount), 'Invoice ' || NEW.invoice_number || ' revenue', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
    );

    IF COALESCE(NEW.tax_amount, 0) > 0 THEN
      INSERT INTO public.accounting_ledger (
        entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
      ) VALUES (
        COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'vat_payable', 'liability',
        NEW.tax_amount, 'Invoice ' || NEW.invoice_number || ' VAT', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
      );
    END IF;

    IF COALESCE(NEW.shipping_vat_amount, 0) > 0 THEN
      INSERT INTO public.accounting_ledger (
        entry_date, reference_type, reference_id, account_name, account_type, credit, description, currency_code, posted_by
      ) VALUES (
        COALESCE(NEW.invoice_date, CURRENT_DATE), 'invoice', NEW.id, 'vat_payable', 'liability',
        NEW.shipping_vat_amount, 'Invoice ' || NEW.invoice_number || ' Shipping VAT', COALESCE(NEW.currency_code, 'NGN'), NEW.posted_by
      );
    END IF;

    NEW.balance_due := NEW.total_amount;
    NEW.status := 'pending';
    NEW.posted_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add the INSERT trigger (keep the existing UPDATE trigger)
DROP TRIGGER IF EXISTS trigger_create_ar_on_insert ON invoices;
CREATE TRIGGER trigger_create_ar_on_insert
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_ar_on_post();