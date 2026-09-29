-- ============================================================
-- Utilisation Gained: real financial value from additional productive days
-- ============================================================
-- Spec: "Financial value from additional productive vehicle capacity."
-- Formula: Additional Productive Days x Verified Contribution per
-- Productive Day.
--
-- ADDITIONAL PRODUCTIVE DAYS — reuses get_fleet_utilization()'s existing
-- peer-benchmark logic (still live under the hood; only its summary
-- rollup was changed to a flat pooled quota per a separate instruction).
-- For each owned vehicle: recommended_days (the best active-day count
-- already achieved by an owned vehicle of the SAME truck_type in the
-- period) minus this vehicle's own active_days. Real, fleet-specific,
-- self-proving — it can't recommend a target the fleet hasn't already
-- demonstrated. A truck_type with no peer (most single-vehicle fleets)
-- has no target and is EXCLUDED, not defaulted to a fabricated one.
--
-- CONTRIBUTION PER PRODUCTIVE DAY — gross_profit (nets out vendor_cost,
-- the honest "contribution" figure, not client_revenue) from dispatch_
-- financials rows with finance_status='complete', joined dispatch_id ->
-- dispatches.vehicle_id (dispatch_financials has no vehicle_id of its
-- own), divided by the SAME audit-log-derived active-days used above.
-- Verified against production before building this: real and non-zero,
-- cross-validated in the same ballpark across owned (NGN53,934/day) and
-- vendor (NGN46,901/day) scopes for Relma Haulage — not a fluke of a
-- thin sample.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_utilisation_gained(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH fleet AS (
    SELECT * FROM public.get_fleet_utilization(p_organization_id, p_days)
  ),
  gap AS (
    SELECT
      vehicle_id, registration_number, active_days, recommended_days,
      GREATEST(0, recommended_days - active_days) AS additional_days
    FROM fleet
    WHERE recommended_days IS NOT NULL AND recommended_days > active_days
  ),
  -- active_days is a per-vehicle constant from get_fleet_utilization(), but
  -- joining it straight to dispatch_financials fans out one row per
  -- financials row per vehicle — summing av.active_days across THAT join
  -- would multiply each vehicle's day count by its own dispatch count.
  -- Sum profit per vehicle first (one row per vehicle), THEN join active_days
  -- once per vehicle, so both totals are counted at the same grain. Profit
  -- is windowed to the same p_days as active_days (via created_at) — an
  -- earlier version of this left profit unwindowed (all-time) while
  -- active_days was scoped to p_days, mismatching numerator and
  -- denominator and wildly overstating the per-day rate.
  profit_per_vehicle AS (
    SELECT d.vehicle_id, coalesce(sum(df.gross_profit), 0) AS vehicle_profit
    FROM public.dispatches d
    JOIN public.dispatch_financials df ON df.dispatch_id = d.id
    WHERE df.organization_id = p_organization_id
      AND df.finance_status = 'complete'
      AND df.created_at > now() - (p_days || ' days')::interval
    GROUP BY d.vehicle_id
  ),
  contribution AS (
    SELECT
      coalesce(sum(pv.vehicle_profit), 0) AS total_profit,
      coalesce(sum(av.active_days), 0) AS total_active_days
    FROM public.get_fleet_utilization(p_organization_id, p_days) av
    JOIN profit_per_vehicle pv ON pv.vehicle_id = av.vehicle_id
  ),
  rate AS (
    SELECT CASE WHEN total_active_days > 0 THEN total_profit / total_active_days ELSE 0 END AS contribution_per_day
    FROM contribution
  )
  SELECT jsonb_build_object(
    'vehicles_with_gap', (SELECT count(*) FROM gap),
    'total_additional_days', (SELECT coalesce(sum(additional_days), 0) FROM gap),
    'contribution_per_day', (SELECT round(contribution_per_day, 2) FROM rate),
    'utilisation_gained_value', (
      SELECT round((SELECT coalesce(sum(additional_days), 0) FROM gap) * (SELECT contribution_per_day FROM rate), 2)
    ),
    'total_owned_vehicles', (SELECT count(*) FROM fleet),
    'vehicles_with_no_peer', (SELECT count(*) FROM fleet WHERE recommended_days IS NULL),
    'period_days', p_days
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.get_utilisation_gained(uuid, integer) TO authenticated;
