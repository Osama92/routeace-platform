-- ============================================================
-- Fleet utilisation summary must count idle vehicles as 0%
-- ============================================================
-- Verified against production before this fix: 2 of 31 owned vehicles for
-- Relma had any activity in 30 days, and the original get_fleet_utilization_summary
-- averaged only those 2 — reporting 75% fleet utilisation when the honest
-- fleet-wide figure, with 29 idle trucks correctly counted at 0%, is far
-- lower. An idle truck is not absent from the average, it IS the finding.
--
-- Still excludes vehicles whose truck_type has no peer at all (recommended_days
-- IS NULL) — there's nothing to compare them against, so including them
-- would mean either fabricating a target or diluting the percentage with an
-- undefined comparison. Those are reported as their own count instead.
-- ============================================================

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
    ) FILTER (WHERE recommended_days IS NOT NULL), 1),
    'vehicles_measured', count(*) FILTER (WHERE recommended_days IS NOT NULL),
    'vehicles_idle', count(*) FILTER (WHERE recommended_days IS NOT NULL AND active_days = 0),
    'vehicles_without_peer', count(*) FILTER (WHERE recommended_days IS NULL),
    'total_owned_vehicles', count(*),
    'period_days', p_days
  )
  FROM public.get_fleet_utilization(p_organization_id, p_days);
$fn$;

GRANT EXECUTE ON FUNCTION public.get_fleet_utilization_summary(uuid, integer) TO authenticated;
