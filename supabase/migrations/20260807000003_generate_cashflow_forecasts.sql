-- ============================================================
-- CASHFLOW FORECAST GENERATION
-- ============================================================
-- cashflow_forecasts is read by the CFO Dashboard but nothing ever wrote
-- to it, so the forecast panel always showed zero.
--
-- The inputs already exist: unpaid invoices carry a due_date (expected
-- inflow) and unpaid bills carry a due_date (expected outflow). This
-- function projects them onto the forecast calendar.
--
-- Both AR collection and AP settlement are OPERATING activities. The
-- category CHECK constraint permits only operating / investing /
-- financing, so investing and financing are deliberately not emitted —
-- the platform captures no capex or financing schedule to derive them
-- from, and inventing rows there would misstate the forecast.
--
-- Confidence is graded by how overdue the item is, mirroring the AR
-- aging weighting already used in Cashflow Forecasting AI:
--     not yet due .... 90
--     0-30 days late . 75
--     31-60 .......... 55
--     61-90 .......... 35
--     90+ ............ 15
--
-- The function is idempotent: it clears its own generated rows for the
-- horizon before regenerating. Rows created by any future manual entry
-- are distinguished by ai_notes and are not touched.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_cashflow_forecasts(
  p_org_id       uuid DEFAULT NULL,
  p_horizon_days int  DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inflow_rows  int := 0;
  v_outflow_rows int := 0;
  v_horizon_end  date := CURRENT_DATE + (p_horizon_days || ' days')::interval;
BEGIN
  -- Remove previously generated rows for the horizon so re-running does
  -- not accumulate duplicates. Only auto-generated rows are removed.
  DELETE FROM public.cashflow_forecasts
  WHERE ai_notes = 'auto:ar_ap_projection'
    AND forecast_date >= CURRENT_DATE
    AND forecast_date <= v_horizon_end
    AND (p_org_id IS NULL OR organization_id = p_org_id);

  -- ── Expected inflows: unpaid invoices, bucketed by due date ────
  WITH ar AS (
    SELECT
      i.organization_id,
      COALESCE(i.due_date, i.invoice_date, i.created_at::date) AS due,
      SUM(i.total_amount) AS amt,
      MIN(COALESCE(i.due_date, i.invoice_date, i.created_at::date)) AS earliest
    FROM public.invoices i
    WHERE i.status NOT IN ('paid', 'cancelled', 'draft')
      AND i.organization_id IS NOT NULL
      AND (p_org_id IS NULL OR i.organization_id = p_org_id)
    GROUP BY 1, 2
  )
  INSERT INTO public.cashflow_forecasts (
    organization_id, forecast_date, category, subcategory,
    projected_inflow, projected_outflow, confidence_score, ai_notes
  )
  SELECT
    ar.organization_id,
    -- Overdue items are expected today rather than in the past.
    GREATEST(ar.due, CURRENT_DATE),
    'operating',
    'accounts_receivable',
    ar.amt,
    0,
    CASE
      WHEN ar.due >= CURRENT_DATE                     THEN 90
      WHEN ar.due >= CURRENT_DATE - INTERVAL '30 days' THEN 75
      WHEN ar.due >= CURRENT_DATE - INTERVAL '60 days' THEN 55
      WHEN ar.due >= CURRENT_DATE - INTERVAL '90 days' THEN 35
      ELSE 15
    END,
    'auto:ar_ap_projection'
  FROM ar
  WHERE GREATEST(ar.due, CURRENT_DATE) <= v_horizon_end;
  GET DIAGNOSTICS v_inflow_rows = ROW_COUNT;

  -- ── Expected outflows: unpaid bills, bucketed by due date ──────
  WITH ap AS (
    SELECT
      b.organization_id,
      COALESCE(b.due_date, b.bill_date, b.created_at::date) AS due,
      SUM(COALESCE(b.total_amount, b.amount)) AS amt
    FROM public.bills b
    WHERE b.payment_status <> 'paid'
      AND b.payment_status IS DISTINCT FROM 'cancelled'
      AND b.organization_id IS NOT NULL
      AND (p_org_id IS NULL OR b.organization_id = p_org_id)
    GROUP BY 1, 2
  )
  INSERT INTO public.cashflow_forecasts (
    organization_id, forecast_date, category, subcategory,
    projected_inflow, projected_outflow, confidence_score, ai_notes
  )
  SELECT
    ap.organization_id,
    GREATEST(ap.due, CURRENT_DATE),
    'operating',
    'accounts_payable',
    0,
    ap.amt,
    -- Payables are a known obligation: higher confidence than collection.
    CASE WHEN ap.due >= CURRENT_DATE THEN 95 ELSE 85 END,
    'auto:ar_ap_projection'
  FROM ap
  WHERE GREATEST(ap.due, CURRENT_DATE) <= v_horizon_end;
  GET DIAGNOSTICS v_outflow_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'inflow_rows',  v_inflow_rows,
    'outflow_rows', v_outflow_rows,
    'horizon_days', p_horizon_days,
    'generated_at', now()
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.generate_cashflow_forecasts(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.generate_cashflow_forecasts(uuid, int)
  TO authenticated, service_role;

-- Refresh nightly at 01:15 UTC so the CFO forecast reflects current AR/AP.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('routeace-cashflow-forecast');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'routeace-cashflow-forecast',
    '15 1 * * *',
    'SELECT public.generate_cashflow_forecasts()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'cron scheduling skipped: %', SQLERRM;
END $$;
