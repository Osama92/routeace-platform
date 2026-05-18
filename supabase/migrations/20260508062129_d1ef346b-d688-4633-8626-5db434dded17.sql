
-- Phase 7/8/12/14 operational enablement: safe SECURITY DEFINER write helpers
-- so edge functions, triggers and workflows can record events without
-- per-table RLS-INSERT-policy proliferation. All helpers tenant-scoped.

-- ============================================================
-- 1. enqueue_async_job: safe enqueue from any tenant-aware caller
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_async_job(
  _job_type text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _organization_id uuid DEFAULT NULL,
  _priority smallint DEFAULT 5,
  _scheduled_at timestamptz DEFAULT now(),
  _max_attempts int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _job_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Tenant scope guard: caller must be member of org (or super admin)
  IF _organization_id IS NOT NULL
     AND NOT is_super_admin(_uid)
     AND NOT has_role(_uid, 'core_founder'::app_role)
     AND NOT is_org_member(_uid, _organization_id)
  THEN
    RAISE EXCEPTION 'tenant scope violation';
  END IF;

  INSERT INTO public.async_jobs(
    organization_id, job_type, payload, priority, scheduled_at,
    max_attempts, created_by
  ) VALUES (
    _organization_id, _job_type, COALESCE(_payload,'{}'::jsonb),
    GREATEST(1, LEAST(10, _priority)), _scheduled_at,
    GREATEST(1, _max_attempts), _uid
  ) RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_async_job(text,jsonb,uuid,smallint,timestamptz,int) FROM public;
GRANT EXECUTE ON FUNCTION public.enqueue_async_job(text,jsonb,uuid,smallint,timestamptz,int) TO authenticated;

-- ============================================================
-- 2. emit_kpi_event: tenant-scoped event-bus emission
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_kpi_event(
  _organization_id uuid,
  _event_key text,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;
  IF _uid IS NOT NULL
     AND NOT is_super_admin(_uid)
     AND NOT has_role(_uid, 'core_founder'::app_role)
     AND NOT is_org_member(_uid, _organization_id)
  THEN
    RAISE EXCEPTION 'tenant scope violation';
  END IF;

  INSERT INTO public.kpi_events(organization_id, event_key, payload)
  VALUES (_organization_id, _event_key, COALESCE(_payload,'{}'::jsonb))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_kpi_event(uuid,text,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.emit_kpi_event(uuid,text,jsonb) TO authenticated;

-- ============================================================
-- 3. record_usage_meter: server-side billing meter (Phase 12)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_usage_meter(
  _organization_id uuid,
  _meter_key text,
  _quantity numeric,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _organization_id IS NULL OR _meter_key IS NULL THEN
    RAISE EXCEPTION 'organization_id and meter_key required';
  END IF;
  IF _quantity IS NULL OR _quantity < 0 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;
  IF _uid IS NOT NULL
     AND NOT is_super_admin(_uid)
     AND NOT has_role(_uid, 'core_founder'::app_role)
     AND NOT is_org_member(_uid, _organization_id)
  THEN
    RAISE EXCEPTION 'tenant scope violation';
  END IF;

  INSERT INTO public.usage_meter_events(
    organization_id, meter_key, quantity, metadata, recorded_by
  ) VALUES (
    _organization_id, _meter_key, _quantity,
    COALESCE(_metadata,'{}'::jsonb), _uid
  ) RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_usage_meter(uuid,text,numeric,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_usage_meter(uuid,text,numeric,jsonb) TO authenticated;

-- ============================================================
-- 4. record_workflow_check: pass/warn/fail workflow integrity
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_workflow_check(
  _workflow_key text,
  _status text,
  _organization_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _status NOT IN ('pass','warn','fail') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF _organization_id IS NOT NULL
     AND _uid IS NOT NULL
     AND NOT is_super_admin(_uid)
     AND NOT has_role(_uid, 'core_founder'::app_role)
     AND NOT is_org_member(_uid, _organization_id)
  THEN
    RAISE EXCEPTION 'tenant scope violation';
  END IF;

  INSERT INTO public.workflow_integrity_checks(
    workflow_key, organization_id, status, details
  ) VALUES (
    _workflow_key, _organization_id, _status, COALESCE(_details,'{}'::jsonb)
  ) RETURNING id INTO _id;

  -- Auto-escalate failures into the platform audit log
  IF _status = 'fail' THEN
    PERFORM public.log_platform_event(
      'workflow.failure',
      'warn',
      _organization_id,
      jsonb_build_object('workflow_key', _workflow_key, 'details', _details)
    );
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_workflow_check(text,text,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_workflow_check(text,text,uuid,jsonb) TO authenticated;
