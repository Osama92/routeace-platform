-- ============================================================
-- get_profit_loss_breakdown: Own-Truck vs 3PL channel split for the P&L
-- ============================================================
-- Spec: Finance wants the P&L to show revenue by own-truck vs 3PL (with
-- each channel's cost), an itemized "Own Truck COGS" breakdown (diesel,
-- driver wages, tolls/parking, repairs), a "Cost of Sales (3PL)" line for
-- amounts paid to 3PL vendors, and a correct consolidated Revenue/Gross
-- Profit/Net Profit.
--
-- CHANNEL SPLIT — dispatch_financials (client_revenue, vendor_cost,
-- finance_status) joined dispatch_id -> dispatches.vehicle_id ->
-- vehicles.ownership_type. 'owned' -> own_truck; 'vendor' and 'leased'
-- both -> third_party (3PL), per explicit product decision: a leased
-- truck is still an externally-sourced vehicle for cost-structure
-- purposes, grouped with vendor-sourced capacity rather than owned fleet.
-- finance_status = 'flagged' rows are excluded (disputed/incorrect,
-- should never flow into a statement); 'pending' rows ARE included
-- (accrued) per explicit product decision, using coalesce(entered_at,
-- created_at) for the period filter so a pending row with a NULL
-- entered_at isn't silently dropped from the period window.
--
-- OWN TRUCK COGS — expenses.is_cogs = true, grouped by category. Verified
-- against real production data (Relma Haulage) that is_cogs is a genuine
-- per-row flag, not strictly derived from category (e.g. 'repairs' rows
-- split roughly half is_cogs=true/half false) — so this filters by the
-- is_cogs boolean directly, matching the existing platform-wide
-- convention already used by FinancialStatements.tsx, ProfitLoss.tsx,
-- AdminAnalytics, etc. 'parking' (also is_cogs=true per
-- 20260806000004) has no line of its own in the user's requested
-- itemization (diesel/driver wages/tolls/repairs) and is folded into the
-- tolls line ("Tolls, Gate Fees & Parking"); any other category value
-- (e.g. a literal 'cogs' catch-all seen in real data) renders as "Other
-- Own Truck Costs" rather than leaking a raw enum slug into the UI — so
-- the itemized sum always ties out exactly to own_truck_cogs_total.
--
-- COST OF SALES (3PL) — third_party.cost above (dispatch_financials.
-- vendor_cost for vendor/leased vehicles), NOT bills. bills.vendor_name
-- mixes real 3PL haulage payments with unrelated trade payables (foam,
-- produce, etc.) with no category column to separate them, and the
-- bills-driven accounting_ledger cost_of_sales figure is a different,
-- non-reconciled number from dispatch_financials.vendor_cost. This
-- migration intentionally does not touch accounting_ledger or bills.
--
-- REVENUE — invoice_revenue (invoices.subtotal, ex-VAT, non-cancelled/
-- draft) remains the basis for the consolidated Revenue/Gross Profit/Net
-- Profit, unchanged from today's FinancialStatements.tsx logic. The
-- channel-split dispatch_revenue_total (own_truck.revenue + third_party.
-- revenue) is a separate, dispatch-level operational figure shown
-- alongside it with a reconciliation delta — the two are never forced to
-- be equal, since they come from different business processes (billing
-- cycle vs. per-dispatch finance entry).
--
-- Verified in a rolled-back dry run against Relma Haulage
-- (361edfe9-e6ff-4290-acba-2dda09c2b5fc) before applying: own_truck_cogs_total
-- (1,981,500) ties out exactly to the existing page's pre-change totalCogs
-- figure (also 1,981,500) — confirms no row is silently dropped by the new
-- itemization logic.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profit_loss_breakdown(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH channel AS (
    SELECT
      CASE WHEN v.ownership_type = 'owned' THEN 'own_truck' ELSE 'third_party' END AS bucket,
      df.client_revenue,
      df.vendor_cost,
      df.finance_status
    FROM public.dispatch_financials df
    JOIN public.dispatches d ON d.id = df.dispatch_id
    JOIN public.vehicles v ON v.id = d.vehicle_id
    WHERE df.organization_id = p_organization_id
      AND df.finance_status <> 'flagged'
      AND (p_period_start IS NULL OR coalesce(df.entered_at, df.created_at) >= p_period_start)
      AND (p_period_end IS NULL OR coalesce(df.entered_at, df.created_at) <= p_period_end)
  ),
  own_truck AS (
    SELECT
      coalesce(sum(client_revenue), 0) AS revenue,
      coalesce(sum(vendor_cost), 0) AS cost,
      count(*) AS dispatch_count,
      count(*) FILTER (WHERE finance_status = 'pending') AS pending_count
    FROM channel WHERE bucket = 'own_truck'
  ),
  third_party AS (
    SELECT
      coalesce(sum(client_revenue), 0) AS revenue,
      coalesce(sum(vendor_cost), 0) AS cost,
      count(*) AS dispatch_count,
      count(*) FILTER (WHERE finance_status = 'pending') AS pending_count
    FROM channel WHERE bucket = 'third_party'
  ),
  cogs_expenses AS (
    SELECT
      CASE
        WHEN category::text IN ('tolls', 'parking') THEN 'tolls_parking'
        WHEN category::text IN ('maintenance', 'repairs') THEN 'repairs'
        ELSE category::text
      END AS bucket_category,
      amount
    FROM public.expenses
    WHERE organization_id = p_organization_id
      AND is_cogs = true
      AND approval_status = 'approved'
      AND (p_period_start IS NULL OR expense_date >= p_period_start::date)
      AND (p_period_end IS NULL OR expense_date <= p_period_end::date)
  ),
  cogs_grouped AS (
    SELECT bucket_category, coalesce(sum(amount), 0) AS amount
    FROM cogs_expenses
    GROUP BY bucket_category
  ),
  opex_expenses AS (
    SELECT category::text AS category, amount
    FROM public.expenses
    WHERE organization_id = p_organization_id
      AND is_cogs = false
      AND approval_status = 'approved'
      AND (p_period_start IS NULL OR expense_date >= p_period_start::date)
      AND (p_period_end IS NULL OR expense_date <= p_period_end::date)
  ),
  opex_grouped AS (
    SELECT category, coalesce(sum(amount), 0) AS amount
    FROM opex_expenses
    GROUP BY category
  ),
  inv AS (
    SELECT
      coalesce(sum(subtotal), 0) AS revenue,
      coalesce(sum(tax_amount) + sum(shipping_vat_amount), 0) AS output_vat
    FROM public.invoices
    WHERE organization_id = p_organization_id
      AND status NOT IN ('cancelled', 'draft')
      AND (p_period_start IS NULL OR coalesce(invoice_date, created_at::date) >= p_period_start::date)
      AND (p_period_end IS NULL OR coalesce(invoice_date, created_at::date) <= p_period_end::date)
  ),
  bill AS (
    SELECT coalesce(sum(tax_amount), 0) AS input_vat
    FROM public.bills
    WHERE organization_id = p_organization_id
      AND payment_status <> 'cancelled'
      AND (p_period_start IS NULL OR coalesce(bill_date, created_at::date) >= p_period_start::date)
      AND (p_period_end IS NULL OR coalesce(bill_date, created_at::date) <= p_period_end::date)
  )
  SELECT jsonb_build_object(
    'own_truck', jsonb_build_object(
      'revenue', (SELECT revenue FROM own_truck),
      'cost', (SELECT cost FROM own_truck),
      'gross_profit', (SELECT revenue - cost FROM own_truck),
      'dispatch_count', (SELECT dispatch_count FROM own_truck),
      'pending_count', (SELECT pending_count FROM own_truck)
    ),
    'third_party', jsonb_build_object(
      'revenue', (SELECT revenue FROM third_party),
      'cost', (SELECT cost FROM third_party),
      'gross_profit', (SELECT revenue - cost FROM third_party),
      'dispatch_count', (SELECT dispatch_count FROM third_party),
      'pending_count', (SELECT pending_count FROM third_party)
    ),
    'cogs_breakdown', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'category', bucket_category,
        'label', CASE bucket_category
          WHEN 'fuel' THEN 'Diesel & Fuel'
          WHEN 'driver_salary' THEN 'Driver Wages (trip)'
          WHEN 'tolls_parking' THEN 'Tolls, Gate Fees & Parking'
          WHEN 'repairs' THEN 'Running Repairs (trip)'
          ELSE 'Other Own Truck Costs'
        END,
        'amount', amount
      ) ORDER BY amount DESC), '[]'::jsonb)
      FROM cogs_grouped
    ),
    'own_truck_cogs_total', (SELECT coalesce(sum(amount), 0) FROM cogs_grouped),
    'cost_of_sales_3pl', (SELECT cost FROM third_party),
    'invoice_revenue', (SELECT revenue FROM inv),
    'dispatch_revenue_total', (SELECT revenue FROM own_truck) + (SELECT revenue FROM third_party),
    'revenue_reconciliation_delta',
      ((SELECT revenue FROM own_truck) + (SELECT revenue FROM third_party)) - (SELECT revenue FROM inv),
    'output_vat', (SELECT output_vat FROM inv),
    'input_vat', (SELECT input_vat FROM bill),
    'tax_expense', greatest(0, (SELECT output_vat FROM inv) - (SELECT input_vat FROM bill)),
    'opex_total', (SELECT coalesce(sum(amount), 0) FROM opex_grouped),
    'opex_breakdown', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('category', category, 'amount', amount) ORDER BY amount DESC), '[]'::jsonb)
      FROM opex_grouped
    )
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.get_profit_loss_breakdown(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
