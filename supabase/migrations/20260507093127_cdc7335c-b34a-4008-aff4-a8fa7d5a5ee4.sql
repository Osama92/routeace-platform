
-- ─── 1. Fix vehicle_documents leak (drop any permissive policies) ───────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='vehicle_documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicle_documents', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view vehicle documents"
  ON public.vehicle_documents FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Ops managers manage vehicle documents"
  ON public.vehicle_documents FOR ALL TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    ) AND (
      public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- ─── 2. Vehicle Checklists ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_checklists (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id       UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id        UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  submitted_by     UUID NOT NULL REFERENCES auth.users(id),
  checklist_type   TEXT NOT NULL CHECK (checklist_type IN ('pre_trip','post_trip','supervisory')),
  checklist_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_reading NUMERIC,
  fuel_level_pct   INTEGER CHECK (fuel_level_pct BETWEEN 0 AND 100),
  overall_result   TEXT NOT NULL DEFAULT 'pending'
    CHECK (overall_result IN ('pass','pass_with_issues','fail','pending')),
  safety_critical_fail BOOLEAN NOT NULL DEFAULT false,
  dispatch_blocked BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read checklists"
  ON public.vehicle_checklists FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Org members submit checklists"
  ON public.vehicle_checklists FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Ops managers update checklists"
  ON public.vehicle_checklists FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
  ));

CREATE INDEX IF NOT EXISTS idx_checklists_org_date ON public.vehicle_checklists(organization_id, checklist_date DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_vehicle ON public.vehicle_checklists(vehicle_id, checklist_date DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_driver  ON public.vehicle_checklists(driver_id, checklist_date DESC);

-- ─── 3. Checklist Items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.vehicle_checklists(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  item_name    TEXT NOT NULL,
  condition    TEXT NOT NULL DEFAULT 'not_checked'
    CHECK (condition IN ('good','fair','poor','critical','not_checked')),
  is_safety_critical BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  photo_url    TEXT
);
ALTER TABLE public.vehicle_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read checklist items"
  ON public.vehicle_checklist_items FOR SELECT TO authenticated
  USING (checklist_id IN (
    SELECT id FROM public.vehicle_checklists
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE POLICY "Org members submit checklist items"
  ON public.vehicle_checklist_items FOR INSERT TO authenticated
  WITH CHECK (checklist_id IN (
    SELECT id FROM public.vehicle_checklists
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON public.vehicle_checklist_items(checklist_id);

-- ─── 4. Fuel Logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  logged_by       UUID NOT NULL REFERENCES auth.users(id),
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_reading NUMERIC NOT NULL,
  litres_dispensed NUMERIC NOT NULL CHECK (litres_dispensed > 0),
  cost_per_litre  NUMERIC,
  total_cost      NUMERIC,
  fuel_station    TEXT,
  fuel_type       TEXT DEFAULT 'diesel'
    CHECK (fuel_type IN ('diesel','petrol','cng','electric','other')),
  receipt_number  TEXT,
  km_since_last_fill NUMERIC,
  km_per_litre    NUMERIC GENERATED ALWAYS AS (
    CASE WHEN litres_dispensed > 0 AND km_since_last_fill > 0
    THEN ROUND(km_since_last_fill / litres_dispensed, 2)
    ELSE NULL END
  ) STORED,
  is_flagged      BOOLEAN NOT NULL DEFAULT false,
  flag_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read fuel logs"
  ON public.fuel_logs FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Org members log fuel"
  ON public.fuel_logs FOR INSERT TO authenticated
  WITH CHECK (
    logged_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Ops managers update fuel logs"
  ON public.fuel_logs FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
  ));

CREATE INDEX IF NOT EXISTS idx_fuel_logs_org_date ON public.fuel_logs(organization_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle  ON public.fuel_logs(vehicle_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver   ON public.fuel_logs(driver_id, log_date DESC);

-- ─── 5. Work Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id       UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  checklist_id     UUID REFERENCES public.vehicle_checklists(id) ON DELETE SET NULL,
  work_order_number TEXT NOT NULL DEFAULT ('WO-' || UPPER(substring(gen_random_uuid()::text,1,8))),
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'mechanical'
    CHECK (category IN ('mechanical','electrical','body_damage','tires','fuel_system','safety_equipment','documentation','other')),
  priority         TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('immediate','24_hours','48_hours','scheduled','low','medium')),
  status           TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed','cancelled')),
  raised_by        UUID NOT NULL REFERENCES auth.users(id),
  assigned_to      TEXT,
  parts_cost       NUMERIC DEFAULT 0,
  labour_cost      NUMERIC DEFAULT 0,
  external_cost    NUMERIC DEFAULT 0,
  total_cost       NUMERIC GENERATED ALWAYS AS (
    COALESCE(parts_cost,0) + COALESCE(labour_cost,0) + COALESCE(external_cost,0)
  ) STORED,
  due_by           TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  sla_breached     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read work orders"
  ON public.work_orders FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Ops managers manage work orders"
  ON public.work_orders FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX IF NOT EXISTS idx_work_orders_org_status ON public.work_orders(organization_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle  ON public.work_orders(vehicle_id, status);

CREATE OR REPLACE FUNCTION public.check_work_order_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.due_by IS NOT NULL AND NEW.due_by < now() AND NEW.status NOT IN ('resolved','closed','cancelled') THEN
    NEW.sla_breached := true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_check_wo_sla ON public.work_orders;
CREATE TRIGGER trg_check_wo_sla
  BEFORE INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.check_work_order_sla();

-- ─── 6. Fines ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_fines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  logged_by       UUID NOT NULL REFERENCES auth.users(id),
  fine_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  fine_amount     NUMERIC NOT NULL DEFAULT 0,
  fine_type       TEXT NOT NULL CHECK (fine_type IN
    ('speeding','overloading','wrong_route','documentation','traffic_violation','parking','safety_violation','other')),
  issuing_authority TEXT,
  fine_reference  TEXT,
  location        TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','disputed','waived')),
  paid_by         TEXT CHECK (paid_by IN ('company','driver','insurance','other')),
  deducted_from_driver BOOLEAN NOT NULL DEFAULT false,
  action_taken    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read fines"
  ON public.vehicle_fines FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "Ops managers manage fines"
  ON public.vehicle_fines FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE INDEX IF NOT EXISTS idx_fines_org_date ON public.vehicle_fines(organization_id, fine_date DESC);

-- ─── 7. Incidents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  logged_by       UUID NOT NULL REFERENCES auth.users(id),
  incident_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type   TEXT NOT NULL CHECK (incident_type IN
    ('collision_at_fault','collision_no_fault','parking_damage','load_damage','theft','vandalism','flood','fire','other')),
  severity        TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor','moderate','major','total_loss')),
  location        TEXT,
  description     TEXT NOT NULL,
  third_party_involved BOOLEAN NOT NULL DEFAULT false,
  police_report_number TEXT,
  repair_cost_estimate NUMERIC DEFAULT 0,
  actual_repair_cost   NUMERIC DEFAULT 0,
  insurance_claim_number TEXT,
  insurance_paid       NUMERIC DEFAULT 0,
  driver_liable        BOOLEAN,
  amount_recovered     NUMERIC DEFAULT 0,
  deducted_from_driver BOOLEAN NOT NULL DEFAULT false,
  status               TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','under_repair','resolved','insurance_pending','closed')),
  closed_at            TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read incidents"
  ON public.vehicle_incidents FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "Ops managers manage incidents"
  ON public.vehicle_incidents FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE INDEX IF NOT EXISTS idx_incidents_org_date ON public.vehicle_incidents(organization_id, incident_date DESC);

-- ─── 8. Fleet Availability Snapshots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_availability_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  total_vehicles   INTEGER NOT NULL DEFAULT 0,
  available_count  INTEGER NOT NULL DEFAULT 0,
  on_trip_count    INTEGER NOT NULL DEFAULT 0,
  maintenance_count INTEGER NOT NULL DEFAULT 0,
  availability_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_vehicles > 0
    THEN ROUND((available_count::NUMERIC / total_vehicles) * 100, 1)
    ELSE 0 END
  ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, log_date)
);
ALTER TABLE public.fleet_availability_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read availability"
  ON public.fleet_availability_log FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "Service role write availability"
  ON public.fleet_availability_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
