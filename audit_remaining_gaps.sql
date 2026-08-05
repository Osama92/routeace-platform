-- ============================================================
-- REMAINING ISOLATION GAPS — run in Supabase SQL Editor.
-- Read-only. This is the part of the audit still outstanding.
-- Please return the output of ALL THREE queries below.
-- ============================================================


-- ── QUERY A ── MOST IMPORTANT ─────────────────────────────────
-- Tables that HAVE an organization_id but are NOT protected:
-- either RLS is off, or the tenant_isolation_gate is missing.
-- Any row returned here is an outright unprotected tenant table
-- and outranks everything else in priority.
--
-- EXPECTED RESULT: zero rows.
SELECT
  c.table_name,
  t.rowsecurity                                   AS rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename  = c.table_name
      AND p.policyname = 'tenant_isolation_gate'
  )                                               AS has_gate,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=c.table_name) AS policy_count
FROM information_schema.columns c
JOIN pg_tables t
  ON t.schemaname = 'public' AND t.tablename = c.table_name
WHERE c.table_schema = 'public'
  AND c.column_name  = 'organization_id'
  AND (
    t.rowsecurity = false
    OR NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename  = c.table_name
        AND p.policyname = 'tenant_isolation_gate'
    )
  )
ORDER BY t.rowsecurity, c.table_name;


-- ── QUERY B ───────────────────────────────────────────────────
-- Tables with RLS enabled that hold NO organization_id column,
-- so the gate could never apply. bill_items and invoice_line_items
-- were the two we already fixed via parent-resolving gates.
-- This shows whether any OTHER tenant-bearing child tables are
-- in the same position and still need the same treatment.
--
-- Many rows here are legitimately global (lookup/config/platform
-- tables) — I will classify them; I need the list.
SELECT
  t.tablename,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=t.tablename) AS policy_count,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=t.tablename
      AND p.policyname LIKE 'tenant_isolation_gate%'
  ) AS has_any_gate
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public'
      AND c.table_name = t.tablename
      AND c.column_name = 'organization_id'
  )
ORDER BY has_any_gate, t.tablename;


-- ── QUERY C ───────────────────────────────────────────────────
-- Data reality check: confirms which "orphan" tables are truly
-- empty (so every dashboard reading them is stuck at zero) versus
-- which actually hold data. Drives the repair priority order.
SELECT 'accounts_receivable'      AS tbl, count(*) AS rows FROM public.accounts_receivable
UNION ALL SELECT 'accounts_payable',        count(*) FROM public.accounts_payable
UNION ALL SELECT 'accounting_ledger',       count(*) FROM public.accounting_ledger
UNION ALL SELECT 'journal_entries',         count(*) FROM public.journal_entries
UNION ALL SELECT 'tax_ledger',              count(*) FROM public.tax_ledger
UNION ALL SELECT 'tax_rates',               count(*) FROM public.tax_rates
UNION ALL SELECT 'ar_payments',             count(*) FROM public.ar_payments
UNION ALL SELECT 'sla_policies',            count(*) FROM public.sla_policies
UNION ALL SELECT 'sla_contracts',           count(*) FROM public.sla_contracts
UNION ALL SELECT 'partners',                count(*) FROM public.partners
UNION ALL SELECT 'revenue_contracts',       count(*) FROM public.revenue_contracts
UNION ALL SELECT 'cash_transactions',       count(*) FROM public.cash_transactions
UNION ALL SELECT 'warehouses',              count(*) FROM public.warehouses
-- live tables for contrast: these SHOULD be non-zero
UNION ALL SELECT 'zz LIVE invoices',        count(*) FROM public.invoices
UNION ALL SELECT 'zz LIVE bills',           count(*) FROM public.bills
UNION ALL SELECT 'zz LIVE dispatches',      count(*) FROM public.dispatches
UNION ALL SELECT 'zz LIVE expenses',        count(*) FROM public.expenses
ORDER BY 1;
