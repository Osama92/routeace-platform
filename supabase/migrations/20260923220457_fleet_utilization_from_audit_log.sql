-- ============================================================
-- Fleet utilisation: real active days, peer-benchmarked target
-- ============================================================
-- For the Business Impact screen. Requirement: "days a vehicle is expected
-- to run against actual", with a system-recommended target, output as a
-- percentage. Owned/internal fleet only — a vendor truck's utilisation is
-- the vendor's business, not something we have standing to measure.
--
-- WHY THIS DOESN'T NEED A NEW TRACKING TABLE
-- dispatches has no per-status timestamps (only created_at/updated_at), so
-- naively counting "distinct dispatch creation dates" would undercount a
-- multi-day trip as a single day — considered and explicitly rejected before
-- building this. enterprise_audit_log (trg_eaudit_dispatches) already
-- captures every status transition with an exact timestamp, back to
-- 2026-06-13 (277 real transitions at time of writing). A vehicle's active
-- span is derived from that: from the moment a dispatch entered
-- picked_up/in_transit to the moment it left that state (or "now", if it's
-- still active) — the actual calendar days a truck was doing something,
-- not a proxy for it.
--
-- WHY THE TARGET IS PEER-BENCHMARKED, NOT A FIXED ASSUMPTION
-- An imported constant (e.g. "26 working days/month") is exactly the kind of
-- unfounded benchmark this screen is trying to avoid presenting as fact. The
-- recommended target for a truck type is instead the highest active-day
-- count already achieved by an owned vehicle of that SAME truck type in the
-- period — real, fleet-specific, and it can't recommend something the fleet
-- hasn't already proven possible. A truck_type with only one vehicle, or
-- none active, has no target and reports NULL rather than a fabricated one.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_fleet_utilization(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  vehicle_id uuid,
  registration_number text,
  truck_type text,
  active_days integer,
  recommended_days integer,
  utilization_pct numeric,
  is_benchmark_vehicle boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH status_events AS (
    SELECT
      record_id AS dispatch_id,
      occurred_at,
      after_data->>'status' AS new_status,
      LAG(occurred_at) OVER (PARTITION BY record_id ORDER BY occurred_at) AS prev_occurred_at,
      LAG(after_data->>'status') OVER (PARTITION BY record_id ORDER BY occurred_at) AS prev_status
    FROM enterprise_audit_log
    WHERE table_name = 'dispatches' AND 'status' = ANY(diff_keys)
  ),
  -- A span closes when the dispatch leaves an active state (to anything —
  -- delivered, cancelled, delayed). It also opens a still-active span for a
  -- dispatch that entered active and has no later transition, running to now.
  active_spans AS (
    SELECT dispatch_id, prev_occurred_at AS span_start, occurred_at AS span_end
    FROM status_events
    WHERE prev_status IN ('picked_up', 'in_transit')
    UNION ALL
    SELECT se.dispatch_id, se.occurred_at AS span_start, now() AS span_end
    FROM status_events se
    WHERE se.new_status IN ('picked_up', 'in_transit')
      AND NOT EXISTS (
        SELECT 1 FROM status_events se2
        WHERE se2.dispatch_id = se.dispatch_id AND se2.occurred_at > se.occurred_at
      )
  ),
  vehicle_spans AS (
    SELECT d.vehicle_id, a.span_start, a.span_end
    FROM active_spans a
    JOIN dispatches d ON d.id = a.dispatch_id
    WHERE d.vehicle_id IS NOT NULL AND d.organization_id = p_organization_id
  ),
  vehicle_days AS (
    SELECT DISTINCT vehicle_id,
           generate_series(span_start::date, span_end::date, interval '1 day')::date AS active_date
    FROM vehicle_spans
  ),
  per_vehicle AS (
    SELECT v.id, v.registration_number, v.truck_type,
           count(DISTINCT vd.active_date) FILTER (
             WHERE vd.active_date > current_date - (p_days || ' days')::interval
           )::int AS active_days
    FROM vehicles v
    LEFT JOIN vehicle_days vd ON vd.vehicle_id = v.id
    WHERE v.organization_id = p_organization_id
      AND COALESCE(v.ownership_type, 'owned') = 'owned'
    GROUP BY v.id, v.registration_number, v.truck_type
  ),
  peer_targets AS (
    SELECT truck_type, MAX(active_days) AS target_days
    FROM per_vehicle
    WHERE truck_type IS NOT NULL
    GROUP BY truck_type
  )
  SELECT
    pv.id, pv.registration_number, pv.truck_type, pv.active_days,
    pt.target_days,
    CASE WHEN pt.target_days IS NOT NULL AND pt.target_days > 0
         THEN round((pv.active_days::numeric / pt.target_days) * 100, 1)
         ELSE NULL END,
    pt.target_days IS NOT NULL AND pv.active_days = pt.target_days AND pt.target_days > 0
  FROM per_vehicle pv
  LEFT JOIN peer_targets pt ON pt.truck_type = pv.truck_type
  ORDER BY pv.active_days DESC, pv.registration_number;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_fleet_utilization(uuid, integer) TO authenticated;

-- Fleet-wide rollup for the single percentage the Business Impact screen
-- shows — the average of every owned vehicle's utilization against its own
-- truck-type peer target. Vehicles with no peer target (a truck_type with
-- only one vehicle, itself the benchmark at 100%) are still included.
CREATE OR REPLACE FUNCTION public.get_fleet_utilization_summary(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'fleet_utilization_pct', round(avg(
      CASE WHEN is_benchmark_vehicle THEN 100
           ELSE utilization_pct END
    ), 1),
    'vehicles_measured', count(*),
    'vehicles_with_peer_target', count(*) FILTER (WHERE recommended_days IS NOT NULL),
    'period_days', p_days
  )
  FROM public.get_fleet_utilization(p_organization_id, p_days);
$fn$;

GRANT EXECUTE ON FUNCTION public.get_fleet_utilization_summary(uuid, integer) TO authenticated;
