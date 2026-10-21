-- ============================================================
-- Replace Chart of Accounts with the standard 50-account chart
-- ============================================================
-- chart_of_accounts is global/shared reference data (no organization_id,
-- super-admin managed per migration 20260308225400). Verified before this
-- migration: only 4 rows exist in production (crypto/stablecoin
-- placeholders from 20260227045655), and the one real FK into this table
-- (journal_entries.account_id) has ZERO rows platform-wide — nothing links
-- to the 4 existing rows, so replacing them loses no linked data.
--
-- IMPORTANT — scope: this table is NOT the live financial ledger. The real
-- posting engine (accounting_ledger, 640+ real rows across 5 active orgs,
-- most recent entry within the last week) posts to its own hardcoded
-- string literals ('accounts_receivable', 'cost_of_sales', 'revenue', etc)
-- via post_invoice_to_ledger/post_bill_to_ledger/post_expense_to_ledger,
-- and is completely decoupled from chart_of_accounts — it always has been.
-- accounting_ledger.account_type is also its own separate, unconstrained
-- VARCHAR column (supabase/migrations/20260223113214), untouched by this
-- migration. This migration intentionally does NOT rewire that posting
-- layer — explicit user decision: replace the reference table only.
--
-- account_type CHECK is widened from the old 8 broad categories
-- (asset/liability/equity/revenue/cogs/expense/other_income/other_expense)
-- to the new chart's exact 10 types, since the new chart distinguishes
-- current vs fixed assets and current vs long-term liabilities, which the
-- old taxonomy couldn't express.
-- ============================================================

-- Clear the 4 placeholder rows (no linked journal_entries, verified above)
-- BEFORE widening the constraint — ADD CONSTRAINT validates all existing
-- rows immediately, and the 4 old rows use the OLD lowercase scheme
-- ('asset' etc), which the new CHECK doesn't include. Delete rather than
-- truncate so the FK from journal_entries (currently empty) degrades
-- gracefully (ON DELETE SET NULL) instead of being blocked.
DELETE FROM public.chart_of_accounts;

ALTER TABLE public.chart_of_accounts
  DROP CONSTRAINT IF EXISTS chart_of_accounts_account_type_check;

ALTER TABLE public.chart_of_accounts
  ADD CONSTRAINT chart_of_accounts_account_type_check
  CHECK (account_type IN (
    'current_asset', 'fixed_asset',
    'current_liability', 'long_term_liability',
    'equity', 'income', 'cogs', 'operating_expense',
    'finance_cost', 'tax'
  ));

INSERT INTO public.chart_of_accounts
  (account_code, account_name, account_type, account_group, normal_balance, is_system)
VALUES
  ('1000', 'Cash & Bank',                      'current_asset',       'Current Asset',       'Dr', true),
  ('1010', 'Petty Cash',                       'current_asset',       'Current Asset',       'Dr', true),
  ('1100', 'Prepaid Drops (RouteAce wallet)',  'current_asset',       'Current Asset',       'Dr', true),
  ('1200', 'Trade Receivables',                'current_asset',       'Current Asset',       'Dr', true),
  ('1210', 'Allowance for Doubtful Debts',     'current_asset',       'Current Asset',       'Cr', true),
  ('1300', 'Input VAT Recoverable',            'current_asset',       'Current Asset',       'Dr', true),
  ('1400', 'WHT Receivable',                   'current_asset',       'Current Asset',       'Dr', true),
  ('1500', 'Driver Advances',                  'current_asset',       'Current Asset',       'Dr', true),
  ('1550', 'Prepaid Insurance & Licences',     'current_asset',       'Current Asset',       'Dr', true),
  ('1600', 'Spare Parts & Fuel Stock',         'current_asset',       'Current Asset',       'Dr', true),
  ('1700', 'Trucks & Trailers (at cost)',      'fixed_asset',         'Fixed Asset',          'Dr', true),
  ('1705', 'Accum. Depreciation — Fleet',      'fixed_asset',         'Fixed Asset',          'Cr', true),
  ('1750', 'Workshop Plant & Equipment',       'fixed_asset',         'Fixed Asset',          'Dr', true),
  ('1800', 'Depot Land & Buildings',           'fixed_asset',         'Fixed Asset',          'Dr', true),
  ('1850', 'Right-of-Use Assets (leased)',     'fixed_asset',         'Fixed Asset',          'Dr', true),
  ('2000', 'Trade Payables',                   'current_liability',   'Current Liability',    'Cr', true),
  ('2100', 'Accrued Expenses',                 'current_liability',   'Current Liability',    'Cr', true),
  ('2200', 'Output VAT Payable',               'current_liability',   'Current Liability',    'Cr', true),
  ('2300', 'PAYE Payable',                     'current_liability',   'Current Liability',    'Cr', true),
  ('2310', 'Pension Payable',                  'current_liability',   'Current Liability',    'Cr', true),
  ('2350', 'WHT Payable',                      'current_liability',   'Current Liability',    'Cr', true),
  ('2400', 'CIT Payable',                      'current_liability',   'Current Liability',    'Cr', true),
  ('2410', 'Development Levy Payable',         'current_liability',   'Current Liability',    'Cr', true),
  ('2500', 'Truck Loans — current',            'current_liability',   'Current Liability',    'Cr', true),
  ('2800', 'Truck Loans — non-current',        'long_term_liability', 'Long-term Liability',  'Cr', true),
  ('2850', 'Lease Liability — non-current',    'long_term_liability', 'Long-term Liability',  'Cr', true),
  ('3000', 'Share Capital',                    'equity',              'Equity',                'Cr', true),
  ('3100', 'Retained Earnings',                'equity',              'Equity',                'Cr', true),
  ('3300', 'Directors'' Current Account',      'equity',              'Equity',                'Cr', true),
  ('4100', 'Freight Revenue',                  'income',              'Income',                'Cr', true),
  ('4200', 'Waiting & Demurrage Recovered',    'income',              'Income',                'Cr', true),
  ('4300', 'Additional Drops Revenue',         'income',              'Income',                'Cr', true),
  ('4900', 'Rebates & Credits (contra)',       'income',              'Income',                'Dr', true),
  ('5100', 'Diesel & Fuel',                    'cogs',                'COGS',                  'Dr', true),
  ('5200', 'Driver Wages (trip)',              'cogs',                'COGS',                  'Dr', true),
  ('5300', 'Tolls & Gate Fees',                'cogs',                'COGS',                  'Dr', true),
  ('5400', 'Loading & Offloading',             'cogs',                'COGS',                  'Dr', true),
  ('5500', 'Security & Escort',                'cogs',                'COGS',                  'Dr', true),
  ('5800', 'Subcontracted Haulage (3PL)',      'cogs',                'COGS',                  'Dr', true),
  ('5900', 'Running Repairs (trip)',           'cogs',                'COGS',                  'Dr', true),
  ('6100', 'Insurance, Licences, Permits',     'operating_expense',   'Operating Expense',     'Dr', true),
  ('6200', 'Depot & Admin',                    'operating_expense',   'Operating Expense',     'Dr', true),
  ('6300', 'Office Salaries',                  'operating_expense',   'Operating Expense',     'Dr', true),
  ('6500', 'Depreciation',                     'operating_expense',   'Operating Expense',     'Dr', true),
  ('6900', 'Software Subscriptions',           'operating_expense',   'Operating Expense',     'Dr', true),
  ('8000', 'Finance Costs (loan interest)',    'finance_cost',        'Finance Cost',          'Dr', true),
  ('9000', 'Company Income Tax',               'tax',                 'Tax',                   'Dr', true),
  ('9100', 'Development Levy',                 'tax',                 'Tax',                   'Dr', true);
