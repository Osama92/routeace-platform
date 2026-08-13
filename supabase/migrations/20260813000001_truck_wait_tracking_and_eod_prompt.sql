-- ============================================================
-- TRUCK WAIT TRACKING — tenant scoping + end-of-day prompt
-- ============================================================
-- "Avg Wait Days (Unloaded Trucks)" reads truck_wait_tracking, which is
-- empty because nothing captures on-site wait times. The owner asked for
-- an end-of-day prompt to the Super Admin so the day's waits can be
-- recorded before close of business.
--
-- Two problems fixed here:
--
-- 1. TENANT SCOPING. truck_wait_tracking has no organization_id, so once
--    it holds data every organisation would see every other's wait
--    records — the same class of leak just fixed on Fleet KPIs. The
--    column is added and backfilled through the parent dispatch before
--    any capture flow is switched on.
--
-- 2. THE PROMPT ITSELF. A daily reminder is only useful if it names what
--    is outstanding. This function finds dispatches that were active
--    today but have no wait record, and raises one alert per org listing
--    the count — rather than a generic nag that carries no information.
-- ============================================================

-- ── 1. Tenant scoping ────────────────────────────────────────
ALTER TABLE public.truck_wait_tracking
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill from the parent dispatch for any pre-existing rows.
UPDATE public.truck_wait_tracking w
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE w.dispatch_id = d.id
  AND w.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_truck_wait_org_date
  ON public.truck_wait_tracking (organization_id, arrival_timestamp DESC);

ALTER TABLE public.truck_wait_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS truck_wait_tenant_gate ON public.truck_wait_tracking;
CREATE POLICY truck_wait_tenant_gate
  ON public.truck_wait_tracking
  AS RESTRICTIVE FOR ALL TO public
  USING (
    organization_id IS NULL
    OR organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    organization_id IS NULL
    OR organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  );

DROP POLICY IF EXISTS truck_wait_rw ON public.truck_wait_tracking;
CREATE POLICY truck_wait_rw
  ON public.truck_wait_tracking FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Stamp the tenant automatically from the dispatch so a caller cannot
-- omit it (and cannot set someone else's).
CREATE OR REPLACE FUNCTION public.truck_wait_set_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.dispatch_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.dispatches WHERE id = NEW.dispatch_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization(auth.uid());
  END IF;

  -- Keep wait_hours consistent with the timestamps rather than trusting
  -- a value the client may not have recalculated.
  IF NEW.arrival_timestamp IS NOT NULL THEN
    NEW.wait_hours := GREATEST(0, EXTRACT(EPOCH FROM (
      COALESCE(NEW.loading_timestamp, NEW.exit_timestamp, now()) - NEW.arrival_timestamp
    )) / 3600.0);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_truck_wait_set_org ON public.truck_wait_tracking;
CREATE TRIGGER trg_truck_wait_set_org
  BEFORE INSERT OR UPDATE ON public.truck_wait_tracking
  FOR EACH ROW EXECUTE FUNCTION public.truck_wait_set_org();


-- ── 2. End-of-day prompt ─────────────────────────────────────
-- Raises one alert per organisation that has dispatches today with no
-- wait record. Silent when there is nothing outstanding — a reminder
-- that fires every day regardless of state gets ignored within a week.
CREATE OR REPLACE FUNCTION public.prompt_daily_wait_time_entry()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r            record;
  v_alerts     int := 0;
  v_recipient  record;
BEGIN
  FOR r IN
    SELECT d.organization_id,
           count(*) AS missing_count
    FROM public.dispatches d
    LEFT JOIN public.truck_wait_tracking w ON w.dispatch_id = d.id
    WHERE d.created_at::date = CURRENT_DATE
      AND d.organization_id IS NOT NULL
      AND w.id IS NULL
    GROUP BY d.organization_id
  LOOP
    -- Super Admin of that org receives the prompt.
    FOR v_recipient IN
      SELECT au.id AS user_id, au.email
      FROM public.organization_members om
      JOIN auth.users au ON au.id = om.user_id
      JOIN public.user_roles ur ON ur.user_id = om.user_id
      WHERE om.organization_id = r.organization_id
        AND om.is_active = true
        AND ur.role IN ('super_admin', 'org_admin')
      LIMIT 1
    LOOP
      INSERT INTO public.alert_dispatch_log (
        alert_kind, channel, recipient, recipient_user_id,
        subject, message, related_entity_type, delivery_status
      ) VALUES (
        'wait_time_entry_due',
        'in_app',
        v_recipient.email,
        v_recipient.user_id,
        'Record today''s truck wait times',
        r.missing_count || ' dispatch(es) today have no on-site wait time recorded. '
          || 'Enter arrival and loading times so average wait days can be reported.',
        'dispatch',
        'pending'
      );
      v_alerts := v_alerts + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('alerts_raised', v_alerts, 'run_at', now());
END $$;

REVOKE EXECUTE ON FUNCTION public.prompt_daily_wait_time_entry() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.prompt_daily_wait_time_entry() TO service_role;

-- 17:00 UTC — close of the working day in West Africa (18:00 WAT).
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('routeace-wait-time-prompt');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'routeace-wait-time-prompt',
    '0 17 * * 1-5',
    'SELECT public.prompt_daily_wait_time_entry()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'wait-time prompt cron scheduling skipped: %', SQLERRM;
END $$;
