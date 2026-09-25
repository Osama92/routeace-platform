-- ============================================================
-- Fleet utilisation: flat pooled quota, replacing peer-benchmarking
-- ============================================================
-- User-specified formula: (active days in transit) / (30 workdays x number
-- of owned trucks) x 100. E.g. 5 owned trucks = a 150-day pool over a
-- 30-day window; scales with p_days for other window sizes (e.g. 90 days ->
-- 3x the daily quota per truck).
--
-- Replaces the peer-truck-type-benchmark approach from
-- get_fleet_utilization_summary (20260923220950): that measured each
-- vehicle against the fleet's own busiest truck of the same truck_type,
-- excluding types with no peer to compare against. The user wants a
-- simpler fleet-wide pooled percentage instead — no peer comparison, no
-- truck_type exclusions. get_fleet_utilization (per-vehicle active days,
-- unchanged) is still the real, audit-log-derived source; only the
-- rollup/target logic changes here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_fleet_utilization_summary(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH fleet AS (
    SELECT * FROM public.get_fleet_utilization(p_organization_id, p_days)
  ),
  totals AS (
    SELECT
      count(*)::int AS total_owned_vehicles,
      count(*) FILTER (WHERE active_days = 0)::int AS vehicles_idle,
      coalesce(sum(active_days), 0)::int AS total_active_days,
      -- Quota scales with the selected window the same way active_days does:
      -- 30 workdays per truck per 30-day window, pro-rated for other windows.
      (count(*) * round(30.0 * p_days / 30.0))::int AS total_workday_quota
    FROM fleet
  )
  SELECT jsonb_build_object(
    'fleet_utilization_pct', CASE WHEN total_workday_quota > 0
      THEN round((total_active_days::numeric / total_workday_quota) * 100, 1)
      ELSE NULL END,
    'vehicles_measured', total_owned_vehicles,
    'vehicles_idle', vehicles_idle,
    'total_owned_vehicles', total_owned_vehicles,
    'total_active_days', total_active_days,
    'total_workday_quota', total_workday_quota,
    'period_days', p_days
  )
  FROM totals;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_fleet_utilization_summary(uuid, integer) TO authenticated;
