-- ============================================================
-- ACCOUNTING POSTING LAYER
-- ============================================================
-- Problem this solves:
--   The reporting surface (Financial Statements, CFO Dashboard, AI CFO,
--   Treasury Risk, KPI Dashboard, Sovereign Reporting, Period Closing,
--   Finance Ledger, Decision Cockpit, ...) was built to read from
--   accounting_ledger / accounts_receivable / accounts_payable.
--   Nothing ever wrote to them, so every one of those screens reported
--   zero regardless of business activity.
--
-- This migration installs the missing posting layer: database triggers
-- that emit balanced double-entry rows whenever a financial event
-- occurs, exactly as Zoho/QuickBooks do.
--
-- ── POSTING RULES ────────────────────────────────────────────
--
-- Invoice issued (leaves draft):
--     Dr  Accounts Receivable      total_amount   (asset ↑)
--       Cr  Revenue                subtotal       (income ↑)
--       Cr  VAT Payable            tax_amount     (liability ↑)
--   Revenue is recognised NET of VAT. Output VAT is money collected on
--   behalf of FIRS and is a liability, never income.
--
-- Invoice paid:
--     Dr  Cash & Bank              total_amount   (asset ↑)
--       Cr  Accounts Receivable    total_amount   (asset ↓)
--
-- Bill received:
--     Dr  Cost / Expense           net (ex-VAT)   (expense ↑)
--     Dr  VAT Receivable           tax_amount     (asset ↑ — recoverable)
--       Cr  Accounts Payable       total_amount   (liability ↑)
--
-- Bill paid:
--     Dr  Accounts Payable         total_amount   (liability ↓)
--       Cr  Cash & Bank            total_amount   (asset ↓)
--
-- Expense recorded (cash/other, not via a vendor bill):
--     Dr  COGS or Operating Expense   amount
--       Cr  Cash & Bank                amount
--
-- ── DESIGN NOTES ─────────────────────────────────────────────
-- * Draft invoices post NOTHING. A draft is an unissued document: not
--   revenue, not a receivable, no VAT liability.
-- * Cancelled documents reverse rather than delete, preserving the
--   audit trail.
-- * Every posting is idempotent on (reference_type, reference_id,
--   account_name) so re-running the backfill cannot double-post.
-- * All rows carry organization_id, so the existing
--   tenant_isolation_gate applies automatically.
-- * Triggers are AFTER and exception-safe: a posting failure must never
--   block the underlying business transaction.
-- ============================================================


-- ── 0. Idempotency key ───────────────────────────────────────
-- One posting per (document, account). Prevents double-posting on
-- re-run of the backfill or a repeated status transition.
CREATE UNIQUE INDEX IF NOT EXISTS accounting_ledger_unique_posting
  ON public.accounting_ledger (reference_type, reference_id, account_name)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_ledger_org_date
  ON public.accounting_ledger (organization_id, entry_date DESC);

-- Subledger idempotency keys. These did NOT exist — accounts_receivable
-- and accounts_payable had only a PK on id — so the ON CONFLICT clauses
-- in the posting functions below depend on creating them here. Without
-- them each re-post would insert a duplicate subledger row.
CREATE UNIQUE INDEX IF NOT EXISTS accounts_receivable_invoice_unique
  ON public.accounts_receivable (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_payable_reference_unique
  ON public.accounts_payable (reference_number)
  WHERE reference_number IS NOT NULL;


-- ── 1. Posting helper ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  p_org_id      uuid,
  p_date        date,
  p_ref_type    text,
  p_ref_id      uuid,
  p_account     text,
  p_acct_type   text,
  p_debit       numeric,
  p_credit      numeric,
  p_description text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Never post a zero-value line; it adds noise without information.
  IF COALESCE(p_debit,0) = 0 AND COALESCE(p_credit,0) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.accounting_ledger (
    organization_id, entry_date, reference_type, reference_id,
    account_name, account_type, debit, credit, description, currency_code
  ) VALUES (
    p_org_id, COALESCE(p_date, CURRENT_DATE), p_ref_type, p_ref_id,
    p_account, p_acct_type, COALESCE(p_debit,0), COALESCE(p_credit,0),
    p_description, 'NGN'
  )
  ON CONFLICT (reference_type, reference_id, account_name)
  WHERE reference_id IS NOT NULL
  DO UPDATE SET
    debit       = EXCLUDED.debit,
    credit      = EXCLUDED.credit,
    entry_date  = EXCLUDED.entry_date,
    description = EXCLUDED.description;
END $$;


-- ── 2. Invoice posting ───────────────────────────────────────
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


-- ── 3. Bill posting ──────────────────────────────────────────
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
       WHERE reference_number = COALESCE(NEW.bill_number, NEW.id::text);

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

    -- AP subledger row (keyed on reference_number: no bill_id column exists)
    INSERT INTO public.accounts_payable (
      organization_id, vendor_name, reference_number, amount_due, amount_paid,
      balance, status, posting_date, due_date, currency_code
    ) VALUES (
      NEW.organization_id,
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
    ON CONFLICT (reference_number) WHERE reference_number IS NOT NULL DO UPDATE SET
      amount_due  = EXCLUDED.amount_due,
      amount_paid = EXCLUDED.amount_paid,
      balance     = EXCLUDED.balance,
      status      = EXCLUDED.status,
      due_date    = EXCLUDED.due_date,
      updated_at  = now();

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

DROP TRIGGER IF EXISTS trg_post_bill_to_ledger ON public.bills;
CREATE TRIGGER trg_post_bill_to_ledger
  AFTER INSERT OR UPDATE OF payment_status, total_amount, amount, tax_amount, paid_at
  ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_to_ledger();


-- ── 4. Expense posting ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_expense_to_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amt   numeric := COALESCE(NEW.amount, 0);
  v_date  date    := COALESCE(NEW.expense_date, CURRENT_DATE);
  v_acct  text    := CASE WHEN COALESCE(NEW.is_cogs,false)
                          THEN 'cost_of_sales' ELSE 'operating_expense' END;
  v_desc  text    := COALESCE(NEW.description, 'Expense')
                     || COALESCE(' (' || NEW.category::text || ')', '');
BEGIN
  -- Only approved expenses hit the books.
  IF COALESCE(NEW.approval_status, 'approved') <> 'approved' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'expense', NEW.id,
      v_acct, 'expense', v_amt, 0, v_desc);

    PERFORM public.post_ledger_entry(
      NEW.organization_id, v_date, 'expense_payment', NEW.id,
      'cash_and_bank_expense', 'asset', 0, v_amt, v_desc || ' - paid');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'post_expense_to_ledger failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_post_expense_to_ledger ON public.expenses;
CREATE TRIGGER trg_post_expense_to_ledger
  AFTER INSERT OR UPDATE OF amount, approval_status, is_cogs, expense_date
  ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.post_expense_to_ledger();
