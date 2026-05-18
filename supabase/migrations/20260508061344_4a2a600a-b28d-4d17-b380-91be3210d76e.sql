
-- ==========================================================
-- ASYNC JOB QUEUE (Phase 7)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.async_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','dead')),
  priority SMALLINT NOT NULL DEFAULT 5,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_async_jobs_status_sched ON public.async_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_async_jobs_org ON public.async_jobs(organization_id);

CREATE TABLE IF NOT EXISTS public.async_jobs_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id UUID,
  organization_id UUID,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.async_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.async_jobs_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "async_jobs_org_read" ON public.async_jobs FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(),'core_founder')
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);
CREATE POLICY "async_jobs_dlq_admin_read" ON public.async_jobs_dlq FOR SELECT
USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'core_founder'));

-- ==========================================================
-- KPI EVENT BUS + CACHE (Phase 8)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kpi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source_module TEXT,
  reference_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpi_events_unprocessed ON public.kpi_events(organization_id, processed) WHERE processed = false;

CREATE TABLE IF NOT EXISTS public.kpi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  metric_key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'org',
  scope_ref UUID,
  value NUMERIC NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (organization_id, metric_key, scope, scope_ref)
);
CREATE INDEX IF NOT EXISTS idx_kpi_cache_org_metric ON public.kpi_cache(organization_id, metric_key);

ALTER TABLE public.kpi_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_events_org_read" ON public.kpi_events FOR SELECT
USING (public.is_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "kpi_cache_org_read" ON public.kpi_cache FOR SELECT
USING (public.is_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));

-- ==========================================================
-- USAGE METERING (Phase 12)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.usage_meter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  meter_key TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'count',
  source TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_meter_org_key_time ON public.usage_meter_events(organization_id, meter_key, recorded_at DESC);

ALTER TABLE public.usage_meter_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_meter_org_read" ON public.usage_meter_events FOR SELECT
USING (public.is_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));

-- ==========================================================
-- WORKFLOW INTEGRITY (Phase 14)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.workflow_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key TEXT NOT NULL,
  organization_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pass','warn','fail')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wic_workflow_time ON public.workflow_integrity_checks(workflow_key, checked_at DESC);

ALTER TABLE public.workflow_integrity_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wic_admin_read" ON public.workflow_integrity_checks FOR SELECT
USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'core_founder'));

-- ==========================================================
-- STORAGE PATH ISOLATION VALIDATOR (Phase 9)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.validate_storage_object_paths()
RETURNS TABLE(bucket_id TEXT, object_name TEXT, owner UUID, issue TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.bucket_id, o.name, o.owner,
    CASE
      WHEN o.name !~ '^[0-9a-fA-F-]{36}/' THEN 'missing_org_prefix'
      ELSE 'ok'
    END AS issue
  FROM storage.objects o
  WHERE o.name !~ '^[0-9a-fA-F-]{36}/'
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.validate_storage_object_paths() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_storage_object_paths() TO authenticated;

-- ==========================================================
-- PRE-DEPLOY READINESS CHECK (Phase 15)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.run_predeploy_readiness_check()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_async_dead INT;
  v_kpi_unprocessed INT;
  v_storage_bad INT;
  v_workflow_fail INT;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'core_founder')) THEN
    RAISE EXCEPTION 'Only core admins can run readiness checks';
  END IF;

  SELECT COUNT(*) INTO v_async_dead FROM public.async_jobs WHERE status = 'dead';
  SELECT COUNT(*) INTO v_kpi_unprocessed FROM public.kpi_events WHERE processed = false AND created_at < now() - interval '15 minutes';
  SELECT COUNT(*) INTO v_storage_bad FROM public.validate_storage_object_paths();
  SELECT COUNT(*) INTO v_workflow_fail FROM public.workflow_integrity_checks WHERE status = 'fail' AND checked_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'generated_at', now(),
    'async_dead_jobs', v_async_dead,
    'kpi_events_stale', v_kpi_unprocessed,
    'storage_path_violations', v_storage_bad,
    'recent_workflow_failures', v_workflow_fail,
    'deployment_blocked', (v_async_dead > 0 OR v_storage_bad > 0 OR v_workflow_fail > 0)
  );
END $$;
REVOKE ALL ON FUNCTION public.run_predeploy_readiness_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_predeploy_readiness_check() TO authenticated;
