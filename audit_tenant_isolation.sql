-- ============================================================
-- TENANT ISOLATION AUDIT — run in Supabase SQL Editor
-- Returns the authoritative live state. Read-only, safe to run.
-- ============================================================

-- ── QUERY 1: HIGH RISK ────────────────────────────────────────
-- Tables with RLS enabled, holding tenant data, but with NO
-- organization_id column — so tenant_isolation_gate could never
-- be applied to them. If their policies are role-only, any user
-- with that role sees EVERY organization's rows.
SELECT
  t.tablename,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=t.tablename
      AND p.policyname='tenant_isolation_gate'
  ) THEN 'gated' ELSE 'NO GATE' END AS gate_status,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=t.tablename) AS policy_count
FROM pg_tables t
WHERE t.schemaname='public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=t.tablename
      AND c.column_name='organization_id'
  )
ORDER BY t.tablename;


-- ── QUERY 2: CRITICAL ─────────────────────────────────────────
-- Tables that HAVE organization_id but are MISSING the gate.
-- These are outright unprotected tenant tables.
SELECT
  c.table_name,
  t.rowsecurity AS rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=c.table_name
      AND p.policyname='tenant_isolation_gate'
  ) AS has_gate
FROM information_schema.columns c
JOIN pg_tables t ON t.schemaname='public' AND t.tablename=c.table_name
WHERE c.table_schema='public'
  AND c.column_name='organization_id'
  AND (
    t.rowsecurity = false
    OR NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=c.table_name
        AND p.policyname='tenant_isolation_gate'
    )
  )
ORDER BY t.rowsecurity, c.table_name;


-- ── QUERY 3: DATA REALITY CHECK ───────────────────────────────
-- Row counts for the "orphan" tables the UI reads but nothing writes.
-- Confirms which dashboards are structurally guaranteed to show zero.
SELECT 'accounts_receivable' AS tbl, count(*) FROM public.accounts_receivable
UNION ALL SELECT 'accounts_payable',      count(*) FROM public.accounts_payable
UNION ALL SELECT 'accounting_ledger',     count(*) FROM public.accounting_ledger
UNION ALL SELECT 'journal_entries',       count(*) FROM public.journal_entries
UNION ALL SELECT 'tax_ledger',            count(*) FROM public.tax_ledger
UNION ALL SELECT 'tax_rates',             count(*) FROM public.tax_rates
UNION ALL SELECT 'ar_payments',           count(*) FROM public.ar_payments
UNION ALL SELECT 'sla_policies',          count(*) FROM public.sla_policies
UNION ALL SELECT 'sla_contracts',         count(*) FROM public.sla_contracts
UNION ALL SELECT 'partners',              count(*) FROM public.partners
UNION ALL SELECT 'warehouses',            count(*) FROM public.warehouses
UNION ALL SELECT 'revenue_contracts',     count(*) FROM public.revenue_contracts
UNION ALL SELECT 'cash_transactions',     count(*) FROM public.cash_transactions
-- live tables for contrast (these should be non-zero)
UNION ALL SELECT '-- invoices (live)',    count(*) FROM public.invoices
UNION ALL SELECT '-- bills (live)',       count(*) FROM public.bills
UNION ALL SELECT '-- dispatches (live)',  count(*) FROM public.dispatches
UNION ALL SELECT '-- expenses (live)',    count(*) FROM public.expenses
ORDER BY 1;


-- ── QUERY 4: CROSS-TENANT LEAK PROOF ──────────────────────────
-- Do bill_items / invoice_line_items span multiple organizations?
-- If distinct_orgs > 1 and the table has no org gate, a finance user
-- in one org can read another org's line items.
SELECT 'bill_items' AS tbl,
       count(*) AS rows,
       count(DISTINCT b.organization_id) AS distinct_orgs
FROM public.bill_items bi JOIN public.bills b ON b.id = bi.bill_id
UNION ALL
SELECT 'invoice_line_items',
       count(*),
       count(DISTINCT i.organization_id)
FROM public.invoice_line_items ili JOIN public.invoices i ON i.id = ili.invoice_id;
