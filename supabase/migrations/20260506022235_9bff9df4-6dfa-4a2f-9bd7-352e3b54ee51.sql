
-- ─── sync_cursor for wms-background-sync ────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.integration_configs ADD COLUMN sync_cursor JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_integration_configs_active_sync
  ON public.integration_configs(is_active) WHERE is_active = true;

-- ─── Vehicles: expected_daily_revenue ──────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.vehicles ADD COLUMN expected_daily_revenue NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─── asset_maintenance_events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_maintenance_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  maintenance_type TEXT NOT NULL DEFAULT 'preventive'
    CHECK (maintenance_type IN ('preventive','breakdown','inspection','repair')),
  description     TEXT,
  logged_by       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_maintenance_dates CHECK (end_date >= start_date)
);
ALTER TABLE public.asset_maintenance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members read maintenance events" ON public.asset_maintenance_events;
CREATE POLICY "Org members read maintenance events"
  ON public.asset_maintenance_events FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
DROP POLICY IF EXISTS "Ops managers write maintenance events" ON public.asset_maintenance_events;
CREATE POLICY "Ops managers write maintenance events"
  ON public.asset_maintenance_events FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin','admin','org_admin','ops_manager','dispatcher')
    )
  );
DROP POLICY IF EXISTS "Ops managers update maintenance events" ON public.asset_maintenance_events;
CREATE POLICY "Ops managers update maintenance events"
  ON public.asset_maintenance_events FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin','admin','org_admin','ops_manager','dispatcher')
    )
  );
CREATE INDEX IF NOT EXISTS idx_asset_maint_org_vehicle
  ON public.asset_maintenance_events(organization_id, vehicle_id, start_date);

-- ─── asset_idle_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_idle_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  idle_date       DATE NOT NULL,
  reason_code     TEXT NOT NULL
    CHECK (reason_code IN ('no_load_available','client_delay','dispatch_failure','payment_issue','driver_issue','other')),
  notes           TEXT,
  logged_by       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, idle_date)
);
ALTER TABLE public.asset_idle_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members read idle logs" ON public.asset_idle_logs;
CREATE POLICY "Org members read idle logs"
  ON public.asset_idle_logs FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
DROP POLICY IF EXISTS "Ops managers write idle logs" ON public.asset_idle_logs;
CREATE POLICY "Ops managers write idle logs"
  ON public.asset_idle_logs FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','admin','org_admin','ops_manager','dispatcher')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE INDEX IF NOT EXISTS idx_asset_idle_org_vehicle
  ON public.asset_idle_logs(organization_id, vehicle_id, idle_date);

-- ─── asset_weekly_summaries ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_weekly_summaries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id          UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  week_start          DATE NOT NULL,
  week_end            DATE NOT NULL,
  transit_days        INTEGER NOT NULL DEFAULT 0 CHECK (transit_days >= 0 AND transit_days <= 7),
  maintenance_days    INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_days >= 0 AND maintenance_days <= 7),
  idle_days           INTEGER NOT NULL DEFAULT 0 CHECK (idle_days >= 0 AND idle_days <= 7),
  trips_completed     INTEGER NOT NULL DEFAULT 0,
  utilisation_pct     NUMERIC GENERATED ALWAYS AS (ROUND((transit_days::NUMERIC / 7) * 100, 1)) STORED,
  expected_daily_revenue NUMERIC NOT NULL DEFAULT 0,
  idle_loss           NUMERIC GENERATED ALWAYS AS (idle_days * expected_daily_revenue) STORED,
  excess_maintenance_days INTEGER GENERATED ALWAYS AS (GREATEST(0, maintenance_days - 2)) STORED,
  maintenance_loss    NUMERIC GENERATED ALWAYS AS (GREATEST(0, maintenance_days - 2) * expected_daily_revenue) STORED,
  total_weekly_loss   NUMERIC GENERATED ALWAYS AS (
    (idle_days * expected_daily_revenue) +
    (GREATEST(0, maintenance_days - 2) * expected_daily_revenue)
  ) STORED,
  is_complete         BOOLEAN NOT NULL DEFAULT false,
  computed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, week_start),
  CONSTRAINT valid_week_days CHECK (transit_days + maintenance_days + idle_days <= 7)
);
ALTER TABLE public.asset_weekly_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members read weekly summaries" ON public.asset_weekly_summaries;
CREATE POLICY "Org members read weekly summaries"
  ON public.asset_weekly_summaries FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
DROP POLICY IF EXISTS "Service role write weekly summaries" ON public.asset_weekly_summaries;
CREATE POLICY "Service role write weekly summaries"
  ON public.asset_weekly_summaries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Ops managers write weekly summaries" ON public.asset_weekly_summaries;
CREATE POLICY "Ops managers write weekly summaries"
  ON public.asset_weekly_summaries FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','admin','org_admin','ops_manager')
    )
  );
DROP POLICY IF EXISTS "Ops managers update weekly summaries" ON public.asset_weekly_summaries;
CREATE POLICY "Ops managers update weekly summaries"
  ON public.asset_weekly_summaries FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','admin','org_admin','ops_manager')
    )
  );
CREATE INDEX IF NOT EXISTS idx_asset_weekly_org_week
  ON public.asset_weekly_summaries(organization_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_asset_weekly_vehicle
  ON public.asset_weekly_summaries(vehicle_id, week_start DESC);

-- ─── Audit trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_asset_maintenance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(action, table_name, record_id, user_id, new_data, old_data)
  VALUES (
    LOWER(TG_OP),
    'asset_maintenance_events',
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN TG_OP <> 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    CASE WHEN TG_OP <> 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_asset_maintenance ON public.asset_maintenance_events;
CREATE TRIGGER trg_audit_asset_maintenance
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_maintenance_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_asset_maintenance();
