-- ============================================================
-- FIX: AP subledger must key on bill id, not bill_number
-- ============================================================
-- accounts_payable has no bill_id column, so the posting layer keyed
-- its rows on reference_number (= bills.bill_number). Production data
-- contains duplicate bill numbers — RHPRI-005-20260805 and
-- RHPRI-004-20260730 are each used by 3 different bills — so six bills
-- collapsed into two AP rows.
--
-- Effect: 21 bills produced only 17 AP rows and the AP subledger
-- under-reported outstanding payables by NGN2,775,557 versus the
-- general ledger (which was correct at NGN12,754,107).
--
-- Fix: add a real bill_id foreign key and key the subledger on it.
-- bill_number is retained in reference_number for display, but is no
-- longer the identity. The duplicate bill numbers themselves are a
-- separate data-quality issue for the business to resolve; this makes
-- the accounting correct regardless.
-- ============================================================

-- 1. Real foreign key to the source document
ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE;

-- 2. Retire the reference_number-based uniqueness
DROP INDEX IF EXISTS public.accounts_payable_reference_unique;

-- 3. Key on bill_id instead
CREATE UNIQUE INDEX IF NOT EXISTS accounts_payable_bill_unique
  ON public.accounts_payable (bill_id)
  WHERE bill_id IS NOT NULL;

-- 4. Clear the collapsed rows so the backfill can rebuild them cleanly.
--    Only removes rows this posting layer created (bill_id IS NULL means
--    it predates the fix); manually-entered AP rows are left untouched.
DELETE FROM public.accounts_payable WHERE bill_id IS NULL;


-- 5. Repost with bill_id as the key
CREATE OR REPLACE FUNCTION public.post_bill_to_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gross numeric := COALESCE(NEW.total_amount, NEW.amount, 0);
  v_vat   numeric := COALESCE(NEW.tax_amount, 0);
  v_net   numeric := COALESCE(NEW.total_amount, NEW.amount, 0) - COALESCE(NEW.tax_amount, 0);
  v_date  date    := COALESCE(NEW.bill_date::date, NEW.created_at::date, CURRENT_DATE);
  v_desc  text    := 'Bill ' || COALESCE(NEW.bill_number, LEFT(NEW.id::text, 8))
                     || COALESCE(' - ' || NEW.vendor_name, '');
BEGIN
  BEGIN
    IF NEW.payment_status = 'cancelled' THEN
      UPDATE public.accounting_ledger
         SET debit = 0, credit = 0, description = v_desc || ' (cancelled)'
       WHERE reference_type IN ('bill','bill_payment') AND reference_id = NEW.id;

      UPDATE public.accounts_payable
         SET status = 'cancelled', balance = 0, updated_at = now()
       WHERE bill_id = NEW.id;

      RETURN NEW;
    END IF;

    -- Dr Cost of Sales / Dr VAT Receivable / Cr AP
    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'bill', NEW.id,
      'cost_of_sales', 'expense', v_net, 0, v_desc);

    IF v_vat > 0 THEN
      PERFORM public.post_ledger_entry(
        NEW.organization_id, v_date, 'bill', NEW.id,
        'vat_receivable', 'asset', v_vat, 0, v_desc || ' - input VAT');
    END IF;

    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'bill', NEW.id,
      'accounts_payable', 'liability', 0, v_gross, v_desc);

    -- AP subledger row, keyed on the bill's id (bill_number is not unique)
    INSERT INTO public.accounts_payable (
      organization_id, bill_id, vendor_name, reference_number,
      amount_due, amount_paid, balance, status,
      posting_date, due_date, currency_code
    ) VALUES (
      NEW.organization_id, NEW.id,
      COALESCE(NEW.vendor_name, 'Vendor'),
      COALESCE(NEW.bill_number, NEW.id::text),
      v_gross,
      CASE WHEN NEW.payment_status = 'paid' THEN v_gross ELSE 0 END,
      CASE WHEN NEW.payment_status = 'paid' THEN 0 ELSE v_gross END,
      CASE
        WHEN NEW.payment_status = 'paid' THEN 'paid'
        WHEN NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'unpaid'
      END,
      v_date, NEW.due_date, 'NGN'
    )
    ON CONFLICT (bill_id) WHERE bill_id IS NOT NULL DO UPDATE SET
      amount_due       = EXCLUDED.amount_due,
      amount_paid      = EXCLUDED.amount_paid,
      balance          = EXCLUDED.balance,
      status           = EXCLUDED.status,
      due_date         = EXCLUDED.due_date,
      reference_number = EXCLUDED.reference_number,
      vendor_name      = EXCLUDED.vendor_name,
      updated_at       = now();

    -- Settlement: Dr AP / Cr Cash
    IF NEW.payment_status = 'paid' THEN
      PERFORM public.post_ledger_entry(
        NEW.organization_id, COALESCE(NEW.paid_at::date, CURRENT_DATE),
        'bill_payment', NEW.id,
        'accounts_payable_settlement', 'liability', v_gross, 0,
        v_desc || ' - paid');

      PERFORM public.post_ledger_entry(
        NEW.organization_id, COALESCE(NEW.paid_at::date, CURRENT_DATE),
        'bill_payment', NEW.id,
        'cash_and_bank_outflow', 'asset', 0, v_gross,
        v_desc || ' - cash paid');
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'post_bill_to_ledger failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END $$;
