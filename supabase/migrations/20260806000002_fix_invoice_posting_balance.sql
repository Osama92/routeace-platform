-- ============================================================
-- FIX: invoice postings must balance to exactly zero
-- ============================================================
-- The initial posting layer credited Revenue from `subtotal` and
-- ignored `shipping_vat_amount`. Two live invoices carry shipping /
-- adjustment amounts that are included in total_amount but absent
-- from subtotal, producing a NGN10,500 ledger imbalance. A double-entry
-- ledger must net to exactly zero or the Trial Balance is meaningless.
--
-- Revenue is now DERIVED as the balancing figure:
--     revenue = total_amount - tax_amount - shipping_vat_amount
-- so Dr AR always equals Cr Revenue + Cr VAT regardless of source-data
-- quirks. shipping_vat_amount is now also credited to VAT Payable,
-- since it is likewise collected on behalf of FIRS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.post_invoice_to_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- Output VAT is the line VAT plus any shipping VAT — both are collected
  -- on behalf of FIRS and are a liability, not income.
  v_vat   numeric := COALESCE(NEW.tax_amount, 0) + COALESCE(NEW.shipping_vat_amount, 0);
  v_gross numeric := COALESCE(NEW.total_amount, 0);
  -- Revenue is derived as the balancing figure (gross less VAT) rather than
  -- read from subtotal. Some invoices carry shipping/adjustment amounts that
  -- are in total_amount but not in subtotal; deriving keeps every entry
  -- balanced (Dr AR = Cr Revenue + Cr VAT) regardless of those quirks.
  v_net   numeric := COALESCE(NEW.total_amount, 0)
                     - COALESCE(NEW.tax_amount, 0)
                     - COALESCE(NEW.shipping_vat_amount, 0);
  v_date  date    := COALESCE(NEW.invoice_date::date, NEW.created_at::date, CURRENT_DATE);
  v_desc  text    := 'Invoice ' || COALESCE(NEW.invoice_number, LEFT(NEW.id::text, 8));
BEGIN
  -- Drafts post nothing.
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Cancellation: reverse the document by zeroing its postings.
    IF NEW.status = 'cancelled' THEN
      UPDATE public.accounting_ledger
         SET debit = 0, credit = 0,
             description = v_desc || ' (cancelled)'
       WHERE reference_type = 'invoice' AND reference_id = NEW.id;

      UPDATE public.accounts_receivable
         SET status = 'cancelled', balance = 0, updated_at = now()
       WHERE invoice_id = NEW.id;

      RETURN NEW;
    END IF;

    -- Issued invoice: Dr AR / Cr Revenue + Cr VAT Payable
    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'invoice', NEW.id,
      'accounts_receivable', 'asset', v_gross, 0, v_desc);

    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'invoice', NEW.id,
      'revenue', 'revenue', 0, v_net, v_desc || ' - revenue');

    IF v_vat > 0 THEN
      PERFORM public.post_ledger_entry(
        NEW.organization_id, v_date, 'invoice', NEW.id,
        'vat_payable', 'liability', 0, v_vat, v_desc || ' - output VAT');
    END IF;

    -- AR subledger row
    INSERT INTO public.accounts_receivable (
      organization_id, invoice_id, customer_id, amount_due, amount_paid,
      balance, status, posting_date, due_date, currency_code
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.customer_id, v_gross,
      CASE WHEN NEW.status = 'paid' THEN v_gross ELSE 0 END,
      CASE WHEN NEW.status = 'paid' THEN 0 ELSE v_gross END,
      CASE
        WHEN NEW.status = 'paid' THEN 'paid'
        WHEN NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'unpaid'
      END,
      v_date, NEW.due_date, 'NGN'
    )
    ON CONFLICT (invoice_id) WHERE invoice_id IS NOT NULL DO UPDATE SET
      amount_due   = EXCLUDED.amount_due,
      amount_paid  = EXCLUDED.amount_paid,
      balance      = EXCLUDED.balance,
      status       = EXCLUDED.status,
      due_date     = EXCLUDED.due_date,
      updated_at   = now();

    -- Settlement: Dr Cash / Cr AR
    IF NEW.status = 'paid' THEN
      PERFORM public.post_ledger_entry(
        NEW.organization_id,
        COALESCE(NEW.paid_date::date, CURRENT_DATE),
        'invoice_payment', NEW.id,
        'cash_and_bank', 'asset', v_gross, 0, v_desc || ' - payment received');

      PERFORM public.post_ledger_entry(
        NEW.organization_id,
        COALESCE(NEW.paid_date::date, CURRENT_DATE),
        'invoice_payment', NEW.id,
        'accounts_receivable_settlement', 'asset', 0, v_gross,
        v_desc || ' - AR cleared');
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Posting must never block the business transaction.
    RAISE WARNING 'post_invoice_to_ledger failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_post_invoice_to_ledger ON public.invoices;
CREATE TRIGGER trg_post_invoice_to_ledger
  AFTER INSERT OR UPDATE OF status, total_amount, subtotal, tax_amount,
                            shipping_vat_amount, paid_date
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.post_invoice_to_ledger();
