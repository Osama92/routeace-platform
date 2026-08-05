-- ============================================================
-- Standardise expenses.is_cogs by category
-- ============================================================
-- PROBLEM
-- is_cogs was set inconsistently WITHIN the same category. Live data:
--     fuel      : 3 rows flagged COGS, 13 rows not
--     tolls     : 8 flagged,           10 not
--     repairs   : 3 flagged,           17 not
--     driver_salary : 2 flagged,        3 not
-- The same kind of cost was landing on both sides of the gross-margin
-- line depending on who entered it, so gross profit was arbitrary.
--
-- RULE APPLIED (standard haulage cost accounting)
-- Cost of Sales — costs incurred to deliver the service, which scale
-- with trips run:
--     fuel, driver_salary, maintenance, tolls, repairs, parking
-- Operating Expense — overheads that exist regardless of trip volume:
--     insurance, administrative, marketing, utilities, rent,
--     equipment, other
--
-- NOTES
-- * `equipment` is treated as OpEx, not COGS: equipment purchases are
--   capital/overhead rather than a per-trip delivery cost.
-- * `other` remains OpEx. In live data this bucket is dominated by a
--   NGN31m reimbursement, which is correctly an overhead. It is left
--   untouched deliberately — reclassifying it would materially and
--   wrongly change gross margin.
-- * A trigger keeps new rows consistent, but only when the caller has
--   not set is_cogs explicitly, so finance can still override per row.
-- ============================================================

-- 1. Backfill existing rows to the category rule
UPDATE public.expenses
SET is_cogs = (category::text IN
      ('fuel','driver_salary','maintenance','tolls','repairs','parking'))
WHERE is_cogs IS DISTINCT FROM
      (category::text IN
      ('fuel','driver_salary','maintenance','tolls','repairs','parking'));


-- 2. Drop the column default so an omitted is_cogs arrives as NULL.
--    Previously it defaulted to `false`, meaning an insert that simply
--    omitted the field silently classified a fuel or driver-salary cost
--    as overhead — which is how the inconsistency above arose. With the
--    default removed, NULL now means "not specified" and the trigger
--    below derives it from the category.
ALTER TABLE public.expenses ALTER COLUMN is_cogs DROP DEFAULT;


-- 3. Default the flag from category on insert when not explicitly provided
CREATE OR REPLACE FUNCTION public.set_expense_cogs_default()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Only fill in when the caller left it NULL. An explicit true/false
  -- from finance is always respected.
  IF NEW.is_cogs IS NULL THEN
    NEW.is_cogs := NEW.category::text IN
      ('fuel','driver_salary','maintenance','tolls','repairs','parking');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_expense_cogs_default ON public.expenses;
CREATE TRIGGER trg_set_expense_cogs_default
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_expense_cogs_default();
