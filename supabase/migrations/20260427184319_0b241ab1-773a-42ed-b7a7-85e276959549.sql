
ALTER FUNCTION public.kpi_performance_pct(numeric, numeric, text) SET search_path = public;
ALTER FUNCTION public.block_kpi_snapshot_mutation() SET search_path = public;

-- Also revoke public exec on new SECURITY DEFINER functions (only authenticated)
REVOKE EXECUTE ON FUNCTION public.refresh_my_kpis() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_user_kpis(uuid, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rollup_team_performance(date, date, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rollup_org_performance(date, date, uuid) FROM PUBLIC;
