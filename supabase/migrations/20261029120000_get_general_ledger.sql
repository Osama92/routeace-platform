-- ============================================================
-- get_general_ledger: paired journal-entry view over accounting_ledger
-- ============================================================
-- Spec: Finance → AR/AP Ledger → "General Ledger" tab should show a real
-- double-entry journal (Entry #, Account Code, Account Name, Debit, Credit,
-- Vehicle, Customer, Dispatch, Ownership), matching a provided mockup.
--
-- accounting_ledger IS the real, live posting table (confirmed ~614 rows
-- across 5 orgs), but it was never designed to look like a textbook
-- journal: no account_code (account_name is a bare string literal like
-- 'accounts_receivable'/'cost_of_sales'), no entry-number grouping, and
-- no vehicle/customer/dispatch/ownership columns. journal_entries DOES
-- have account_id/entry_number, but nothing has ever written to it (zero
-- rows platform-wide) — the posting triggers (post_invoice_to_ledger,
-- post_bill_to_ledger, post_expense_to_ledger) only write accounting_ledger.
-- Rather than start a second, currently-empty ledger table, this RPC
-- synthesizes the journal-entry view FROM accounting_ledger:
--
-- ENTRY GROUPING — one (reference_type, reference_id) pair is normally one
-- business event (e.g. all rows posted by a single invoice-issuance
-- trigger call), EXCEPT expense/expense_payment: verified against live
-- production that post_expense_to_ledger posts the expense leg
-- (operating_expense or cost_of_sales debit) and its payment leg
-- (cash_and_bank_expense credit) as two SEPARATE single-sided trigger
-- calls sharing the same reference_id — grouping those by
-- (reference_type, reference_id) would show each as its own unbalanced
-- "entry" (confirmed: platform total showed a real Dr/Cr mismatch before
-- this fix). Grouped by reference_id alone instead for this reference
-- type, merging the expense-recorded and expense-paid legs into one
-- balanced entry, since in this ledger both legs always share the same
-- underlying expenses.id. invoice/invoice_payment and bill/bill_payment
-- remain grouped by (reference_type, reference_id) — issuance and
-- settlement are genuinely separate, individually-balanced entries on
-- different dates for those document types (matching the mockup's own
-- JE-001 invoice vs. JE-004 payment as separate numbered entries).
-- dense_rank() over (entry_date, grouping key) gives a stable "JE-00N".
--
-- ACCOUNT CODE MAPPING — accounting_ledger.account_name has no FK to
-- chart_of_accounts, so this is a hardcoded literal->code lookup, not a
-- join. Verified exhaustive against live production
-- (select distinct account_name, account_type, reference_type): 13
-- combinations, all covered below. 'cost_of_sales' is the one ambiguous
-- literal — the new chart splits COGS into Diesel/Driver Wages/Tolls/
-- Repairs/3PL Haulage, so:
--   * cost_of_sales + reference_type='expense'  -> coded from
--     expenses.category (fuel->5100, driver_salary->5200, tolls/
--     parking->5300, maintenance/repairs->5900), falling back to 5900
--     for any other category value (mirrors the "Other Own Truck Costs"
--     fallback in get_profit_loss_breakdown for the same reason: a
--     literal 'cogs' catch-all category exists in real data).
--   * cost_of_sales + reference_type='bill'     -> coded 5800
--     Subcontracted Haulage (3PL). This can overstate 3PL haulage since
--     bills also cover ordinary trade payables with no category column
--     to separate them — same caveat already documented in
--     20261021130000_get_profit_loss_breakdown.sql for the same reason.
--
-- KNOWN DATA GAP — verified against live production that a small number
-- of entries (7 of 258 for the org tested) do not balance to zero even
-- after the expense/expense_payment grouping fix above. Root cause
-- traced to real gaps in the underlying accounting_ledger data itself
-- (e.g. one expense_payment row with no matching expense row — the
-- original expense-recorded leg is simply missing/was deleted), not a
-- grouping or join bug in this RPC. This is a pre-existing data-quality
-- issue in the live posting layer, out of scope to silently correct here
-- (touching the posting triggers or historical rows is a separate,
-- higher-risk task) — the UI must show the real Debit/Credit totals and
-- a non-zero "Difference" when they don't balance, exactly as the
-- mockup's own "TOTAL — must balance" / "Difference (must be 0)" rows
-- are designed to surface, rather than hide or fabricate a balancing
-- entry.
--
-- OWNERSHIP DIMENSION — only derivable where a ledger row traces back to
-- an expense with a populated vehicle_id (confirmed live: 93 of 126
-- expenses are vehicle-linked; cost_of_sales+operating_expense from
-- expenses = 129 ledger rows eligible). Chained expenses.vehicle_id ->
-- vehicles.ownership_type, 'owned' -> 'Owned', 'vendor'/'leased' -> '3PL'
-- (same bucketing as get_profit_loss_breakdown). ALL other rows —
-- invoice/invoice_payment (revenue/AR/VAT) and bill/bill_payment
-- (cost_of_sales-from-bills/AP) — have no reliable per-row vehicle or
-- dispatch link in this system today (invoices and bills are billing-
-- cycle documents, not dispatch-level ones) and are explicitly labelled
-- 'Unlinked' rather than fabricating a vehicle/dispatch. This was a
-- deliberate scope decision, not an oversight — see 20261021130000's own
-- comment on the same bills-vs-dispatch_financials gap.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_general_ledger(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  account_code TEXT,
  account_name TEXT,
  debit NUMERIC,
  credit NUMERIC,
  vehicle TEXT,
  customer TEXT,
  dispatch TEXT,
  ownership TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH base AS (
    SELECT
      al.entry_date,
      al.reference_type,
      al.reference_id,
      al.account_name AS raw_account_name,
      al.debit,
      al.credit,
      al.description,
      -- Account code + friendly name, from the fixed literal lookup.
      CASE
        WHEN al.account_name = 'accounts_receivable' THEN '1200'
        WHEN al.account_name = 'accounts_receivable_settlement' THEN '1200'
        WHEN al.account_name = 'revenue' THEN '4100'
        WHEN al.account_name = 'vat_payable' THEN '2200'
        WHEN al.account_name = 'vat_receivable' THEN '1300'
        WHEN al.account_name = 'accounts_payable' THEN '2000'
        WHEN al.account_name = 'accounts_payable_settlement' THEN '2000'
        WHEN al.account_name IN ('cash_and_bank', 'cash_and_bank_outflow', 'cash_and_bank_expense') THEN '1000'
        WHEN al.account_name = 'operating_expense' THEN '6200'
        WHEN al.account_name = 'cost_of_sales' AND al.reference_type = 'bill' THEN '5800'
        WHEN al.account_name = 'cost_of_sales' AND al.reference_type = 'expense' THEN
          CASE e.category::text
            WHEN 'fuel' THEN '5100'
            WHEN 'driver_salary' THEN '5200'
            WHEN 'tolls' THEN '5300'
            WHEN 'parking' THEN '5300'
            WHEN 'maintenance' THEN '5900'
            WHEN 'repairs' THEN '5900'
            ELSE '5900'
          END
        ELSE NULL
      END AS account_code,
      CASE
        WHEN al.account_name IN ('accounts_receivable', 'accounts_receivable_settlement') THEN 'Trade Receivables'
        WHEN al.account_name = 'revenue' THEN 'Freight Revenue'
        WHEN al.account_name = 'vat_payable' THEN 'Output VAT Payable'
        WHEN al.account_name = 'vat_receivable' THEN 'Input VAT Recoverable'
        WHEN al.account_name IN ('accounts_payable', 'accounts_payable_settlement') THEN 'Trade Payables'
        WHEN al.account_name IN ('cash_and_bank', 'cash_and_bank_outflow', 'cash_and_bank_expense') THEN 'Cash & Bank'
        WHEN al.account_name = 'operating_expense' THEN 'Depot & Admin'
        WHEN al.account_name = 'cost_of_sales' AND al.reference_type = 'bill' THEN 'Subcontracted Haulage (3PL)'
        WHEN al.account_name = 'cost_of_sales' AND al.reference_type = 'expense' THEN
          CASE e.category::text
            WHEN 'fuel' THEN 'Diesel & Fuel'
            WHEN 'driver_salary' THEN 'Driver Wages (trip)'
            WHEN 'tolls' THEN 'Tolls & Gate Fees'
            WHEN 'parking' THEN 'Tolls & Gate Fees'
            WHEN 'maintenance' THEN 'Running Repairs (trip)'
            WHEN 'repairs' THEN 'Running Repairs (trip)'
            ELSE 'Running Repairs (trip)'
          END
        ELSE al.account_name
      END AS friendly_account_name,
      -- Dimensions: only populated where a reliable chain exists.
      v.registration_number AS vehicle,
      cust.company_name AS customer,
      d.dispatch_number AS dispatch,
      CASE
        WHEN v.ownership_type = 'owned' THEN 'Owned'
        WHEN v.ownership_type IN ('vendor', 'leased') THEN '3PL'
        ELSE 'Unlinked'
      END AS ownership
    FROM public.accounting_ledger al
    LEFT JOIN public.expenses e ON al.reference_type IN ('expense', 'expense_payment') AND e.id = al.reference_id
    LEFT JOIN public.dispatches d ON d.id = e.dispatch_id
    LEFT JOIN public.vehicles v ON v.id = e.vehicle_id
    LEFT JOIN public.invoices inv ON al.reference_type IN ('invoice', 'invoice_payment') AND inv.id = al.reference_id
    LEFT JOIN public.customers cust ON cust.id = inv.customer_id
    WHERE al.organization_id = p_organization_id
      AND (p_period_start IS NULL OR al.entry_date >= p_period_start::date)
      AND (p_period_end IS NULL OR al.entry_date <= p_period_end::date)
  ),
  grouped AS (
    SELECT
      base.*,
      -- expense/expense_payment: merge both legs of the same expenses.id
      -- into one entry (see header comment). Everything else: each
      -- (reference_type, reference_id) is its own entry.
      CASE WHEN reference_type IN ('expense', 'expense_payment')
        THEN reference_id::text
        ELSE reference_type || ':' || reference_id::text
      END AS entry_group_key
    FROM base
  ),
  entry_dates AS (
    SELECT entry_group_key, min(entry_date) AS group_entry_date
    FROM grouped
    GROUP BY entry_group_key
  ),
  numbered AS (
    SELECT
      grouped.*,
      ed.group_entry_date,
      dense_rank() OVER (ORDER BY ed.group_entry_date, grouped.entry_group_key) AS entry_seq
    FROM grouped
    JOIN entry_dates ed ON ed.entry_group_key = grouped.entry_group_key
  )
  SELECT
    'JE-' || lpad(entry_seq::text, 3, '0') AS entry_number,
    group_entry_date AS entry_date,
    initcap(replace(reference_type, '_', ' ')) AS entry_type,
    coalesce(account_code, '----') AS account_code,
    friendly_account_name AS account_name,
    debit,
    credit,
    vehicle,
    customer,
    dispatch,
    ownership
  FROM numbered
  ORDER BY group_entry_date, entry_seq, debit DESC;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_general_ledger(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
