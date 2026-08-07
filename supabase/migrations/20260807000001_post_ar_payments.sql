-- ============================================================
-- AR PAYMENTS POSTING
-- ============================================================
-- ar_payments is read by Finance Reconciliation, Period Closing and
-- FMCG Finance but nothing ever wrote to it, so those screens showed
-- zero collections regardless of activity.
--
-- Settlement data already exists: invoices.status = 'paid' with a
-- paid_date, and every paid invoice already has an accounts_receivable
-- row created by the posting layer. This migration records the
-- settlement as a first-class payment row.
--
-- Scope note: the platform records full settlement only (an invoice is
-- either paid or not) — there is no partial-payment capture UI. So one
-- payment row per paid invoice is correct today. If partial payments are
-- added later, the unique index below should move to a composite key
-- that includes the payment reference.
-- ============================================================

-- Idempotency: one posted payment per invoice. Manual rows entered
-- through a future UI would carry their own invoice_id and are
-- deliberately covered by the same constraint.
CREATE UNIQUE INDEX IF NOT EXISTS ar_payments_invoice_unique
  ON public.ar_payments (invoice_id)
  WHERE invoice_id IS NOT NULL;


CREATE OR REPLACE FUNCTION public.post_ar_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ar_id  uuid;
  v_amount numeric := COALESCE(NEW.total_amount, 0);
BEGIN
  -- Only on settlement, and never for drafts/cancellations.
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- ar_id is nullable but FK-constrained; resolve it where the
    -- subledger row exists so the payment links to its receivable.
    SELECT id INTO v_ar_id
    FROM public.accounts_receivable
    WHERE invoice_id = NEW.id
    LIMIT 1;

    INSERT INTO public.ar_payments (
      organization_id, ar_id, invoice_id, amount,
      payment_method, payment_reference, payment_date, notes
    ) VALUES (
      NEW.organization_id,
      v_ar_id,
      NEW.id,
      v_amount,
      'unspecified',
      NEW.invoice_number,
      COALESCE(NEW.paid_date::date, CURRENT_DATE),
      'Auto-recorded on invoice settlement'
    )
    ON CONFLICT (invoice_id) WHERE invoice_id IS NOT NULL
    DO UPDATE SET
      amount       = EXCLUDED.amount,
      payment_date = EXCLUDED.payment_date,
      ar_id        = COALESCE(ar_payments.ar_id, EXCLUDED.ar_id);

  EXCEPTION WHEN OTHERS THEN
    -- Never block the invoice update on a payment-posting failure.
    RAISE WARNING 'post_ar_payment failed for invoice %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_post_ar_payment ON public.invoices;
CREATE TRIGGER trg_post_ar_payment
  AFTER INSERT OR UPDATE OF status, paid_date, total_amount
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.post_ar_payment();
