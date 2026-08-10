-- ============================================================
-- KPI CALCULATION ENGINE
-- ============================================================
-- kpi_definitions (13 rows) and kpi_role_assignments (27 rows) were
-- configured, but kpi_metrics had no writer anywhere — no function, no
-- trigger, no cron. Every role therefore rendered 0 because there was
-- nothing to read. This is the missing calculation layer.
--
-- DESIGN DECISIONS
--
-- 1. NULL vs 0. A metric that cannot be computed is written as NULL, not
--    0. Zero reads as "measured and failing"; NULL renders as "Not
--    tracked" in the UI along with the reason. Fabricating a number is
--    worse than showing nothing. metadata.reason carries the explanation.
--
-- 2. Snapshots, not read-time. Rows are written per period so
--    month-on-month comparison is possible — Super Admin growth was
--    explicitly asked for as MoM. Read-time computation cannot do that.
--
-- 3. Only metrics verified computable against production are calculated.
--    On-time delivery is NOT computed: 0 of 82 dispatches carry a
--    scheduled_delivery, so there is no baseline to measure against.
--    Inspection compliance is NOT computed: 28 inspections exist but
--    none link to a dispatch.
--    SLA adherence IS computed but flagged low-confidence: only 3 of 82
--    dispatches carry both sla_deadline and actual_delivery.
-- ============================================================

-- metric_value is NOT NULL in the original schema, which makes it
-- impossible to distinguish "computed as zero" from "cannot be computed".
-- That distinction is the whole point of the design below, so the column
-- is relaxed to nullable. NULL means not computable; the reason is in
-- metadata.reason and the UI renders it as "Not tracked".
ALTER TABLE public.kpi_metrics ALTER COLUMN metric_value DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS kpi_metrics_unique_period
  ON public.kpi_metrics (entity_id, role, metric_name, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_entity_period
  ON public.kpi_metrics (entity_id, period_start DESC);


CREATE OR REPLACE FUNCTION public.calculate_kpi_metrics(
  p_org_id       uuid DEFAULT NULL,
  p_period_start date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_period_end   date DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org        record;
  v_written    int := 0;
  v_orgs       int := 0;
  v_ps         timestamptz := p_period_start::timestamptz;
  v_pe         timestamptz := (p_period_end + 1)::timestamptz;  -- exclusive upper bound
BEGIN
  FOR v_org IN
    SELECT id FROM public.organizations
    WHERE (p_org_id IS NULL OR id = p_org_id)
  LOOP
    v_orgs := v_orgs + 1;

    -- ── Operations ────────────────────────────────────────────
    WITH d AS (
      SELECT * FROM public.dispatches
      WHERE organization_id = v_org.id
        AND created_at >= v_ps AND created_at < v_pe
    ),
    agg AS (
      SELECT
        count(*)                                                        AS total,
        count(*) FILTER (WHERE status IN ('delivered','completed'))     AS delivered,
        count(*) FILTER (WHERE status = 'cancelled')                    AS cancelled,
        count(DISTINCT vehicle_id) FILTER (WHERE vehicle_id IS NOT NULL) AS vehicles_used,
        count(*) FILTER (WHERE sla_deadline IS NOT NULL
                           AND actual_delivery IS NOT NULL)             AS sla_measurable,
        count(*) FILTER (WHERE sla_deadline IS NOT NULL
                           AND actual_delivery IS NOT NULL
                           AND actual_delivery <= sla_deadline)         AS sla_met
      FROM d
    ),
    fleet AS (
      SELECT count(*) AS total_vehicles
      FROM public.vehicles
      WHERE organization_id = v_org.id
        AND COALESCE(status,'available') <> 'retired'
    )
    INSERT INTO public.kpi_metrics
      (entity_id, entity_type, role, metric_name, metric_type,
       metric_value, target_value, unit, period_start, period_end, metadata)
    SELECT
      v_org.id, 'organization', m.role, m.metric_name, m.mtype,
      m.val, m.target, m.unit, p_period_start, p_period_end, m.meta
    FROM agg, fleet,
    LATERAL (VALUES
      -- Delivery success: delivered as a share of everything not cancelled.
      ('ops_manager', 'ops_delivery_success_rate', 'lagging', '%', 95::numeric,
        CASE WHEN (agg.total - agg.cancelled) > 0
             THEN round(agg.delivered::numeric * 100 / (agg.total - agg.cancelled), 2)
             ELSE NULL END,
        jsonb_build_object('delivered', agg.delivered, 'eligible', agg.total - agg.cancelled)),

      -- Fleet utilisation: share of the non-retired fleet that ran at least
      -- one dispatch in the period.
      ('org_admin', 'ops_fleet_utilization', 'leading', '%', 80::numeric,
        CASE WHEN fleet.total_vehicles > 0
             THEN round(agg.vehicles_used::numeric * 100 / fleet.total_vehicles, 2)
             ELSE NULL END,
        jsonb_build_object('vehicles_used', agg.vehicles_used, 'fleet_size', fleet.total_vehicles)),

      -- SLA adherence. Computed only where a deadline AND an actual
      -- delivery both exist; flagged when the sample is too small to trust.
      ('ops_manager', 'ops_sla_adherence', 'lagging', '%', 95::numeric,
        CASE WHEN agg.sla_measurable > 0
             THEN round(agg.sla_met::numeric * 100 / agg.sla_measurable, 2)
             ELSE NULL END,
        CASE WHEN agg.sla_measurable = 0
             THEN jsonb_build_object('reason', 'No dispatch carries both an SLA deadline and an actual delivery time')
             WHEN agg.sla_measurable < 10
             THEN jsonb_build_object('measurable', agg.sla_measurable, 'of_total', agg.total,
                                     'low_confidence', true)
             ELSE jsonb_build_object('measurable', agg.sla_measurable, 'of_total', agg.total) END),

      -- Trip completion, attributed to the dispatcher role.
      ('dispatcher', 'driver_trip_completion_rate', 'lagging', '%', 98::numeric,
        CASE WHEN agg.total > 0
             THEN round(agg.delivered::numeric * 100 / agg.total, 2)
             ELSE NULL END,
        jsonb_build_object('delivered', agg.delivered, 'total', agg.total)),

      -- On-time delivery is deliberately NOT computed. Recording NULL with
      -- the reason is honest; a 0 would read as "measured and failing".
      ('ops_manager', 'driver_on_time_delivery_rate', 'lagging', '%', 95::numeric,
        NULL::numeric,
        jsonb_build_object('reason', 'No dispatch carries a scheduled_delivery, so there is no promised time to measure against'))
    ) AS m(role, metric_name, mtype, unit, target, val, meta)
    ON CONFLICT (entity_id, role, metric_name, period_start, period_end)
    DO UPDATE SET
      metric_value  = EXCLUDED.metric_value,
      target_value  = EXCLUDED.target_value,
      metadata      = EXCLUDED.metadata,
      calculated_at = now();

    GET DIAGNOSTICS v_written = ROW_COUNT;

    -- ── Driver productivity ───────────────────────────────────
    INSERT INTO public.kpi_metrics
      (entity_id, entity_type, role, metric_name, metric_type,
       metric_value, target_value, unit, period_start, period_end, metadata)
    SELECT
      v_org.id, 'organization', 'driver', 'driver_deliveries_completed', 'lagging',
      CASE WHEN cnt.drivers > 0
           THEN round(cnt.completed::numeric / cnt.drivers, 2)
           ELSE NULL END,
      12, 'count', p_period_start, p_period_end,
      jsonb_build_object('completed', cnt.completed, 'active_drivers', cnt.drivers,
                         'note', 'Average completed deliveries per active driver')
    FROM (
      SELECT
        count(*) FILTER (WHERE status IN ('delivered','completed'))  AS completed,
        count(DISTINCT driver_id) FILTER (WHERE driver_id IS NOT NULL) AS drivers
      FROM public.dispatches
      WHERE organization_id = v_org.id
        AND created_at >= v_ps AND created_at < v_pe
    ) cnt
    ON CONFLICT (entity_id, role, metric_name, period_start, period_end)
    DO UPDATE SET
      metric_value  = EXCLUDED.metric_value,
      metadata      = EXCLUDED.metadata,
      calculated_at = now();

    -- ── Finance ───────────────────────────────────────────────
    INSERT INTO public.kpi_metrics
      (entity_id, entity_type, role, metric_name, metric_type,
       metric_value, target_value, unit, period_start, period_end, metadata)
    SELECT
      v_org.id, 'organization', 'finance_manager', m.metric_name, 'lagging',
      m.val, m.target, m.unit, p_period_start, p_period_end, m.meta
    FROM (
      SELECT
        count(*) FILTER (WHERE status NOT IN ('draft','cancelled'))       AS billable,
        count(*) FILTER (WHERE status = 'paid')                           AS paid,
        count(*) FILTER (WHERE status = 'overdue')                        AS overdue,
        COALESCE(sum(total_amount) FILTER (WHERE status NOT IN ('draft','cancelled','paid')), 0) AS outstanding
      FROM public.invoices
      WHERE organization_id = v_org.id
        AND created_at >= v_ps AND created_at < v_pe
    ) inv,
    LATERAL (VALUES
      ('fin_ar_collection_rate', '%', 85::numeric,
        CASE WHEN inv.billable > 0
             THEN round(inv.paid::numeric * 100 / inv.billable, 2)
             ELSE NULL END,
        jsonb_build_object('paid', inv.paid, 'billable', inv.billable)),

      ('fin_overdue_invoice_count', 'count', 0::numeric,
        inv.overdue::numeric,
        jsonb_build_object('overdue', inv.overdue)),

      ('fin_outstanding_receivables', 'currency', 0::numeric,
        round(inv.outstanding, 2),
        jsonb_build_object('note', 'Unpaid non-draft invoices raised in the period'))
    ) AS m(metric_name, unit, target, val, meta)
    ON CONFLICT (entity_id, role, metric_name, period_start, period_end)
    DO UPDATE SET
      metric_value  = EXCLUDED.metric_value,
      target_value  = EXCLUDED.target_value,
      metadata      = EXCLUDED.metadata,
      calculated_at = now();

    -- ── Support ───────────────────────────────────────────────
    -- Written even when there are no tickets so the UI can distinguish
    -- "no tickets raised" from "metric never calculated".
    INSERT INTO public.kpi_metrics
      (entity_id, entity_type, role, metric_name, metric_type,
       metric_value, target_value, unit, period_start, period_end, metadata)
    SELECT
      v_org.id, 'organization', 'support', m.metric_name, 'lagging',
      m.val, m.target, m.unit, p_period_start, p_period_end, m.meta
    FROM (
      SELECT
        count(*)                                                    AS total,
        count(*) FILTER (WHERE status IN ('resolved','closed'))     AS resolved
      FROM public.support_tickets
      WHERE organization_id = v_org.id
        AND created_at >= v_ps AND created_at < v_pe
    ) t,
    LATERAL (VALUES
      ('support_tickets_resolved', 'count', 15::numeric,
        CASE WHEN t.total > 0 THEN t.resolved::numeric ELSE NULL END,
        CASE WHEN t.total = 0
             THEN jsonb_build_object('reason', 'No support tickets raised in this period')
             ELSE jsonb_build_object('resolved', t.resolved, 'total', t.total) END),

      ('support_resolution_rate', '%', 90::numeric,
        CASE WHEN t.total > 0
             THEN round(t.resolved::numeric * 100 / t.total, 2)
             ELSE NULL END,
        CASE WHEN t.total = 0
             THEN jsonb_build_object('reason', 'No support tickets raised in this period')
             ELSE jsonb_build_object('resolved', t.resolved, 'total', t.total) END)
    ) AS m(metric_name, unit, target, val, meta)
    ON CONFLICT (entity_id, role, metric_name, period_start, period_end)
    DO UPDATE SET
      metric_value  = EXCLUDED.metric_value,
      target_value  = EXCLUDED.target_value,
      metadata      = EXCLUDED.metadata,
      calculated_at = now();

  END LOOP;

  RETURN jsonb_build_object(
    'organizations', v_orgs,
    'period_start',  p_period_start,
    'period_end',    p_period_end,
    'calculated_at', now()
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.calculate_kpi_metrics(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.calculate_kpi_metrics(uuid, date, date)
  TO authenticated, service_role;


-- Nightly at 02:00 UTC: recompute the current month so figures stay live,
-- and refresh the prior month so a late-arriving record is picked up.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('routeace-kpi-calculation');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'routeace-kpi-calculation',
    '0 2 * * *',
    $cron$
      SELECT public.calculate_kpi_metrics();
      SELECT public.calculate_kpi_metrics(
        NULL,
        (date_trunc('month', CURRENT_DATE) - interval '1 month')::date,
        (date_trunc('month', CURRENT_DATE) - interval '1 day')::date
      );
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'kpi cron scheduling skipped: %', SQLERRM;
END $$;
