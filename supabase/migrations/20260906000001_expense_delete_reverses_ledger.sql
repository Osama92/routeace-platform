-- ============================================================
-- Deleting an expense must reverse it out of the ledger
-- ============================================================
-- trg_post_expense_to_ledger fires on INSERT and on UPDATE OF amount,
-- approval_status, is_cogs, expense_date — but NOT on DELETE. So removing an
-- expense left its accounting_ledger rows behind: the money stayed in the
-- P&L with no source document, and the ledger no longer tied back to
-- anything. Verified against production before writing this: deleting a test
-- expense left 1 orphaned ledger row.
--
-- That was harmless while nothing could delete an expense. A super admin
-- delete button makes it a real risk, so the reversal comes first.
--
-- The ledger rows are REMOVED rather than contra-posted. An expense that is
-- deleted was entered in error — a duplicate, a typo — and should leave no
-- trace; a contra entry would imply a real transaction was reversed, which
-- is a different economic event. Where a genuine reversal is meant, the
-- correct action is a credit note, not a delete.
-- ============================================================

CREATE OR REPLACE FUNCTION public.unpost_expense_from_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  DELETE FROM public.accounting_ledger
  WHERE reference_type = 'expense'
    AND reference_id = OLD.id;

  RETURN OLD;
END $fn$;

DROP TRIGGER IF EXISTS trg_unpost_expense_from_ledger ON public.expenses;
CREATE TRIGGER trg_unpost_expense_from_ledger
  BEFORE DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.unpost_expense_from_ledger();

-- Clean up any rows already stranded by a delete that happened before this
-- trigger existed. Scoped to 'expense' references only, so nothing posted by
-- bills, invoices or payments is touched.
DELETE FROM public.accounting_ledger l
WHERE l.reference_type = 'expense'
  AND NOT EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = l.reference_id);
